/**
 * Chain Configurations - Mainnet Only
 * SDK v4.25 supports multi-chain mainnet deployments
 */

import type { Chain } from 'viem';
import { arbitrum, base, mainnet, unichain } from 'viem/chains';

// ============================================================================
// Custom Chain Definitions
// ============================================================================

export const monad: Chain = {
  id: 10143,
  name: 'Monad',
  nativeCurrency: { decimals: 18, name: 'MON', symbol: 'MON' },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
  testnet: false,
};

// ============================================================================
// Supported Mainnet Chains
// ============================================================================

export const SUPPORTED_CHAINS = {
  [base.id]: base, // 8453 - Base
  [mainnet.id]: mainnet, // 1 - Ethereum
  [arbitrum.id]: arbitrum, // 42161 - Arbitrum
  [unichain.id]: unichain, // 130 - Unichain
  [monad.id]: monad, // 10143 - Monad
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

// Chain IDs for easy reference
export const CHAIN_IDS = {
  BASE: base.id,
  ETHEREUM: mainnet.id,
  ARBITRUM: arbitrum.id,
  UNICHAIN: unichain.id,
  MONAD: monad.id,
} as const;

// ============================================================================
// WETH/Native Wrapped Token Addresses
// ============================================================================

export const WETH_ADDRESSES: Record<SupportedChainId, `0x${string}`> = {
  [base.id]: '0x4200000000000000000000000000000000000006',
  [mainnet.id]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [arbitrum.id]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  [unichain.id]: '0x4200000000000000000000000000000000000006',
  [monad.id]: '0x3bd359c1119da7da1d913d1c4d2b7c461115433a',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get WETH address for a chain
 */
export function getWethAddress(chainId: number): `0x${string}` | undefined {
  return WETH_ADDRESSES[chainId as SupportedChainId];
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: number): chainId is SupportedChainId {
  return chainId in SUPPORTED_CHAINS;
}

/**
 * Get chain by ID
 */
export function getChain(chainId: number): Chain | undefined {
  return SUPPORTED_CHAINS[chainId as SupportedChainId];
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): SupportedChainId[] {
  return Object.keys(SUPPORTED_CHAINS).map(Number) as SupportedChainId[];
}

// Re-export viem chains for convenience
export { arbitrum, base, mainnet, unichain };
