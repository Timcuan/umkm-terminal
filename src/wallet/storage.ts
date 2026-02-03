/**
 * Wallet Storage Module
 * Secure multi-wallet storage in dedicated folder with AES-256-GCM encryption
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  decrypt,
  decryptLegacy,
  encrypt,
  formatAddress,
  isLegacyEncryption,
  validatePrivateKey,
} from './crypto.js';
import { migrateWallet, isLegacyWallet, type MigratableWallet } from '../types/deployment-args.js';
import type {
  StoredWallet,
  WalletBackup,
  WalletInfo,
  WalletOperationResult,
  WalletStore,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

const WALLET_DIR = '.umkm-wallets'; // Dedicated folder for wallet data
const WALLET_STORE_FILE = 'store.json'; // Main wallet store
const BACKUP_SUBDIR = 'backups'; // Backup files subfolder
const STORE_VERSION = 2; // Version 2 = AES-256-GCM encryption
const BACKUP_TYPE = 'umkm-wallet-backup';

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Get wallet directory path (creates if not exists)
 */
export function getWalletDir(): string {
  const walletDir = path.join(process.cwd(), WALLET_DIR);
  if (!fs.existsSync(walletDir)) {
    fs.mkdirSync(walletDir, { recursive: true, mode: 0o700 }); // Restricted permissions
  }
  return walletDir;
}

/**
 * Get wallet store file path
 */
export function getStorePath(): string {
  return path.join(getWalletDir(), WALLET_STORE_FILE);
}

/**
 * Get backup directory path
 */
export function getBackupDir(): string {
  const backupDir = path.join(getWalletDir(), BACKUP_SUBDIR);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  }
  return backupDir;
}

/**
 * Get .env file path
 */
export function getEnvPath(): string {
  return path.join(process.cwd(), '.env');
}

// ============================================================================
// Wallet Store (Multi-Wallet)
// ============================================================================

/**
 * Load wallet store from file
 */
export function loadWalletStore(): WalletStore {
  const storePath = getStorePath();

  if (!fs.existsSync(storePath)) {
    return { version: STORE_VERSION, activeAddress: null, wallets: [] };
  }

  try {
    const content = fs.readFileSync(storePath, 'utf8');
    const store = JSON.parse(content) as WalletStore;

    // Migrate old format if needed
    if (store.version < STORE_VERSION) {
      store.version = STORE_VERSION;
      // Migrate old wallets using type-safe migration
      for (let i = 0; i < store.wallets.length; i++) {
        const wallet = store.wallets[i] as MigratableWallet;
        if (isLegacyWallet(wallet)) {
          store.wallets[i] = migrateWallet(wallet);
        }
      }
    }

    return store;
  } catch {
    return { version: STORE_VERSION, activeAddress: null, wallets: [] };
  }
}

/**
 * Save wallet store to file
 */
