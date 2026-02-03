/**
 * Specific interfaces for configuration objects
 * Replaces generic Record<string, unknown> types with typed interfaces
 * Requirements: 9.2, 9.3 - Replace generic Record types with specific interfaces
 */

import type { Address } from 'viem';
import type { TokenMetadata, PoolPosition, ErrorContext } from './base-types.js';

// ============================================================================
// Token Configuration Interfaces
// ============================================================================

/**
 * Comprehensive token configuration interface
 * Replaces: Record<string, unknown> in token validation and deployment
 */
export interface TokenConfiguration {
  readonly name: string;
  readonly symbol: string;
  readonly image?: string;
  readonly description?: string;
  readonly tokenAdmin?: Address;
  readonly chainId?: number;
  readonly mev?: number | boolean;
  readonly fees?: FeeConfiguration;
  readonly rewardRecipients?: readonly RewardRecipientConfiguration[];
  readonly socials?: SocialConfiguration;
  readonly vault?: VaultConfiguration;
  readonly metadata?: TokenMetadata;
  readonly context?: DeploymentContext;
  readonly salt?: `0x${string}`;
  readonly pairedToken?: Address;
  readonly poolPositions?: readonly PoolPosition[];
}

export interface FeeConfiguration {
  readonly type: 'static' | 'dynamic';
  readonly clankerFee?: number;
  readonly pairedFee?: number;
  readonly baseFee?: number;
  readonly maxLpFee?: number;
  // Unified fee structure (new)
  readonly feePercentage?: number; // Same fee for both tokens
}

export interface RewardRecipientConfiguration {
  readonly address: Address;
  readonly allocation: number;
  readonly rewardToken?: 'Both' | 'Paired' | 'Clanker';
}

export interface SocialConfiguration {
  readonly website?: string;
  readonly twitter?: string;
  readonly telegram?: string;
  readonly discord?: string;
}

export interface VaultConfiguration {
  readonly enabled: boolean;
  readonly percentage: number;
  readonly lockupDays: number;
  readonly vestingDays: number;
  readonly recipient?: Address;
}

export interface DeploymentContext {
  readonly interface: string;
  readonly platform?: string;
  readonly version?: string;
  readonly timestamp?: number;
  readonly [key: string]: unknown;
}

// ============================================================================
// Batch Configuration Interfaces
// ============================================================================

/**
 * Multi-wallet batch configuration
 * Replaces: Record<string, unknown>[] in batch deployment
 */
export interface BatchConfiguration {
  readonly farcasterInput: string | number;
  readonly tokenConfigs: readonly TokenConfiguration[];
  readonly deployerPrivateKeys?: readonly `0x${string}`[];
  readonly maxAddressesPerDeployer?: number;
  readonly concurrency?: number;
  readonly delay?: number;
  readonly retries?: number;
}

/**
 * Batch deployment options
 */
export interface BatchDeploymentOptions {
  readonly concurrency?: number;
  readonly delay?: number;
  readonly retries?: number;
  readonly onProgress?: (completed: number, total: number) => void;
  readonly onError?: (index: number, error: Error, config: TokenConfiguration) => void;
  readonly adaptiveConcurrency?: boolean;
}

// ============================================================================
// Service Configuration Interfaces
// ============================================================================

/**
 * Validation service configuration
 * Replaces: Record<string, unknown> in validation contexts
 */
export interface ValidationConfiguration {
  readonly strictMode?: boolean;
  readonly allowEmptyFields?: boolean;
  readonly maxNameLength?: number;
  readonly maxSymbolLength?: number;
  readonly maxDescriptionLength?: number;
  readonly requiredFields?: readonly string[];
}

/**
 * Service result details
 * Replaces: Record<string, unknown> in service result details
 */
export interface ServiceResultDetails {
  readonly validationErrors?: readonly string[];
  readonly warnings?: readonly string[];
  readonly processedFields?: readonly string[];
  readonly skippedFields?: readonly string[];
  readonly normalizedValues?: Partial<TokenConfiguration>;
  readonly [key: string]: unknown;
}

// ============================================================================
// Reward Recipient Service Configuration
// ============================================================================

/**
 * Reward recipient service options
 * Replaces: RewardRecipientOptions = Record<string, unknown>
 */
