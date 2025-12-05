/**
 * Easy Deployer Module
 * Simple interface for deploying tokens from any platform
 */

import { createPublicClient, createWalletClient, http, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChain } from '../chains/index.js';
import {
  type ClankerEnvConfig,
  getChainName,
  getExplorerUrl,
  getRpcUrl,
  loadEnvConfig,
  validateConfig,
} from '../config/index.js';
import { getDeployment } from '../contracts/addresses.js';
import type { ClankerTokenV4 } from '../types/index.js';
import { Clanker } from '../v4/index.js';

// ============================================================================
// Types
// ============================================================================

/** Reward token type */
export type RewardTokenType = 'Both' | 'Paired' | 'Clanker';

/** Fee type */
export type FeeType = 'static' | 'dynamic';

/** Pool type */
export type PoolType = 'standard' | 'project';

export interface SimpleDeployConfig {
  // ─────────────────────────────────────────────────────────────────────────
  // Basic Token Info (Required)
  // ─────────────────────────────────────────────────────────────────────────
  name: string;
  symbol: string;
  image?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Token Metadata (Optional)
  // ─────────────────────────────────────────────────────────────────────────
  description?: string;
  /** Social media URLs */
  socials?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Chain & Admin
  // ─────────────────────────────────────────────────────────────────────────
  chainId?: number;
  /** Token admin address (defaults to deployer) */
  tokenAdmin?: `0x${string}`;

  // ─────────────────────────────────────────────────────────────────────────
  // Rewards Configuration
  // ─────────────────────────────────────────────────────────────────────────
  /** Reward recipients (max 7, allocation must sum to 100) */
  rewardRecipients?: Array<{
    address: `0x${string}`;
    /** Allocation percentage (1-100, must sum to 100) */
    allocation: number;
    /** Reward token type: Both, Paired, or Clanker (default: Paired) */
    rewardToken?: RewardTokenType;
  }>;

