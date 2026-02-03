/**
 * Batch Deployment Types
 * Shared types for batch deployment functionality
 */

// ============================================================================
// Basic Types
// ============================================================================

/** Supported chains */
export type BatchChain = 'base' | 'ethereum' | 'arbitrum' | 'unichain' | 'monad';

/** Reward token type - same as single deploy */
export type RewardTokenType = 'Both' | 'Paired' | 'Clanker';

/** Social links for token */
export interface TokenSocials {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  farcaster?: string;
}

/** Reward recipient configuration */
export interface RewardRecipient {
  address: string;
  allocation: number; // 1-100
}

// ============================================================================
// Token Configuration
// ============================================================================

/** Full token configuration in template */
export interface BatchToken {
  // Required
  name: string;
  symbol: string;

  // Metadata
  image?: string;
  description?: string;

  // Social links
  socials?: TokenSocials;

  // Admin & Rewards
  tokenAdmin?: string;
  rewardRecipients?: RewardRecipient[];

  // Fees (override defaults)
  fee?: number;
  mev?: number;

  // Vault settings
  vault?: {
    enabled?: boolean;
    percentage?: number; // 1-90
    lockupDays?: number; // min 7
    vestingDays?: number;
  };
}

/** Template defaults */
export interface BatchDefaults {
  // Fees
  fee?: number; // 1-80% (for static)
  mev?: number; // 0-20 blocks
  feeType?: 'static' | 'dynamic';
  dynamicBaseFee?: number; // 1-10% (for dynamic - minimum fee)
  dynamicMaxFee?: number; // 1-80% (for dynamic - maximum fee)

  // Admin & Rewards
  tokenAdmin?: string;
  rewardRecipient?: string;
  rewardToken?: RewardTokenType; // Both | Paired | Clanker

  // Vault
  vault?: {
    enabled?: boolean;
    percentage?: number; // 1-90
    lockupDays?: number; // min 7
    vestingDays?: number;
  };

  // Metadata
  image?: string;
  description?: string;
  socials?: TokenSocials;

  // Context for clanker.world verification
  interfaceName?: string;
  platformName?: string;
}

/** Batch template structure */
export interface BatchTemplate {
  name?: string;
  description?: string;
  chain?: BatchChain;
  defaults?: BatchDefaults;
  tokens: BatchToken[];
}

// ============================================================================
// Deployment Results
// ============================================================================

/** Deploy result per token */
export interface BatchResult {
  index: number;
  name: string;
  symbol: string;
  success: boolean;
  address?: string;
  txHash?: string;
  error?: string;
}

/** Batch deploy summary */
export interface BatchSummary {
  template: string;
  chain: BatchChain;
  total: number;
  success: number;
  failed: number;
  results: BatchResult[];
  duration: number;
}

/** Deploy options */
export interface BatchOptions {
  /** Delay between deploys in seconds (default: 3) */
  delay?: number;
  /** Random delay variation - min seconds to add (default: 0) */
  randomDelayMin?: number;
  /** Random delay variation - max seconds to add (default: 0) */
  randomDelayMax?: number;
  /** Number of retries (default: 2) */
  retries?: number;
  /** Progress callback */
  onProgress?: (current: number, total: number, result: BatchResult) => void;
  /** Delay between batches in seconds for batch streaming (default: 0) */
  batchDelay?: number;
}

// ============================================================================
// Template Generation
// ============================================================================

/** Generate options */
export interface GenerateOptions {
  // Token naming
  name: string;
  symbol: string;

  // Chain
  chain?: BatchChain;

  // Defaults
  fee?: number;
  mev?: number;
  feeType?: 'static' | 'dynamic';
  dynamicBaseFee?: number; // 1-10% (for dynamic)
  dynamicMaxFee?: number; // 1-80% (for dynamic)
  tokenAdmin?: string;
  rewardRecipient?: string;
  rewardToken?: RewardTokenType;

  // Metadata (applied to all tokens)
  image?: string;
  description?: string;
  socials?: TokenSocials;

  // Vault
  vault?: {
    enabled?: boolean;
    percentage?: number;
    lockupDays?: number;
    vestingDays?: number;
  };

  // Context for clanker.world verification
  interfaceName?: string;
  platformName?: string;
}