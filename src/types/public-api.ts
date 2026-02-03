/**
 * Comprehensive type definitions for all public APIs
 * Ensures all public methods have proper TypeScript types with constraints
 * Requirements: 9.4, 9.5 - Add comprehensive type definitions for public APIs
 */

import type { Address } from 'viem';
import type { 
  ClankerTokenV4, 
  DeployResult, 
  OperationResult,
  TokenConfiguration,
  BatchConfiguration,
  ErrorContext 
} from './index.js';

// ============================================================================
// Core SDK Public API Types
// ============================================================================

/**
 * Clanker SDK constructor options with strict typing
 */
export interface ClankerSDKOptions {
  /** Wallet client for signing transactions */
  readonly wallet: import('viem').WalletClient;
  /** Public client for reading blockchain state */
  readonly publicClient: import('viem').PublicClient;
  /** Optional configuration overrides */
  readonly config?: Partial<ClankerSDKConfig>;
}

/**
 * SDK configuration with all optional parameters typed
 */
export interface ClankerSDKConfig {
  /** Default chain ID for deployments */
  readonly defaultChainId: number;
  /** Default gas limit multiplier */
  readonly gasMultiplier: number;
  /** Default timeout for transactions (ms) */
  readonly transactionTimeout: number;
  /** Enable debug logging */
  readonly debug: boolean;
  /** Custom RPC endpoints */
  readonly rpcEndpoints: Readonly<Record<number, string>>;
}

/**
 * Deploy method result with comprehensive typing
 */
export interface SDKDeployResult extends DeployResult {
  /** Additional SDK-specific metadata */
  readonly metadata: {
    readonly sdkVersion: string;
    readonly deploymentMethod: 'sdk' | 'batch' | 'multi-wallet';
    readonly timestamp: number;
    readonly chainName: string;
  };
}

// ============================================================================
// Deployer Public API Types
// ============================================================================

/**
 * Deployer constructor options with strict constraints
 */
export interface DeployerConstructorOptions {
  /** Environment configuration */
  readonly config: import('../config/index.js').ClankerEnvConfig;
  /** Optional deployment service implementation */
  readonly deploymentService?: import('../deployer/deployment-service.js').IDeploymentService;
  /** Optional validation service implementation */
  readonly validationService?: import('../services/validation-service.js').IValidationService;
  /** Optional reward recipient service implementation */
  readonly rewardService?: import('../services/reward-recipient-service.js').RewardRecipientService;
}

/**
 * Simple deploy configuration with comprehensive validation
 */
export interface SimpleDeployConfiguration extends Omit<ClankerTokenV4, 'chainId'> {
  /** Chain ID is required for simple deploy */
  readonly chainId: number;
  /** Additional deployment options */
  readonly options?: DeploymentOptions;
}

/**
 * Deployment options for fine-grained control
 */
export interface DeploymentOptions {
  /** Custom gas limit */
  readonly gasLimit?: bigint;
  /** Custom gas price */
  readonly gasPrice?: bigint;
  /** Transaction timeout in milliseconds */
  readonly timeout?: number;
  /** Enable simulation before deployment */
  readonly simulate?: boolean;
  /** Custom nonce (for advanced users) */
  readonly nonce?: number;
}

/**
 * Deploy output with enhanced metadata
 */
export interface EnhancedDeployOutput {
  /** Transaction hash */
  readonly txHash: `0x${string}`;
  /** Chain ID */
  readonly chainId: number;
  /** Estimated gas cost */
  readonly estimatedGas?: bigint;
  /** Actual gas used (after confirmation) */
  readonly gasUsed?: bigint;
  /** Gas price used */
  readonly gasPrice?: bigint;
  /** Total cost in wei */
  readonly totalCost?: bigint;
  /** Deployment timestamp */
  readonly timestamp: number;
  /** Wait for confirmation function */
  readonly waitForTransaction: () => Promise<{
    readonly address: Address;
    readonly blockNumber: bigint;
    readonly blockHash: `0x${string}`;
  }>;
}

// ============================================================================
// Batch Deployment Public API Types
// ============================================================================

/**
 * Batch template with strict validation
 */
export interface ValidatedBatchTemplate {
  /** Template metadata */
  readonly metadata: {
    readonly name: string;
    readonly description?: string;
    readonly version: string;
    readonly createdAt: number;
    readonly totalTokens: number;
  };
  /** Chain configuration */
  readonly chain: 'base' | 'ethereum' | 'arbitrum' | 'unichain' | 'monad';
  /** Default values for all tokens */
  readonly defaults: BatchTemplateDefaults;
  /** Individual token configurations */
  readonly tokens: readonly BatchTokenConfiguration[];
}

