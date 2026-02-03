/**
 * Multi-Wallet Batch Deployment Integration
 * Enhanced batch system with farcaster integration and optimized parallel deployments
 */

import type { Chain, PublicClient, WalletClient } from 'viem';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { type BatchDeployConfig, createBatchDeployConfig } from '../config/batch.js';
import {
  MultiWalletDeployer,
  type MultiWalletDeployOptions,
} from '../deployer/multi-wallet-deployer.js';
import { BatchValidationError, errorLogger, wrapError } from '../errors/index.js';
import { 
  type TokenConfiguration, 
  type BatchConfiguration,
  toBatchConfiguration,
  toTokenConfiguration 
} from '../types/configuration.js';
import { 
  ValidationError, 
  createValidationError
} from '../errors/standardized-errors.js';
import type { ErrorContext } from '../types/base-types.js';
import { decryptWallet, getAllWallets } from '../wallet/index.js';
import { FarcasterService } from './farcaster-integration.js';

// ============================================================================
// Types
// ============================================================================

export interface MultiWalletBatchConfig {
  /** Farcaster username or FID to fetch wallets from */
  farcasterInput: string | number;
  /** Token configurations to deploy */
  tokenConfigs: TokenConfiguration[];
  /** Deployer wallet private keys */
  deployerPrivateKeys?: `0x${string}`[];
  /** Password for encrypted wallets */
  walletPassword?: string;
  /** Number of wallets to use from store */
  walletCount?: number;
  /** Wallet clients for each deployer */
  walletClients?: Map<string, WalletClient>;
  /** Deployment options */
  deployOptions?: MultiWalletDeployOptions;
  /** Maximum addresses per deployer wallet (default: 3) */
  maxAddressesPerDeployer?: number;
}

export interface BatchDeploymentPlan {
  /** Total tokens to deploy */
  totalTokens: number;
  /** Available deployer wallets */
  deployerWallets: string[];
  /** Tokens per wallet */
  tokensPerWallet: number;
  /** Addresses assigned to each deployer */
  addressDistribution: Map<string, string[]>;
  /** Estimated total cost in ETH */
  estimatedCost: number;
  /** Estimated time in seconds */
  estimatedTime: number;
}

export interface BatchDeploymentResult {
  /** Deployment plan that was used */
  plan: BatchDeploymentPlan;
  /** Actual deployment results */
  results: import('../deployer/multi-wallet-deployer.js').BatchDeployResult;
  /** Success rate */
  successRate: number;
  /** Wallet performance stats */
  walletStats: Array<{
    address: string;
    deployed: number;
    successful: number;
    failed: number;
    totalGasUsed: bigint;
  }>;
}

// ============================================================================
// Multi-Wallet Batch Manager
// ============================================================================

export class MultiWalletBatchManager {
  private deployer: MultiWalletDeployer;
  private farcasterService: FarcasterService;

  constructor(
    private publicClient: PublicClient,
    private chain: Chain
  ) {
    this.deployer = new MultiWalletDeployer(publicClient, chain);
    this.farcasterService = new FarcasterService();
  }

  /**
   * Create batch configuration from environment variables
   */
  static createFromEnv(tokenConfigs: TokenConfiguration[]): MultiWalletBatchConfig {
    const batchConfig = createBatchDeployConfig({
      farcasterInput: process.env.FARCASTER_INPUT,
      deployerPrivateKeys: process.env.DEPLOYER_PRIVATE_KEYS,
      maxAddressesPerDeployer: process.env.MAX_ADDRESSES_PER_DEPLOYER
        ? parseInt(process.env.MAX_ADDRESSES_PER_DEPLOYER)
        : undefined,
      strategy: process.env.STRATEGY as 'conservative' | 'balanced' | 'aggressive' | undefined,
      dryRun: process.env.DRY_RUN === 'true',
    });

    return {
      farcasterInput: batchConfig.farcasterInput,
      tokenConfigs,
      deployerPrivateKeys: batchConfig.deployerPrivateKeys,
      maxAddressesPerDeployer: batchConfig.maxAddressesPerDeployer,
      deployOptions: {
        maxConcurrentPerWallet: batchConfig.maxConcurrentPerWallet,
        deployDelay: batchConfig.deployDelay,
        maxRetries: batchConfig.maxRetries,
        gasMultiplier: batchConfig.gasMultiplier,
      },
    };
  }

