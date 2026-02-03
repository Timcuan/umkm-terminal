/**
 * Batch Deployment Configuration
 * Environment-based configuration for multi-wallet batch deployments
 */

import { ValidationError } from '../errors/index.js';
import { validatePrivateKey } from '../validation/index.js';

// ============================================================================
// Types
// ============================================================================

export interface BatchDeployEnvConfig {
  // Farcaster integration
  farcasterInput?: string; // username or FID

  // Deployer wallets (comma-separated)
  deployerPrivateKeys?: string; // "0x...,0x...,0x..."

  // Deployment limits
  maxAddressesPerDeployer?: number; // default: 3
  maxConcurrentPerWallet?: number; // default: 1
  deployDelay?: number; // ms between deploys, default: 1000

  // Rate limiting
  rateLimitPerWallet?: number; // requests per second, default: 2

  // Retry settings
  maxRetries?: number; // default: 3
  retryDelay?: number; // ms, default: 1000

  // Gas settings
  gasMultiplier?: number; // default: 1.1
  maxGasPrice?: string; // gwei, e.g., "20"

  // Strategy preset
  strategy?: 'conservative' | 'balanced' | 'aggressive';

  // Dry run mode
  dryRun?: boolean; // default: false
}

export interface BatchDeployConfig {
  // Required
  farcasterInput: string;
  deployerPrivateKeys: `0x${string}`[];

  // Optional with defaults
  maxAddressesPerDeployer: number;
  maxConcurrentPerWallet: number;
  deployDelay: number;
  rateLimitPerWallet: number;
  maxRetries: number;
  retryDelay: number;
  gasMultiplier: number;
  maxGasPrice?: bigint;
  dryRun: boolean;
}

// ============================================================================
// Strategy Presets
// ============================================================================

export const BATCH_STRATEGIES = {
  conservative: {
    maxAddressesPerDeployer: 2,
    maxConcurrentPerWallet: 1,
    deployDelay: 2000,
    rateLimitPerWallet: 1,
    maxRetries: 5,
    retryDelay: 2000,
    gasMultiplier: 1.2,
  },
  balanced: {
    maxAddressesPerDeployer: 3,
    maxConcurrentPerWallet: 1,
    deployDelay: 1000,
    rateLimitPerWallet: 2,
    maxRetries: 3,
    retryDelay: 1000,
    gasMultiplier: 1.1,
  },
  aggressive: {
    maxAddressesPerDeployer: 5,
    maxConcurrentPerWallet: 2,
    deployDelay: 500,
    rateLimitPerWallet: 3,
    maxRetries: 2,
    retryDelay: 500,
    gasMultiplier: 1.05,
  },
} as const;

// ============================================================================
// Configuration Builder
// ============================================================================

export class BatchDeployConfigBuilder {
  private config: Partial<BatchDeployConfig> = {};

  static fromEnv(): BatchDeployConfigBuilder {
    const builder = new BatchDeployConfigBuilder();

    // Load from environment
    builder.farcasterInput(process.env.FARCASTER_INPUT);
    builder.deployerPrivateKeys(process.env.DEPLOYER_PRIVATE_KEYS);
    builder.maxAddressesPerDeployer(
      process.env.MAX_ADDRESSES_PER_DEPLOYER
        ? parseInt(process.env.MAX_ADDRESSES_PER_DEPLOYER)
        : undefined
    );
    builder.maxConcurrentPerWallet(
      process.env.MAX_CONCURRENT_PER_WALLET
        ? parseInt(process.env.MAX_CONCURRENT_PER_WALLET)
        : undefined
    );
    builder.deployDelay(process.env.DEPLOY_DELAY ? parseInt(process.env.DEPLOY_DELAY) : undefined);
    builder.rateLimitPerWallet(
      process.env.RATE_LIMIT_PER_WALLET ? parseInt(process.env.RATE_LIMIT_PER_WALLET) : undefined
    );
    builder.maxRetries(process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : undefined);
    builder.retryDelay(process.env.RETRY_DELAY ? parseInt(process.env.RETRY_DELAY) : undefined);
    builder.gasMultiplier(
      process.env.GAS_MULTIPLIER ? parseFloat(process.env.GAS_MULTIPLIER) : undefined
    );
    builder.maxGasPrice(process.env.MAX_GAS_PRICE);

    const strategy = process.env.STRATEGY;
    if (strategy === 'conservative' || strategy === 'balanced' || strategy === 'aggressive') {
      builder.strategy(strategy);
    }

    builder.dryRun(process.env.DRY_RUN === 'true');

    return builder;
  }

  farcasterInput(value?: string): this {
    if (value) this.config.farcasterInput = value;
    return this;
  }

  deployerPrivateKeys(value?: string): this {
    if (value) {
      const keys = value.split(',').map((k) => k.trim());
      // Validate each key
      keys.forEach((key) => {
        try {
          validatePrivateKey(key as `0x${string}`);
        } catch (_error) {
          throw new ValidationError(
            'INVALID_PRIVATE_KEY',
            `Invalid private key format: ${key.slice(0, 10)}...`
          );
        }
      });
      this.config.deployerPrivateKeys = keys as `0x${string}`[];
    }
    return this;
  }

  maxAddressesPerDeployer(value?: number): this {
    if (value !== undefined) this.config.maxAddressesPerDeployer = value;
    return this;
  }

  maxConcurrentPerWallet(value?: number): this {
    if (value !== undefined) this.config.maxConcurrentPerWallet = value;
    return this;
  }