/**
 * Batch template defaults with comprehensive typing
 */
export interface BatchTemplateDefaults {
  /** Default token admin */
  readonly tokenAdmin?: Address;
  /** Default chain ID */
  readonly chainId?: number;
  /** Default image URL */
  readonly image?: string;
  /** Default MEV protection */
  readonly mev?: number | boolean;
  /** Default fee configuration */
  readonly fees?: import('./index.js').FeeConfig;
  /** Default reward recipients */
  readonly rewardRecipients?: readonly import('./index.js').RewardRecipient[];
  /** Default social links */
  readonly socials?: import('./index.js').TokenMetadata['socials'];
  /** Default vault configuration */
  readonly vault?: import('./index.js').VaultConfig;
}

/**
 * Individual batch token configuration
 */
export interface BatchTokenConfiguration {
  /** Token name (required) */
  readonly name: string;
  /** Token symbol (required) */
  readonly symbol: string;
  /** Token description */
  readonly description?: string;
  /** Token image URL (overrides default) */
  readonly image?: string;
  /** Token admin (overrides default) */
  readonly tokenAdmin?: Address;
  /** Chain ID (overrides default) */
  readonly chainId?: number;
  /** MEV protection (overrides default) */
  readonly mev?: number | boolean;
  /** Fee configuration (overrides default) */
  readonly fees?: import('./index.js').FeeConfig;
  /** Reward recipients (overrides default) */
  readonly rewardRecipients?: readonly import('./index.js').RewardRecipient[];
  /** Social links (overrides default) */
  readonly socials?: import('./index.js').TokenMetadata['socials'];
  /** Vault configuration (overrides default) */
  readonly vault?: import('./index.js').VaultConfig;
}

/**
 * Batch deployment options with comprehensive controls
 */
export interface BatchDeploymentOptions {
  /** Maximum concurrent deployments */
  readonly concurrency?: number;
  /** Delay between deployments (ms) */
  readonly delay?: number;
  /** Maximum retry attempts per token */
  readonly retries?: number;
  /** Progress callback */
  readonly onProgress?: (completed: number, total: number, current?: BatchTokenResult) => void;
  /** Error callback */
  readonly onError?: (index: number, error: Error, config: BatchTokenConfiguration) => void;
  /** Success callback */
  readonly onSuccess?: (index: number, result: BatchTokenResult, config: BatchTokenConfiguration) => void;
  /** Enable adaptive concurrency based on success rate */
  readonly adaptiveConcurrency?: boolean;
  /** Stop on first error */
  readonly stopOnError?: boolean;
  /** Custom deployer factory */
  readonly deployerFactory?: import('../deployer/factory.js').IDeployerFactory;
}

/**
 * Individual batch token deployment result
 */
export interface BatchTokenResult {
  /** Deployment success status */
  readonly success: boolean;
  /** Token configuration used */
  readonly token: BatchTokenConfiguration;
  /** Deployment result (if successful) */
  readonly result?: EnhancedDeployOutput;
  /** Error details (if failed) */
  readonly error?: string;
  /** Token index in batch */
  readonly index: number;
  /** Deployment duration (ms) */
  readonly duration: number;
  /** Retry attempt number */
  readonly retryAttempt: number;
}

/**
 * Batch deployment summary with comprehensive statistics
 */
export interface BatchDeploymentSummary {
  /** Overall success status */
  readonly success: boolean;
  /** Total tokens processed */
  readonly total: number;
  /** Successfully deployed tokens */
  readonly successful: number;
  /** Failed deployments */
  readonly failed: number;
  /** Skipped deployments */
  readonly skipped: number;
  /** Total deployment duration (ms) */
  readonly duration: number;
  /** Average deployment time per token (ms) */
  readonly averageTime: number;
  /** Total gas used across all deployments */
  readonly totalGasUsed: bigint;
  /** Total cost in wei */
  readonly totalCost: bigint;
  /** Individual results */
  readonly results: readonly BatchTokenResult[];
  /** Error summary */
  readonly errors: readonly {
    readonly index: number;
    readonly error: string;
    readonly tokenName: string;
    readonly retryAttempts: number;
  }[];
  /** Performance statistics */
  readonly stats: {
    readonly successRate: number;
    readonly averageGasPerToken: bigint;
    readonly averageCostPerToken: bigint;
    readonly peakConcurrency: number;
    readonly totalRetries: number;
  };
}

// ============================================================================
// Multi-Wallet Deployment Public API Types
// ============================================================================

/**
 * Multi-wallet batch configuration with validation
 */
