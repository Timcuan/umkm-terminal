/**
 * Simple Deployer Functions
 * Quick deployment functions and factory methods for SimpleDeployConfig
 */

import { loadEnvConfig } from '../config/index.js';
import { validatePrivateKey } from '../validation/index.js';
import { wrapError } from '../errors/index.js';
import { Deployer, type SimpleDeployConfig, type DeployOutput } from './deployer.js';

// ============================================================================
// Quick Deploy Function
// ============================================================================

/**
 * Quick deploy function - uses environment variables
 *
 * @example
 * ```typescript
 * const result = await quickDeploy({
 *   name: 'My Token',
 *   symbol: 'TKN',
 * });
 * console.log(result.tokenAddress);
 * ```
 */
export async function quickDeploy(config: SimpleDeployConfig): Promise<DeployOutput> {
  const deployer = new Deployer({});
  return deployer.deploy(config);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create deployer for specific chain
 */
export function createDeployer(chainId: number, privateKey?: `0x${string}`): Deployer {
  return new Deployer({
    config: {
      chainId,
      privateKey: privateKey || loadEnvConfig().privateKey,
    }
  });
}

/**
 * Create deployer for Base
 */
export function createBaseDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(8453, privateKey);
}

/**
 * Create deployer for Ethereum
 */
export function createEthDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(1, privateKey);
}

/**
 * Create deployer for Arbitrum
 */
export function createArbDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(42161, privateKey);
}

/**
 * Create deployer for Unichain
 */
export function createUnichainDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(130, privateKey);
}

/**
 * Create deployer for Monad
 */
export function createMonadDeployer(privateKey?: `0x${string}`): Deployer {
  return createDeployer(10143, privateKey);
}