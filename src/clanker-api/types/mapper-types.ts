/**
 * Types for field mapping between SDK format and Clanker API format
 */

import type { ClankerTokenV4 } from '../../types/index.js';
import type { ClankerAPITokenRequest, ClankerAPIResponse } from './api-types.js';

// ============================================================================
// Mapping Context Types
// ============================================================================

export interface MappingContext {
  chainId: number;
  operationMethod: 'direct' | 'api';
  preserveDefaults: boolean;
  validateRequired: boolean;
}

// ============================================================================
// Field Mapping Types
// ============================================================================

export interface FieldMappingResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

export interface RewardsMappingConfig {
  convertBpsToPercentage: boolean;
  validateTotalAllocation: boolean;
  defaultFeePreference: 'Both' | 'Clanker' | 'Paired';
}

export interface PoolMappingConfig {
  defaultPairedToken?: string;
  defaultMarketCap: number;
  validatePairedToken: boolean;
}

// ============================================================================
// Mapper Interface
// ============================================================================

export interface IFieldMapper {
  /**
   * Convert SDK format to Clanker API format
   */
  mapToAPIFormat(
    token: ClankerTokenV4,
    context?: Partial<MappingContext>
  ): FieldMappingResult<ClankerAPITokenRequest>;

  /**
   * Convert Clanker API response back to SDK format
   */
  mapFromAPIResponse(
    apiResponse: ClankerAPIResponse,
    originalToken: ClankerTokenV4,
    context?: Partial<MappingContext>
  ): FieldMappingResult<{
    address: string;
    txHash: string;
    poolAddress?: string;
    liquidityTxHash?: string;
  }>;

  /**
   * Validate mapping compatibility
   */
  validateMapping(
    token: ClankerTokenV4,
    context?: Partial<MappingContext>
  ): FieldMappingResult<boolean>;
}

// ============================================================================
// Specific Mapping Types
// ============================================================================

export interface TokenMetadataMapping {
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  socialMediaUrls?: Array<{
    platform: string;
    url: string;
  }>;
  auditUrls?: string[];
}

export interface RewardsMapping {
  admin: string;
  recipient: string;
  allocation: number; // Percentage for API, BPS for SDK
  rewardsToken: 'Both' | 'Clanker' | 'Paired';
}

export interface FeesMapping {
  type: 'static' | 'dynamic';
  clankerFee?: number;
  pairedFee?: number;
  // Dynamic fee fields
  baseFee?: number;
  maxFee?: number;
  referenceTickFilterPeriod?: number;
  resetPeriod?: number;
  resetTickFilter?: number;
  feeControlNumerator?: number;
  decayFilterBps?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type MappingDirection = 'toAPI' | 'fromAPI';

export interface MappingOptions {
  direction: MappingDirection;
  strict?: boolean;
  preserveExtensions?: boolean;
  generateRequestKey?: boolean;
}