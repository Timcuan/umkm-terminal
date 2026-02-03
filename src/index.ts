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
  // Comprehensive public API types
  ClankerSDKOptions,
  ClankerSDKConfig,
  SDKDeployResult,
  DeployerConstructorOptions,
  SimpleDeployConfiguration,
  DeploymentOptions,
  EnhancedDeployOutput,
  ValidatedBatchTemplate,
  BatchTemplateDefaults,
  BatchTokenConfiguration,
  BatchDeploymentOptions,
  BatchTokenResult,
  BatchDeploymentSummary,
  MultiWalletBatchConfiguration,
  MultiWalletDeploymentOptions,
  MultiWalletDeploymentResult,
  // Configuration types
  TokenConfiguration,
  BatchConfiguration,
  FeeConfiguration,
  RewardRecipientConfiguration,
  VaultConfiguration,
  ErrorContext,
  ServiceResultDetails,
  // Deployment argument types
  DeploymentArgs,
  LegacyWallet,
  ModernWallet,
  MigratableWallet,
  ValidatableTokenConfig,
  QRCodeOptions,
  // Runtime validation types
  RuntimeValidationResult,
  ValidationContext,
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

export {
  // Custom chains
  arbitrum,
  base,
  // Chain IDs
  CHAIN_IDS,
  type ChainFeatures,
  getAllChainFeatures,
  // Utilities
  getChain,
  // Feature detection
  getChainFeatures,
  getChainsWithFeature,
  getSupportedChainIds,
  getWethAddress,
  hasDynamicFees,
  hasMevProtection,
  isChainSupported,
  mainnet,
  monad,
  // Supported chains map
  SUPPORTED_CHAINS,
  type SupportedChainId,
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

// Runtime validation utilities
export {
  validateAddress,
  validateChainId,
  validateTokenName,
  validateTokenSymbol,
  validateFeeConfig,
  validateRewardRecipient,
  validateVaultConfig,
  validateClankerTokenV4,
  validateSimpleDeployConfiguration,
  validateBatchDeploymentOptions,
  combineValidationResults,
  createValidationContext,
  validateArray,
} from './types/index.js';

// =============================================================================
// Config & Deployer
// =============================================================================

// Environment validator for easy .env configuration
export {
  checkRequiredVariables,
  type EnvConfig,
  getConfigSummary,
  loadEnvConfig as loadEnvConfigV2,
} from './config/env-validator.js';
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
// Multi-Wallet Batch Deploy
// =============================================================================

export {
  type BatchDeployConfig,
  BatchDeployConfigBuilder,
  createBatchDeployConfig,
  type MultiWalletBatchConfig,
  MultiWalletBatchManager,
} from './batch/multi-wallet-batch.js';

// =============================================================================
// Farcaster Module
// =============================================================================

export {
  type FarcasterLookupResult,
  type FarcasterUser,
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
// Validation Services
// =============================================================================

export {
  ValidationService,
  type IValidationService,
  type ValidationResult as ServiceValidationResult,
  type PrivateKeyInfo,
  type AddressInfo,
  type MnemonicInfo,
  type TokenConfigInfo,
  validatePrivateKeyOrThrow,
  validateAddressOrThrow,
  validateTokenConfigOrThrow,
  defaultValidationService,
  RewardRecipientService,
  type IRewardRecipientService,
  type RewardRecipientConfig,
  type NormalizedRewardRecipient,
  type RewardRecipientResult,
  normalizeRewardRecipientsOrThrow,
  validateRewardRecipientsOrThrow,
  defaultRewardRecipientService
} from './services/index.js';

// =============================================================================
// Clanker API Integration
// =============================================================================

export {
  // Types
  type ClankerAPITokenRequest,
  type ClankerAPIResponse,
  type ClankerAPIConfig,
  type OperationMethod,
  // Errors
  ClankerSDKError,
  ClankerAPIError,
  ConfigurationError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  createAPIError,
  createConfigError,
  createAuthError,
  createNetworkError,
  createClankerValidationError,
  // Core components
  ClankerAPIMethod,
  UnifiedExecutor,
  ConfigManager,
  FieldMapper,
  // Enhanced Clanker classes
  EnhancedClanker,
  BackwardCompatibleClanker,
  createEnhancedClanker,
  createEnhancedClankerFromEnv,
  createUnifiedExecutor,
  createUnifiedExecutorFromEnv,
} from './clanker-api/index.js';

// =============================================================================
// Wallet Management
// =============================================================================

export {
  // Storage - multi-wallet
  addWalletToStore,
  addWalletWithMnemonicToStore,
  // Storage - backup files
  createBackupFile,
  // Crypto utilities
  decrypt,
  decryptLegacy,
  decryptSimple,
  decryptWallet,
  decryptWalletMnemonic,
  encrypt,
  encryptSimple,
  formatAddress,
  generateMnemonicPhrase,
  generateWallet,
  generateWalletWithMnemonic,
  getActiveWallet,
  getAddressFromKey,
  getAllWallets,
  // Storage - paths
  getBackupDir,
  // Storage - .env sync
  getCurrentPrivateKey,
  getCurrentWallet,
  getEnvPath,
  getEnvPrivateKey,
  getStorePath,
  getWalletByAddress,
  getWalletDir,
  // Types
  type StoredWallet,
  // Interactive menu
  handleWalletManagement,
  importFromBackup,
  isLegacyEncryption,
  listBackupFiles,
  loadWalletStore,
  migrateEnvWalletToStore,
  migrateOldWalletStore,
  mnemonicToAddress,
  mnemonicToPrivateKey,
  readBackupFile,
  removeWalletFromStore,
  savePrivateKeyToEnv,
  saveWalletStore,
  setActiveWallet,
  showWalletMenu,
  syncActiveWalletToEnv,
  // Transaction Pattern
  WalletStoreTransaction,
  createWalletTransaction,
  withWalletTransaction,
  syncActiveWalletWithKey,
  updateWalletName,
  type ValidationResult,
  validateMnemonicPhrase,
  validatePrivateKey,
  type WalletBackup,
  type WalletInfo,
  type WalletStore,
  type WalletStoreTransactionOptions,
  type WalletTransactionResult,
  walletHasMnemonic,
} from './wallet/index.js';