export function saveWalletStore(store: WalletStore): boolean {
  try {
    const storePath = getStorePath();
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Add wallet to store (private key only)
 */
export function addWalletToStore(
  privateKey: string,
  name: string,
  password: string,
  setActive = false
): WalletOperationResult {
  const validation = validatePrivateKey(privateKey);
  if (!validation.valid || !validation.address || !validation.normalizedKey) {
    return { success: false, error: validation.error || 'Invalid private key' };
  }

  const store = loadWalletStore();

  // Check if wallet already exists
  const existing = store.wallets.find(
    (w) => w.address.toLowerCase() === (validation.address || '').toLowerCase()
  );
  if (existing) {
    return { success: false, error: 'Wallet already exists in store' };
  }

  // Encrypt private key with AES-256-GCM
  const encryptedKey = encrypt(validation.normalizedKey, password);

  // Create wallet entry
  const wallet: StoredWallet = {
    address: validation.address,
    name: name || formatAddress(validation.address),
    encryptedKey,
    createdAt: new Date().toISOString(),
    isActive: setActive || store.wallets.length === 0,
  };

  // If setting as active, deactivate others
  if (wallet.isActive) {
    for (const w of store.wallets) {
      w.isActive = false;
    }
    store.activeAddress = wallet.address;
  }

  store.wallets.push(wallet);

  if (!saveWalletStore(store)) {
    return { success: false, error: 'Failed to save wallet store' };
  }

  // Sync to .env if active
  if (wallet.isActive) {
    syncActiveWalletToEnv(validation.normalizedKey);
  }

  return { success: true, address: validation.address };
}

/**
 * Add wallet with mnemonic to store
 */
export function addWalletWithMnemonicToStore(
  privateKey: string,
  mnemonic: string,
  name: string,
  password: string,
  derivationIndex = 0,
  setActive = false
): WalletOperationResult {
  const validation = validatePrivateKey(privateKey);
  if (!validation.valid || !validation.address || !validation.normalizedKey) {
    return { success: false, error: validation.error || 'Invalid private key' };
  }

  const store = loadWalletStore();

  // Check if wallet already exists
  const existing = store.wallets.find(
    (w) => w.address.toLowerCase() === (validation.address || '').toLowerCase()
  );
  if (existing) {
    return { success: false, error: 'Wallet already exists in store' };
  }

  // Encrypt both private key and mnemonic
  const encryptedKey = encrypt(validation.normalizedKey, password);
  const encryptedMnemonic = encrypt(mnemonic, password);

  // Create wallet entry
  const wallet: StoredWallet = {
    address: validation.address,
    name: name || formatAddress(validation.address),
    encryptedKey,
    encryptedMnemonic,
    derivationIndex,
    createdAt: new Date().toISOString(),
    isActive: setActive || store.wallets.length === 0,
  };

  // If setting as active, deactivate others
  if (wallet.isActive) {
    for (const w of store.wallets) {
      w.isActive = false;
    }
    store.activeAddress = wallet.address;
  }

  store.wallets.push(wallet);

  if (!saveWalletStore(store)) {
    return { success: false, error: 'Failed to save wallet store' };
  }

  // Sync to .env if active
  if (wallet.isActive) {
    syncActiveWalletToEnv(validation.normalizedKey);
  }

  return { success: true, address: validation.address };
}

/**
 * Remove wallet from store
 */
export function removeWalletFromStore(address: string): WalletOperationResult {
  const store = loadWalletStore();

  const index = store.wallets.findIndex((w) => w.address.toLowerCase() === address.toLowerCase());

  if (index === -1) {
    return { success: false, error: 'Wallet not found' };
  }

  const wasActive = store.wallets[index].isActive;
  store.wallets.splice(index, 1);

  // If removed wallet was active, set first wallet as active
  if (wasActive && store.wallets.length > 0) {
    store.wallets[0].isActive = true;
    store.activeAddress = store.wallets[0].address;
  } else if (store.wallets.length === 0) {
    store.activeAddress = null;
  }

  if (!saveWalletStore(store)) {
    return { success: false, error: 'Failed to save wallet store' };
  }

  return { success: true, address: wasActive ? store.activeAddress || undefined : undefined };
}

/**
 * Set active wallet
 */
export function setActiveWallet(address: string, password: string): WalletOperationResult {
  const store = loadWalletStore();

  const wallet = store.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());

  if (!wallet) {
    return { success: false, error: 'Wallet not found' };
  }

  // Decrypt to verify password and get key
  const privateKey = decryptWalletKey(wallet, password);
  if (!privateKey) {
    return { success: false, error: 'Invalid password' };
  }

  const validation = validatePrivateKey(privateKey);
  if (!validation.valid || validation.address?.toLowerCase() !== wallet.address.toLowerCase()) {
    return { success: false, error: 'Invalid password' };
  }

  // Update active status
  for (const w of store.wallets) {
    w.isActive = false;
  }
  wallet.isActive = true;
  store.activeAddress = wallet.address;

  if (!saveWalletStore(store)) {
    return { success: false, error: 'Failed to save wallet store' };
  }

  // Sync to .env
  if (validation.normalizedKey) {
    syncActiveWalletToEnv(validation.normalizedKey);
  }

  return { success: true, address: wallet.address };
}

/**
 * Get active wallet from store
 */
export function getActiveWallet(): StoredWallet | null {
  const store = loadWalletStore();
  return store.wallets.find((w) => w.isActive) || null;
}

/**
 * Get all wallets from store
 */
export function getAllWallets(): StoredWallet[] {
  const store = loadWalletStore();
  return store.wallets;
}

/**
 * Get wallet by address
 */
export function getWalletByAddress(address: string): StoredWallet | null {
  const store = loadWalletStore();
  return store.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()) || null;
}

/**
 * Decrypt wallet private key (handles legacy and new encryption)
 */
