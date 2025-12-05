/**
 * Utility Functions
 */

import { getWethAddress } from '../chains/index.js';
import { DEFAULT_SUPPLY, POOL_POSITIONS, type PoolPositionPreset } from '../constants/index.js';
import type { PoolPosition } from '../types/index.js';

// ============================================================================
// Market Cap Utilities
// ============================================================================

/**
 * Calculate tick from market cap in ETH
 *
 * @param marketCapEth - Target market cap in ETH
 * @param supply - Token supply (defaults to 100B)
 * @returns Tick value for the given market cap
 */
export function getTickFromMarketCap(
  marketCapEth: number,
  supply: bigint = DEFAULT_SUPPLY
): number {
  // Price per token = marketCapEth / supply
  const pricePerToken = marketCapEth / Number(supply / 10n ** 18n);

  // tick = log1.0001(price) * 10000
  // For token0/token1 where token is token1
  const tick = Math.floor(Math.log(pricePerToken) / Math.log(1.0001));

  // Round to nearest 60 (tick spacing for 0.3% fee tier)
  return Math.round(tick / 60) * 60;
}

/**
 * Calculate market cap from tick
 *
 * @param tick - Tick value
 * @param supply - Token supply (defaults to 100B)
 * @returns Market cap in ETH
 */
export function getMarketCapFromTick(tick: number, supply: bigint = DEFAULT_SUPPLY): number {
  const price = 1.0001 ** tick;
  return price * Number(supply / 10n ** 18n);
}

// ============================================================================
// Pool Position Utilities
// ============================================================================

/**
 * Get pool positions by preset name
 */
export function getPoolPositions(preset: PoolPositionPreset): PoolPosition[] {
  return POOL_POSITIONS[preset];
}

/**
 * Validate pool positions
 * - Total BPS must equal 10000
 * - Ticks must be valid
 */
export function validatePoolPositions(positions: PoolPosition[]): boolean {
  const totalBps = positions.reduce((sum, p) => sum + p.bps, 0);
  if (totalBps !== 10_000) {
    return false;
  }

  for (const pos of positions) {
    if (pos.tickLower >= pos.tickUpper) {
      return false;
    }
    if (pos.bps <= 0 || pos.bps > 10_000) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Address Utilities
// ============================================================================

/**
 * Check if an address is valid
 */
export function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get paired token address (WETH) for a chain
 */
export function getPairedTokenAddress(chainId: number): `0x${string}` {
  const weth = getWethAddress(chainId);
  if (!weth) {
    throw new Error(`WETH address not found for chain ${chainId}`);
  }
  return weth;
}

// ============================================================================
// Encoding Utilities
// ============================================================================

/**
 * Encode metadata to JSON string
 */
export function encodeMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata);
}

/**
 * Decode metadata from JSON string
 */
export function decodeMetadata(metadata: string): Record<string, unknown> {
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === 0n) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${integerPart}.${fractionalStr}`;
}

/**
 * Parse token amount from string
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [integerPart, fractionalPart = ''] = amount.split('.');
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integerPart + paddedFractional);
}
