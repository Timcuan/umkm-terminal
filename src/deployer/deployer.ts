/**
 * Core Deployer Class
 * Main deployer implementation with simplified configuration handling
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
import { errorLogger, ValidationError, wrapError } from '../errors/index.js';
import { 
  type IValidationService,
  type IDeploymentService,
  type RewardRecipientConfig,
  type NormalizedRewardRecipient,
  ValidationService,
  RewardRecipientService,
  ClankerDeploymentService,
  defaultValidationService,
  defaultRewardRecipientService
} from '../services/index.js';
import type { ClankerTokenV4 } from '../types/index.js';
import type { TokenConfiguration } from '../types/configuration.js';
import { Clanker } from '../v4/index.js';
import {
  validateAndNormalizeAddress,
  validatePrivateKey,
} from '../validation/index.js';

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
    /** Clanker token fee % (1-80, default: 5) - for static (deprecated) */
    clankerFee?: number;
    /** Paired token fee % (1-80, default: 5) - for static (deprecated) */
    pairedFee?: number;
    /** Unified fee percentage for both tokens (1-99) - recommended */
    feePercentage?: number;
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
// Deployer Options Interface
// ============================================================================

export interface DeployerOptions {
  /** Environment configuration (optional, will load from env if not provided) */
  config?: Partial<ClankerEnvConfig>;
  /** Validation service for input validation (optional, uses default if not provided) */
  validationService?: IValidationService;
  /** Reward recipient service for processing reward configurations (optional, uses default if not provided) */
  rewardRecipientService?: RewardRecipientService;
  /** Deployment service for token deployment operations (optional, creates default if not provided) */
  deploymentService?: IDeploymentService;
}

// ============================================================================
// Core Deployer Class
// ============================================================================

export class Deployer {
  private config: ClankerEnvConfig;
  private validationService: IValidationService;
  private rewardRecipientService: RewardRecipientService;
  private deploymentService: IDeploymentService;

  constructor(options: DeployerOptions = {}) {
    // Load from env only if no config provided, otherwise use provided config
    let envConfig;
    try {
      envConfig = loadEnvConfig();
    } catch (error) {
      // If loading env config fails and no config provided, re-throw
      if (!options.config || !options.config.privateKey) {
        throw error;
      }
      // Otherwise, use minimal default config
      envConfig = {
        privateKey: '' as `0x${string}`,
        chainId: 8453,
        rpcUrl: '',
        mevBlockDelay: 8
      };
    }
    
    this.config = { ...envConfig, ...options.config };

    // Validate private key
    try {
      validatePrivateKey(this.config.privateKey);
    } catch (error) {
      throw wrapError(error, 'Invalid private key provided');
    }

    // Validate configuration
    const validationResult = validateConfig(this.config);
    if (!validationResult.success) {
      throw new ValidationError(
        'CONFIG_VALIDATION_FAILED',
        `Config errors: ${validationResult.error.join(', ')}`,
        undefined,
        this.config
      );
    }

    // Setup clients
    const chain = getChain(this.config.chainId);
    if (!chain) {
      throw new ValidationError(
        'UNSUPPORTED_CHAIN',
        `Unsupported chain: ${this.config.chainId}`,
        'chainId',
        this.config.chainId
      );
    }

    const rpcUrl = getRpcUrl(this.config.chainId, this.config.rpcUrl);
    const account = privateKeyToAccount(this.config.privateKey) as import('viem').Account;

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const wallet = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    const clanker = new Clanker({ wallet, publicClient });

    // Initialize services with dependency injection
    this.validationService = options.validationService || defaultValidationService;
    this.rewardRecipientService = options.rewardRecipientService || defaultRewardRecipientService;
    this.deploymentService = options.deploymentService || new ClankerDeploymentService(clanker);
  }

  // ============================================================================
  // Backward Compatibility Constructor
  // ============================================================================

