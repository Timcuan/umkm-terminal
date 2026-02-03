/**
 * Wallet Store Transaction Pattern
 * Provides transactional operations for wallet management with .env synchronization
 * Eliminates duplication in wallet store operations across modules
 */

import { WalletStoreService } from './store.js';
import { EnvSyncService } from './env-sync-service.js';
import { EncryptionService } from './encryption-service.js';
import { validatePrivateKey, formatAddress } from './crypto.js';
import { type ServiceResultDetails } from '../types/configuration.js';
import type { WalletStore, StoredWallet } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface WalletStoreTransactionOptions {
  autoCommit?: boolean;
  syncToEnv?: boolean;
}

export type WalletTransactionResult = {
  success: true;
  data: {
    store: WalletStore;
    activeWallet?: StoredWallet;
    syncedToEnv?: boolean;
  };
} | {
  success: false;
  error: string;
  details?: ServiceResultDetails;
}

// ============================================================================
// Wallet Store Transaction Class
// ============================================================================

export class WalletStoreTransaction {
  private store: WalletStore;
  private originalStore: WalletStore;
  private committed = false;
  private options: Required<WalletStoreTransactionOptions>;
  private storeService: WalletStoreService;
  private envSyncService: EnvSyncService;
  private encryptionService: EncryptionService;

  constructor(options: WalletStoreTransactionOptions = {}) {
    this.options = {
      autoCommit: options.autoCommit ?? false,
      syncToEnv: options.syncToEnv ?? true
    };
    
    // Initialize services
    this.storeService = new WalletStoreService();
    this.envSyncService = new EnvSyncService();
    this.encryptionService = new EncryptionService();
    
    // Load current store and create a deep copy for rollback
    this.store = this.storeService.loadWalletStore();
    this.originalStore = JSON.parse(JSON.stringify(this.store));
  }

  /**
   * Begin transaction (explicit begin for clarity)
   */
  begin(): this {
    this.committed = false;
    return this;
  }

  /**
   * Find wallet by address
   */
  findWallet(address: string): StoredWallet | null {
    return this.store.wallets.find(
      w => w.address.toLowerCase() === address.toLowerCase()
    ) || null;
  }

  /**
   * Add wallet to transaction
   */
  addWallet(
    privateKey: string,
    name: string,
    password: string,
    setActive = false,
    mnemonic?: string,
    derivationIndex = 0
  ): WalletTransactionResult {
    try {
      // Validate private key
      const validation = validatePrivateKey(privateKey);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error || 'Invalid private key',
          details: { privateKey: privateKey.slice(0, 10) + '...' }
        };
      }

      const { address, normalizedKey } = validation.data;

      // Check if wallet already exists
      const existing = this.findWallet(address);
      if (existing) {
        return {
          success: false,
          error: 'Wallet already exists in store',
          details: { address: address, existingName: existing.name }
        };
      }

      // Encrypt private key and mnemonic
      const encryptedKey = this.encryptionService.encrypt(normalizedKey, password);
      const encryptedMnemonic = mnemonic ? this.encryptionService.encrypt(mnemonic, password) : undefined;

      // Create wallet entry
      const wallet: StoredWallet = {
        address: address,
        name: name || formatAddress(address),
        encryptedKey,
        encryptedMnemonic,
        derivationIndex: mnemonic ? derivationIndex : undefined,
        createdAt: new Date().toISOString(),
        isActive: setActive || this.store.wallets.length === 0
      };

      // If setting as active, deactivate others
      if (wallet.isActive) {
        for (const w of this.store.wallets) {
          w.isActive = false;
        }
        this.store.activeAddress = wallet.address;
      }

      // Add to store
      this.store.wallets.push(wallet);

      // Auto-commit if enabled
      if (this.options.autoCommit) {
        return this.commit();
      }

