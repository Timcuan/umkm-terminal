/**
 * Clanker SDK v4.25
 *
 * Multi-chain token deployment SDK for Clanker protocol.
 * Supports: Base, Ethereum, Arbitrum, Unichain, Monad
 *
 * @example
 * ```typescript
 * import { Clanker, CHAIN_IDS } from 'clanker-sdk';
 * import { createPublicClient, createWalletClient, http } from 'viem';
 * import { privateKeyToAccount } from 'viem/accounts';
 * import { base } from 'viem/chains';
 *
 * const account = privateKeyToAccount(process.env.PRIVATE_KEY);
 * const publicClient = createPublicClient({ chain: base, transport: http() });
 * const wallet = createWalletClient({ account, chain: base, transport: http() });
 *
 * const clanker = new Clanker({ wallet, publicClient });
 *
 * // Deploy on Base
 * const result = await clanker.deploy({
 *   name: 'My Token',
 *   symbol: 'TKN',
 *   image: 'ipfs://...',
 *   tokenAdmin: account.address,
 *   chainId: CHAIN_IDS.BASE,
 * });
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Core SDK
// =============================================================================

export { Clanker } from './v4/index.js';

// =============================================================================
// Types
// =============================================================================

export type {
  ClankerError,
  ClankerTokenV4,
  DeployResult,
  DynamicFeeConfig,
  FeeConfig,
  LockerConfig,
  MevConfig,
  MevModuleType,
  OperationResult,
  PoolPosition,
  RewardRecipient,
  RewardsConfig,
  StaticFeeConfig,
  TokenBase,
  TokenMetadata,
  VaultConfig,
} from './types/index.js';

// =============================================================================
// Constants
// =============================================================================

export {
  DEFAULT_LOCK_DURATION,
  DEFAULT_SUPPLY,
  FEE_CONFIGS,
  FeeConfigPreset,
  MEV_SNIPER_AUCTION_DEFAULTS,
  MEV_SNIPER_AUCTION_LIMITS,
  POOL_POSITIONS,
  PoolPositionPreset,
} from './constants/index.js';

// =============================================================================
// Chains
// =============================================================================

export type { SupportedChainId } from './chains/index.js';
export {
  // Chain IDs
  CHAIN_IDS,
  // Utilities
  getChain,
  getSupportedChainIds,
  getWethAddress,
  isChainSupported,
  // Custom chains
  monad,
  // Supported chains map
  SUPPORTED_CHAINS,
  // WETH addresses
  WETH_ADDRESSES,
  // Re-exported viem chains
  arbitrum,
  base,
  mainnet,
  unichain,
} from './chains/index.js';

// =============================================================================
// Contracts
// =============================================================================

export {
  ClankerFactoryAbi,
  FeeLockerAbi,
  LockerAbi,
  TokenAbi,
  VaultAbi,
} from './contracts/abis/index.js';

export type {
  ChainDeployment,
  ClankerContracts,
} from './contracts/addresses.js';

export {
  DEPLOYMENTS,
  getContracts,
  getDeployment,
  isChainDeployed,
} from './contracts/addresses.js';

// =============================================================================
// Utilities
// =============================================================================

export {
  decodeMetadata,
  encodeMetadata,
  formatTokenAmount,
  getMarketCapFromTick,
  getPairedTokenAddress,
  getPoolPositions,
  getTickFromMarketCap,
  isValidAddress,
  parseTokenAmount,
  validatePoolPositions,
} from './utils/index.js';

// =============================================================================
// Config & Deployer
// =============================================================================

export {
  loadEnvConfig,
  getRpcUrl,
  getExplorerUrl,
  getChainName,
  validateConfig,
  type ClankerEnvConfig,
} from './config/index.js';

export {
  Deployer,
  quickDeploy,
  createDeployer,
  createBaseDeployer,
  createEthDeployer,
  createArbDeployer,
  type SimpleDeployConfig,
  type DeployOutput,
} from './deployer/index.js';