function decryptWalletKey(wallet: StoredWallet, password: string): string | null {
  // Type-safe access to encrypted data (handles legacy format)
  const migratableWallet = wallet as MigratableWallet;
  const encryptedData = isLegacyWallet(migratableWallet) 
    ? migratableWallet.encrypted 
    : wallet.encryptedKey;
    
  if (!encryptedData) return null;

  // Try new encryption first
  let privateKey = decrypt(encryptedData, password);

  // If failed and looks like legacy, try legacy decryption
  if (!privateKey && isLegacyEncryption(encryptedData)) {
    privateKey = decryptLegacy(encryptedData, password);
  }

  if (!privateKey) return null;

  const validation = validatePrivateKey(privateKey);
  if (!validation.valid || validation.address?.toLowerCase() !== wallet.address.toLowerCase()) {
    return null;
  }

  return validation.normalizedKey || null;
}

/**
 * Decrypt wallet and get private key
 */
export function decryptWallet(address: string, password: string): string | null {
  const wallet = getWalletByAddress(address);
  if (!wallet) return null;
  return decryptWalletKey(wallet, password);
}

/**
 * Decrypt wallet mnemonic (if available)
 */
export function decryptWalletMnemonic(address: string, password: string): string | null {
  const wallet = getWalletByAddress(address);
  if (!wallet || !wallet.encryptedMnemonic) return null;

  const mnemonic = decrypt(wallet.encryptedMnemonic, password);
  if (!mnemonic) return null;

  // Verify it's a valid mnemonic by checking format
  const words = mnemonic.trim().split(/\s+/);
  if (words.length !== 12 && words.length !== 24) return null;

  return mnemonic;
}

/**
 * Check if wallet has mnemonic
 */
export function walletHasMnemonic(address: string): boolean {
  const wallet = getWalletByAddress(address);
  return wallet?.encryptedMnemonic !== undefined;
}

/**
 * Update wallet name
 */
export function updateWalletName(address: string, newName: string): WalletOperationResult {
  const store = loadWalletStore();

  const wallet = store.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());

  if (!wallet) {
    return { success: false, error: 'Wallet not found' };
  }

  wallet.name = newName;

  if (!saveWalletStore(store)) {
    return { success: false, error: 'Failed to save wallet store' };
  }

  return { success: true };
}

// ============================================================================
// .env Sync
// ============================================================================

/**
 * Sync active wallet to .env file
 */
export function syncActiveWalletToEnv(privateKey: string): boolean {
  const envPath = getEnvPath();

  try {
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');

      if (envContent.match(/^PRIVATE_KEY=/m)) {
        envContent = envContent.replace(/^PRIVATE_KEY=.*$/m, `PRIVATE_KEY=${privateKey}`);
      } else {
        envContent = `PRIVATE_KEY=${privateKey}\n${envContent}`;
      }
    } else {
      envContent = `# UMKM Terminal Configuration\nPRIVATE_KEY=${privateKey}\nCHAIN_ID=8453\n`;
    }

    fs.writeFileSync(envPath, envContent);
    process.env.PRIVATE_KEY = privateKey;

    return true;
  } catch {
    return false;
  }
}

/**
 * Get current private key from .env
 */