  /**
   * Create batch configuration from BatchDeployConfig
   */
  static fromBatchConfig(
    batchConfig: BatchDeployConfig,
    tokenConfigs: TokenConfiguration[]
  ): MultiWalletBatchConfig {
    return {
      farcasterInput: batchConfig.farcasterInput,
      tokenConfigs,
      deployerPrivateKeys: batchConfig.deployerPrivateKeys,
      maxAddressesPerDeployer: batchConfig.maxAddressesPerDeployer,
      deployOptions: {
        maxConcurrentPerWallet: batchConfig.maxConcurrentPerWallet,
        deployDelay: batchConfig.deployDelay,
        maxRetries: batchConfig.maxRetries,
        gasMultiplier: batchConfig.gasMultiplier,
      },
    };
  }

  /**
   * Create deployment plan from Farcaster user
   */
  async createDeploymentPlan(
    farcasterInput: string | number,
    tokenConfigs: TokenConfiguration[],
    deployerPrivateKeys: `0x${string}`[],
    maxAddressesPerDeployer: number = 3
  ): Promise<BatchDeploymentPlan> {
    try {
      // Validate inputs
      if (!tokenConfigs.length) {
        const context: ErrorContext = {
          operation: 'createDeploymentPlan',
          component: 'MultiWalletBatchManager'
        };
        throw createValidationError('INVALID_CONFIG', 'No token configurations provided', context);
      }

      if (!deployerPrivateKeys.length) {
        const context: ErrorContext = {
          operation: 'createDeploymentPlan',
          component: 'MultiWalletBatchManager'
        };
        throw createValidationError('INVALID_CONFIG', 'No deployer private keys provided', context);
      }

      // Use FarcasterService to create deployment plan
      const farcasterPlan = await this.farcasterService.createFarcasterDeploymentPlan(
        farcasterInput,
        deployerPrivateKeys,
        maxAddressesPerDeployer
      );

      // Calculate distribution
      const totalDeployers = farcasterPlan.addressDistribution.size;
      const tokensPerWallet = Math.ceil(tokenConfigs.length / totalDeployers);
      const estimatedCost = this.estimateTotalCost(tokenConfigs, totalDeployers);
      const estimatedTime = this.estimateDeploymentTime(tokenConfigs.length, totalDeployers);

      return {
        totalTokens: tokenConfigs.length,
        deployerWallets: farcasterPlan.deployerWallets,
        tokensPerWallet,
        addressDistribution: farcasterPlan.addressDistribution,
        estimatedCost,
        estimatedTime,
      };
    } catch (error) {
      errorLogger.log(wrapError(error as Error, 'Failed to create deployment plan'));
      throw error;
    }
  }

  /**
   * Setup and prepare wallet deployer for batch operations
   */
  async setupBatchDeployer(config: MultiWalletBatchConfig): Promise<{
    plan: BatchDeploymentPlan;
    isReady: boolean;
    walletStats: {
      totalWallets: number;
      activeWallets: number;
    };
  }> {
    try {
      console.log('🔧 Setting up multi-wallet batch deployer...\n');

      // Phase 1: Validation
      await this.validateSetupConfiguration(config);

      // Phase 2: Configuration
      const plan = await this.configureDeploymentPlan(config);

      // Phase 3: Execution Setup
      const walletStats = await this.executeWalletInitialization(config, plan);

      const isReady = walletStats.activeWallets > 0;
      this.displaySetupResult(isReady);

      return { plan, isReady, walletStats };
    } catch (error) {
      errorLogger.log(wrapError(error as Error, 'Failed to setup batch deployer'));
      throw error;
    }
  }

