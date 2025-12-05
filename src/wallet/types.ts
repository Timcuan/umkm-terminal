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
  encryptedKey: string;        // Encrypted private key (AES-256-GCM)
  encryptedMnemonic?: string;  // Encrypted mnemonic (if generated with mnemonic)
  derivationIndex?: number;    // BIP44 derivation index (default 0)
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
  encrypted: string;              // Encrypted private key
  encryptedMnemonic?: string;     // Encrypted mnemonic (if available)
  createdAt: string;
  warning: string;
  filename?: string;              // Added when listing backup files
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

/**
 * Operation result
 */
export interface WalletOperationResult {
  success: boolean;
  error?: string;
  address?: string;
  filePath?: string;
}
