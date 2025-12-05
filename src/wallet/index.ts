/**
 * Wallet Management Module
 * Secure multi-wallet storage with AES-256-GCM encryption and mnemonic support
 */

// Types
export type {
  StoredWallet,
  ValidationResult,
  WalletBackup,
  WalletInfo,
  WalletOperationResult,
  WalletStore,
} from './types.js';

// Crypto Utilities
export {
  decrypt,
  decryptLegacy,
  encrypt,
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

// Aliases for backward compatibility
export { decrypt as decryptSimple, encrypt as encryptSimple } from './crypto.js';

// Storage
export {
  // Path helpers
  getBackupDir,
  getEnvPath,
  getStorePath,
  getWalletDir,
  // Wallet store (multi-wallet)
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
  // .env sync
  getCurrentWallet,
  getEnvPrivateKey,
  syncActiveWalletToEnv,
  // Backup files
  createBackupFile,
  importFromBackup,
  listBackupFiles,
  readBackupFile,
} from './storage.js';

// Aliases for backward compatibility
export { getEnvPrivateKey as getCurrentPrivateKey } from './storage.js';
export { syncActiveWalletToEnv as savePrivateKeyToEnv } from './storage.js';

// Interactive Menu
export { handleWalletManagement, showWalletMenu } from './menu.js';
