/**
 * Environment Configuration Validator
 * Validates and loads environment variables for all deployment modes
 */

import dotenv from 'dotenv';
import { ValidationError } from '../errors/index.js';

// Load environment variables
dotenv.config();

export interface EnvConfig {
  // Deployment mode
  deployMode: 'single' | 'multi-chain' | 'batch' | 'multi-wallet-batch';

  // Wallet configuration
  privateKey?: string;
  deployerPrivateKeys?: string[];
  walletPassword?: string;

  // Chain configuration
  chainId?: number;
  chains?: number[];

  // Token defaults
  tokenName?: string;
  tokenSymbol?: string;
  tokenImage?: string;
  tokenDescription?: string;
  tokenAdmin?: string;
  rewardRecipient?: string;
  rewardToken?: 'Both' | 'Paired' | 'Clanker';

  // Fee configuration
  feeType?: 'static' | 'dynamic';
  clankerFee?: number;
  pairedFee?: number;

  // MEV protection
  mevBlockDelay?: number;

  // Social links
  tokenWebsite?: string;
  tokenTwitter?: string;
  tokenTelegram?: string;
  tokenDiscord?: string;
  tokenFarcaster?: string;

  // Vanity address
  vanitySuffix?: string;

  // Batch settings
  batchCount?: number;
  batchDelay?: number;
  batchRetries?: number;

  // Multi-wallet batch settings
  farcasterInput?: string | number;
  strategy?: 'conservative' | 'balanced' | 'aggressive';
  maxAddressesPerDeployer?: number;
  maxConcurrentPerWallet?: number;
  deployDelay?: number;
  rateLimitPerWallet?: number;
  maxRetries?: number;
  retryDelay?: number;
  gasMultiplier?: number;
  maxGasPrice?: number;
  dryRun?: boolean;

  // Vault settings
  vaultEnabled?: boolean;
  vaultPercentage?: number;
  vaultLockupDays?: number;
  vaultVestingDays?: number;

  // Verification settings
  interfaceName?: string;
  platformName?: string;
}

/**
 * Load and validate environment configuration
 */
export function loadEnvConfig(): EnvConfig {
  const errors: string[] = [];

  // Get deployment mode
  const deployMode = (process.env.DEPLOY_MODE as EnvConfig['deployMode']) || 'single';

  if (!['single', 'multi-chain', 'batch', 'multi-wallet-batch'].includes(deployMode)) {
    errors.push(
      `Invalid DEPLOY_MODE: ${deployMode}. Must be one of: single, multi-chain, batch, multi-wallet-batch`
    );
  }

  // Validate wallet configuration based on mode
  const privateKey = process.env.PRIVATE_KEY;
  const deployerPrivateKeysStr = process.env.DEPLOYER_PRIVATE_KEYS;
  let deployerPrivateKeys: string[] | undefined;

  if (deployMode === 'multi-wallet-batch') {
    if (!deployerPrivateKeysStr) {
      errors.push('DEPLOYER_PRIVATE_KEYS is required for multi-wallet-batch mode');
    } else {
      deployerPrivateKeys = deployerPrivateKeysStr.split(',').map((k) => k.trim());
      // Validate each private key
      deployerPrivateKeys.forEach((key, index) => {
        if (!key.startsWith('0x') || key.length !== 66) {
          errors.push(`Invalid private key at index ${index}: must be 32 bytes with 0x prefix`);
        }
      });
    }
  } else {
    if (!privateKey) {
      errors.push('PRIVATE_KEY is required for this deployment mode');
    } else if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      errors.push('Invalid PRIVATE_KEY: must be 32 bytes with 0x prefix');
    }
  }

  // Validate chain configuration
  const chainIdStr = process.env.CHAIN_ID;
  const chainsStr = process.env.CHAINS;
  let chainId: number | undefined;
  let chains: number[] | undefined;

  if (deployMode === 'multi-chain') {
    if (!chainsStr) {
      errors.push('CHAINS is required for multi-chain mode');
    } else {
      chains = chainsStr.split(',').map((c) => {
        const id = parseInt(c.trim());
        if (Number.isNaN(id)) {
          errors.push(`Invalid chain ID: ${c}`);
        }
        return id;
      });
    }
  } else {
    if (chainIdStr) {
      chainId = parseInt(chainIdStr);
      if (Number.isNaN(chainId)) {
        errors.push(`Invalid CHAIN_ID: ${chainIdStr}`);
      }
    }
  }

  // Parse numeric values with validation
  const parseNumber = (key: string, min?: number, max?: number): number | undefined => {
    const value = process.env[key];
    if (!value) return undefined;

    const num = parseFloat(value);
    if (Number.isNaN(num)) {
      errors.push(`Invalid ${key}: must be a number`);
      return undefined;
    }

    if (min !== undefined && num < min) {
      errors.push(`${key} must be at least ${min}`);
    }
    if (max !== undefined && num > max) {
      errors.push(`${key} must be at most ${max}`);
    }

    return num;
  };

  const parseBoolean = (key: string): boolean | undefined => {
    const value = process.env[key];
    if (!value) return undefined;

    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    errors.push(`Invalid ${key}: must be true or false`);
    return undefined;
  };

  // Parse all configuration
  const config: EnvConfig = {
    deployMode,
    privateKey,
    deployerPrivateKeys,
    walletPassword: process.env.WALLET_PASSWORD,
    chainId,
    chains,
    tokenName: process.env.TOKEN_NAME,
    tokenSymbol: process.env.TOKEN_SYMBOL,
    tokenImage: process.env.TOKEN_IMAGE,
    tokenDescription: process.env.TOKEN_DESCRIPTION,
    tokenAdmin: process.env.TOKEN_ADMIN,
    rewardRecipient: process.env.REWARD_RECIPIENT,
    rewardToken: process.env.REWARD_TOKEN as EnvConfig['rewardToken'],
    feeType: process.env.FEE_TYPE as EnvConfig['feeType'],
    clankerFee: parseNumber('CLANKER_FEE', 1, 80),
    pairedFee: parseNumber('PAIRED_FEE', 1, 80),
    mevBlockDelay: parseNumber('MEV_BLOCK_DELAY', 0, 50),
    tokenWebsite: process.env.TOKEN_WEBSITE,
    tokenTwitter: process.env.TOKEN_TWITTER,
    tokenTelegram: process.env.TOKEN_TELEGRAM,
    tokenDiscord: process.env.TOKEN_DISCORD,
    tokenFarcaster: process.env.TOKEN_FARCASTER,
    vanitySuffix: process.env.VANITY_SUFFIX,
    batchCount: parseNumber('BATCH_COUNT', 1),
    batchDelay: parseNumber('BATCH_DELAY', 0),
    batchRetries: parseNumber('BATCH_RETRIES', 0),
    retryDelay: parseNumber('RETRY_DELAY', 0),
    gasMultiplier: parseNumber('GAS_MULTIPLIER', 1.0, 2.0),
    maxGasPrice: parseNumber('MAX_GAS_PRICE', 0),
    dryRun: parseBoolean('DRY_RUN'),
    vaultEnabled: parseBoolean('VAULT_ENABLED'),
    vaultPercentage: parseNumber('VAULT_PERCENTAGE', 0, 100),
    vaultLockupDays: parseNumber('VAULT_LOCKUP_DAYS', 0),
    vaultVestingDays: parseNumber('VAULT_VESTING_DAYS', 0),
    interfaceName: process.env.INTERFACE_NAME,
    platformName: process.env.PLATFORM_NAME,
  };

  // Throw error if validation failed
  if (errors.length) {
    throw new ValidationError(
      'ENV_VALIDATION_FAILED',
      `Environment validation failed:\n${errors.map((e) => `- ${e}`).join('\n')}`
    );
  }

  return config;
}