export interface MultiWalletBatchConfiguration {
  /** Farcaster input (username or FID) */
  readonly farcasterInput: string | number;
  /** Token configurations to deploy */
  readonly tokenConfigs: readonly TokenConfiguration[];
  /** Optional deployer private keys (if not using Farcaster wallets) */
  readonly deployerPrivateKeys?: readonly `0x${string}`[];
  /** Maximum addresses per deployer wallet */
  readonly maxAddressesPerDeployer?: number;
  /** Deployment options */
  readonly options?: MultiWalletDeploymentOptions;
}

/**
 * Multi-wallet deployment options
 */
export interface MultiWalletDeploymentOptions extends BatchDeploymentOptions {
  /** Maximum concurrent deployments per wallet */
  readonly maxConcurrentPerWallet?: number;
  /** Wallet selection strategy */
  readonly walletStrategy?: 'round-robin' | 'least-busy' | 'random';
  /** Enable wallet load balancing */
  readonly loadBalancing?: boolean;
  /** Minimum balance required per wallet (in wei) */
  readonly minWalletBalance?: bigint;
  /** Enable automatic nonce management */
  readonly autoNonceManagement?: boolean;
}

/**
 * Multi-wallet deployment result
 */
export interface MultiWalletDeploymentResult extends BatchDeploymentSummary {
  /** Wallet-specific statistics */
  readonly walletStats: readonly {
    readonly address: Address;
    readonly deploymentsCount: number;
    readonly successfulDeployments: number;
    readonly failedDeployments: number;
    readonly totalGasUsed: bigint;
    readonly totalCost: bigint;
    readonly averageTime: number;
  }[];
  /** Load balancing statistics */
  readonly loadBalancing: {
    readonly totalWallets: number;
    readonly activeWallets: number;
    readonly walletUtilization: number;
    readonly loadDistribution: readonly number[];
  };
}

// ============================================================================
// Wallet Management Public API Types
// ============================================================================

/**
 * Wallet operation result with comprehensive error handling
 */
export interface WalletOperationResult<T = unknown> {
  /** Operation success status */
  readonly success: boolean;
  /** Result data (if successful) */
  readonly data?: T;
  /** Error message (if failed) */
  readonly error?: string;
  /** Additional error context */
  readonly context?: ErrorContext;
  /** Operation timestamp */
  readonly timestamp: number;
}

/**
 * Stored wallet with enhanced metadata
 */
export interface EnhancedStoredWallet {
  /** Wallet address */
  readonly address: Address;
  /** Wallet name */
  readonly name: string;
  /** Encrypted private key */
  readonly encryptedKey: string;
  /** Encrypted mnemonic (if available) */
  readonly encryptedMnemonic?: string;
  /** Creation timestamp */
  readonly createdAt: number;
  /** Last used timestamp */
  readonly lastUsed?: number;
  /** Wallet metadata */
  readonly metadata: {
    readonly version: string;
    readonly source: 'generated' | 'imported' | 'mnemonic';
    readonly derivationPath?: string;
    readonly isHardwareWallet?: boolean;
  };
  /** Usage statistics */
  readonly stats?: {
    readonly deploymentsCount: number;
    readonly totalGasUsed: bigint;
    readonly totalCost: bigint;
    readonly lastDeployment?: number;
  };
}

/**
 * Wallet backup with comprehensive metadata
 */
export interface EnhancedWalletBackup {
  /** Backup format version */
  readonly version: string;
  /** Backup creation timestamp */
  readonly createdAt: number;
  /** Backup description */
  readonly description?: string;
  /** Encrypted wallet data */
  readonly wallets: readonly EnhancedStoredWallet[];
  /** Backup metadata */
  readonly metadata: {
    readonly totalWallets: number;
    readonly backupSize: number;
    readonly checksumSHA256: string;
    readonly encryptionMethod: string;
  };
}

// ============================================================================
// Service Interface Types
// ============================================================================

/**
 * Validation service result with detailed information
 */
export interface ValidationServiceResult<T> {
  /** Validation success status */
  readonly success: boolean;
  /** Validated data (if successful) */
  readonly data?: T;
  /** Validation error message (if failed) */
  readonly error?: string;
  /** Detailed validation results */
  readonly details?: {
    readonly validatedFields: readonly string[];
    readonly warnings: readonly string[];
    readonly normalizedValues: Partial<T>;
    readonly validationRules: readonly string[];
  };
}

/**
 * Reward recipient service result
 */
