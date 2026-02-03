/**
 * Wallet Management Module
 * Secure multi-wallet storage with AES-256-GCM encryption and mnemonic support
 */

// Services
export { WalletStoreService } from './store.js';
export { WalletBackupService } from './backup-service.js';
export { EnvSyncService } from './env-sync-service.js';
export { WalletMigrationService } from './migration-service.js';
export { EncryptionService, type IEncryptionService } from './encryption-service.js';

// Crypto Utilities
// Aliases for backward compatibility
export {
  decrypt,
  decrypt as decryptSimple,
  decryptLegacy,
  encrypt,
  encrypt as encryptSimple,
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
} from './crypto.js';

// Interactive Menu
export { handleWalletManagement, showWalletMenu } from './menu.js';

// Store Operations (backward compatibility)
export {
  // Path helpers
  getWalletDir,
  getStorePath,
  // Store operations
  loadWalletStore,
  saveWalletStore,
  addWalletToStore,
  addWalletWithMnemonicToStore,
  removeWalletFromStore,
  setActiveWallet,
  getActiveWallet,
  getAllWallets,
  getWalletByAddress,
  decryptWallet,
  decryptWalletMnemonic,
  walletHasMnemonic,
  updateWalletName,
} from './store.js';

// Backup Operations (backward compatibility)
export {
  // Path helpers
  getBackupDir,
  // Backup operations
  createBackupFile,
  listBackupFiles,
  readBackupFile,
  importFromBackup,
} from './backup-service.js';

// Environment Sync (backward compatibility)
export {
  // Path helpers
  getEnvPath,
  // Env sync operations
  syncActiveWalletToEnv,
  syncActiveWalletToEnv as savePrivateKeyToEnv,
  getEnvPrivateKey,
  getEnvPrivateKey as getCurrentPrivateKey,
  getCurrentWallet,
} from './env-sync-service.js';

// Migration (backward compatibility)
export {
  migrateEnvWalletToStore,
  migrateOldWalletStore,
} from './migration-service.js';

// Transaction Pattern
export {
  WalletStoreTransaction,
  createWalletTransaction,
  withWalletTransaction,
  syncActiveWalletWithKey,
} from './transaction.js';

// Types
export type {
  StoredWallet,
  ValidationResult,
  WalletBackup,
  WalletInfo,
  WalletOperationResult,
  WalletStore,
  WalletStoreTransactionOptions,
  WalletTransactionResult,
} from './types.js';