  // ─────────────────────────────────────────────────────────────────────────
  // Pool Configuration (Optional)
  // ─────────────────────────────────────────────────────────────────────────
  pool?: {
    /** Pool type: standard or project (default: standard) */
    type?: PoolType;
    /** Paired token address (default: WETH) */
    pairedToken?: `0x${string}`;
    /** Initial market cap in ETH (default: ~10 ETH) */
    initialMarketCap?: number;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Fee Configuration (Optional)
  // ─────────────────────────────────────────────────────────────────────────
  fees?: {
    /** Fee type: static or dynamic (default: static) */
    type?: FeeType;
    /** Clanker token fee % (1-80, default: 5) - for static */
    clankerFee?: number;
    /** Paired token fee % (1-80, default: 5) - for static */
    pairedFee?: number;
    /** Base fee % (1-5, default: 1) - for dynamic */
    baseFee?: number;
    /** Max LP fee % (1-5, default: 5) - for dynamic */
    maxLpFee?: number;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MEV Protection (Enabled by default)
  // ─────────────────────────────────────────────────────────────────────────
  /** MEV block delay (default: 8, set 0 to disable) */
  mev?: boolean | number;

  // ─────────────────────────────────────────────────────────────────────────
  // Vault (Disabled by default)
  // ─────────────────────────────────────────────────────────────────────────
  vault?: {
    /** Enable vault */
    enabled?: boolean;
    /** Percentage of tokens to vault (1-90) */
    percentage?: number;
    /** Lockup duration in days (min 7) */
    lockupDays?: number;
    /** Vesting duration in days (0 = instant) */
    vestingDays?: number;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Deployment Context (for clanker.world verification)
  // ─────────────────────────────────────────────────────────────────────────
  context?: {
    interface?: string;
    platform?: string;
    requestId?: string;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Vanity Address (Optional)
  // ─────────────────────────────────────────────────────────────────────────
  /** Custom salt for CREATE2 vanity address mining */
  salt?: `0x${string}`;
}

export interface DeployOutput {
  success: boolean;
  tokenAddress?: `0x${string}`;
  txHash?: `0x${string}`;
  chainId: number;
  chainName: string;
  explorerUrl?: string;
  error?: string;
}

// ============================================================================
// Easy Deployer Class
// ============================================================================

export class Deployer {
  private config: ClankerEnvConfig;
  private clanker: Clanker;

  constructor(config?: Partial<ClankerEnvConfig>) {
    // Load from env and merge with provided config
    const envConfig = loadEnvConfig();
    this.config = { ...envConfig, ...config };

    // Validate
    const errors = validateConfig(this.config);
    if (errors.length > 0) {
      throw new Error(`Config errors: ${errors.join(', ')}`);
    }

    // Setup clients
    const chain = getChain(this.config.chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${this.config.chainId}`);
    }

    const rpcUrl = getRpcUrl(this.config.chainId, this.config.rpcUrl);
    const account = privateKeyToAccount(this.config.privateKey);

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const wallet = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    this.clanker = new Clanker({ wallet, publicClient });
  }

  /**
   * Get deployer wallet address
   */
  get address(): `0x${string}` {
    return privateKeyToAccount(this.config.privateKey).address;
  }

  /**
   * Get current chain ID
   */
  get chainId(): number {
    return this.config.chainId;
  }

  /**
   * Get chain features availability
   */
  get chainFeatures(): { mevProtection: boolean; dynamicFees: boolean } {
    const deployment = getDeployment(this.config.chainId);
    if (!deployment) {
      return { mevProtection: false, dynamicFees: false };
    }
    return {
      mevProtection: deployment.contracts.mevModule !== zeroAddress,
      dynamicFees: deployment.contracts.feeDynamicHook !== zeroAddress,
    };
  }

  /**
   * Deploy a token with simple config
   */
  async deploy(config: SimpleDeployConfig): Promise<DeployOutput> {
    const chainId = config.chainId || this.config.chainId;
    const chainName = getChainName(chainId);

    try {
      // ─────────────────────────────────────────────────────────────────────
      // Validate required fields
      // ─────────────────────────────────────────────────────────────────────
      if (!config.name || config.name.trim().length === 0) {
        throw new Error('Token name is required');
      }
      if (!config.symbol || config.symbol.trim().length === 0) {
        throw new Error('Token symbol is required');
      }
      if (config.symbol.length > 10) {
        throw new Error(`Token symbol too long (max 10 chars), got ${config.symbol.length}`);
      }

      // Build token config
      const tokenConfig: ClankerTokenV4 = {
        name: config.name.trim(),
        symbol: config.symbol.trim().toUpperCase(),
        image: config.image || this.config.defaultImage || '',
        tokenAdmin: config.tokenAdmin || this.address,
        chainId,
      };

      // ─────────────────────────────────────────────────────────────────────
      // Metadata (description + socials)
      // ─────────────────────────────────────────────────────────────────────
      if (config.description || config.socials) {
        tokenConfig.metadata = {
          description: config.description,
          socials: config.socials,
        };
      }

      // ─────────────────────────────────────────────────────────────────────
      // Rewards Configuration (Multi-recipient support)
      // ─────────────────────────────────────────────────────────────────────
      if (config.rewardRecipients && config.rewardRecipients.length > 0) {
        const recipients = config.rewardRecipients;

        // Validate: max 7 recipients
        if (recipients.length > 7) {
          throw new Error('Maximum 7 reward recipients allowed');
        }

        // Validate: total allocation must be ~100%
        const totalAllocation = recipients.reduce((sum, r) => sum + r.allocation, 0);
        if (Math.abs(totalAllocation - 100) > 0.01) {
          throw new Error(`Reward allocations must sum to 100%, got ${totalAllocation}%`);
        }

        // Convert allocation % to bps (0.1% = 10 bps, 100% = 10000 bps)
        tokenConfig.rewards = {
          recipients: recipients.map((r, index) => {
            let bps = Math.round(r.allocation * 100); // % to bps

            // For last recipient, ensure total is exactly 10000
            if (index === recipients.length - 1) {
              const previousBps = recipients
                .slice(0, index)
                .reduce((sum, prev) => sum + Math.round(prev.allocation * 100), 0);
              bps = 10000 - previousBps;
            }

            return {
              admin: r.address,
              recipient: r.address,
              bps,
              feePreference: r.rewardToken || 'Both',
            };
          }),
        };
      }

      // ─────────────────────────────────────────────────────────────────────
      // Pool Configuration
      // ─────────────────────────────────────────────────────────────────────
      if (config.pool?.pairedToken) {
        tokenConfig.pairedToken = config.pool.pairedToken;
      }
      // Note: pool.type and initialMarketCap handled by Clanker contract defaults

      // ─────────────────────────────────────────────────────────────────────
      // Fee Configuration
      // SimpleDeployConfig uses % (5 = 5%), ClankerTokenV4 uses bps (500 = 5%)
      // ─────────────────────────────────────────────────────────────────────
      if (config.fees) {
        const feeType = config.fees.type || 'static';
        if (feeType === 'static') {
          const clankerFee = config.fees.clankerFee ?? 5;
          const pairedFee = config.fees.pairedFee ?? 5;

          // Validate fee range (1-80%)
          if (clankerFee < 1 || clankerFee > 80) {
            throw new Error(`clankerFee must be 1-80%, got ${clankerFee}%`);
          }
          if (pairedFee < 1 || pairedFee > 80) {
            throw new Error(`pairedFee must be 1-80%, got ${pairedFee}%`);
          }

          tokenConfig.fees = {
            type: 'static',
            clankerFee: clankerFee * 100, // % -> bps
            pairedFee: pairedFee * 100,
          };
        } else {
          const baseFee = config.fees.baseFee ?? 1;
          const maxLpFee = config.fees.maxLpFee ?? 5;

          // Validate dynamic fee range (0.5-5%)
          if (baseFee < 0.5 || baseFee > 5) {
            throw new Error(`baseFee must be 0.5-5%, got ${baseFee}%`);
          }
          if (maxLpFee < 0.5 || maxLpFee > 5) {
            throw new Error(`maxLpFee must be 0.5-5%, got ${maxLpFee}%`);
          }

          tokenConfig.fees = {
            type: 'dynamic',
            baseFee: baseFee * 100, // % -> bps
            maxFee: maxLpFee * 100,
            startingSniperFee: 500,
            endingSniperFee: 100,
            clankerFee: 100,
            referenceTickFilterPeriod: 30,
            resetPeriod: 120,
            resetTickFilter: 200,
            feeControlNumerator: 500000000,
            decayFilterBps: 7500,
            decayDuration: 30,
          };
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // Vault (Disabled by default)
      // ─────────────────────────────────────────────────────────────────────
      if (config.vault?.enabled && config.vault.percentage && config.vault.percentage > 0) {
        const percentage = config.vault.percentage;
        const lockupDays = config.vault.lockupDays ?? 30;

        // Validate vault percentage (1-90%)
        if (percentage < 1 || percentage > 90) {
          throw new Error(`Vault percentage must be 1-90%, got ${percentage}%`);
        }

        // Validate lockup duration (min 7 days)
        if (lockupDays < 7) {
          throw new Error(`Vault lockup must be at least 7 days, got ${lockupDays} days`);
        }

        tokenConfig.vault = {
          percentage,
          lockupDuration: lockupDays * 24 * 60 * 60,
          vestingDuration: (config.vault.vestingDays ?? 0) * 24 * 60 * 60,
        };
      }

      // ─────────────────────────────────────────────────────────────────────
      // MEV Protection (Enabled by default)
      // ─────────────────────────────────────────────────────────────────────
      if (config.mev === false || config.mev === 0) {
        tokenConfig.mev = { type: 'none' };
      } else if (config.mev === true) {
        tokenConfig.mev = { type: 'blockDelay', blockDelay: 8 };
      } else if (typeof config.mev === 'number' && config.mev > 0) {
        tokenConfig.mev = { type: 'blockDelay', blockDelay: config.mev };
      } else if (this.config.mevBlockDelay) {
        tokenConfig.mev = { type: 'blockDelay', blockDelay: this.config.mevBlockDelay };
      } else {
        // Default MEV enabled with 8 blocks
        tokenConfig.mev = { type: 'blockDelay', blockDelay: 8 };
      }

      // ─────────────────────────────────────────────────────────────────────
      // Deployment Context (for clanker.world verification)
      // ─────────────────────────────────────────────────────────────────────
      tokenConfig.context = {
        interface: config.context?.interface || 'UMKM Terminal',
        platform: config.context?.platform || 'Clanker',
        ...(config.context?.requestId && { messageId: config.context.requestId }),
      };

      // ─────────────────────────────────────────────────────────────────────
      // Vanity Salt (for CREATE2 address mining)
      // ─────────────────────────────────────────────────────────────────────
      if (config.salt) {
        tokenConfig.salt = config.salt;
      }

      // Deploy
      const result = await this.clanker.deploy(tokenConfig);
      const { address } = await result.waitForTransaction();

      const explorerUrl = getExplorerUrl(chainId);

      return {
        success: true,
        tokenAddress: address,
        txHash: result.txHash,
        chainId,
        chainName,
        explorerUrl: explorerUrl ? `${explorerUrl}/token/${address}` : undefined,
      };
    } catch (err) {
      return {
        success: false,
        chainId,
        chainName,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ==========================================================================
  // Token Management Methods
  // ==========================================================================

  /**
   * Update token image (requires token admin)
   */
  async updateImage(token: `0x${string}`, newImage: string) {
    return this.clanker.updateImage(token, newImage);
  }

  /**
   * Update token metadata (requires token admin)
   */
  async updateMetadata(token: `0x${string}`, metadata: string) {
    return this.clanker.updateMetadata(token, metadata);
  }

  /**
   * Get rewards configuration for a token
   */
  async getRewards(token: `0x${string}`) {
    return this.clanker.getRewards(token);
  }

  /**
   * Update reward recipient (requires reward admin)
   */
  async updateRewardRecipient(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newRecipient: `0x${string}`;
  }) {
    return this.clanker.updateRewardRecipient(params);
  }

  /**
   * Update reward admin (requires current admin)
   */
  async updateRewardAdmin(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newAdmin: `0x${string}`;
  }) {
    return this.clanker.updateRewardAdmin(params);
  }

  // ==========================================================================
  // Fee & Vault Claims
  // ==========================================================================

  /**
   * Get available fees for a token
   */
  async getAvailableFees(token: `0x${string}`, recipient: `0x${string}`) {
    return this.clanker.getAvailableFees(token, recipient);
  }

  /**
   * Claim fees for a token
   */
  async claimFees(token: `0x${string}`, recipient: `0x${string}`) {
    return this.clanker.claimFees(token, recipient);
  }

  /**
   * Get claimable vault amount
   */
  async getVaultClaimableAmount(token: `0x${string}`) {
    return this.clanker.getVaultClaimableAmount(token);
  }

  /**
   * Claim vaulted tokens
   */
  async claimVaultedTokens(token: `0x${string}`) {
    return this.clanker.claimVaultedTokens(token);
  }
}

// ============================================================================
// Quick Deploy Function
// ============================================================================

/**
 * Quick deploy function - uses environment variables
 *
 * @example
 * ```typescript
 * const result = await quickDeploy({
 *   name: 'My Token',
 *   symbol: 'TKN',
 * });
 * console.log(result.tokenAddress);
 * ```
 */
export async function quickDeploy(config: SimpleDeployConfig): Promise<DeployOutput> {
  const deployer = new Deployer();
  return deployer.deploy(config);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create deployer for specific chain
 */
export function createDeployer(chainId: number, privateKey?: `0x${string}`): Deployer {
  return new Deployer({
    chainId,
    privateKey: privateKey || loadEnvConfig().privateKey,
  });
}

/**
 * Create deployer for Base
 */
export function createBaseDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(8453, privateKey);
}

/**
 * Create deployer for Ethereum
 */
export function createEthDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(1, privateKey);
}

/**
 * Create deployer for Arbitrum
 */
export function createArbDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(42161, privateKey);
}

/**
 * Create deployer for Unichain
 */
export function createUnichainDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(130, privateKey);
}

/**
 * Create deployer for Monad
 */
export function createMonadDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(10143, privateKey);
}

// ============================================================================
// Multi-Chain Deploy
// ============================================================================

/** Supported chain names for multi-deploy */
export type ChainName = 'base' | 'ethereum' | 'arbitrum' | 'unichain' | 'monad';

/** Chain name to ID mapping */
const CHAIN_NAME_TO_ID: Record<ChainName, number> = {
  base: 8453,
  ethereum: 1,
  arbitrum: 42161,
  unichain: 130,
  monad: 10143,
};

/** Multi-deploy token configuration (simplified) */
export interface MultiDeployConfig {
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token image URL (optional) */
  image?: string;
  /** Token description (optional) */
  description?: string;
  /** MEV protection blocks (default: 8, set 0 to disable) */
  mev?: number;
  /** Fee percentage (default: 5%) */
  feePercent?: number;
}

/** Result for each chain deployment */
export interface MultiDeployResult {
  chain: ChainName;
  chainId: number;
  success: boolean;
  tokenAddress?: `0x${string}`;
  txHash?: `0x${string}`;
  explorerUrl?: string;
  error?: string;
}

/** Summary of multi-chain deployment */
export interface MultiDeploySummary {
  token: { name: string; symbol: string };
  results: MultiDeployResult[];
  successful: number;
  failed: number;
  totalChains: number;
}

/**
 * Multi-Chain Deployer
 * Deploy the same token across multiple chains with one call
 *
 * @example
 * ```typescript
 * const multiDeploy = new MultiChainDeployer();
 *
 * // Deploy to all chains
 * const results = await multiDeploy.deployToAll({
 *   name: 'My Token',
 *   symbol: 'TKN',
 * });
 *
 * // Deploy to specific chains
 * const results = await multiDeploy.deployTo(['base', 'arbitrum'], {
 *   name: 'My Token',
 *   symbol: 'TKN',
 * });
 * ```
 */
export class MultiChainDeployer {
  private privateKey: `0x${string}`;

  constructor(privateKey?: `0x${string}`) {
    this.privateKey = privateKey || loadEnvConfig().privateKey;
  }

  /**
   * Get wallet address
   */
  get address(): `0x${string}` {
    return createDeployer(8453, this.privateKey).address;
  }

  /**
   * Deploy token to all supported chains
   */
  async deployToAll(config: MultiDeployConfig): Promise<MultiDeploySummary> {
    const chains: ChainName[] = ['base', 'ethereum', 'arbitrum', 'unichain', 'monad'];
    return this.deployTo(chains, config);
  }

  /**
   * Deploy token to specific chains
   */
  async deployTo(chains: ChainName[], config: MultiDeployConfig): Promise<MultiDeploySummary> {
    const results: MultiDeployResult[] = [];

    // Deploy to each chain sequentially
    for (const chain of chains) {
      const result = await this.deployToChain(chain, config);
      results.push(result);
    }

    // Build summary
    const successful = results.filter((r) => r.success).length;
    return {
      token: { name: config.name, symbol: config.symbol },
      results,
      successful,
      failed: results.length - successful,
      totalChains: results.length,
    };
  }

  /**
   * Deploy token to a single chain
   */
  async deployToChain(chain: ChainName, config: MultiDeployConfig): Promise<MultiDeployResult> {
    const chainId = CHAIN_NAME_TO_ID[chain];

    try {
      const deployer = createDeployer(chainId, this.privateKey);

      // Build simple config
      const deployConfig: SimpleDeployConfig = {
        name: config.name,
        symbol: config.symbol,
        image: config.image,
        description: config.description,
        mev: config.mev ?? 8,
        fees: {
          type: 'static',
          clankerFee: config.feePercent ?? 5,
          pairedFee: config.feePercent ?? 5,
        },
      };

      const result = await deployer.deploy(deployConfig);

      return {
        chain,
        chainId,
        success: result.success,
        tokenAddress: result.tokenAddress,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        error: result.error,
      };
    } catch (err) {
      return {
        chain,
        chainId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Deploy to multiple chains in parallel (faster but uses more gas at once)
   */
  async deployToParallel(
    chains: ChainName[],
    config: MultiDeployConfig
  ): Promise<MultiDeploySummary> {
    const promises = chains.map((chain) => this.deployToChain(chain, config));
    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.success).length;
    return {
      token: { name: config.name, symbol: config.symbol },
      results,
      successful,
      failed: results.length - successful,
      totalChains: results.length,
    };
  }
}

/**
 * Quick multi-chain deploy function
 *
 * @example
 * ```typescript
 * // Deploy to all chains
 * const results = await multiDeploy({
 *   name: 'My Token',
 *   symbol: 'TKN',
 * });
 *
 * // Deploy to specific chains
 * const results = await multiDeploy({
 *   name: 'My Token',
 *   symbol: 'TKN',
 * }, ['base', 'arbitrum']);
 * ```
 */
export async function multiDeploy(
  config: MultiDeployConfig,
  chains?: ChainName[]
): Promise<MultiDeploySummary> {
  const deployer = new MultiChainDeployer();
  if (chains && chains.length > 0) {
    return deployer.deployTo(chains, config);
  }
  return deployer.deployToAll(config);
}

// ============================================================================
// Batch Deploy (Multiple Tokens on Single Chain)
// ============================================================================

/** Single token config for batch deploy */
export interface BatchTokenConfig {
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token image URL (optional) */
  image?: string;
  /** Token description (optional) */
  description?: string;
  /** Custom ID for tracking (optional) */
  id?: string;
}

/** Batch deploy options */
export interface BatchDeployOptions {
  /** Chain to deploy on (default: 'base') */
  chain?: ChainName;
  /** MEV protection blocks (default: 8) */
  mev?: number;
  /** Fee percentage (default: 5%) */
  feePercent?: number;
  /** Delay between deploys in ms (default: 3000) */
  delayMs?: number;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
  /** Number of retries for failed deploys (default: 2) */
  retries?: number;
  /** Delay before retry in ms (default: 5000) */
  retryDelayMs?: number;
  /** Start from index (for resume, default: 0) */
  startIndex?: number;
  /** Callback for each deployment */
  onProgress?: (index: number, total: number, result: BatchDeployResult) => void;
  /** Callback on error */
  onError?: (index: number, error: Error, token: BatchTokenConfig) => void;
  /** Callback on retry */
  onRetry?: (index: number, attempt: number, token: BatchTokenConfig) => void;
}

/** Result for each token in batch */
export interface BatchDeployResult {
  index: number;
  id?: string;
  name: string;
  symbol: string;
  success: boolean;
  tokenAddress?: `0x${string}`;
  txHash?: `0x${string}`;
  explorerUrl?: string;
  error?: string;
  attempts: number;
  timestamp: number;
}

/** Summary of batch deployment */
export interface BatchDeploySummary {
  chain: ChainName;
  chainId: number;
  results: BatchDeployResult[];
  successful: number;
  failed: number;
  total: number;
  tokens: Array<{ name: string; symbol: string; address?: `0x${string}` }>;
  startTime: number;
  endTime: number;
  durationMs: number;
}

/**
 * Batch Deployer
 * Deploy multiple tokens (1-100) on a single chain
 *
 * @example
 * ```typescript
 * const batch = new BatchDeployer();
 *
 * // Deploy multiple tokens
 * const results = await batch.deploy([
 *   { name: 'Token A', symbol: 'TKNA' },
 *   { name: 'Token B', symbol: 'TKNB' },
 *   { name: 'Token C', symbol: 'TKNC' },
 * ]);
 *
 * // With options
 * const results = await batch.deploy(tokens, {
 *   chain: 'base',
 *   feePercent: 3,
 *   delayMs: 3000,
 *   onProgress: (i, total, result) => {
 *     console.log(`${i + 1}/${total}: ${result.success ? '✅' : '❌'}`);
 *   },
 * });
 * ```
 */
export class BatchDeployer {
  private privateKey: `0x${string}`;

  constructor(privateKey?: `0x${string}`) {
    this.privateKey = privateKey || loadEnvConfig().privateKey;
  }

  /**
   * Get wallet address
   */
  get address(): `0x${string}` {
    return createDeployer(8453, this.privateKey).address;
  }

  /**
   * Deploy multiple tokens on a single chain
   * @param tokens Array of token configs (1-100)
   * @param options Deployment options
   */
  async deploy(
    tokens: BatchTokenConfig[],
    options: BatchDeployOptions = {}
  ): Promise<BatchDeploySummary> {
    const startTime = Date.now();

    // Validate token count
    if (tokens.length === 0) {
      throw new Error('At least 1 token is required');
    }
    if (tokens.length > 100) {
      throw new Error('Maximum 100 tokens per batch');
    }

    // Options with defaults
    const chain = options.chain || 'base';
    const chainId = CHAIN_NAME_TO_ID[chain];
    const mev = options.mev ?? 8;
    const feePercent = options.feePercent ?? 5;
    const delayMs = options.delayMs ?? 3000;
    const continueOnError = options.continueOnError ?? true;
    const retries = options.retries ?? 2;
    const retryDelayMs = options.retryDelayMs ?? 5000;
    const startIndex = options.startIndex ?? 0;
    const onProgress = options.onProgress;
    const onError = options.onError;
    const onRetry = options.onRetry;

    // Create deployer for chain
    const deployer = createDeployer(chainId, this.privateKey);

    const results: BatchDeployResult[] = [];
    const total = tokens.length;

    // Deploy each token (starting from startIndex for resume)
    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
      let lastError: Error | null = null;
      let attempts = 0;

      // Retry loop
      for (let attempt = 0; attempt <= retries; attempt++) {
        attempts = attempt + 1;

        // Retry callback
        if (attempt > 0 && onRetry) {
          onRetry(i, attempt, token);
        }

        // Retry delay
        if (attempt > 0) {
          await this.sleep(retryDelayMs);
        }

        try {
          // Build config
          const deployConfig: SimpleDeployConfig = {
            name: token.name,
            symbol: token.symbol,
            image: token.image,
            description: token.description,
            mev,
            fees: {
              type: 'static',
              clankerFee: feePercent,
              pairedFee: feePercent,
            },
          };

          // Deploy
          const result = await deployer.deploy(deployConfig);

          if (result.success) {
            const batchResult: BatchDeployResult = {
              index: i,
              id: token.id,
              name: token.name,
              symbol: token.symbol,
              success: true,
              tokenAddress: result.tokenAddress,
              txHash: result.txHash,
              explorerUrl: result.explorerUrl,
              attempts,
              timestamp: Date.now(),
            };

            results.push(batchResult);

            if (onProgress) {
              onProgress(i, total, batchResult);
            }

            lastError = null;
            break; // Success, exit retry loop
          } else {
            lastError = new Error(result.error || 'Deploy failed');
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          if (onError) {
            onError(i, lastError, token);
          }
        }
      }

      // All retries failed
      if (lastError) {
        const batchResult: BatchDeployResult = {
          index: i,
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          success: false,
          error: lastError.message,
          attempts,
          timestamp: Date.now(),
        };

        results.push(batchResult);

        if (onProgress) {
          onProgress(i, total, batchResult);
        }

        if (!continueOnError) {
          break;
        }
      }

      // Delay between deploys (except last one)
      if (i < tokens.length - 1 && delayMs > 0) {
        await this.sleep(delayMs);
      }
    }

    const endTime = Date.now();

    // Build summary
    const successful = results.filter((r) => r.success).length;
    return {
      chain,
      chainId,
      results,
      successful,
      failed: results.length - successful,
      total: results.length,
      tokens: results.map((r) => ({
        name: r.name,
        symbol: r.symbol,
        address: r.tokenAddress,
      })),
      startTime,
      endTime,
      durationMs: endTime - startTime,
    };
  }

  /**
   * Retry failed tokens from a previous batch
   */
  async retryFailed(
    summary: BatchDeploySummary,
    tokens: BatchTokenConfig[],
    options?: BatchDeployOptions
  ): Promise<BatchDeploySummary> {
    // Get failed indices
    const failedIndices = summary.results.filter((r) => !r.success).map((r) => r.index);

    if (failedIndices.length === 0) {
      return summary; // Nothing to retry
    }

    // Get failed tokens
    const failedTokens = failedIndices.map((i) => tokens[i]);

    // Retry deployment
    return this.deploy(failedTokens, options);
  }

  /**
   * Export results to JSON string
   */
  exportResults(summary: BatchDeploySummary): string {
    return JSON.stringify(summary, null, 2);
  }

  /**
   * Get deployment statistics
   */
  getStats(summary: BatchDeploySummary): {
    successRate: number;
    avgTimePerToken: number;
    totalDuration: string;
  } {
    const successRate =
      summary.total > 0 ? Math.round((summary.successful / summary.total) * 100) : 0;
    const avgTimePerToken = summary.total > 0 ? Math.round(summary.durationMs / summary.total) : 0;
    const totalSeconds = Math.round(summary.durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const totalDuration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    return { successRate, avgTimePerToken, totalDuration };
  }

  /**
   * Generate token configs from template
   * Useful for creating numbered tokens like "Token 1", "Token 2", etc.
   */
  generateTokens(
    count: number,
    template: {
      namePrefix: string;
      symbolPrefix: string;
      image?: string;
      description?: string;
      startIndex?: number;
    }
  ): BatchTokenConfig[] {
    if (count < 1 || count > 100) {
      throw new Error('Count must be 1-100');
    }

    const startIndex = template.startIndex ?? 1;
    const tokens: BatchTokenConfig[] = [];

    for (let i = 0; i < count; i++) {
      const num = startIndex + i;
      tokens.push({
        name: `${template.namePrefix} ${num}`,
        symbol: `${template.symbolPrefix}${num}`,
        image: template.image,
        description: template.description,
      });
    }

    return tokens;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Quick batch deploy function
 *
 * @example
 * ```typescript
 * // Deploy 3 tokens
 * const results = await batchDeploy([
 *   { name: 'Token A', symbol: 'TKNA' },
 *   { name: 'Token B', symbol: 'TKNB' },
 *   { name: 'Token C', symbol: 'TKNC' },
 * ]);
 *
 * // With options
 * const results = await batchDeploy(tokens, {
 *   chain: 'arbitrum',
 *   feePercent: 3,
 * });
 * ```
 */
export async function batchDeploy(
  tokens: BatchTokenConfig[],
  options?: BatchDeployOptions
): Promise<BatchDeploySummary> {
  const deployer = new BatchDeployer();
  return deployer.deploy(tokens, options);
}

/**
 * Generate and deploy numbered tokens
 *
 * @example
 * ```typescript
 * // Deploy 10 tokens: "My Token 1" to "My Token 10"
 * const results = await batchDeployGenerated(10, {
 *   namePrefix: 'My Token',
 *   symbolPrefix: 'MTK',
 * });
 * ```
 */
export async function batchDeployGenerated(
  count: number,
  template: {
    namePrefix: string;
    symbolPrefix: string;
    image?: string;
    description?: string;
    startIndex?: number;
  },
  options?: BatchDeployOptions
): Promise<BatchDeploySummary> {
  const deployer = new BatchDeployer();
  const tokens = deployer.generateTokens(count, template);
  return deployer.deploy(tokens, options);
}
