/**
 * Core Types for Clanker SDK
 */

// Export base types first
export type * from './base-types.js';

// Export comprehensive public API types
export type * from './public-api.js';

// Export configuration types (excluding duplicates)
export type {
  TokenConfiguration,
  BatchConfiguration,
  SocialConfiguration,
  DeploymentContext,
  ValidationConfiguration,
  ServiceResultDetails,
  RewardRecipientOptions,
  StructuredMetadata,
  WalletStatistics,
  RewardRecipientConfiguration,
  FeeConfiguration,
  VaultConfiguration,
  BatchDeploymentOptions
} from './configuration.js';

// Export deployment argument types
export type * from './deployment-args.js';

// Export runtime validation types and functions
export type * from './runtime-validation.js';
export {
  validateAddress,
  validateChainId,
  validateTokenName,
  validateTokenSymbol,
  validateFeeConfig,
  validateRewardRecipient,
  validateVaultConfig,
  validateClankerTokenV4,
  validateSimpleDeployConfiguration,
  validateBatchDeploymentOptions,
  combineValidationResults,
  createValidationContext,
  validateArray
} from './runtime-validation.js';

// Export Clanker API types
export type { OperationMethod } from '../clanker-api/types/config-types.js';

// ============================================================================
// Token Types
// ============================================================================

/**
 * Base token configuration shared across versions
 */
export interface TokenBase {
  /** Token name (e.g., "My Token") */
  name: string;
  /** Token symbol (e.g., "TKN") */
  symbol: string;
  /** Token image URL (IPFS or HTTPS) */
  image: string;
  /** Chain ID for deployment */
  chainId: number;
}

/**
 * Token metadata for additional information
 */
export interface TokenMetadata {
  /** Token description */
  description?: string;
  /** Social links */
  socials?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
  };
  /** Custom metadata fields */
  [key: string]: unknown;
}

/**
 * Pool position configuration
 */
export interface PoolPosition {
  /** Lower tick bound */
  tickLower: number;
  /** Upper tick bound */
  tickUpper: number;
  /** Basis points for this position (out of 10000) */
  bps: number;
}

/**
 * Static fee configuration
 */
export interface StaticFeeConfig {
  type: 'static';
  /** Fee on clanker token (in basis points, e.g., 100 = 1%) */
  clankerFee: number;
  /** Fee on paired token (in basis points) */
  pairedFee: number;
}

/**
 * Dynamic fee configuration
 */
export interface DynamicFeeConfig {
  type: 'dynamic';
  /** Starting sniper fee (basis points) */
  startingSniperFee: number;
  /** Ending sniper fee (basis points) */
  endingSniperFee: number;
  /** Base fee (basis points) */
  baseFee: number;
  /** Maximum fee (basis points) */
  maxFee: number;
  /** Clanker protocol fee (basis points) */
  clankerFee: number;
  /** Reference tick filter period (seconds) */
  referenceTickFilterPeriod: number;
  /** Reset period (seconds) */
  resetPeriod: number;
  /** Reset tick filter (basis points) */
  resetTickFilter: number;
  /** Fee control numerator */
  feeControlNumerator: number;
  /** Decay filter (basis points) */
  decayFilterBps: number;
  /** Decay duration (seconds) */
  decayDuration: number;
}

export type FeeConfig = StaticFeeConfig | DynamicFeeConfig;

/**
 * Locker configuration for LP tokens
 */
export interface LockerConfig {
  /** Lock duration in seconds */
  lockDuration?: number;
  /** Reward recipients */
  rewardRecipients?: Array<{
    address: `0x${string}`;
    bps: number;
  }>;
}

/**
 * Vault configuration for token vesting
 */
export interface VaultConfig {
  /** Percentage of supply to vault (0-90) */
  percentage: number;
  /** Lockup duration in seconds (min 7 days) */
  lockupDuration: number;
  /** Vesting duration in seconds after lockup */
  vestingDuration?: number;
  /** Recipient address (defaults to tokenAdmin) */
  recipient?: `0x${string}`;
}

/**
 * Reward recipient configuration
 */
export interface RewardRecipient {
  /** Admin address for this reward position */
  admin: `0x${string}`;
  /** Recipient address */
  recipient: `0x${string}`;
  /** Basis points (must sum to 10000) */
  bps: number;
  /** Fee preference: Both, Paired, or Clanker */
  feePreference?: 'Both' | 'Paired' | 'Clanker';
}

/**
 * Rewards configuration
 */
export interface RewardsConfig {
  recipients: RewardRecipient[];
}

/**
 * MEV protection module types
 */
export type MevModuleType = 'none' | 'blockDelay' | 'sniperAuction';

/**
 * MEV protection configuration
 */
export interface MevConfig {
  type: MevModuleType;
  /** Block delay for blockDelay type */
  blockDelay?: number;
  /** Sniper auction config */
  sniperAuction?: {
    startingFee: number;
    endingFee: number;
    secondsToDecay: number;
  };
}

// ============================================================================
// V4 Token Configuration
// ============================================================================

/**
 * Complete V4 token configuration
 */
export interface ClankerTokenV4 extends TokenBase {
  /** Token admin address */
  tokenAdmin: `0x${string}`;
  /** Token metadata */
  metadata?: TokenMetadata;
  /** Pool positions (defaults to Standard) */
  poolPositions?: PoolPosition[];
  /** Fee configuration (defaults to static 1%) */
  fees?: FeeConfig;
  /** Vault configuration for token vesting */
  vault?: VaultConfig;
  /** MEV protection (defaults to blockDelay) */
  mev?: MevConfig;
  /** Rewards configuration (defaults to 100% to tokenAdmin) */
  rewards?: RewardsConfig;
  /** Paired token address (defaults to WETH) */
  pairedToken?: `0x${string}`;
  /** Custom salt for CREATE2 (for vanity addresses) */
  salt?: `0x${string}`;
  /** Deployment context */
  context?: {
    interface?: string;
    platform?: string;
    [key: string]: unknown;
  };
}

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Deployment result
 */
export interface DeployResult {
  /** Transaction hash */
  txHash: `0x${string}`;
  /** Chain ID */
  chainId: number;
  /** Wait for transaction confirmation */
  waitForTransaction: () => Promise<{
    address: `0x${string}`;
  }>;
}

/**
 * Error result
 */
export interface ClankerError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Operation result type
 */
export type OperationResult<T> =
  | { success: true; data: T; error: undefined }
  | { success: false; data: undefined; error: ClankerError };
