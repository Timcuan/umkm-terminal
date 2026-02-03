/**
 * Multi-Chain Deployer
 * Deploy the same token across multiple chains with one call
 */

import { loadEnvConfig } from '../config/index.js';
import { validatePrivateKey } from '../validation/index.js';
import { wrapError } from '../errors/index.js';
import { createDeployer } from './simple-deployer.js';
import type { SimpleDeployConfig } from './deployer.js';

// ============================================================================
// Types
// ============================================================================

/** Supported chain names for multi-deploy */
export type ChainName = 'base' | 'ethereum' | 'arbitrum' | 'unichain' | 'monad';

/** Chain name to ID mapping */
const CHAIN_NAME_TO_ID: Record<ChainName, number> = {
  base: 8453,
  ethereum: 1,
  arbitrum: 42161,
  unichain: 130,
  monad: 10143,
};

/** Multi-deploy token configuration (simplified) */
export interface MultiDeployConfig {
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token image URL (optional) */
  image?: string;
  /** Token description (optional) */
  description?: string;
  /** MEV protection blocks (default: 8, set 0 to disable) */
  mev?: number;
  /** Fee percentage (default: 5%) */
  feePercent?: number;
}

/** Result for each chain deployment */
export interface MultiDeployResult {
  chain: ChainName;
  chainId: number;
  success: boolean;
  tokenAddress?: `0x${string}`;
  txHash?: `0x${string}`;
  explorerUrl?: string;
  error?: string;
}

/** Summary of multi-chain deployment */
export interface MultiDeploySummary {
  token: { name: string; symbol: string };
  results: MultiDeployResult[];
  successful: number;
  failed: number;
  totalChains: number;
}

// ============================================================================
// Multi-Chain Deployer Class
// ============================================================================

/**
 * Multi-Chain Deployer
 * Deploy the same token across multiple chains with one call
 *
 * @example
 * ```typescript
 * const multiDeploy = new MultiChainDeployer();
 *
 * // Deploy to all chains
 * const results = await multiDeploy.deployToAll({
 *   name: 'My Token',
 *   symbol: 'TKN',
 * });
 *
 * // Deploy to specific chains
 * const results = await multiDeploy.deployTo(['base', 'arbitrum'], {
 *   name: 'My Token',
 *   symbol: 'TKN',
 * });
 * ```
 */
export class MultiChainDeployer {
  private privateKey: `0x${string}`;

  constructor(privateKey?: `0x${string}`) {
    this.privateKey = privateKey || loadEnvConfig().privateKey;

    // Validate private key
    try {
      validatePrivateKey(this.privateKey);
    } catch (error) {
      throw wrapError(error, 'Invalid private key provided for multi-chain deployment');
    }
  }

  /**
   * Get wallet address
   */
  get address(): `0x${string}` {
    return createDeployer(8453, this.privateKey).address;
  }

  /**
   * Deploy token to all supported chains
   */
  async deployToAll(config: MultiDeployConfig): Promise<MultiDeploySummary> {
    const chains: ChainName[] = ['base', 'ethereum', 'arbitrum', 'unichain', 'monad'];
    return this.deployTo(chains, config);
  }

  /**
   * Deploy token to specific chains
   */
  async deployTo(chains: ChainName[], config: MultiDeployConfig): Promise<MultiDeploySummary> {
    const results: MultiDeployResult[] = [];

    // Deploy to each chain sequentially
    for (const chain of chains) {
      const result = await this.deployToChain(chain, config);
      results.push(result);
    }

    // Build summary
    const successful = results.filter((r) => r.success).length;
    return {
      token: { name: config.name, symbol: config.symbol },
      results,
      successful,
      failed: results.length - successful,
      totalChains: results.length,
    };
  }

  /**
   * Deploy token to a single chain
   */
  async deployToChain(chain: ChainName, config: MultiDeployConfig): Promise<MultiDeployResult> {
    const chainId = CHAIN_NAME_TO_ID[chain];

    try {
      const deployer = createDeployer(chainId, this.privateKey);

      // Build simple config
      const deployConfig: SimpleDeployConfig = {
        name: config.name,
        symbol: config.symbol,
        image: config.image,
        description: config.description,
        mev: config.mev ?? 8,
        fees: {
          type: 'static',
          clankerFee: config.feePercent ?? 5,
          pairedFee: config.feePercent ?? 5,
        },
      };

      const result = await deployer.deploy(deployConfig);

      return {
        chain,
        chainId,
        success: result.success,
        tokenAddress: result.tokenAddress,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        error: result.error,
      };
    } catch (err) {
      return {
        chain,
        chainId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Deploy to multiple chains in parallel (faster but uses more gas at once)
   */
  async deployToParallel(
    chains: ChainName[],
    config: MultiDeployConfig
  ): Promise<MultiDeploySummary> {
    const promises = chains.map((chain) => this.deployToChain(chain, config));
    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.success).length;
    return {
      token: { name: config.name, symbol: config.symbol },
      results,
      successful,
      failed: results.length - successful,
      totalChains: results.length,
    };
  }
}

// ============================================================================
// Quick Multi-Chain Deploy Function
// ============================================================================

/**
 * Quick multi-chain deploy function
 *
 * @example
 * ```typescript
 * // Deploy to all chains
 * const results = await multiDeploy({
 *   name: 'My Token',
 *   symbol: 'TKN',
 * });
 *
 * // Deploy to specific chains
 * const results = await multiDeploy({
 *   name: 'My Token',
 *   symbol: 'TKN',
 * }, ['base', 'arbitrum']);
 * ```
 */
export async function multiDeploy(
  config: MultiDeployConfig,
  chains?: ChainName[]
): Promise<MultiDeploySummary> {
  const deployer = new MultiChainDeployer();
  if (chains && chains.length > 0) {
    return deployer.deployTo(chains, config);
  }
  return deployer.deployToAll(config);
}