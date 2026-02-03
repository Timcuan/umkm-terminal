/**
 * Multi-Wallet Batch Deployer
 * Manages parallel deployments across multiple deployer wallets
 */

import type { Chain, PublicClient, WalletClient } from 'viem';
import { DeploymentError, errorLogger, wrapError } from '../errors/index.js';
import { type FarcasterWalletsResult, getUserWallets } from '../farcaster/index.js';
import { withRetry } from '../retry/index.js';
import type { TokenConfiguration } from '../types/configuration.js';
import { createRateLimiter, type RateLimiter } from '../utils/rate-limiter.js';
import { validatePrivateKey, validateTokenConfig } from '../validation/index.js';
import { NonceManager } from './nonce-manager.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Deployment job result with comprehensive type safety
 * Replaces: Record<string, unknown> for deployment results
 */
export interface DeploymentJobResult {
  /** Transaction hash */
  txHash: `0x${string}`;
  /** Deployed token address */
  tokenAddress?: `0x${string}`;
  /** Chain ID where deployment occurred */
  chainId: number;
  /** Gas used for deployment */
  gasUsed?: bigint;
  /** Gas price used */
  gasPrice?: bigint;
  /** Total cost in wei */
  totalCost?: bigint;
  /** Deployment timestamp */
  deployedAt: number;
  /** Token configuration used */
  tokenConfig: {
    name: string;
    symbol: string;
    image?: string;
    tokenAdmin: `0x${string}`;
  };
  /** Additional deployment metadata */
  metadata?: {
    batchIndex?: number;
    walletIndex?: number;
    retryAttempt?: number;
    deploymentDuration?: number;
    [key: string]: unknown;
  };
}

export interface DeployerWallet {
  /** Wallet address */
  address: string;
  /** Private key for signing */
  privateKey: `0x${string}`;
  /** Wallet client instance */
  walletClient: WalletClient;
  /** Is this wallet active */
  active: boolean;
  /** Last activity timestamp */
  lastActivity: number;
  /** Deployment count */
  deploymentCount: number;
}

export interface DeploymentJob {
  /** Unique job ID */
  id: string;
  /** Token configuration */
  config: TokenConfiguration;
  /** Target deployer wallet address */
  deployerAddress: string;
  /** Job created timestamp */
  createdAt: number;
  /** Job status */
  status: 'pending' | 'assigned' | 'deploying' | 'completed' | 'failed';
  /** Assigned worker ID */
  workerId?: string;
  /** Deployment result */
  result?: DeploymentJobResult;
  /** Error if failed */
  error?: Error;
  /** Retry count */
  retryCount: number;
}

export interface MultiWalletDeployOptions {
  /** Maximum concurrent deployments per wallet (default: 1) */
  maxConcurrentPerWallet?: number;
  /** Delay between deployments in ms (default: 1000) */
  deployDelay?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Rate limit per wallet (default: 2 requests/second) */
  rateLimitPerWallet?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Gas price multiplier for priority (default: 1.1) */
  gasMultiplier?: number;
  /** Skip wallets with low balance (default: true) */
  skipLowBalance?: boolean;
  /** Minimum balance required in ETH (default: 0.01) */
  minBalance?: number;
}

export interface BatchDeployResult {
  /** Total jobs processed */
  total: number;
  /** Successful deployments */
  successful: number;
  /** Failed deployments */
  failed: number;
  /** Deployment results */
  results: Array<{
    jobId: string;
    success: boolean;
    deployerAddress: string;
    txHash?: string;
    error?: string;
  }>;
  /** Total time taken */
  duration: number;
  /** Gas used */
  totalGasUsed: bigint;
}

// ============================================================================
// Multi-Wallet Deployer Class
// ============================================================================

export class MultiWalletDeployer {
  private deployerWallets = new Map<string, DeployerWallet>();
  private nonceManager: NonceManager;
  private rateLimiters = new Map<string, RateLimiter>();
  private deploymentQueue: DeploymentJob[] = [];
  private activeJobs = new Map<string, DeploymentJob>();
  private options: Required<MultiWalletDeployOptions>;
  private isDeploying = false;

  constructor(
    private publicClient: PublicClient,
    private chain: Chain,
    options: MultiWalletDeployOptions = {}
  ) {
    this.options = {
      maxConcurrentPerWallet: options.maxConcurrentPerWallet || 1,
      deployDelay: options.deployDelay || 1000,
      maxRetries: options.maxRetries || 3,
      rateLimitPerWallet: options.rateLimitPerWallet || {
        maxRequests: 2,
        windowMs: 1000,
      },
      gasMultiplier: options.gasMultiplier || 1.1,
      skipLowBalance: options.skipLowBalance !== false,
      minBalance: options.minBalance || 0.01,
    };

    this.nonceManager = new NonceManager(publicClient);
  }

