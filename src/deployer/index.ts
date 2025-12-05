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
      // Build token config
      const tokenConfig: ClankerTokenV4 = {
        name: config.name,
        symbol: config.symbol,
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
        // Convert allocation % to bps (0.1% = 10 bps, 99.9% = 9990 bps, 100% = 10000 bps)
        const recipients = config.rewardRecipients;
        
        tokenConfig.rewards = {
          recipients: recipients.map((r, index) => {
            // Calculate bps with precision (allocation can be decimal like 0.1)
            let bps = Math.round(r.allocation * 100); // % to bps
            
            // For last recipient, ensure total is exactly 10000
            if (index === recipients.length - 1) {
              const previousBps = recipients
                .slice(0, index)
                .reduce((sum, prev) => sum + Math.round(prev.allocation * 100), 0);
              bps = 10000 - previousBps;
            }
            
            return {
              admin: r.address, // Each recipient is their own admin
              recipient: r.address,
              bps,
              feePreference: r.rewardToken || 'Both', // Default to Both (token + WETH)
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
          // User inputs % (1-80), convert to bps (100-8000)
          // Default: 5% = 500 bps
          tokenConfig.fees = {
            type: 'static',
            clankerFee: (config.fees.clankerFee ?? 5) * 100, // 5% -> 500 bps
            pairedFee: (config.fees.pairedFee ?? 5) * 100,   // 5% -> 500 bps
          };
        } else {
          // Dynamic fees - user inputs % for baseFee/maxLpFee
          // Default: baseFee 1% = 100 bps, maxFee 5% = 500 bps
          tokenConfig.fees = {
            type: 'dynamic',
            baseFee: (config.fees.baseFee ?? 1) * 100,       // 1% -> 100 bps
            maxFee: (config.fees.maxLpFee ?? 5) * 100,       // 5% -> 500 bps
            // Default values for other dynamic fee params
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
        tokenConfig.vault = {
          percentage: config.vault.percentage,
          lockupDuration: (config.vault.lockupDays ?? 30) * 24 * 60 * 60,
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
