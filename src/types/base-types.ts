/**
 * Base type definitions shared across modules
 * Prevents circular imports between type files
 */

import type { Address } from 'viem';

// ============================================================================
// Base Token Types
// ============================================================================

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
 * Error context configuration
 * Replaces: Record<string, unknown> in error contexts
 */
export interface ErrorContext {
  readonly operation?: string;
  readonly component?: string;
  readonly tokenIndex?: number;
  readonly batchIndex?: number;
  readonly walletAddress?: Address;
  readonly chainId?: number;
  readonly txHash?: `0x${string}`;
  readonly timestamp?: number;
  readonly [key: string]: unknown;
}

/**
 * Safe conversion from unknown to ErrorContext
 */
export function toErrorContext(obj: unknown): ErrorContext {
  if (!obj || typeof obj !== 'object') {
    return {};
  }
  return obj as ErrorContext;
}