/**
 * SDK Constants
 */

import type { FeeConfig, PoolPosition } from '../types/index.js';

// ============================================================================
// Default Values
// ============================================================================

/** Default token supply: 100 billion tokens with 18 decimals */
export const DEFAULT_SUPPLY = 100_000_000_000_000_000_000_000_000_000n;

/** Default lock duration: 1 year in seconds */
export const DEFAULT_LOCK_DURATION = 365 * 24 * 60 * 60;

// ============================================================================
// Pool Positions
// ============================================================================

export enum PoolPositionPreset {
  /** Standard single position covering full range */
  Standard = 'Standard',
  /** Project-optimized multi-position */
  Project = 'Project',
  /** 20 ETH starting market cap */
  TwentyETH = 'TwentyETH',
}

export const POOL_POSITIONS: Record<PoolPositionPreset, PoolPosition[]> = {
  [PoolPositionPreset.Standard]: [
    {
      tickLower: -230400,
      tickUpper: -120000,
      bps: 10_000,
    },
  ],
  [PoolPositionPreset.Project]: [
    { tickLower: -230400, tickUpper: -214000, bps: 1_000 },
    { tickLower: -214000, tickUpper: -155000, bps: 5_000 },
    { tickLower: -202000, tickUpper: -155000, bps: 1_500 },
    { tickLower: -155000, tickUpper: -120000, bps: 2_000 },
    { tickLower: -141000, tickUpper: -120000, bps: 500 },
  ],
  [PoolPositionPreset.TwentyETH]: [
    { tickLower: -223400, tickUpper: -212000, bps: 1_000 },
    { tickLower: -212000, tickUpper: -155000, bps: 5_000 },
    { tickLower: -201000, tickUpper: -155000, bps: 1_500 },
    { tickLower: -155000, tickUpper: -120000, bps: 2_000 },
    { tickLower: -141000, tickUpper: -120000, bps: 500 },
  ],
};

// ============================================================================
// Fee Configurations
// ============================================================================

export enum FeeConfigPreset {
  /** 1% static fee */
  StaticBasic = 'StaticBasic',
  /** 5% static fee */
  StaticFlat5Percent = 'StaticFlat5Percent',
  /** Dynamic fee 1-5% */
  DynamicBasic = 'DynamicBasic',
  /** Dynamic fee 1-3% */
  Dynamic3 = 'Dynamic3',
}

export const FEE_CONFIGS: Record<FeeConfigPreset, FeeConfig> = {
  [FeeConfigPreset.StaticBasic]: {
    type: 'static',
    clankerFee: 100,
    pairedFee: 100,
  },
  [FeeConfigPreset.StaticFlat5Percent]: {
    type: 'static',
    clankerFee: 500,
    pairedFee: 500,
  },
  [FeeConfigPreset.DynamicBasic]: {
    type: 'dynamic',
    startingSniperFee: 100,
    endingSniperFee: 500,
    baseFee: 100,
    maxFee: 500,
    clankerFee: 20,
    referenceTickFilterPeriod: 30,
    resetPeriod: 120,
    resetTickFilter: 200,
    feeControlNumerator: 500000000,
    decayFilterBps: 7500,
    decayDuration: 30,
  },
  [FeeConfigPreset.Dynamic3]: {
    type: 'dynamic',
    startingSniperFee: 100,
    endingSniperFee: 300,
    baseFee: 100,
    maxFee: 300,
    clankerFee: 20,
    referenceTickFilterPeriod: 30,
    resetPeriod: 120,
    resetTickFilter: 200,
    feeControlNumerator: 250000000,
    decayFilterBps: 7500,
    decayDuration: 30,
  },
};

// ============================================================================
// MEV Protection
// ============================================================================

export const MEV_SNIPER_AUCTION_DEFAULTS = {
  startingFee: 666777,
  endingFee: 50000,
  secondsToDecay: 30,
};

export const MEV_SNIPER_AUCTION_LIMITS = {
  minStartingFee: 0,
  maxStartingFee: 800000,
  minEndingFee: 0,
  maxEndingFee: 800000,
  minSecondsToDecay: 1,
  maxSecondsToDecay: 120,
};
