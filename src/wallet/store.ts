/**
 * Wallet Store Service
 * Multi-wallet store operations and management
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { validatePrivateKey, formatAddress } from './crypto.js';
import { EncryptionService, type IEncryptionService } from './encryption-service.js';
import { migrateWallet, isLegacyWallet, type MigratableWallet } from '../types/deployment-args.js';
import type {
  StoredWallet,
  WalletOperationResult,
  WalletStore,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

const WALLET_DIR = '.umkm-wallets'; // Dedicated folder for wallet data
const WALLET_STORE_FILE = 'store.json'; // Main wallet store
const STORE_VERSION = 2; // Version 2 = AES-256-GCM encryption

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Get wallet directory path, creating it if it doesn't exist
 * Uses restricted permissions (0o700) for security
 * 
 * @returns Absolute path to the wallet directory
 */
export function getWalletDir(): string {
  const walletDir = path.join(process.cwd(), WALLET_DIR);
  if (!fs.existsSync(walletDir)) {
    fs.mkdirSync(walletDir, { recursive: true, mode: 0o700 }); // Restricted permissions
  }
  return walletDir;
}

/**
 * Get the full path to the wallet store file
 * 
 * @returns Absolute path to the wallet store JSON file
 */
export function getStorePath(): string {
  return path.join(getWalletDir(), WALLET_STORE_FILE);
}

// ============================================================================
// Wallet Store Service
// ============================================================================

/**
 * Service for managing multi-wallet store operations
 * Provides secure storage and retrieval of encrypted wallet data
 * 
 * @example
 * ```typescript
 * const storeService = new WalletStoreService();
 * const result = storeService.addWallet('MyWallet', privateKey, 'password123');
 * if (result.success) {
 *   console.log('Wallet added:', result.data);
 * }
 * ```
 */
export class WalletStoreService {
  private encryptionService: IEncryptionService;

  constructor(encryptionService?: IEncryptionService) {
    this.encryptionService = encryptionService || new EncryptionService();
  }