export interface RewardRecipientOptions {
  readonly defaultRewardToken?: 'Both' | 'Paired' | 'Clanker';
  readonly allowZeroAllocation?: boolean;
  readonly maxRecipients?: number;
  readonly requireIntegerAllocations?: boolean;
  readonly normalizeAddresses?: boolean;
}

// ============================================================================
// Metadata and Utility Interfaces
// ============================================================================

/**
 * Structured metadata interface
 * Replaces: Record<string, unknown> for metadata encoding/decoding
 */
export interface StructuredMetadata {
  readonly version?: string;
  readonly creator?: Address;
  readonly timestamp?: number;
  readonly tags?: readonly string[];
  readonly properties?: {
    readonly [key: string]: string | number | boolean;
  };
  readonly links?: {
    readonly [key: string]: string;
  };
}

/**
 * Wallet statistics configuration
 * Replaces: Record<string, unknown> in wallet stats calculations
 */
export interface WalletStatistics {
  readonly address: Address;
  readonly deploymentsCount: number;
  readonly successfulDeployments: number;
  readonly failedDeployments: number;
  readonly totalGasUsed: bigint;
  readonly averageGasPrice: bigint;
  readonly totalCost: bigint;
  readonly lastDeploymentTime?: number;
}

// ============================================================================
// Type Guards and Validation Functions
// ============================================================================

/**
 * Type guard for token configuration
 */
export function isTokenConfiguration(obj: unknown): obj is TokenConfiguration {
  if (!obj || typeof obj !== 'object') return false;
  
  const config = obj as Record<string, unknown>;
  
  return (
    typeof config.name === 'string' &&
    config.name.trim().length > 0 &&
    typeof config.symbol === 'string' &&
    config.symbol.trim().length > 0
  );
}

/**
 * Type guard for batch configuration
 */
export function isBatchConfiguration(obj: unknown): obj is BatchConfiguration {
  if (!obj || typeof obj !== 'object') return false;
  
  const config = obj as Record<string, unknown>;
  
  return (
    (typeof config.farcasterInput === 'string' || typeof config.farcasterInput === 'number') &&
    Array.isArray(config.tokenConfigs) &&
    config.tokenConfigs.every(isTokenConfiguration)
  );
}

/**
 * Type guard for fee configuration
 */
export function isFeeConfiguration(obj: unknown): obj is FeeConfiguration {
  if (!obj || typeof obj !== 'object') return false;
  
  const config = obj as Record<string, unknown>;
  
  return (
    (config.type === 'static' || config.type === 'dynamic') &&
    (config.clankerFee === undefined || typeof config.clankerFee === 'number') &&
    (config.pairedFee === undefined || typeof config.pairedFee === 'number') &&
    (config.baseFee === undefined || typeof config.baseFee === 'number') &&
    (config.maxLpFee === undefined || typeof config.maxLpFee === 'number')
  );
}

/**
 * Type guard for reward recipient configuration
 */
export function isRewardRecipientConfiguration(obj: unknown): obj is RewardRecipientConfiguration {
  if (!obj || typeof obj !== 'object') return false;
  
  const config = obj as Record<string, unknown>;
  
  return (
    typeof config.address === 'string' &&
    config.address.startsWith('0x') &&
    config.address.length === 42 &&
    typeof config.allocation === 'number' &&
    config.allocation >= 0 &&
    config.allocation <= 100
  );
}

/**
 * Type guard for error context
 */
export function isErrorContext(obj: unknown): obj is ErrorContext {
  if (!obj || typeof obj !== 'object') return false;
  
  // Error context is flexible, just check it's an object
  return true;
}

/**
 * Safe conversion from unknown to TokenConfiguration
 */
export function toTokenConfiguration(obj: unknown): TokenConfiguration {
  if (!isTokenConfiguration(obj)) {
    throw new Error('Invalid token configuration format');
  }
  return obj;
}

/**
 * Safe conversion from unknown to BatchConfiguration
 */
export function toBatchConfiguration(obj: unknown): BatchConfiguration {
  if (!isBatchConfiguration(obj)) {
    throw new Error('Invalid batch configuration format');
  }
  return obj;
}