  /**
   * Add a deployer wallet
   */
  async addDeployerWallet(privateKey: `0x${string}`, walletClient: WalletClient): Promise<void> {
    try {
      // Validate private key
      validatePrivateKey(privateKey);

      // Get wallet address
      const address = await walletClient.getAddresses();
      if (!address[0]) {
        throw new Error('Failed to get wallet address');
      }

      // Check balance if required
      if (this.options.skipLowBalance) {
        const balance = await this.publicClient.getBalance({
          address: address[0],
        });
        const balanceEth = Number(balance) / 1e18;

        if (balanceEth < this.options.minBalance) {
          throw new Error(
            `Insufficient balance: ${balanceEth} ETH (minimum: ${this.options.minBalance} ETH)`
          );
        }
      }

      // Initialize nonce
      await this.nonceManager.initializeWallet(address[0]);

      // Create rate limiter for this wallet
      const rateLimiter = createRateLimiter(this.options.rateLimitPerWallet);
      this.rateLimiters.set(address[0], rateLimiter);

      // Add wallet
      this.deployerWallets.set(address[0], {
        address: address[0],
        privateKey,
        walletClient,
        active: true,
        lastActivity: Date.now(),
        deploymentCount: 0,
      });

      errorLogger.log(wrapError(new Error(`Added deployer wallet: ${address[0]}`), 'Wallet added'));
    } catch (error) {
      errorLogger.log(wrapError(error, 'Failed to add deployer wallet'));
      throw error;
    }
  }

  /**
   * Add multiple deployer wallets with batch nonce optimization
   * More efficient than adding wallets individually when dealing with multiple wallets
   */
  async addDeployerWallets(wallets: Array<{ privateKey: `0x${string}`; walletClient: WalletClient }>): Promise<number> {
    try {
      const validWallets: Array<{ address: string; privateKey: `0x${string}`; walletClient: WalletClient }> = [];
      const addresses: string[] = [];

      // Validate all wallets and get addresses first
      for (const wallet of wallets) {
        try {
          // Validate private key
          validatePrivateKey(wallet.privateKey);

          // Get wallet address
          const addressArray = await wallet.walletClient.getAddresses();
          if (!addressArray[0]) {
            errorLogger.log(wrapError(new Error('Failed to get wallet address, skipping'), 'Wallet validation'));
            continue;
          }

          const address = addressArray[0];

          // Check if wallet already exists
          if (this.deployerWallets.has(address)) {
            errorLogger.log(wrapError(new Error(`Wallet ${address} already exists, skipping`), 'Wallet validation'));
            continue;
          }

          validWallets.push({ address, privateKey: wallet.privateKey, walletClient: wallet.walletClient });
          addresses.push(address);
        } catch (error) {
          errorLogger.log(wrapError(error as Error, 'Failed to validate wallet, skipping'));
        }
      }

      if (validWallets.length === 0) {
        return 0;
      }

      // Batch initialize nonces for all valid wallets - this is the key optimization
      await this.nonceManager.initializeWallets(addresses);

      // Add all wallets
      let addedCount = 0;
      for (const wallet of validWallets) {
        try {
          // Check balance if required
          if (this.options.skipLowBalance) {
            const balance = await this.publicClient.getBalance({ address: wallet.address as `0x${string}` });
            const balanceEth = Number(balance) / 1e18;

            if (balanceEth < this.options.minBalance) {
              errorLogger.log(wrapError(new Error(`Insufficient balance for ${wallet.address}: ${balanceEth} ETH (minimum: ${this.options.minBalance} ETH)`), 'Balance check'));
              continue;
            }
          }

          // Create rate limiter for this wallet
          const rateLimiter = createRateLimiter(this.options.rateLimitPerWallet);
          this.rateLimiters.set(wallet.address, rateLimiter);

          // Add wallet
          this.deployerWallets.set(wallet.address, {
            address: wallet.address,
            privateKey: wallet.privateKey,
            walletClient: wallet.walletClient,
            active: true,
            lastActivity: Date.now(),
            deploymentCount: 0,
          });

          addedCount++;
          errorLogger.log(wrapError(new Error(`Added deployer wallet: ${wallet.address}`), 'Wallet added'));
        } catch (error) {
          errorLogger.log(wrapError(error as Error, `Failed to add wallet ${wallet.address}`));
        }
      }

      return addedCount;
    } catch (error) {
      errorLogger.log(wrapError(error as Error, 'Failed to add multiple deployer wallets'));
      throw error;
    }
  }

