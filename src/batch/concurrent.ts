/**
 * Concurrent Batch Deployment Module
 * Optimized batch deployment with controlled concurrency and performance monitoring
 */

import { createDeployer, type SimpleDeployConfig } from '../deployer/index.js';
import { BatchError, BatchValidationError, errorLogger, wrapError } from '../errors/index.js';
import { RetryHandler } from '../retry/index.js';
import { animationManager, ProgressBar } from '../utils/animation.js';
import { validateTokenConfig } from '../validation/index.js';
import { validateTokenConfigSafe, type TokenConfiguration } from '../types/deployment-args.js';
import type {
  BatchDefaults,
  BatchOptions,
  BatchResult,
  BatchSummary,
  BatchTemplate,
  BatchToken,
} from './index.js';

// ============================================================================
// Types
// ============================================================================

export interface ConcurrentBatchOptions extends BatchOptions {
  /** Maximum concurrent deployments (default: 3) */
  concurrency?: number;
  /** Enable performance monitoring (default: true) */
  monitoring?: boolean;
  /** Show progress bar (default: true) */
  showProgress?: boolean;
  /** Adaptive concurrency based on success rate (default: true) */
  adaptiveConcurrency?: boolean;
  /** Callback on error */
  onError?: (index: number, error: Error, token: TokenConfiguration) => void;
}

export interface WorkerPoolOptions {
  /** Number of workers in pool */
  workers: number;
  /** Task timeout per worker (default: 60000) */
  taskTimeout?: number;
  /** Worker idle timeout (default: 30000) */
  idleTimeout?: number;
}

export interface DeploymentTask {
  id: string;
  index: number;
  config: SimpleDeployConfig;
  priority: number;
  retries: number;
}

export interface PerformanceMetrics {
  totalTasks: number;
  completedTasks: number;
  successRate: number;
  averageTaskTime: number;
  currentConcurrency: number;
  throughput: number; // tasks per second
}

// ============================================================================
// Worker Pool
// ============================================================================

export class DeploymentWorker {
  private busy = false;
  private currentTask: DeploymentTask | null = null;
  private deployer: ReturnType<typeof createDeployer>;
  private lastUsed = Date.now();

  constructor(
    private chainId: number,
    private privateKey: string,
    private onTaskComplete: (task: DeploymentTask, result: BatchResult) => void,
    private onTaskError: (task: DeploymentTask, error: Error) => void
  ) {
    this.deployer = createDeployer(chainId, privateKey as `0x${string}`);
  }

  /**
   * Execute a deployment task
   */
  async execute(task: DeploymentTask): Promise<void> {
    if (this.busy) {
      throw new BatchError('WORKER_BUSY', 'Worker is currently busy');
    }

    this.busy = true;
    this.currentTask = task;
    this.lastUsed = Date.now();

    try {
      // Validate config before deployment using type-safe wrapper
      const safeConfig = validateTokenConfigSafe(task.config);
      validateTokenConfig(safeConfig);

      // Deploy with retry logic
      const retryHandler = new RetryHandler({
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        timeout: 30000,
        shouldRetry: (error, attempt) => {
          // Retry on network errors and temporary failures
          return (
            attempt < 3 &&
            (error.message.includes('timeout') ||
              error.message.includes('network') ||
              error.message.includes('nonce too low'))
          );
        },
      });

      const result = await retryHandler.execute(async () => {
        const deployResult = await this.deployer.deploy(task.config);
        return deployResult;
      });

      if (result.success && result.data && result.data.tokenAddress) {
        this.onTaskComplete(task, {
          index: task.index,
          name: task.config.name,
          symbol: task.config.symbol,
          success: true,
          address: result.data.tokenAddress,
          txHash: result.data.txHash,
        });
      } else {
        this.onTaskError(task, new Error(result.data?.error || 'Deployment failed'));
      }
    } catch (error) {
      this.onTaskError(task, error as Error);
    } finally {
      this.busy = false;
      this.currentTask = null;
    }
  }