/**
 * Get a summary of the current configuration
 */
export function getConfigSummary(config: EnvConfig): string {
  const lines = [
    `Deployment Mode: ${config.deployMode}`,
    '',
    'Wallet Configuration:',
    config.deployerPrivateKeys
      ? `  Deployer Wallets: ${config.deployerPrivateKeys.length}`
      : config.privateKey
        ? '  Single Wallet: ✓'
        : '  No wallet configured',
    config.walletPassword ? '  Wallet Password: ✓' : '  Wallet Password: -',
    '',
    'Chain Configuration:',
    config.chains
      ? `  Chains: ${config.chains.join(', ')}`
      : config.chainId
        ? `  Chain: ${config.chainId}`
        : '  No chain configured',
    '',
    'Token Settings:',
    config.tokenName ? `  Name: ${config.tokenName}` : '  Name: -',
    config.tokenSymbol ? `  Symbol: ${config.tokenSymbol}` : '  Symbol: -',
    config.rewardToken ? `  Reward Token: ${config.rewardToken}` : '  Reward Token: -',
  ];

  if (config.deployMode === 'multi-wallet-batch') {
    lines.push(
      '',
      'Multi-Wallet Batch Settings:',
      `  Strategy: ${config.strategy || 'balanced'}`,
      `  Max Addresses per Wallet: ${config.maxAddressesPerDeployer || 3}`,
      `  Deploy Delay: ${config.deployDelay || 1000}ms`,
      `  Rate Limit: ${config.rateLimitPerWallet || 2} req/s`,
      `  Dry Run: ${config.dryRun ? 'Yes' : 'No'}`
    );
  }

  if (config.deployMode === 'batch') {
    lines.push(
      '',
      'Batch Settings:',
      `  Batch Count: ${config.batchCount || 5}`,
      `  Batch Delay: ${config.batchDelay || 3}s`,
      `  Batch Retries: ${config.batchRetries || 2}`
    );
  }

  return lines.join('\n');
}

/**
 * Check if all required variables are set for the current mode
 */
export function checkRequiredVariables(config: EnvConfig): string[] {
  const missing: string[] = [];

  switch (config.deployMode) {
    case 'single':
    case 'multi-chain':
      if (!config.privateKey) missing.push('PRIVATE_KEY');
      if (config.deployMode === 'multi-chain' && !config.chains?.length) {
        missing.push('CHAINS');
      }
      break;

    case 'batch':
      if (!config.privateKey) missing.push('PRIVATE_KEY');
      if (!config.batchCount) missing.push('BATCH_COUNT');
      break;

    case 'multi-wallet-batch':
      if (!config.deployerPrivateKeys?.length) missing.push('DEPLOYER_PRIVATE_KEYS');
      if (!config.farcasterInput) missing.push('FARCASTER_INPUT');
      break;
  }

  return missing;
}