  /**
   * Add multiple deployer wallets from farcaster user
   */
  async addDeployerWalletsFromFarcaster(
    usernameOrFid: string | number,
    walletClients: Map<string, WalletClient>
  ): Promise<number> {
    try {
      // Fetch wallets from farcaster
      const walletsResult: FarcasterWalletsResult = await getUserWallets(usernameOrFid);
      const wallets = walletsResult.wallets || [];
      let addedCount = 0;

      for (const walletAddress of wallets) {
        const walletClient = walletClients.get(walletAddress);
        if (walletClient) {
          // Note: In practice, you'd need to provide private keys
          // This is a simplified example
          try {
            await this.addDeployerWallet(
              '0x'.padEnd(66, '0') as `0x${string}`, // Placeholder
              walletClient
            );
            addedCount++;
          } catch (error) {
            errorLogger.log(wrapError(error as Error, `Failed to add wallet ${walletAddress}`));
          }
        }
      }

      return addedCount;
    } catch (error) {
      errorLogger.log(wrapError(error as Error, 'Failed to add wallets from Farcaster'));
      throw error;
    }
  }

  /**
   * Create batch deployment jobs
   */
  createBatchJobs(configs: TokenConfiguration[]): DeploymentJob[] {
    const jobs: DeploymentJob[] = [];
    const activeWallets = this.getActiveDeployerWallets();

    if (activeWallets.length === 0) {
      throw new Error('No active deployer wallets available');
    }

    // Distribute jobs across wallets round-robin
    configs.forEach((config, index) => {
      const walletAddress = activeWallets[index % activeWallets.length];

      const job: DeploymentJob = {
        id: `job-${Date.now()}-${index}`,
        config,
        deployerAddress: walletAddress,
        createdAt: Date.now(),
        status: 'pending',
        retryCount: 0,
      };

      jobs.push(job);
    });

    return jobs;
  }