export function getEnvPrivateKey(): string | null {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return null;

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^PRIVATE_KEY=(.*)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Get current wallet from .env
 */
export function getCurrentWallet(): WalletInfo | null {
  const privateKey = getEnvPrivateKey();
  if (!privateKey) return null;

  const validation = validatePrivateKey(privateKey);
  if (!validation.valid || !validation.address) return null;

  return {
    address: validation.address,
    privateKey: validation.normalizedKey || privateKey,
  };
}

// ============================================================================
// Backup Files
// ============================================================================

/**
 * Create wallet backup file
 */
export function createBackupFile(
  privateKey: string,
  password: string,
  name?: string,
  mnemonic?: string
): WalletOperationResult {
  const validation = validatePrivateKey(privateKey);
  if (!validation.valid || !validation.address) {
    return { success: false, error: 'Invalid private key' };
  }

  const backupDir = getBackupDir();

  try {
    const backup: WalletBackup = {
      version: STORE_VERSION,
      type: BACKUP_TYPE,
      address: validation.address,
      name,
      encrypted: encrypt(validation.normalizedKey || privateKey, password),
      encryptedMnemonic: mnemonic ? encrypt(mnemonic, password) : undefined,
      createdAt: new Date().toISOString(),
      warning: 'This file contains your encrypted wallet. Keep it safe and remember your password!',
    };

    const shortAddr = formatAddress(validation.address);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `wallet-${shortAddr}-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), { mode: 0o600 });

    return { success: true, filePath, address: validation.address };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create backup',
    };
  }
}

/**
 * List backup files
 */
export function listBackupFiles(): WalletBackup[] {
  const backupDir = getBackupDir();

  if (!fs.existsSync(backupDir)) return [];

  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
  const backups: WalletBackup[] = [];

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));
      if (content.type === BACKUP_TYPE && content.address && content.encrypted) {
        backups.push({ ...content, filename: file });
      }
    } catch {
      // Skip invalid files
    }
  }

  return backups;
}

/**
 * Read backup file
 */
export function readBackupFile(filename: string): WalletBackup | null {
  const backupDir = getBackupDir();
  const filePath = path.join(backupDir, filename);

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (content.type === BACKUP_TYPE && content.address && content.encrypted) {
      return content;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Import from backup file
 */
export function importFromBackup(
  filename: string,
  password: string
): { success: boolean; privateKey?: string; mnemonic?: string; address?: string; error?: string } {
  const backup = readBackupFile(filename);
  if (!backup) {
    return { success: false, error: 'Could not read backup file' };
  }

  // Try to decrypt private key
  let privateKey = decrypt(backup.encrypted, password);

  // Try legacy decryption if new format fails
  if (!privateKey && isLegacyEncryption(backup.encrypted)) {
    privateKey = decryptLegacy(backup.encrypted, password);
  }

  if (!privateKey) {
    return { success: false, error: 'Invalid password or corrupted backup' };
  }

  const validation = validatePrivateKey(privateKey);
  if (!validation.valid) {
    return { success: false, error: 'Invalid password or corrupted backup' };
  }

  if (validation.address?.toLowerCase() !== backup.address.toLowerCase()) {
    return { success: false, error: 'Password incorrect' };
  }

  // Try to decrypt mnemonic if available
  let mnemonic: string | undefined;
  if (backup.encryptedMnemonic) {
    mnemonic = decrypt(backup.encryptedMnemonic, password) || undefined;
  }

  return {
    success: true,
    privateKey: validation.normalizedKey,
    mnemonic,
    address: validation.address,
  };
}

// ============================================================================
// Migration
// ============================================================================

/**
 * Import current .env wallet to store
 */
export function migrateEnvWalletToStore(
  password: string,
  name = 'Main Wallet'
): WalletOperationResult {
  const currentWallet = getCurrentWallet();
  if (!currentWallet) {
    return { success: false, error: 'No wallet in .env' };
  }

  // Check if already in store
  const existing = getWalletByAddress(currentWallet.address);
  if (existing) {
    return { success: false, error: 'Wallet already in store' };
  }

  return addWalletToStore(currentWallet.privateKey, name, password, true);
}

/**
 * Migrate old wallet store from root to new folder
 */
export function migrateOldWalletStore(): boolean {
  const oldStorePath = path.join(process.cwd(), '.wallets.json');
  const oldBackupDir = path.join(process.cwd(), 'wallets');

  let migrated = false;

  // Migrate old store file
  if (fs.existsSync(oldStorePath)) {
    try {
      const oldContent = fs.readFileSync(oldStorePath, 'utf8');
      const newStorePath = getStorePath();

      if (!fs.existsSync(newStorePath)) {
        fs.writeFileSync(newStorePath, oldContent, { mode: 0o600 });
        migrated = true;
      }

      // Rename old file as backup
      fs.renameSync(oldStorePath, `${oldStorePath}.bak`);
    } catch {
      // Ignore migration errors
    }
  }

  // Migrate old backup files
  if (fs.existsSync(oldBackupDir)) {
    try {
      const newBackupDir = getBackupDir();
      const files = fs.readdirSync(oldBackupDir).filter((f) => f.endsWith('.json'));

      for (const file of files) {
        const oldPath = path.join(oldBackupDir, file);
        const newPath = path.join(newBackupDir, file);

        if (!fs.existsSync(newPath)) {
          fs.copyFileSync(oldPath, newPath);
          migrated = true;
        }
      }
    } catch {
      // Ignore migration errors
    }
  }

  return migrated;
}
