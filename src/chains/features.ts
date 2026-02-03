/**
 * Chain Feature Detection
 * Utilities to detect which features are available on each chain
 */

import { getContracts } from '../contracts/addresses.js';
import { CHAIN_IDS } from './index.js';

export interface ChainFeatures {
  /** MEV protection is available */
  mevProtection: boolean;
  /** Dynamic fee hooks are available */
  dynamicFees: boolean;
  /** Fee locker is deployed */
  feeLocker: boolean;
  /** Vault is deployed */
  vault: boolean;
  /** Airdrop contract is deployed */
  airdrop: boolean;
}

/**
 * Get features available for a specific chain
 */
export function getChainFeatures(chainId: number): ChainFeatures {
  const contracts = getContracts(chainId);

  if (!contracts) {
    return {
      mevProtection: false,
      dynamicFees: false,
      feeLocker: false,
      vault: false,
      airdrop: false,
    };
  }

  return {
    mevProtection: contracts.mevModule !== '0x0000000000000000000000000000000000000000',
    dynamicFees: contracts.feeDynamicHook !== '0x0000000000000000000000000000000000000000',
    feeLocker: contracts.feeLocker !== '0x0000000000000000000000000000000000000000',
    vault: contracts.vault !== '0x0000000000000000000000000000000000000000',
    airdrop: contracts.airdrop !== '0x0000000000000000000000000000000000000000',
  };
}

/**
 * Check if MEV protection is available on a chain
 */
export function hasMevProtection(chainId: number): boolean {
  return getChainFeatures(chainId).mevProtection;
}

/**
 * Check if dynamic fees are available on a chain
 */
export function hasDynamicFees(chainId: number): boolean {
  return getChainFeatures(chainId).dynamicFees;
}

/**
 * Get all chains that support a specific feature
 */
export function getChainsWithFeature(feature: keyof ChainFeatures): number[] {
  const chainIds = Object.values(CHAIN_IDS);
  return chainIds.filter((chainId) => getChainFeatures(chainId)[feature]);
}

/**
 * Get feature summary for all supported chains
 */
export function getAllChainFeatures(): Record<number, ChainFeatures> {
  const chainIds = Object.values(CHAIN_IDS);
  const features: Record<number, ChainFeatures> = {};

  for (const chainId of chainIds) {
    features[chainId] = getChainFeatures(chainId);
  }

  return features;
}