  deployDelay(value?: number): this {
    if (value !== undefined) this.config.deployDelay = value;
    return this;
  }

  rateLimitPerWallet(value?: number): this {
    if (value !== undefined) this.config.rateLimitPerWallet = value;
    return this;
  }

  maxRetries(value?: number): this {
    if (value !== undefined) this.config.maxRetries = value;
    return this;
  }

  retryDelay(value?: number): this {
    if (value !== undefined) this.config.retryDelay = value;
    return this;
  }

  gasMultiplier(value?: number): this {
    if (value !== undefined) this.config.gasMultiplier = value;
    return this;
  }

  maxGasPrice(value?: string): this {
    if (value) {
      const gwei = parseFloat(value);
      if (!Number.isNaN(gwei)) {
        this.config.maxGasPrice = BigInt(Math.floor(gwei * 1e9));
      }
    }
    return this;
  }

  strategy(strategy?: 'conservative' | 'balanced' | 'aggressive'): this {
    if (strategy && BATCH_STRATEGIES[strategy]) {
      Object.assign(this.config, BATCH_STRATEGIES[strategy]);
    }
    return this;
  }

  dryRun(value?: boolean): this {
    if (value !== undefined) this.config.dryRun = value;
    return this;
  }

  build(): BatchDeployConfig {
    // Apply defaults
    const defaults = BATCH_STRATEGIES.balanced;

    const finalConfig: BatchDeployConfig = {
      farcasterInput: this.config.farcasterInput || '',
      deployerPrivateKeys: this.config.deployerPrivateKeys || [],
      maxAddressesPerDeployer:
        this.config.maxAddressesPerDeployer ?? defaults.maxAddressesPerDeployer,
      maxConcurrentPerWallet: this.config.maxConcurrentPerWallet ?? defaults.maxConcurrentPerWallet,
      deployDelay: this.config.deployDelay ?? defaults.deployDelay,
      rateLimitPerWallet: this.config.rateLimitPerWallet ?? defaults.rateLimitPerWallet,
      maxRetries: this.config.maxRetries ?? defaults.maxRetries,
      retryDelay: this.config.retryDelay ?? defaults.retryDelay,
      gasMultiplier: this.config.gasMultiplier ?? defaults.gasMultiplier,
      maxGasPrice: this.config.maxGasPrice,
      dryRun: this.config.dryRun ?? false,
    };

    // Validate required fields
    if (!finalConfig.farcasterInput) {
      throw new ValidationError(
        'MISSING_FARCASTER_INPUT',
        'Farcaster input (username or FID) is required'
      );
    }

    if (!finalConfig.deployerPrivateKeys.length) {
      throw new ValidationError(
        'MISSING_PRIVATE_KEYS',
        'At least one deployer private key is required'
      );
    }

    return finalConfig;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load batch deploy configuration from environment
 */
export function loadBatchDeployConfig(): BatchDeployConfig {
  return BatchDeployConfigBuilder.fromEnv().build();
}

/**
 * Create configuration from object
 */
export function createBatchDeployConfig(config: BatchDeployEnvConfig): BatchDeployConfig {
  const builder = new BatchDeployConfigBuilder();

  // Explicitly handle each configuration property
  if (config.farcasterInput) builder.farcasterInput(config.farcasterInput);
  if (config.deployerPrivateKeys) builder.deployerPrivateKeys(config.deployerPrivateKeys);
  if (config.maxAddressesPerDeployer)
    builder.maxAddressesPerDeployer(config.maxAddressesPerDeployer);
  if (config.maxConcurrentPerWallet) builder.maxConcurrentPerWallet(config.maxConcurrentPerWallet);
  if (config.deployDelay) builder.deployDelay(config.deployDelay);
  if (config.rateLimitPerWallet) builder.rateLimitPerWallet(config.rateLimitPerWallet);
  if (config.maxRetries) builder.maxRetries(config.maxRetries);
  if (config.retryDelay) builder.retryDelay(config.retryDelay);
  if (config.gasMultiplier) builder.gasMultiplier(config.gasMultiplier);
  if (config.maxGasPrice) builder.maxGasPrice(config.maxGasPrice);
  if (config.strategy) builder.strategy(config.strategy);
  if (config.dryRun !== undefined) builder.dryRun(config.dryRun);

  return builder.build();
}

/**
 * Validate configuration
 */
export function validateBatchDeployConfig(config: BatchDeployConfig): void {
  // Validate addresses per deployer
  if (config.maxAddressesPerDeployer < 1 || config.maxAddressesPerDeployer > 10) {
    throw new ValidationError(
      'INVALID_ADDRESSES_PER_DEPLOYER',
      'maxAddressesPerDeployer must be between 1 and 10'
    );
  }

  // Validate concurrency
  if (config.maxConcurrentPerWallet < 1 || config.maxConcurrentPerWallet > 5) {
    throw new ValidationError(
      'INVALID_CONCURRENCY',
      'maxConcurrentPerWallet must be between 1 and 5'
    );
  }

  // Validate rate limit
  if (config.rateLimitPerWallet < 0.5 || config.rateLimitPerWallet > 10) {
    throw new ValidationError(
      'INVALID_RATE_LIMIT',
      'rateLimitPerWallet must be between 0.5 and 10 requests per second'
    );
  }

  // Validate gas multiplier
  if (config.gasMultiplier < 1 || config.gasMultiplier > 2) {
    throw new ValidationError('INVALID_GAS_MULTIPLIER', 'gasMultiplier must be between 1 and 2');
  }
}