  /**
   * Execute batch deployment
   */
  async executeBatchDeploy(
    configs: TokenConfiguration[],
    onProgress?: (completed: number, total: number, currentJob: DeploymentJob) => void
  ): Promise<BatchDeployResult> {
    if (this.isDeploying) {
      throw new Error('Deployment already in progress');
    }

    this.isDeploying = true;
    const startTime = Date.now();
    let completedCount = 0;
    const results: BatchDeployResult['results'] = [];
    let totalGasUsed = 0n;

    try {
      // Create jobs
      const jobs = this.createBatchJobs(configs);
      this.deploymentQueue = [...jobs];

      // Group jobs by wallet for per-wallet concurrency control
      const jobsByWallet = new Map<string, DeploymentJob[]>();
      jobs.forEach((job) => {
        if (!jobsByWallet.has(job.deployerAddress)) {
          jobsByWallet.set(job.deployerAddress, []);
        }
        const walletJobs = jobsByWallet.get(job.deployerAddress);
        if (walletJobs) {
          walletJobs.push(job);
        }
      });

      // Process jobs per-wallet with concurrency control
      const walletPromises = Array.from(jobsByWallet.entries()).map(([walletAddress, walletJobs]) =>
        this.processWalletJobs(walletAddress, walletJobs, onProgress)
      );

      const walletResults = await Promise.allSettled(walletPromises);

      // Collect results from all wallets
      walletResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          result.value.forEach((jobResult) => {
            if (jobResult.success) {
              results.push({
                jobId: jobResult.jobId,
                success: true,
                deployerAddress: jobResult.deployerAddress,
                txHash: jobResult.txHash,
              });
              completedCount++;
              totalGasUsed += jobResult.gasUsed || 0n;
            } else {
              results.push({
                jobId: jobResult.jobId,
                success: false,
                deployerAddress: jobResult.deployerAddress,
                error: jobResult.error,
              });
            }
          });
        } else {
          // Handle wallet-level failure
          errorLogger.log(wrapError(new Error(String(result.reason)), 'Wallet processing failed'));
        }
      });

      const duration = Date.now() - startTime;

      return {
        total: jobs.length,
        successful: completedCount,
        failed: jobs.length - completedCount,
        results,
        duration,
        totalGasUsed,
      };
    } finally {
      this.isDeploying = false;
      this.deploymentQueue = [];
      this.activeJobs.clear();
    }
  }

  /**
   * Process all jobs for a specific wallet with concurrency control
   */
  private async processWalletJobs(
    walletAddress: string,
    jobs: DeploymentJob[],
    onProgress?: (completed: number, total: number, currentJob: DeploymentJob) => void
  ): Promise<
    Array<{
      jobId: string;
      success: boolean;
      deployerAddress: string;
      txHash?: string;
      gasUsed?: bigint;
      error?: string;
    }>
  > {
    const results: Array<{
      jobId: string;
      success: boolean;
      deployerAddress: string;
      txHash?: string;
      gasUsed?: bigint;
      error?: string;
    }> = [];
    const maxConcurrent = this.options.maxConcurrentPerWallet;

    // Process jobs in batches to control concurrency
    for (let i = 0; i < jobs.length; i += maxConcurrent) {
      const batch = jobs.slice(i, i + maxConcurrent);

      const batchPromises = batch.map((job) =>
        this.processJob(job, onProgress)
          .then((result) => ({
            jobId: job.id,
            success: true,
            deployerAddress: job.deployerAddress,
            txHash: result.txHash,
            gasUsed: result.gasUsed,
          }))
          .catch((error) => ({
            jobId: job.id,
            success: false,
            deployerAddress: job.deployerAddress,
            error: error.message,
          }))
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            jobId: 'unknown',
            success: false,
            deployerAddress: walletAddress,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });
    }

    return results;
  }

  /**
   * Process a single deployment job
   */
  private async processJob(
    job: DeploymentJob,
    onProgress?: (completed: number, total: number, currentJob: DeploymentJob) => void
  ): Promise<DeploymentJobResult> {
    const wallet = this.deployerWallets.get(job.deployerAddress);
    if (!wallet) {
      throw new Error(`Deployer wallet not found: ${job.deployerAddress}`);
    }

    const rateLimiter = this.rateLimiters.get(job.deployerAddress);
    if (!rateLimiter) {
      throw new Error(`Rate limiter not found for wallet: ${job.deployerAddress}`);
    }

    let lastError: Error | undefined;

    // Retry logic
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Wait for rate limit
        await rateLimiter.waitForSlot();

        // Validate config
        validateTokenConfig(job.config);

        // Deploy with retry
        const result = await withRetry(
          async () => {
            // Simulate deployment - replace with actual deploy logic
            await this.delay(this.options.deployDelay);

            // Increment nonce on success
            this.nonceManager.incrementNonce(job.deployerAddress);

            // Update wallet stats
            wallet.deploymentCount++;
            wallet.lastActivity = Date.now();

            return {
              txHash: `0x${Math.random().toString(16).substring(2, 66)}` as `0x${string}`,
              gasUsed: BigInt(210000),
              chainId: job.config.chainId || 8453,
              deployedAt: Date.now(),
              tokenConfig: {
                name: job.config.name,
                symbol: job.config.symbol,
                image: job.config.image,
                tokenAdmin: job.config.tokenAdmin as `0x${string}`,
              },
            };
          },
          {
            maxAttempts: 2,
            initialDelay: 1000,
          }
        );

        job.status = 'completed';
        job.result = result;

        onProgress?.(this.activeJobs.size, this.deploymentQueue.length, job);

        return result;
      } catch (error) {
        lastError = error as Error;
        job.retryCount = attempt;

        if (attempt === this.options.maxRetries) {
          job.status = 'failed';
          job.error = lastError;

          // Deactivate wallet on repeated failures
          if (lastError instanceof DeploymentError) {
            this.nonceManager.deactivateWallet(job.deployerAddress);
            wallet.active = false;
          }

          throw lastError;
        }

        // Sync nonce on failure
        await this.nonceManager.syncNonce(job.deployerAddress);
      }
    }

    throw lastError;
  }

  /**
   * Get active deployer wallets
   */
  private getActiveDeployerWallets(): string[] {
    return Array.from(this.deployerWallets.entries())
      .filter(([, wallet]) => wallet.active)
      .map(([address]) => address);
  }

  /**
   * Get deployer statistics
   */
  getStats(): {
    totalWallets: number;
    activeWallets: number;
    totalDeployments: number;
    queueSize: number;
    activeJobs: number;
  } {
    const activeWallets = this.getActiveDeployerWallets();
    const totalDeployments = Array.from(this.deployerWallets.values()).reduce(
      (sum, wallet) => sum + wallet.deploymentCount,
      0
    );

    return {
      totalWallets: this.deployerWallets.size,
      activeWallets: activeWallets.length,
      totalDeployments,
      queueSize: this.deploymentQueue.length,
      activeJobs: this.activeJobs.size,
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.deployerWallets.clear();
    this.nonceManager.reset();
    this.rateLimiters.clear();
    this.deploymentQueue = [];
    this.activeJobs.clear();
    this.isDeploying = false;
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