  /**
   * Load wallet store from file system
   * Creates a new store if none exists, handles migration from older versions
   * 
   * @returns WalletStore object with current version and wallet data
   */
  loadWalletStore(): WalletStore {
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
          const wallet = store.wallets[i] as unknown as MigratableWallet;
          if (isLegacyWallet(wallet)) {
            const migrated = migrateWallet(wallet);
            store.wallets[i] = {
              address: migrated.address,
              name: migrated.name,
              encryptedKey: migrated.encryptedKey,
              createdAt: typeof migrated.createdAt === 'number' 
                ? new Date(migrated.createdAt).toISOString() 
                : migrated.createdAt,
              isActive: false, // Add missing isActive property
            };
          }
        }
      }

      return store;
    } catch {
      return { version: STORE_VERSION, activeAddress: null, wallets: [] };
    }
  }

  /**
   * Save wallet store to file system with secure permissions
   * 
   * @param store - The wallet store to save
   * @returns true if save was successful, false otherwise
   */
  saveWalletStore(store: WalletStore): boolean {
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
  addWalletToStore(
    privateKey: string,
    name: string,
    password: string,
    setActive = false
  ): WalletOperationResult {
    const validation = validatePrivateKey(privateKey);
    if (!validation.success) {
      return { success: false, error: validation.error || 'Invalid private key' };
    }

    const { address, normalizedKey } = validation.data;
    const store = this.loadWalletStore();

    // Check if wallet already exists
    const existing = store.wallets.find(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'Wallet already exists in store' };
    }

    // Encrypt private key
    const encryptedKey = this.encryptionService.encrypt(normalizedKey, password);

    // Create wallet entry
    const wallet: StoredWallet = {
      address: address,
      name: name || formatAddress(address),
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

    if (!this.saveWalletStore(store)) {
      return { success: false, error: 'Failed to save wallet store' };
    }

    return { success: true, address: address };
  }

  /**
   * Add wallet with mnemonic to store
   */
  addWalletWithMnemonicToStore(
    privateKey: string,
    mnemonic: string,
    name: string,
    password: string,
    derivationIndex = 0,
    setActive = false
  ): WalletOperationResult {
    const validation = validatePrivateKey(privateKey);
    if (!validation.success) {
      return { success: false, error: validation.error || 'Invalid private key' };
    }

    const { address, normalizedKey } = validation.data;
    const store = this.loadWalletStore();

    // Check if wallet already exists
    const existing = store.wallets.find(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'Wallet already exists in store' };
    }

    // Encrypt both private key and mnemonic
    const encryptedKey = this.encryptionService.encrypt(normalizedKey, password);
    const encryptedMnemonic = this.encryptionService.encrypt(mnemonic, password);

    // Create wallet entry
    const wallet: StoredWallet = {
      address: address,
      name: name || formatAddress(address),
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

    if (!this.saveWalletStore(store)) {
      return { success: false, error: 'Failed to save wallet store' };
    }

    return { success: true, address: address };
  }

  /**
   * Remove wallet from store
   */
  removeWalletFromStore(address: string): WalletOperationResult {
    const store = this.loadWalletStore();

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

    if (!this.saveWalletStore(store)) {
      return { success: false, error: 'Failed to save wallet store' };
    }

    return { success: true, address: wasActive ? store.activeAddress || undefined : undefined };
  }

  /**
   * Set active wallet
   */
  setActiveWallet(address: string, password: string): WalletOperationResult {
    const store = this.loadWalletStore();

    const wallet = store.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    // Decrypt to verify password and get key
    const privateKey = this.decryptWalletKey(wallet, password);
    if (!privateKey) {
      return { success: false, error: 'Invalid password' };
    }

    const validation = validatePrivateKey(privateKey);
    if (!validation.success || validation.data.address.toLowerCase() !== wallet.address.toLowerCase()) {
      return { success: false, error: 'Invalid password' };
    }

    // Update active status
    for (const w of store.wallets) {
      w.isActive = false;
    }
    wallet.isActive = true;
    store.activeAddress = wallet.address;

    if (!this.saveWalletStore(store)) {
      return { success: false, error: 'Failed to save wallet store' };
    }

    return { success: true, address: wallet.address };
  }

  /**
   * Get active wallet from store
   */
  getActiveWallet(): StoredWallet | null {
    const store = this.loadWalletStore();
    return store.wallets.find((w) => w.isActive) || null;
  }

  /**
   * Get all wallets from store
   */
  getAllWallets(): StoredWallet[] {
    const store = this.loadWalletStore();
    return store.wallets;
  }

  /**
   * Get wallet by address
   */
  getWalletByAddress(address: string): StoredWallet | null {
    const store = this.loadWalletStore();
    return store.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()) || null;
  }

  /**
   * Decrypt wallet private key
   */
  private decryptWalletKey(wallet: StoredWallet, password: string): string | null {
    // Type-safe access to encrypted data (handles legacy format)
    const migratableWallet = wallet as unknown as MigratableWallet;
    const encryptedData = isLegacyWallet(migratableWallet) 
      ? migratableWallet.encrypted 
      : wallet.encryptedKey;
      
    if (!encryptedData) return null;

    const privateKey = this.encryptionService.decrypt(encryptedData, password);
    if (!privateKey) return null;

    const validation = validatePrivateKey(privateKey);
    if (!validation.success || validation.data.address.toLowerCase() !== wallet.address.toLowerCase()) {
      return null;
    }

    return validation.data.normalizedKey;
  }

  /**
   * Decrypt wallet and get private key
   */
  decryptWallet(address: string, password: string): string | null {
    const wallet = this.getWalletByAddress(address);
    if (!wallet) return null;
    return this.decryptWalletKey(wallet, password);
  }

  /**
   * Decrypt wallet mnemonic (if available)
   */
  decryptWalletMnemonic(address: string, password: string): string | null {
    const wallet = this.getWalletByAddress(address);
    if (!wallet || !wallet.encryptedMnemonic) return null;

    const mnemonic = this.encryptionService.decrypt(wallet.encryptedMnemonic, password);
    if (!mnemonic) return null;

    // Verify it's a valid mnemonic by checking format
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) return null;

    return mnemonic;
  }

  /**
   * Check if wallet has mnemonic
   */
  walletHasMnemonic(address: string): boolean {
    const wallet = this.getWalletByAddress(address);
    return wallet?.encryptedMnemonic !== undefined;
  }

  /**
   * Update wallet name
   */
  updateWalletName(address: string, newName: string): WalletOperationResult {
    const store = this.loadWalletStore();

    const wallet = store.wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    wallet.name = newName;

    if (!this.saveWalletStore(store)) {
      return { success: false, error: 'Failed to save wallet store' };
    }

    return { success: true };
  }
}

// Create default instance for backward compatibility
const defaultStoreService = new WalletStoreService();

// Export functions for backward compatibility
export const loadWalletStore = () => defaultStoreService.loadWalletStore();
export const saveWalletStore = (store: WalletStore) => defaultStoreService.saveWalletStore(store);
export const addWalletToStore = (privateKey: string, name: string, password: string, setActive?: boolean) =>
  defaultStoreService.addWalletToStore(privateKey, name, password, setActive);
export const addWalletWithMnemonicToStore = (privateKey: string, mnemonic: string, name: string, password: string, derivationIndex?: number, setActive?: boolean) =>
  defaultStoreService.addWalletWithMnemonicToStore(privateKey, mnemonic, name, password, derivationIndex, setActive);
export const removeWalletFromStore = (address: string) => defaultStoreService.removeWalletFromStore(address);
export const setActiveWallet = (address: string, password: string) => defaultStoreService.setActiveWallet(address, password);
export const getActiveWallet = () => defaultStoreService.getActiveWallet();
export const getAllWallets = () => defaultStoreService.getAllWallets();
export const getWalletByAddress = (address: string) => defaultStoreService.getWalletByAddress(address);
export const decryptWallet = (address: string, password: string) => defaultStoreService.decryptWallet(address, password);
export const decryptWalletMnemonic = (address: string, password: string) => defaultStoreService.decryptWalletMnemonic(address, password);
export const walletHasMnemonic = (address: string) => defaultStoreService.walletHasMnemonic(address);
export const updateWalletName = (address: string, newName: string) => defaultStoreService.updateWalletName(address, newName);