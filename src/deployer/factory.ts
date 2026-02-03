/**
 * Deployer Factory Functions
 * Factory functions and interfaces for creating deployers
 */

import { Deployer } from './deployer.js';
import { MultiChainDeployer } from './multi-chain-deployer.js';
import type { ClankerEnvConfig } from '../config/index.js';

// ============================================================================
// Factory Interface
// ============================================================================

/**
 * Interface for deployer factory to enable dependency injection
 */
export interface IDeployerFactory {
  /**
   * Create a deployer for a specific chain
   */
  create(chainId: number, privateKey?: `0x${string}`): Deployer;

  /**
   * Create a multi-chain deployer
   */
  createMultiChain(privateKey?: `0x${string}`): MultiChainDeployer;
}

// ============================================================================
// Default Factory Implementation
// ============================================================================

/**
 * Default deployer factory implementation
 */
export class DeployerFactory implements IDeployerFactory {
  constructor(private defaultConfig?: Partial<ClankerEnvConfig>) {}

  create(chainId: number, privateKey?: `0x${string}`): Deployer {
    return new Deployer({
      config: {
        ...this.defaultConfig,
        chainId,
        ...(privateKey && { privateKey }),
      }
    });
  }

  createMultiChain(privateKey?: `0x${string}`): MultiChainDeployer {
    return new MultiChainDeployer(privateKey);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a default deployer factory
 */
export function createDeployerFactory(config?: Partial<ClankerEnvConfig>): IDeployerFactory {
  return new DeployerFactory(config);
}

/**
 * Create a deployer factory with specific configuration
 */
export function createConfiguredDeployerFactory(config: Partial<ClankerEnvConfig>): IDeployerFactory {
  return new DeployerFactory(config);
}