  /**
   * Phase 1: Validate configuration for batch deployer setup
   */
  private async validateSetupConfiguration(config: MultiWalletBatchConfig): Promise<void> {
    await this.validateBatchConfig(config);
    console.log('✅ Configuration validated');
  }

  /**
   * Phase 2: Configure deployment plan and display distribution
   */
  private async configureDeploymentPlan(config: MultiWalletBatchConfig): Promise<BatchDeploymentPlan> {
    const maxAddressesPerDeployer = config.maxAddressesPerDeployer || 3;
    const plan = await this.createDeploymentPlan(
      config.farcasterInput,
      config.tokenConfigs,
      config.deployerPrivateKeys || [],
      maxAddressesPerDeployer
    );
    
    console.log('✅ Deployment plan created');
    this.displayDistributionPlan(plan);
    
    return plan;
  }

  /**
   * Phase 3: Execute wallet initialization and balance validation
   */
  private async executeWalletInitialization(
    config: MultiWalletBatchConfig, 
    plan: BatchDeploymentPlan
  ): Promise<{ totalWallets: number; activeWallets: number }> {
    // Initialize deployer wallets
    await this.initializeDeployerWallets(config);
    
    // Gather wallet statistics
    const walletStats = this.gatherWalletStatistics();
    
    // Validate wallet balances for deployment readiness
    await this.validateWalletBalances(plan.deployerWallets);
    
    return walletStats;
  }

  /**
   * Gather wallet statistics and display them
   */
  private gatherWalletStatistics(): { totalWallets: number; activeWallets: number } {
    const walletStats = this.deployer.getStats();
    this.displayWalletStatistics(walletStats);
    return walletStats;
  }

  /**
   * Display wallet statistics in a formatted way
   */
  private displayWalletStatistics(walletStats: { totalWallets: number; activeWallets: number }): void {
    console.log('\n📊 Wallet Statistics:');
    console.log(`  Total Wallets: ${walletStats.totalWallets}`);
    console.log(`  Active Wallets: ${walletStats.activeWallets}`);
    console.log(`  Inactive Wallets: ${walletStats.totalWallets - walletStats.activeWallets}`);
  }

  /**
   * Validate wallet balances for deployment readiness
   */
  private async validateWalletBalances(walletAddresses: string[]): Promise<void> {
    await this.checkWalletBalances(walletAddresses);
  }

  /**
   * Display final setup result
   */
  private displaySetupResult(isReady: boolean): void {
    if (isReady) {
      console.log('\n🚀 Batch deployer is ready for deployment!');
    } else {
      console.log('\n❌ Batch deployer setup failed - no active wallets');
    }
  }

  /**
   * Check wallet balances for all deployer wallets
   */
  private async checkWalletBalances(walletAddresses: string[]): Promise<void> {
    console.log('\n💰 Checking wallet balances...');

    for (const address of walletAddresses) {
      try {
        const balance = await this.publicClient.getBalance({
          address: address as `0x${string}`,
        });
        const ethBalance = Number(balance) / 1e18;

        if (ethBalance < 0.01) {
          console.warn(
            `⚠️  Warning: Wallet ${address} has low balance: ${ethBalance.toFixed(4)} ETH`
          );
        } else {
          console.log(`  ${address}: ${ethBalance.toFixed(4)} ETH`);
        }
      } catch (_error) {
        console.warn(`  ${address}: Unable to fetch balance`);
      }
    }
  }