  /**
   * Create Deployer with legacy constructor signature for backward compatibility
   * @deprecated Use new constructor with DeployerOptions instead
   */
  static createLegacy(config?: Partial<ClankerEnvConfig>): Deployer {
    return new Deployer({ config });
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
   * Deploy a token with comprehensive configuration validation and error recovery
   * 
   * This method provides a simplified interface for token deployment while maintaining
   * full type safety and comprehensive error handling. It validates all input parameters,
   * normalizes configuration values, and provides detailed error context for debugging.
   * 
   * @param config - The token deployment configuration
   * @param config.name - Token name (1-100 characters, will be trimmed)
   * @param config.symbol - Token symbol (1-20 characters, uppercase letters and numbers only)
   * @param config.image - Optional token image URL (IPFS or HTTPS recommended)
   * @param config.tokenAdmin - Token administrator address (must be valid Ethereum address)
   * @param config.chainId - Target blockchain chain ID (must be supported: 1, 8453, 42161, 1301, 34443)
   * @param config.mev - Optional MEV protection level (number of blocks or boolean)
   * @param config.fees - Optional fee configuration (static or dynamic)
   * @param config.rewardRecipients - Optional reward recipient configurations
   * @param config.socials - Optional social media links
   * @param config.vault - Optional token vesting vault configuration
   * 
   * @returns Promise resolving to deployment output with transaction details
   * @returns result.success - Whether deployment was successful
   * @returns result.txHash - Transaction hash for the deployment
   * @returns result.address - Deployed token contract address (if successful)
   * @returns result.chainId - Chain ID where token was deployed
   * @returns result.explorerUrl - Block explorer URL for the transaction
   * @returns result.error - Error message (if deployment failed)
   * 
   * @throws {ValidationError} When configuration validation fails
   * @throws {DeploymentError} When blockchain deployment fails
   * @throws {Error} For unexpected errors during deployment
   * 
   * @example
   * ```typescript
   * const deployer = new Deployer(envConfig);
   * 
   * const result = await deployer.deploy({
   *   name: 'My Token',
   *   symbol: 'MTK',
   *   image: 'ipfs://QmHash...',
   *   tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c',
   *   chainId: 8453, // Base
   *   mev: 8, // 8 block delay
   *   fees: {
   *     type: 'static',
   *     clankerFee: 100, // 1%
   *     pairedFee: 100   // 1%
   *   },
   *   rewardRecipients: [{
   *     address: '0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c',
   *     allocation: 100 // 100%
   *   }]
   * });
   * 
   * if (result.success) {
   *   console.log(`Token deployed at: ${result.address}`);
   *   console.log(`Explorer: ${result.explorerUrl}`);
   * } else {
   *   console.error(`Deployment failed: ${result.error}`);
   * }
   * ```
   * 
   * @example
   * ```typescript
   * // Minimal configuration (uses defaults)
   * const result = await deployer.deploy({
   *   name: 'Simple Token',
   *   symbol: 'SIMPLE',
   *   tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c',
   *   chainId: 8453
   * });
   * ```
   * 
   * @since 4.25.0
   * @see {@link SimpleDeployConfig} for complete configuration options
   * @see {@link DeployOutput} for detailed return type information
   * @see {@link https://docs.clanker.world/deployment} for deployment guide
   */
  async deploy(config: SimpleDeployConfig): Promise<DeployOutput> {
    const chainId = config.chainId || this.config.chainId;
    const chainName = getChainName(chainId);

    try {
      // Validate and normalize the deployment configuration
      const validatedConfig = this.validateDeployConfig(config);
      
      // Build the complete token configuration
      const tokenConfig = this.buildTokenConfig(validatedConfig, chainId);
      
      // Deploy the token using injected deployment service
      const result = await this.deploymentService.deploy(tokenConfig);
      const { address } = await result.waitForTransaction();

      const explorerUrl = getExplorerUrl(chainId);

      return {
        success: true,
        tokenAddress: address as `0x${string}`,
        txHash: result.txHash as `0x${string}`,
        chainId,
        chainName,
        explorerUrl: explorerUrl ? `${explorerUrl}/token/${address}` : undefined,
      };
    } catch (err) {
      // Log the error using the new error logger
      const error = wrapError(err, 'Deployment failed');
      errorLogger.log(error);

      // Return structured error response
      return {
        success: false,
        chainId,
        chainName,
        error: error.getUserMessage(),
      };
    }
  }

  /**
   * Validate and normalize deployment configuration
   * Uses injected ValidationService and RewardRecipientService to eliminate duplication
   */
  private validateDeployConfig(config: SimpleDeployConfig): SimpleDeployConfig {
    // Use injected ValidationService for consistent validation
    // Convert SimpleDeployConfig to TokenConfiguration format for validation
    const tokenConfigForValidation: TokenConfiguration = {
      name: config.name,
      symbol: config.symbol,
      chainId: config.chainId,
      tokenAdmin: config.tokenAdmin,
      rewardRecipients: config.rewardRecipients as any,
      fees: config.fees ? {
        type: config.fees.type || 'static',
        // Support both old and new fee structure
        clankerFee: config.fees.feePercentage || config.fees.clankerFee,
        pairedFee: config.fees.feePercentage || config.fees.pairedFee,
        feePercentage: config.fees.feePercentage,
        baseFee: config.fees.baseFee,
        maxLpFee: config.fees.maxLpFee,
      } : undefined,
      vault: config.vault ? {
        enabled: config.vault.enabled || false,
        percentage: config.vault.percentage || 0,
        lockupDays: config.vault.lockupDays || 0,
        vestingDays: config.vault.vestingDays || 0,
      } : undefined,
      mev: config.mev
    };

    const tokenConfigResult = this.validationService.validateTokenConfig(tokenConfigForValidation);

    if (!tokenConfigResult.success) {
      throw new ValidationError(
        'INVALID_TOKEN_CONFIG',
        tokenConfigResult.error,
        'deploy.config'
      );
    }

    // Normalize reward recipients using injected RewardRecipientService
    if (config.rewardRecipients && config.rewardRecipients.length > 0) {
      // Convert SimpleDeployConfig format to RewardRecipientConfig format
      const recipientConfigs: RewardRecipientConfig[] = config.rewardRecipients.map(r => ({
        address: r.address,
        allocation: r.allocation
      }));

      const normalizedRecipients = this.rewardRecipientService.normalize(
        recipientConfigs,
        config.tokenAdmin
      );

      const validationResult = this.rewardRecipientService.validate(normalizedRecipients);
      if (!validationResult.success) {
        throw new ValidationError(
          'INVALID_REWARD_RECIPIENTS',
          validationResult.error,
          'deploy.rewardRecipients'
        );
      }

      // Convert back to SimpleDeployConfig format, preserving rewardToken
      config.rewardRecipients = normalizedRecipients.map((r, index) => ({
        address: r.address as `0x${string}`,
        allocation: r.allocation,
        rewardToken: config.rewardRecipients![index]?.rewardToken || 'Paired'
      }));
    }

    return config;
  }

  /**
   * Build complete token configuration from validated config
   */
  private buildTokenConfig(config: SimpleDeployConfig, chainId: number): ClankerTokenV4 {
    // Build base token configuration
    const tokenConfig: ClankerTokenV4 = {
      name: config.name.trim(),
      symbol: config.symbol.trim().toUpperCase(),
      image: config.image || this.config.defaultImage || '',
      tokenAdmin: config.tokenAdmin
        ? validateAndNormalizeAddress(config.tokenAdmin, 'tokenAdmin')
        : this.address,
      chainId,
    };

    // Add metadata if present
    if (config.description || config.socials) {
      tokenConfig.metadata = {
        description: config.description,
        socials: config.socials,
      };
    }

    // Add reward configuration
    this.buildRewardConfig(tokenConfig, config);

    // Add pool configuration
    if (config.pool?.pairedToken) {
      tokenConfig.pairedToken = config.pool.pairedToken;
    }

    // Add fee configuration
    this.buildFeeConfig(tokenConfig, config);

    // Add vault configuration
    this.buildVaultConfig(tokenConfig, config);

    // Add MEV configuration
    this.buildMevConfig(tokenConfig, config);

    // Add deployment context
    tokenConfig.context = {
      interface: config.context?.interface || 'UMKM Terminal',
      platform: config.context?.platform || 'Clanker',
      ...(config.context?.requestId && { messageId: config.context.requestId }),
    };

    // Add vanity salt if present
    if (config.salt) {
      tokenConfig.salt = config.salt;
    }

    return tokenConfig;
  }

  /**
   * Build reward configuration from normalized recipients
   */
  private buildRewardConfig(tokenConfig: ClankerTokenV4, config: SimpleDeployConfig): void {
    if (!config.rewardRecipients || config.rewardRecipients.length === 0) {
      return;
    }

    const recipients = config.rewardRecipients as Array<{
      address: `0x${string}`;
      allocation: number;
      rewardToken?: 'Both' | 'Paired' | 'Clanker';
    }>;

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

  /**
   * Build fee configuration
   * SimpleDeployConfig uses % (5 = 5%), ClankerTokenV4 uses bps (500 = 5%)
   */
  private buildFeeConfig(tokenConfig: ClankerTokenV4, config: SimpleDeployConfig): void {
    if (!config.fees) {
      return;
    }

    const feeType = config.fees.type || 'static';
    
    if (feeType === 'static') {
      // Support unified fee structure (preferred) or legacy separate fees
      const unifiedFee = config.fees.feePercentage;
      const clankerFee = unifiedFee ?? config.fees.clankerFee ?? 5;
      const pairedFee = unifiedFee ?? config.fees.pairedFee ?? 5;

      tokenConfig.fees = {
        type: 'static',
        clankerFee: clankerFee * 100, // % -> bps
        pairedFee: pairedFee * 100,
      };
    } else {
      const baseFee = config.fees.baseFee ?? 1;
      const maxLpFee = config.fees.maxLpFee ?? 5;

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

  /**
   * Build vault configuration
   */
  private buildVaultConfig(tokenConfig: ClankerTokenV4, config: SimpleDeployConfig): void {
    if (!config.vault?.enabled || !config.vault.percentage || config.vault.percentage <= 0) {
      return;
    }

    const percentage = config.vault.percentage;
    const lockupDays = config.vault.lockupDays ?? 30;

    tokenConfig.vault = {
      percentage,
      lockupDuration: lockupDays * 24 * 60 * 60,
      vestingDuration: (config.vault.vestingDays ?? 0) * 24 * 60 * 60,
    };
  }

  /**
   * Build MEV protection configuration
   */
  private buildMevConfig(tokenConfig: ClankerTokenV4, config: SimpleDeployConfig): void {
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
  }

  // ==========================================================================
  // Token Management Methods
  // ==========================================================================

  /**
   * Update token image (requires token admin)
   */
  async updateImage(token: `0x${string}`, newImage: string) {
    return this.deploymentService.updateImage(token, newImage);
  }

  /**
   * Update token metadata (requires token admin)
   */
  async updateMetadata(token: `0x${string}`, metadata: string) {
    return this.deploymentService.updateMetadata(token, metadata);
  }

  /**
   * Get rewards configuration for a token
   */
  async getRewards(token: `0x${string}`) {
    return this.deploymentService.getRewards(token);
  }

  /**
   * Update reward recipient (requires reward admin)
   */
  async updateRewardRecipient(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newRecipient: `0x${string}`;
  }) {
    return this.deploymentService.updateRewardRecipient(params);
  }

  /**
   * Update reward admin (requires current admin)
   */
  async updateRewardAdmin(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newAdmin: `0x${string}`;
  }) {
    return this.deploymentService.updateRewardAdmin(params);
  }

  // ==========================================================================
  // Fee & Vault Claims
  // ==========================================================================

  /**
   * Get available fees for a token
   */
  async getAvailableFees(token: `0x${string}`, recipient: `0x${string}`) {
    return this.deploymentService.getAvailableFees(token, recipient);
  }

  /**
   * Claim fees for a token
   */
  async claimFees(token: `0x${string}`, recipient: `0x${string}`) {
    return this.deploymentService.claimFees(token, recipient);
  }

  /**
   * Get claimable vault amount
   */
  async getVaultClaimableAmount(token: `0x${string}`) {
    return this.deploymentService.getVaultClaimableAmount(token);
  }

  /**
   * Claim vaulted tokens
   */
  async claimVaultedTokens(token: `0x${string}`) {
    return this.deploymentService.claimVaultedTokens(token);
  }
}