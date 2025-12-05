/**
 * Configuration Module
 * Load settings from environment variables or config object
 */

import { CHAIN_IDS } from '../chains/index.js';

// ============================================================================
// Types
// ============================================================================

export interface ClankerEnvConfig {
  // Required
  privateKey: `0x${string}`;

  // Chain
  chainId: number;
  rpcUrl?: string;

  // Token defaults
  defaultImage?: string;

  // Vault defaults
  vaultPercentage?: number;
  vaultLockupDays?: number;

  // MEV defaults
  mevBlockDelay?: number;

  // Fee defaults
  feeType?: 'static' | 'dynamic';
  feeBps?: number;
}

export interface TokenDeployConfig {
  name: string;
  symbol: string;
  image?: string;
  chainId?: number;
  vault?: {
    percentage: number;
    lockupDays: number;
  };
  mev?: {
    blockDelay: number;
  };
}

// ============================================================================
// Environment Loader
// ============================================================================

/**
 * Load configuration from environment variables
 */
export function loadEnvConfig(): ClankerEnvConfig {
  const env = typeof process !== 'undefined' ? process.env : {};

  const privateKey = env.PRIVATE_KEY || env.DEPLOYER_KEY || '';
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable required');
  }

  return {
    privateKey: privateKey.startsWith('0x')
      ? (privateKey as `0x${string}`)
      : (`0x${privateKey}` as `0x${string}`),

    chainId: Number.parseInt(env.CHAIN_ID || env.NETWORK_ID || '8453', 10),
    rpcUrl: env.RPC_URL || env.ETH_RPC_URL,

    defaultImage: env.DEFAULT_IMAGE || env.TOKEN_IMAGE,

    vaultPercentage: env.VAULT_PERCENTAGE ? Number.parseInt(env.VAULT_PERCENTAGE, 10) : undefined,
    vaultLockupDays: env.VAULT_LOCKUP_DAYS ? Number.parseInt(env.VAULT_LOCKUP_DAYS, 10) : 30,

    mevBlockDelay: env.MEV_BLOCK_DELAY ? Number.parseInt(env.MEV_BLOCK_DELAY, 10) : undefined,

    feeType: (env.FEE_TYPE as 'static' | 'dynamic') || 'static',
    feeBps: env.FEE_BPS ? Number.parseInt(env.FEE_BPS, 10) : 100,
  };
}

/**
 * Get RPC URL for chain
 */
export function getRpcUrl(chainId: number, customRpc?: string): string {
  if (customRpc) return customRpc;

  const env = typeof process !== 'undefined' ? process.env : {};

  // Check chain-specific env vars first
  const chainRpcEnvs: Record<number, string[]> = {
    [CHAIN_IDS.BASE]: ['BASE_RPC_URL', 'BASE_RPC'],
    [CHAIN_IDS.ETHEREUM]: ['ETH_RPC_URL', 'ETHEREUM_RPC_URL', 'MAINNET_RPC_URL'],
    [CHAIN_IDS.ARBITRUM]: ['ARBITRUM_RPC_URL', 'ARB_RPC_URL'],
    [CHAIN_IDS.UNICHAIN]: ['UNICHAIN_RPC_URL'],
    [CHAIN_IDS.MONAD]: ['MONAD_RPC_URL'],
  };

  const envKeys = chainRpcEnvs[chainId] || [];
  for (const key of envKeys) {
    if (env[key]) return env[key] as string;
  }

  // Fallback to public RPCs
  const publicRpcs: Record<number, string> = {
    [CHAIN_IDS.BASE]: 'https://mainnet.base.org',
    [CHAIN_IDS.ETHEREUM]: 'https://eth.llamarpc.com',
    [CHAIN_IDS.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
    [CHAIN_IDS.UNICHAIN]: 'https://mainnet.unichain.org',
    [CHAIN_IDS.MONAD]: 'https://rpc.monad.xyz',
  };

  return publicRpcs[chainId] || '';
}

/**
 * Get explorer URL for chain
 */
export function getExplorerUrl(chainId: number): string {
  const explorers: Record<number, string> = {
    [CHAIN_IDS.BASE]: 'https://basescan.org',
    [CHAIN_IDS.ETHEREUM]: 'https://etherscan.io',
    [CHAIN_IDS.ARBITRUM]: 'https://arbiscan.io',
    [CHAIN_IDS.UNICHAIN]: 'https://uniscan.xyz',
    [CHAIN_IDS.MONAD]: 'https://explorer.monad.xyz',
  };
  return explorers[chainId] || '';
}

/**
 * Get chain name
 */
export function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    [CHAIN_IDS.BASE]: 'Base',
    [CHAIN_IDS.ETHEREUM]: 'Ethereum',
    [CHAIN_IDS.ARBITRUM]: 'Arbitrum',
    [CHAIN_IDS.UNICHAIN]: 'Unichain',
    [CHAIN_IDS.MONAD]: 'Monad',
  };
  return names[chainId] || `Chain ${chainId}`;
}

// ============================================================================
// Config Validator
// ============================================================================

export function validateConfig(config: ClankerEnvConfig): string[] {
  const errors: string[] = [];

  if (!config.privateKey || !config.privateKey.startsWith('0x')) {
    errors.push('Invalid private key format');
  }

  if (config.privateKey.length !== 66) {
    errors.push('Private key must be 32 bytes (64 hex chars + 0x)');
  }

  if (
    ![
      CHAIN_IDS.BASE,
      CHAIN_IDS.ETHEREUM,
      CHAIN_IDS.ARBITRUM,
      CHAIN_IDS.UNICHAIN,
      CHAIN_IDS.MONAD,
    ].includes(config.chainId)
  ) {
    errors.push(`Unsupported chain ID: ${config.chainId}`);
  }

  if (config.vaultPercentage !== undefined) {
    if (config.vaultPercentage < 0 || config.vaultPercentage > 90) {
      errors.push('Vault percentage must be 0-90');
    }
  }

  if (config.mevBlockDelay !== undefined) {
    if (config.mevBlockDelay < 0 || config.mevBlockDelay > 100) {
      errors.push('MEV block delay must be 0-100');
    }
  }

  return errors;
}