  /**
   * Execute batch deployment with pre-setup
   */
  async executeBatchDeploymentWithSetup(
    config: MultiWalletBatchConfig,
    onProgress?: (progress: {
      completed: number;
      total: number;
      currentWallet: string;
      currentToken: string;
    }) => void
  ): Promise<BatchDeploymentResult> {
    // Setup first
    const { isReady } = await this.setupBatchDeployer(config);

    if (!isReady) {
      const context: ErrorContext = {
        operation: 'deploy',
        component: 'MultiWalletBatchManager'
      };
      throw createValidationError('INVALID_CONFIG', 'Batch deployer is not ready for deployment', context);
    }

    // Execute deployment
    return this.executeBatchDeployment(config, onProgress);
  }
  async executeBatchDeployment(
    config: MultiWalletBatchConfig,
    onProgress?: (progress: {
      completed: number;
      total: number;
      currentWallet: string;
      currentToken: string;
    }) => void
  ): Promise<BatchDeploymentResult> {
    const startTime = Date.now();

    try {
      // Create deployment plan with max addresses per deployer
      const maxAddressesPerDeployer = config.maxAddressesPerDeployer || 3;
      const plan = await this.createDeploymentPlan(
        config.farcasterInput,
        config.tokenConfigs,
        config.deployerPrivateKeys || [],
        maxAddressesPerDeployer
      );

      errorLogger.log(
        wrapError(
          new Error(
            `Starting batch deployment: ${plan.totalTokens} tokens across ${plan.deployerWallets.length} wallets`
          ),
          'Batch deployment started'
        )
      );

      // Initialize deployer wallets
      await this.initializeDeployerWallets(config);

      // Execute deployment
      const results = await this.deployer.executeBatchDeploy(
        config.tokenConfigs,
        (completed, total, job) => {
          onProgress?.({
            completed,
            total,
            currentWallet: job.deployerAddress,
            currentToken: (job.config.name as string) || (job.config.symbol as string) || 'Unknown',
          });
        }
      );

      // Calculate wallet stats
      const walletStats = this.calculateWalletStats(results.results, plan.deployerWallets);

      const successRate = (results.successful / results.total) * 100;
      const duration = Date.now() - startTime;

      errorLogger.log(
        wrapError(
          new Error(
            `Batch deployment completed: ${results.successful}/${results.total} successful in ${duration}ms`
          ),
          'Batch deployment completed'
        )
      );

      return {
        plan,
        results,
        successRate,
        walletStats,
      };
    } catch (error) {
      errorLogger.log(wrapError(error as Error, 'Batch deployment failed'));
      throw error;
    }
  }

  /**
   * Display wallet distribution plan
   */
  displayDistributionPlan(plan: BatchDeploymentPlan): void {
    console.log('\n=== Wallet Distribution Plan ===');
    console.log(`Total Tokens: ${plan.totalTokens}`);
    console.log(`Active Deployers: ${plan.deployerWallets.length}`);
    console.log(`Tokens per Deployer: ${plan.tokensPerWallet}`);
    console.log('\nAddress Distribution:');

    plan.addressDistribution.forEach((addresses, deployer) => {
      console.log(`\nDeployer: ${deployer}`);
      console.log(`  Assigned Addresses (${addresses.length}):`);
      addresses.forEach((addr) => console.log(`    - ${addr}`));
    });

    console.log(`\nEstimated Cost: ${plan.estimatedCost.toFixed(4)} ETH`);
    console.log(`Estimated Time: ${plan.estimatedTime}s`);
    console.log('================================\n');
  }

  /**
   * Create token configurations based on address distribution
   */
  createTokenConfigsForDistribution(
    baseConfig: TokenConfiguration,
    plan: BatchDeploymentPlan
  ): TokenConfiguration[] {
    return this.farcasterService.createTokenConfigsForDistribution(baseConfig, plan.addressDistribution);
  }

  /**
   * Create optimized token configurations for multi-wallet deployment
   */
  createOptimizedConfigs(
    baseConfig: TokenConfiguration,
    count: number,
    walletAddresses: string[]
  ): TokenConfiguration[] {
    return this.farcasterService.createOptimizedConfigs(baseConfig, count, walletAddresses);
  }