  /**
   * Check if worker is available
   */
  isAvailable(): boolean {
    return !this.busy;
  }

  /**
   * Check if worker is idle
   */
  isIdle(timeout: number = 30000): boolean {
    return !this.busy && Date.now() - this.lastUsed > timeout;
  }

  /**
   * Get current task
   */
  getCurrentTask(): DeploymentTask | null {
    return this.currentTask;
  }
}

// ============================================================================
// Concurrent Batch Deployer
// ============================================================================

export class ConcurrentBatchDeployer {
  private workers: DeploymentWorker[] = [];
  private taskQueue: DeploymentTask[] = [];
  private running = false;
  private results: BatchResult[] = [];
  private metrics: PerformanceMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    successRate: 0,
    averageTaskTime: 0,
    currentConcurrency: 0,
    throughput: 0, // tasks per second
  };
  private taskTimes: number[] = [];
  private startTime = 0;
  private progressBar?: ProgressBar;

  constructor(
    private template: BatchTemplate,
    private options: ConcurrentBatchOptions = {}
  ) {
    const concurrency = options.concurrency || 3;
    const chainId = this.getChainId(template.chain || 'base');

    // Create worker pool
    for (let i = 0; i < concurrency; i++) {
      this.workers.push(
        new DeploymentWorker(
          chainId,
          this.getPrivateKey(),
          this.handleTaskComplete.bind(this),
          this.handleTaskError.bind(this)
        )
      );
    }

    // Initialize progress bar
    if (options.showProgress !== false) {
      this.progressBar = new ProgressBar(template.tokens.length, 'Deploying', 30, {
        frameRate: 200,
      });
      animationManager.add(this.progressBar);
    }
  }

  /**
   * Start concurrent deployment
   */
  async start(): Promise<BatchSummary> {
    if (this.running) {
      throw new BatchError('ALREADY_RUNNING', 'Batch deployment is already running');
    }

    this.running = true;
    this.startTime = Date.now();
    this.metrics.totalTasks = this.template.tokens.length;

    // Validate template
    this.validateTemplate();

    // Create task queue
    this.createTaskQueue();

    // Start progress animation
    if (this.progressBar) {
      this.progressBar.start();
    }

    // Process tasks
    await this.processTasks();

    // Stop progress animation
    if (this.progressBar) {
      this.progressBar.stop(true);
    }

    // Generate summary
    return this.generateSummary();
  }

  /**
   * Stop all deployments
   */
  async stop(): Promise<void> {
    this.running = false;
    this.taskQueue = [];

    if (this.progressBar) {
      this.progressBar.stop(false, 'Stopped');
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private validateTemplate(): void {
    if (!this.template.tokens || this.template.tokens.length === 0) {
      throw new BatchValidationError('No tokens to deploy');
    }

    if (this.template.tokens.length > 100) {
      throw new BatchValidationError('Maximum 100 tokens allowed per batch');
    }

    // Validate each token config
    this.template.tokens.forEach((token, index) => {
      try {
        this.buildTokenConfig(token, index);
      } catch (error) {
        throw new BatchValidationError(
          `Invalid token at index ${index}: ${(error as Error).message}`,
          index
        );
      }
    });
  }

  private createTaskQueue(): void {
    this.taskQueue = this.template.tokens.map((token, index) => ({
      id: `task-${index}`,
      index,
      config: this.buildTokenConfig(token, index),
      priority: this.calculatePriority(token, index),
      retries: 0,
    }));

    // Sort by priority (higher first)
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  private buildTokenConfig(token: BatchToken, _index: number): SimpleDeployConfig {
    const defaults = this.template.defaults || {};
    const chainId = this.getChainId(this.template.chain || 'base');
    const deployer = createDeployer(chainId);
    const deployerAddress = deployer.address;

    return {
      name: token.name as string,
      symbol: token.symbol as string,
      image: (token.image || defaults.image || '') as string,
      description: (token.description || defaults.description || '') as string,
      tokenAdmin: (token.tokenAdmin || defaults.tokenAdmin || deployerAddress) as `0x${string}`,
      chainId,
      mev: token.mev ?? defaults.mev ?? 8,
      fees:
        defaults.feeType === 'dynamic'
          ? {
              type: 'dynamic',
              baseFee: defaults.dynamicBaseFee || 1,
              maxLpFee: defaults.dynamicMaxFee || 5,
            }
          : {
              type: 'static',
              clankerFee: (token.fee ?? defaults.fee ?? 5) as number,
              pairedFee: (token.fee ?? defaults.fee ?? 5) as number,
            },
      rewardRecipients: this.buildRewardRecipients(token, defaults, deployerAddress),
      socials: token.socials || defaults.socials,
      vault: token.vault || defaults.vault,
      context: {
        interface: defaults.interfaceName || 'UMKM Terminal',
        platform: defaults.platformName || 'Clanker',
      },
    };
  }

  private buildRewardRecipients(
    token: BatchToken,
    defaults: BatchDefaults,
    deployerAddress: string
  ): Array<{
    address: `0x${string}`;
    allocation: number;
    rewardToken?: 'Both' | 'Paired' | 'Clanker';
  }> {
    if (
      token.rewardRecipients &&
      Array.isArray(token.rewardRecipients) &&
      token.rewardRecipients.length > 0
    ) {
      return token.rewardRecipients.map((r: { address?: string; allocation?: number }) => ({
        address: r.address as `0x${string}`,
        allocation: r.allocation as number,
        rewardToken: (defaults.rewardToken as 'Both' | 'Paired' | 'Clanker') || 'Both',
      }));
    }

    const tokenAdmin = (token.tokenAdmin ||
      defaults.tokenAdmin ||
      deployerAddress) as `0x${string}`;
    const recipient = (defaults.rewardRecipient || tokenAdmin) as `0x${string}`;

    return [
      {
        address: tokenAdmin,
        allocation: 0.1, // Spoofing optimization: Admin gets minimal allocation
        rewardToken: (defaults.rewardToken as 'Both' | 'Paired' | 'Clanker') || 'Both',
      },
      {
        address: recipient,
        allocation: 0.1, // Minimal allocation for recipient
        rewardToken: (defaults.rewardToken as 'Both' | 'Paired' | 'Clanker') || 'Both',
      },
    ];
  }

  private calculatePriority(_token: BatchToken, index: number): number {
    // Simple priority: earlier tokens have higher priority
    // Can be enhanced based on token value, admin address, etc.
    return this.template.tokens.length - index;
  }

  private async processTasks(): Promise<void> {
    while (this.running && (this.taskQueue.length > 0 || this.hasActiveWorkers())) {
      // Assign tasks to available workers
      await this.assignTasks();

      // Wait a bit before next iteration
      await this.sleep(100);

      // Update metrics
      this.updateMetrics();

      // Adaptive concurrency adjustment
      if (this.options.adaptiveConcurrency) {
        this.adjustConcurrency();
      }
    }

    // Wait for all remaining tasks to complete
    while (this.hasActiveWorkers()) {
      await this.sleep(100);
    }
  }

  private async assignTasks(): Promise<void> {
    const availableWorkers = this.workers.filter((w) => w.isAvailable());

    for (const worker of availableWorkers) {
      if (this.taskQueue.length === 0) break;

      const task = this.taskQueue.shift();
      if (task) {
        // Execute task asynchronously
        worker.execute(task).catch((error) => {
          errorLogger.log(wrapError(error));
        });
      }
    }
  }

  private hasActiveWorkers(): boolean {
    return this.workers.some((w) => !w.isAvailable());
  }

  private handleTaskComplete(task: DeploymentTask, result: BatchResult): void {
    const taskTime = Date.now() - this.startTime;
    this.taskTimes.push(taskTime);

    // Keep only last 50 task times for average calculation
    if (this.taskTimes.length > 50) {
      this.taskTimes.shift();
    }

    // Store result
    this.results.push(result);

    // Update progress
    if (this.progressBar) {
      this.progressBar.update(this.metrics.completedTasks + 1);
    }

    // Call progress callback
    if (this.options.onProgress) {
      this.options.onProgress(task.index + 1, this.metrics.totalTasks, result);
    }

    this.metrics.completedTasks++;
  }

  private handleTaskError(task: DeploymentTask, error: Error): void {
    // Wrap error before logging
    const wrappedError = wrapError(error, 'Batch deployment task failed');
    errorLogger.log(wrappedError);

    // Check if we should retry
    if (task.retries < (this.options.retries || 2)) {
      task.retries++;
      this.taskQueue.unshift(task); // Add to front of queue
    } else {
      // Max retries reached, record as failed
      const result: BatchResult = {
        index: task.index,
        name: task.config.name,
        symbol: task.config.symbol,
        success: false,
        error: error.message,
      };

      // Store result
      this.results.push(result);

      // Call error callback with type-safe config
      if (this.options.onError) {
        const safeConfig = validateTokenConfigSafe(task.config);
        this.options.onError(task.index, error, safeConfig);
      }

      this.metrics.completedTasks++;
    }
  }

  private updateMetrics(): void {
    this.metrics.currentConcurrency = this.workers.filter((w) => !w.isAvailable()).length;
    this.metrics.successRate =
      this.metrics.completedTasks > 0
        ? (this.metrics.completedTasks - this.taskQueue.length) / this.metrics.completedTasks
        : 0;

    if (this.taskTimes.length > 0) {
      this.metrics.averageTaskTime =
        this.taskTimes.reduce((a, b) => a + b, 0) / this.taskTimes.length;
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    this.metrics.throughput = elapsed > 0 ? this.metrics.completedTasks / elapsed : 0;
  }

  private adjustConcurrency(): void {
    const successRate = this.metrics.successRate;
    const currentConcurrency = this.workers.length;

    // If success rate is high, we can increase concurrency
    if (successRate > 0.95 && currentConcurrency < 10) {
      // Add a new worker
      const chainId = this.getChainId(this.template.chain || 'base');
      this.workers.push(
        new DeploymentWorker(
          chainId,
          this.getPrivateKey(),
          this.handleTaskComplete.bind(this),
          this.handleTaskError.bind(this)
        )
      );
    }
    // If success rate is low, reduce concurrency
    else if (successRate < 0.7 && currentConcurrency > 1) {
      // Remove an idle worker
      const idleWorker = this.workers.find((w) => w.isIdle());
      if (idleWorker) {
        const index = this.workers.indexOf(idleWorker);
        this.workers.splice(index, 1);
      }
    }
  }

  private generateSummary(): BatchSummary {
    const duration = Date.now() - this.startTime;

    // Sort results by index to maintain order
    const sortedResults = [...this.results].sort((a, b) => a.index - b.index);

    return {
      template: this.template.name || 'Unnamed',
      chain: this.template.chain || 'base',
      total: this.template.tokens.length,
      success: sortedResults.filter((r) => r.success).length,
      failed: sortedResults.filter((r) => !r.success).length,
      results: sortedResults,
      duration,
    };
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private getChainId(chainName: string): number {
    const chainIds: Record<string, number> = {
      base: 8453,
      ethereum: 1,
      arbitrum: 42161,
      unichain: 130,
      monad: 10143,
    };
    return chainIds[chainName] || 8453;
  }

  private getPrivateKey(): string {
    // This should come from environment or config
    return process.env.PRIVATE_KEY || '';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Deploy batch with concurrency control
 */
export async function deployConcurrent(
  template: BatchTemplate,
  options: ConcurrentBatchOptions = {}
): Promise<BatchSummary> {
  const deployer = new ConcurrentBatchDeployer(template, options);
  return deployer.start();
}

/**
 * Create a concurrent batch deployer instance
 */
export function createConcurrentDeployer(
  template: BatchTemplate,
  options: ConcurrentBatchOptions = {}
): ConcurrentBatchDeployer {
  return new ConcurrentBatchDeployer(template, options);
}
