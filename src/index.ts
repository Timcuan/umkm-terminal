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
  // Re-exported viem chains
  arbitrum,
  base,
  // Chain IDs
  CHAIN_IDS,
  // Utilities
  getChain,
  getSupportedChainIds,
  getWethAddress,
  isChainSupported,
  mainnet,
  // Custom chains
  monad,
  // Supported chains map
  SUPPORTED_CHAINS,
  unichain,
  // WETH addresses
  WETH_ADDRESSES,
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
  type ClankerEnvConfig,
  getChainName,
  getExplorerUrl,
  getRpcUrl,
  loadEnvConfig,
  validateConfig,
} from './config/index.js';

export {
  // Single-chain deployers
  createArbDeployer,
  createBaseDeployer,
  createDeployer,
  createEthDeployer,
  createMonadDeployer,
  createUnichainDeployer,
  Deployer,
  type DeployOutput,
  quickDeploy,
  type SimpleDeployConfig,
} from './deployer/index.js';

// =============================================================================
// Batch Deploy (Template-Based)
// =============================================================================

export {
  // Types
  type BatchChain,
  type BatchDefaults,
  type BatchOptions,
  type BatchResult,
  type BatchSummary,
  type BatchTemplate,
  type BatchToken,
  deployFromFile,
  // Deploy functions
  deployTemplate,
  formatDuration,
  type GenerateOptions,
  generateNumberedTemplate,
  // Template functions
  generateTemplate,
  loadTemplate,
  type RewardRecipient as BatchRewardRecipient,
  saveResults,
  saveTemplate,
  type TokenSocials,
  validateTemplate,
} from './batch/index.js';

// =============================================================================
// Farcaster Module
// =============================================================================

export {
  type FarcasterLookupResult,
  type FarcasterUser,
  type FarcasterWalletsResult,
  getProfilePicture,
  getUserByFid,
  getUserByUsername,
  getUsersByFids,
  getUserWallets,
  getWalletCount,
  resolveUser,
  validateFid,
  validateUsername,
} from './farcaster/index.js';

// =============================================================================
// Wallet Management
// =============================================================================

export {
  // Types
  type StoredWallet,
  type ValidationResult,
  type WalletBackup,
  type WalletInfo,
  type WalletOperationResult,
  type WalletStore,
  // Crypto utilities
  decrypt,
  decryptLegacy,
  decryptSimple,
  encrypt,
  encryptSimple,
  formatAddress,
  generateMnemonicPhrase,
  generateWallet,
  generateWalletWithMnemonic,
  getAddressFromKey,
  isLegacyEncryption,
  mnemonicToAddress,
  mnemonicToPrivateKey,
  validateMnemonicPhrase,
  validatePrivateKey,
  // Storage - paths
  getBackupDir,
  getEnvPath,
  getStorePath,
  getWalletDir,
  // Storage - multi-wallet
  addWalletToStore,
  addWalletWithMnemonicToStore,
  decryptWallet,
  decryptWalletMnemonic,
  getActiveWallet,
  getAllWallets,
  getWalletByAddress,
  loadWalletStore,
  migrateEnvWalletToStore,
  migrateOldWalletStore,
  removeWalletFromStore,
  saveWalletStore,
  setActiveWallet,
  updateWalletName,
  walletHasMnemonic,
  // Storage - .env sync
  getCurrentPrivateKey,
  getCurrentWallet,
  getEnvPrivateKey,
  savePrivateKeyToEnv,
  syncActiveWalletToEnv,
  // Storage - backup files
  createBackupFile,
  importFromBackup,
  listBackupFiles,
  readBackupFile,
  // Interactive menu
  handleWalletManagement,
  showWalletMenu,
} from './wallet/index.js';
