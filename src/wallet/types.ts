/**
 * Wallet Types
 */

/**
 * Basic wallet information
 */
export interface WalletInfo {
  address: string;
  privateKey: string;
}

/**
 * Stored wallet entry with metadata
 */
export interface StoredWallet {
  address: string;
  name: string;
  encryptedKey: string; // Encrypted private key (AES-256-GCM)
  encryptedMnemonic?: string; // Encrypted mnemonic (if generated with mnemonic)
  derivationIndex?: number; // BIP44 derivation index (default 0)
  createdAt: string;
  isActive: boolean;
}

/**
 * Wallet store file format
 */
export interface WalletStore {
  version: number;
  activeAddress: string | null;
  wallets: StoredWallet[];
}

/**
 * Wallet backup file format
 */
export interface WalletBackup {
  version: number;
  type: 'umkm-wallet-backup';
  address: string;
  name?: string;
  encrypted: string; // Encrypted private key
  encryptedMnemonic?: string; // Encrypted mnemonic (if available)
  createdAt: string;
  warning: string;
  filename?: string; // Added when listing backup files
}

/**
 * Private key validation result
 */
export interface ValidationResult {
  valid: boolean;
  address?: string;
  error?: string;
  normalizedKey?: string;
}

import { UIErrorResponse } from '../errors/standardized-errors.js';
import { type ServiceResultDetails } from '../types/configuration.js';

/**
 * Operation result
 */
export interface WalletOperationResult extends UIErrorResponse {
  address?: string;
  filePath?: string;
}

/**
 * Wallet store transaction options
 */
export interface WalletStoreTransactionOptions {
  autoCommit?: boolean;
  syncToEnv?: boolean;
}

/**
 * Wallet transaction result
 */
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
