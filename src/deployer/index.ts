/**
 * Deployer Module
 * Simple interface for deploying tokens from any platform
 */

// Core Deployer
export {
  Deployer,
  type DeployerOptions,
  type SimpleDeployConfig,
  type DeployOutput,
  type RewardTokenType,
  type FeeType,
  type PoolType,
} from './deployer.js';

// Simple Deployment Functions
export {
  quickDeploy,
  createDeployer,
  createBaseDeployer,
  createEthDeployer,
  createArbDeployer,
  createUnichainDeployer,
  createMonadDeployer,
} from './simple-deployer.js';

// Multi-Chain Deployment
export {
  MultiChainDeployer,
  multiDeploy,
  type ChainName,
  type MultiDeployConfig,
  type MultiDeployResult,
  type MultiDeploySummary,
} from './multi-chain-deployer.js';

// Batch Deployment
export {
  BatchDeployer,
  batchDeploy,
  batchDeployGenerated,
  type BatchTokenConfig,
  type BatchDeployOptions,
  type BatchDeployResult,
  type BatchDeploySummary,
} from './batch-deployer.js';

// Multi-Wallet Deployment
export {
  type DeployerWallet,
  type DeploymentJob,
  MultiWalletDeployer,
  type MultiWalletDeployOptions,
} from './multi-wallet-deployer.js';

// Nonce Management
export { NonceManager } from './nonce-manager.js';

// Deployment Service Interface
export {
  type IDeploymentService,
  type DeployResult,
  type RewardsInfo,
  ClankerDeploymentService,
} from './deployment-service.js';

// Factory Functions
export {
  type IDeployerFactory,
  DeployerFactory,
  createDeployerFactory,
  createConfiguredDeployerFactory,
} from './factory.js';