  /**
   * Validate batch configuration
   */
  async validateBatchConfig(config: MultiWalletBatchConfig): Promise<void> {
    const errors: string[] = [];

    // Validate farcaster input using FarcasterService
    const isValidFarcaster = await this.farcasterService.validateFarcasterInput(config.farcasterInput);
    if (!isValidFarcaster) {
      errors.push('Invalid Farcaster username or FID');
    }

    // Validate token configs
    if (!config.tokenConfigs.length) {
      errors.push('No token configurations provided');
    }

    // Validate private keys using ValidationService
    if (!config.deployerPrivateKeys || !config.deployerPrivateKeys.length) {
      errors.push('No deployer private keys provided');
    } else {
      const { ValidationService } = await import('../services/validation-service.js');
      const validationService = new ValidationService();
      
      config.deployerPrivateKeys.forEach((privateKey, index) => {
        const result = validationService.validatePrivateKey(privateKey);
        if (!result.success) {
          errors.push(`Invalid private key at index ${index}: ${result.error}`);
        }
      });
    }

    if (errors.length) {
      throw new BatchValidationError(errors.join(', '));
    }
  }

  /**
   * Get deployment statistics
   */
  getStats() {
    return this.deployer.getStats();
  }

  /**
   * Reset all deployment state
   */
  reset(): void {
    this.deployer.reset();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load deployer wallets from wallet store
   */
  async loadWalletsFromStore(password?: string, count?: number): Promise<`0x${string}`[]> {
    try {
      const wallets = getAllWallets();
      const privateKeys: `0x${string}`[] = [];

      // Get wallets to use
      const walletsToUse = count ? wallets.slice(0, count) : wallets;

      for (const wallet of walletsToUse) {
        try {
          // For now, use the existing wallet decryption
          // This is a simplified approach - in production, use proper wallet module integration
          const decrypted = decryptWallet(JSON.stringify(wallet), password || '');
          if (decrypted && typeof decrypted === 'string' && decrypted.startsWith('0x')) {
            privateKeys.push(decrypted as `0x${string}`);
          }
        } catch (error) {
          console.warn(`Failed to load wallet ${wallet.name}: ${error}`);
        }
      }

      if (!privateKeys.length) {
        const context: ErrorContext = {
          operation: 'loadWalletsFromStore',
          component: 'MultiWalletBatchManager'
        };
        throw createValidationError('INVALID_CONFIG', 'No wallets could be loaded', context);
      }

      return privateKeys;
    } catch (error) {
      errorLogger.log(wrapError(error as Error, 'Failed to load wallets from store'));
      throw error;
    }
  }

  /**
   * Create batch configuration from wallet store
   */
  static async createFromWalletStore(
    tokenConfigs: TokenConfiguration[],
    walletPassword?: string,
    walletCount?: number
  ): Promise<MultiWalletBatchConfig> {
    // Load wallets from store
    const batchManager = new MultiWalletBatchManager(
      createPublicClient({ transport: http() }),
      base // Default to base chain
    );

    const deployerPrivateKeys = await batchManager.loadWalletsFromStore(
      walletPassword,
      walletCount
    );

    return {
      farcasterInput: process.env.FARCASTER_INPUT || '',
      tokenConfigs,
      deployerPrivateKeys,
      walletPassword,
      maxAddressesPerDeployer: process.env.MAX_ADDRESSES_PER_DEPLOYER
        ? parseInt(process.env.MAX_ADDRESSES_PER_DEPLOYER)
        : 3,
      deployOptions: {
        maxConcurrentPerWallet: process.env.MAX_CONCURRENT_PER_WALLET
          ? parseInt(process.env.MAX_CONCURRENT_PER_WALLET)
          : 1,
        deployDelay: process.env.DEPLOY_DELAY ? parseInt(process.env.DEPLOY_DELAY) : 1000,
        maxRetries: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : 3,
        gasMultiplier: process.env.GAS_MULTIPLIER ? parseFloat(process.env.GAS_MULTIPLIER) : 1.1,
      },
    };
  }

  /**
   * Initialize deployer wallets with proper validation
   */
  private async initializeDeployerWallets(config: MultiWalletBatchConfig): Promise<void> {
    if (!config.deployerPrivateKeys || !config.deployerPrivateKeys.length) {
      const context: ErrorContext = {
        operation: 'initializeDeployerWallets',
        component: 'MultiWalletBatchManager'
      };
      throw createValidationError('MISSING_REQUIRED_FIELD', 'No deployer private keys provided', context);
    }

    // Initialize each deployer wallet
    for (let i = 0; i < config.deployerPrivateKeys.length; i++) {
      const privateKey = config.deployerPrivateKeys[i];

      try {
        // Use ValidationService to validate private key format
        const { validatePrivateKeyOrThrow } = await import('../services/validation-service.js');
        validatePrivateKeyOrThrow(privateKey, `deployer wallet ${i + 1}`);

        // Create wallet client from private key
        const walletClient =
          config.walletClients?.get(privateKey) || (await this.createWalletClient(privateKey));

        // Add to deployer
        await this.deployer.addDeployerWallet(privateKey, walletClient);

        errorLogger.log(
          wrapError(
            new Error(
              `Successfully initialized deployer wallet ${i + 1}/${config.deployerPrivateKeys?.length || 0}`
            ),
            'Wallet initialization'
          )
        );
      } catch (error) {
        errorLogger.log(
          wrapError(
            error as Error,
            `Failed to initialize wallet ${i + 1}: ${privateKey.slice(0, 10)}...`
          )
        );

        // Continue with other wallets but warn
        console.warn(`Warning: Skipping wallet ${i + 1} due to initialization error`);
      }
    }

    // Verify at least one wallet is active
    const stats = this.deployer.getStats();
    if (stats.totalWallets === 0) {
      const context: ErrorContext = {
        operation: 'initializeDeployerWallets',
        component: 'MultiWalletBatchManager'
      };
      throw createValidationError(
        'INVALID_CONFIG',
        'No deployer wallets were successfully initialized',
        context
      );
    }

    console.log(`✅ Initialized ${stats.activeWallets}/${stats.totalWallets} deployer wallets`);
  }

  /**
   * Create wallet client from private key
   */
  private async createWalletClient(privateKey: `0x${string}`): Promise<WalletClient> {
    // In production, you would create actual wallet client
    // This is a placeholder implementation
    const account = privateKeyToAccount(privateKey);

    const walletClient = createWalletClient({
      account,
      chain: this.chain,
      transport: http(),
    });

    return walletClient;
  }

  /**
   * Estimate total deployment cost
   */
  private estimateTotalCost(tokenConfigs: TokenConfiguration[], _walletCount: number): number {
    // Rough estimation: 0.01 ETH per deployment + gas
    const gasPrice = 20e9; // 20 gwei
    const gasPerDeployment = 210000;
    const deploymentCost = (gasPrice * gasPerDeployment) / 1e18;

    return tokenConfigs.length * (0.01 + deploymentCost);
  }

  /**
   * Estimate deployment time
   */
  private estimateDeploymentTime(tokenCount: number, walletCount: number): number {
    // Rough estimation: 2 seconds per deployment per wallet
    const deploymentsPerWallet = Math.ceil(tokenCount / walletCount);
    return deploymentsPerWallet * 2;
  }

  /**
   * Calculate wallet performance statistics
   */
  private calculateWalletStats(
    results: Array<{
      jobId: string;
      success: boolean;
      deployerAddress: string;
      txHash?: string;
      error?: string;
    }>,
    walletAddresses: string[]
  ): BatchDeploymentResult['walletStats'] {
    const stats = new Map<
      string,
      {
        deployed: number;
        successful: number;
        failed: number;
        totalGasUsed: bigint;
      }
    >();

    // Initialize stats
    walletAddresses.forEach((address) => {
      stats.set(address, {
        deployed: 0,
        successful: 0,
        failed: 0,
        totalGasUsed: 0n,
      });
    });

    // Calculate stats from results
    results.forEach((result) => {
      const walletStats = stats.get(result.deployerAddress as string);
      if (walletStats) {
        walletStats.deployed++;
        if (result.success) {
          walletStats.successful++;
        } else {
          walletStats.failed++;
        }
      }
    });

    return Array.from(stats.entries()).map(([address, stat]) => ({
      address,
      ...stat,
    }));
  }
}

// Export types for external use
export type { BatchDeployConfig } from '../config/batch.js';
export { BatchDeployConfigBuilder, createBatchDeployConfig } from '../config/batch.js';