export interface RewardRecipientServiceResult {
  /** Normalization success status */
  readonly success: boolean;
  /** Normalized recipients (if successful) */
  readonly recipients?: readonly import('../services/reward-recipient-service.js').NormalizedRewardRecipient[];
  /** Error message (if failed) */
  readonly error?: string;
  /** Processing details */
  readonly details?: {
    readonly totalAllocation: number;
    readonly recipientCount: number;
    readonly adjustments: readonly string[];
    readonly warnings: readonly string[];
  };
}

// ============================================================================
// Farcaster Integration Public API Types
// ============================================================================

/**
 * Farcaster user lookup result with comprehensive data
 */
export interface FarcasterUserResult {
  /** Lookup success status */
  readonly success: boolean;
  /** User data (if found) */
  readonly user?: {
    readonly fid: number;
    readonly username: string;
    readonly displayName: string;
    readonly pfpUrl?: string;
    readonly bio?: string;
    readonly followerCount: number;
    readonly followingCount: number;
    readonly verifiedAddresses: readonly Address[];
  };
  /** Error message (if failed) */
  readonly error?: string;
  /** Lookup metadata */
  readonly metadata: {
    readonly source: 'warpcast' | 'neynar' | 'hub';
    readonly timestamp: number;
    readonly cacheHit: boolean;
  };
}

/**
 * Farcaster wallets result with validation
 */
export interface FarcasterWalletsResult {
  /** Lookup success status */
  readonly success: boolean;
  /** Wallet addresses (if found) */
  readonly wallets?: readonly Address[];
  /** Error message (if failed) */
  readonly error?: string;
  /** Wallet metadata */
  readonly metadata: {
    readonly totalWallets: number;
    readonly verifiedWallets: number;
    readonly source: string;
    readonly timestamp: number;
  };
}

// ============================================================================
// Type Guards and Validation Functions
// ============================================================================

/**
 * Type guard for ClankerSDKOptions
 */
export function isClankerSDKOptions(obj: unknown): obj is ClankerSDKOptions {
  if (!obj || typeof obj !== 'object') return false;
  
  const options = obj as Record<string, unknown>;
  
  return (
    !!options.wallet && typeof options.wallet === 'object' &&
    !!options.publicClient && typeof options.publicClient === 'object'
  );
}

/**
 * Type guard for SimpleDeployConfiguration
 */
export function isSimpleDeployConfiguration(obj: unknown): obj is SimpleDeployConfiguration {
  if (!obj || typeof obj !== 'object') return false;
  
  const config = obj as Record<string, unknown>;
  
  return (
    typeof config.name === 'string' &&
    typeof config.symbol === 'string' &&
    typeof config.tokenAdmin === 'string' &&
    typeof config.chainId === 'number'
  );
}

/**
 * Type guard for BatchDeploymentOptions
 */
export function isBatchDeploymentOptions(obj: unknown): obj is BatchDeploymentOptions {
  if (!obj || typeof obj !== 'object') return false;
  
  const options = obj as Record<string, unknown>;
  
  return (
    (options.concurrency === undefined || typeof options.concurrency === 'number') &&
    (options.delay === undefined || typeof options.delay === 'number') &&
    (options.retries === undefined || typeof options.retries === 'number')
  );
}

/**
 * Type guard for MultiWalletBatchConfiguration
 */
export function isMultiWalletBatchConfiguration(obj: unknown): obj is MultiWalletBatchConfiguration {
  if (!obj || typeof obj !== 'object') return false;
  
  const config = obj as Record<string, unknown>;
  
  return (
    (typeof config.farcasterInput === 'string' || typeof config.farcasterInput === 'number') &&
    Array.isArray(config.tokenConfigs) &&
    config.tokenConfigs.length > 0
  );
}

/**
 * Safe conversion functions with runtime validation
 */
export function toClankerSDKOptions(obj: unknown): ClankerSDKOptions {
  if (!isClankerSDKOptions(obj)) {
    throw new Error('Invalid ClankerSDKOptions format');
  }
  return obj;
}

export function toSimpleDeployConfiguration(obj: unknown): SimpleDeployConfiguration {
  if (!isSimpleDeployConfiguration(obj)) {
    throw new Error('Invalid SimpleDeployConfiguration format');
  }
  return obj;
}

export function toBatchDeploymentOptions(obj: unknown): BatchDeploymentOptions {
  if (!isBatchDeploymentOptions(obj)) {
    throw new Error('Invalid BatchDeploymentOptions format');
  }
  return obj;
}

export function toMultiWalletBatchConfiguration(obj: unknown): MultiWalletBatchConfiguration {
  if (!isMultiWalletBatchConfiguration(obj)) {
    throw new Error('Invalid MultiWalletBatchConfiguration format');
  }
  return obj;
}