      return {
        success: true,
        data: {
          store: this.store,
          activeWallet: wallet.isActive ? wallet : undefined
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { originalError: error }
      };
    }
  }

  /**
   * Update wallet in transaction
   */
  updateWallet(
    address: string,
    updates: Partial<Pick<StoredWallet, 'name' | 'isActive'>>
  ): WalletTransactionResult {
    try {
      const wallet = this.findWallet(address);
      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found',
          details: { address }
        };
      }

      // Apply updates
      if (updates.name !== undefined) {
        wallet.name = updates.name;
      }

      if (updates.isActive !== undefined) {
        // If setting as active, deactivate others
        if (updates.isActive) {
          for (const w of this.store.wallets) {
            w.isActive = false;
          }
          wallet.isActive = true;
          this.store.activeAddress = wallet.address;
        } else {
          wallet.isActive = false;
          // If this was the active wallet, clear active address
          if (this.store.activeAddress === wallet.address) {
            this.store.activeAddress = null;
          }
        }
      }

      // Auto-commit if enabled
      if (this.options.autoCommit) {
        return this.commit();
      }

      return {
        success: true,
        data: {
          store: this.store,
          activeWallet: wallet.isActive ? wallet : undefined
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { address, updates, originalError: error }
      };
    }
  }

  /**
   * Remove wallet from transaction
   */
  removeWallet(address: string): WalletTransactionResult {
    try {
      const index = this.store.wallets.findIndex(
        w => w.address.toLowerCase() === address.toLowerCase()
      );

      if (index === -1) {
        return {
          success: false,
          error: 'Wallet not found',
          details: { address }
        };
      }

      const wasActive = this.store.wallets[index].isActive;
      this.store.wallets.splice(index, 1);

      // If removed wallet was active, set first wallet as active
      if (wasActive && this.store.wallets.length > 0) {
        this.store.wallets[0].isActive = true;
        this.store.activeAddress = this.store.wallets[0].address;
      } else if (this.store.wallets.length === 0) {
        this.store.activeAddress = null;
      }

      // Auto-commit if enabled
      if (this.options.autoCommit) {
        return this.commit();
      }

      return {
        success: true,
        data: {
          store: this.store,
          activeWallet: this.store.wallets.find(w => w.isActive)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { address, originalError: error }
      };
    }
  }

  /**
   * Set active wallet in transaction
   */
  setActiveWallet(address: string, password: string): WalletTransactionResult {
    try {
      const wallet = this.findWallet(address);
      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found',
          details: { address }
        };
      }

      // Verify password by attempting to decrypt
      let privateKey = this.encryptionService.decrypt(wallet.encryptedKey, password);

      if (!privateKey) {
        return {
          success: false,
          error: 'Invalid password',
          details: { address }
        };
      }

      // Validate decrypted key matches wallet address
      const validation = validatePrivateKey(privateKey);
      if (!validation.success || validation.data.address.toLowerCase() !== wallet.address.toLowerCase()) {
        return {
          success: false,
          error: 'Invalid password or corrupted wallet',
          details: { address }
        };
      }

      // Update active status
      for (const w of this.store.wallets) {
        w.isActive = false;
      }
      wallet.isActive = true;
      this.store.activeAddress = wallet.address;

      // Auto-commit if enabled
      if (this.options.autoCommit) {
        return this.commit();
      }

      return {
        success: true,
        data: {
          store: this.store,
          activeWallet: wallet
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set active wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { address, originalError: error }
      };
    }
  }

  /**
   * Get current store state
   */
  getStore(): WalletStore {
    return { ...this.store };
  }

  /**
   * Get active wallet from current transaction state
   */
  getActiveWallet(): StoredWallet | null {
    return this.store.wallets.find(w => w.isActive) || null;
  }

  /**
   * Commit transaction and sync to .env
   */
  commitAndSync(): WalletTransactionResult {
    try {
      // Save store to file
      const saved = this.storeService.saveWalletStore(this.store);
      if (!saved) {
        return {
          success: false,
          error: 'Failed to save wallet store to file'
        };
      }

      let syncedToEnv = false;

      // Sync active wallet to .env if enabled
      if (this.options.syncToEnv) {
        const activeWallet = this.getActiveWallet();
        if (activeWallet) {
          // Note: We can't decrypt without password, so .env sync needs to be handled
          // by the calling code with the known password
          syncedToEnv = false;
        }
      }

      this.committed = true;

      return {
        success: true,
        data: {
          store: this.store,
          activeWallet: this.getActiveWallet() || undefined,
          syncedToEnv
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to commit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { originalError: error }
      };
    }
  }

  /**
   * Commit transaction (alias for commitAndSync)
   */
  commit(): WalletTransactionResult {
    return this.commitAndSync();
  }

  /**
   * Rollback transaction to original state
   */
  rollback(): void {
    this.store = JSON.parse(JSON.stringify(this.originalStore));
    this.committed = false;
  }

  /**
   * Check if transaction has been committed
   */
  isCommitted(): boolean {
    return this.committed;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new wallet store transaction
 */
export function createWalletTransaction(options?: WalletStoreTransactionOptions): WalletStoreTransaction {
  return new WalletStoreTransaction(options);
}

/**
 * Execute a wallet operation within a transaction
 */
export async function withWalletTransaction<T>(
  operation: (transaction: WalletStoreTransaction) => Promise<T> | T,
  options?: WalletStoreTransactionOptions
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const transaction = createWalletTransaction(options);
  
  try {
    transaction.begin();
    const result = await operation(transaction);
    
    if (!transaction.isCommitted()) {
      const commitResult = transaction.commit();
      if (!commitResult.success) {
        transaction.rollback();
        return {
          success: false,
          error: commitResult.error
        };
      }
    }
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    transaction.rollback();
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync active wallet to .env with private key
 * This is a helper for the transaction pattern when password is available
 */
export function syncActiveWalletWithKey(privateKey: string): boolean {
  const validation = validatePrivateKey(privateKey);
  if (!validation.success) {
    return false;
  }
  
  const envSyncService = new EnvSyncService();
  return envSyncService.syncActiveWalletToEnv(validation.data.normalizedKey);
}