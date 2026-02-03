/**
 * Batch Coordinator
 * Advanced batch operation coordination with partial failure recovery
 */

import type { ClankerTokenV4, DeployResult } from '../../types/index.js';
import type { 
  ClankerAPITokenRequest,
  ClankerAPIResponse,
  OperationMethod,
  BatchDeploymentResult,
  ChainSummary,
  BatchDeploymentResponse
} from '../types/index.js';
import { ClankerAPIMethod } from '../executor/api-method.js';
import { 
  createAPIError,
  createValidationError,
  createNetworkError
} from '../types/error-types.js';

// ============================================================================
// Batch Coordination Types
// ============================================================================

export interface BatchCoordinationConfig {
  maxConcurrency: number;
  retryFailedItems: boolean;
  maxRetries: number;
  retryDelay: number;
  failFast: boolean;
  partialFailureThreshold: number; // Percentage of failures before stopping
  progressCallback?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  inProgress: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface BatchItem<T> {
  id: string;
  data: T;
  chainId: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface BatchExecutionResult<T, R> {
  batchId: string;
  config: BatchCoordinationConfig;
  items: BatchItem<T>[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    retried: number;
    duration: number;
  };
  chainSummary: Record<number, ChainSummary>;
  results: R[];
  errors: string[];
}

// ============================================================================
// Batch Coordinator Class
// ============================================================================

export class BatchCoordinator {
  private defaultConfig: BatchCoordinationConfig = {
    maxConcurrency: 5,
    retryFailedItems: true,
    maxRetries: 3,
    retryDelay: 1000,
    failFast: false,
    partialFailureThreshold: 50, // Stop if 50% fail
  };

  /**
   * Execute batch deployment with advanced coordination
   */
  async executeBatchDeployment(
    tokens: ClankerTokenV4[],
    apiMethod: ClankerAPIMethod,
    method: OperationMethod,
    config: Partial<BatchCoordinationConfig> = {}
  ): Promise<BatchDeploymentResponse> {
    const batchConfig = { ...this.defaultConfig, ...config };
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    // Initialize batch items
    const batchItems: BatchItem<ClankerTokenV4>[] = tokens.map((token, index) => ({
      id: `${batchId}-${index}`,
      data: token,
      chainId: token.chainId || 8453,
      retryCount: 0,
      status: 'pending',
    }));

    // Group by chain for efficient processing
    const chainGroups = this.groupByChain(batchItems);
    const results: BatchDeploymentResult[] = [];
    const chainSummary: Record<number, ChainSummary> = {};
    const errors: string[] = [];

    // Initialize chain summaries
    for (const [chainId, items] of chainGroups.entries()) {
      chainSummary[chainId] = {
        total: items.length,
        successful: 0,
        failed: 0,
        methodUsed: method,
      };
    }

    try {
      // Process each chain group
      for (const [chainId, chainItems] of chainGroups.entries()) {
        try {
          const chainResults = await this.processChainBatch(
            chainItems,
            apiMethod,
            batchConfig,
            chainId
          );

          // Update results and summary
          results.push(...chainResults.results);
          chainSummary[chainId].successful = chainResults.successful;
          chainSummary[chainId].failed = chainResults.failed;

          // Check partial failure threshold
          const failureRate = (chainResults.failed / chainItems.length) * 100;
          if (batchConfig.failFast && failureRate > batchConfig.partialFailureThreshold) {
            errors.push(`Chain ${chainId}: Failure rate ${failureRate.toFixed(1)}% exceeds threshold ${batchConfig.partialFailureThreshold}%`);
            break;
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Chain processing failed';
          errors.push(`Chain ${chainId}: ${errorMessage}`);

          // Mark all items in this chain as failed
          for (const item of chainItems) {
            results.push({
              token: item.data.name,
              chainId,
              success: false,
              error: errorMessage,
              methodUsed: method,
            });
            chainSummary[chainId].failed++;
          }

          if (batchConfig.failFast) {
            break;
          }
        }
      }

      return {
        method,
        results,
        chainSummary,
      };

    } catch (error) {
      throw createAPIError(
        `Batch coordination failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_COORDINATION_FAILED',
        false,
        { batchId, duration: Date.now() - startTime }
      );
    }
  }

  /**
   * Process batch for a specific chain with concurrency control
   */
  private async processChainBatch(
    chainItems: BatchItem<ClankerTokenV4>[],
    apiMethod: ClankerAPIMethod,
    config: BatchCoordinationConfig,
    chainId: number
  ): Promise<{
    results: BatchDeploymentResult[];
    successful: number;
    failed: number;
  }> {
    const results: BatchDeploymentResult[] = [];
    let successful = 0;
    let failed = 0;

    // Create semaphore for concurrency control
    const semaphore = new Semaphore(config.maxConcurrency);

    // Process items with concurrency control
    const promises = chainItems.map(async (item) => {
      return semaphore.acquire(async () => {
        const result = await this.processItem(item, apiMethod, config);
        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        // Report progress if callback provided
        if (config.progressCallback) {
          config.progressCallback({
            total: chainItems.length,
            completed: successful + failed,
            successful,
            failed,
            inProgress: chainItems.length - (successful + failed),
            percentage: ((successful + failed) / chainItems.length) * 100,
          });
        }

        return result;
      });
    });

    await Promise.all(promises);

    return { results, successful, failed };
  }

  /**
   * Process individual item with retry logic
   */
  private async processItem(
    item: BatchItem<ClankerTokenV4>,
    apiMethod: ClankerAPIMethod,
    config: BatchCoordinationConfig
  ): Promise<BatchDeploymentResult> {
    item.status = 'processing';
    item.startTime = Date.now();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          item.status = 'retrying';
          item.retryCount = attempt;
          
          // Wait before retry
          await this.delay(config.retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
        }

        // Attempt deployment
        const result = await apiMethod.deploy(item.data);
        
        item.status = 'completed';
        item.endTime = Date.now();
        item.result = result;

        return {
          token: item.data.name,
          chainId: item.chainId,
          success: true,
          result,
          methodUsed: 'api',
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt >= config.maxRetries) {
          break;
        }
      }
    }

    // All retries failed
    item.status = 'failed';
    item.endTime = Date.now();
    item.error = lastError?.message || 'Deployment failed';

    return {
      token: item.data.name,
      chainId: item.chainId,
      success: false,
      error: item.error,
      methodUsed: 'api',
    };
  }

  /**
   * Group batch items by chain ID
   */
  private groupByChain(items: BatchItem<ClankerTokenV4>[]): Map<number, BatchItem<ClankerTokenV4>[]> {
    const groups = new Map<number, BatchItem<ClankerTokenV4>[]>();

    for (const item of items) {
      const chainId = item.chainId;
      if (!groups.has(chainId)) {
        groups.set(chainId, []);
      }
      groups.get(chainId)!.push(item);
    }

    return groups;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    // Check error code
    if ('code' in error) {
      const retryableCodes = [
        'NETWORK_ERROR',
        'TIMEOUT',
        'RATE_LIMIT',
        'SERVER_ERROR',
        'TEMPORARY_FAILURE',
      ];
      return retryableCodes.includes(error.code);
    }

    // Check error message for common retryable patterns
    if ('message' in error && typeof error.message === 'string') {
      const retryablePatterns = [
        /network/i,
        /timeout/i,
        /rate limit/i,
        /server error/i,
        /temporary/i,
        /503/,
        /502/,
        /504/,
      ];
      return retryablePatterns.some(pattern => pattern.test(error.message));
    }

    return false;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `batch_${timestamp}_${random}`;
  }

  /**
   * Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Semaphore for Concurrency Control
// ============================================================================

class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        this.executeTask(task, resolve, reject);
      } else {
        this.waiting.push(() => {
          this.permits--;
          this.executeTask(task, resolve, reject);
        });
      }
    });
  }

  private async executeTask<T>(
    task: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (reason: any) => void
  ): Promise<void> {
    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.release();
    }
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) {
        next();
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create batch coordinator with default configuration
 */
export function createBatchCoordinator(): BatchCoordinator {
  return new BatchCoordinator();
}

/**
 * Create batch coordinator with custom configuration
 */
export function createBatchCoordinatorWithConfig(
  config: Partial<BatchCoordinationConfig>
): BatchCoordinator {
  const coordinator = new BatchCoordinator();
  // The config will be passed to executeBatchDeployment method
  return coordinator;
}

/**
 * Execute simple batch deployment with default settings
 */
export async function executeBatchDeployment(
  tokens: ClankerTokenV4[],
  apiMethod: ClankerAPIMethod,
  method: OperationMethod = 'api',
  config?: Partial<BatchCoordinationConfig>
): Promise<BatchDeploymentResponse> {
  const coordinator = createBatchCoordinator();
  return coordinator.executeBatchDeployment(tokens, apiMethod, method, config);
}