/**
 * Wallet Cryptography Utilities
 * Secure encryption using AES-256-GCM with PBKDF2 key derivation
 * Compatible with standard wallet formats (MetaMask, etc.)
 */

import * as crypto from 'node:crypto';
import { generatePrivateKey, privateKeyToAccount, mnemonicToAccount, english } from 'viem/accounts';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import type { ValidationResult, WalletInfo } from './types.js';

// ============================================================================
// Constants
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000; // Strong key derivation

// Standard Ethereum derivation path (BIP44)
// Path: m/44'/60'/0'/0/{index} - compatible with MetaMask, Ledger, etc.

// ============================================================================
// Secure Encryption (AES-256-GCM with PBKDF2)
// ============================================================================

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 * Returns: base64(salt + iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encryptedData: string, password: string): string {
  try {
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(password, salt);

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

// ============================================================================
// Private Key Validation
// ============================================================================

/**
 * Validate private key format and derive address
 */
export function validatePrivateKey(key: string): ValidationResult {
  let cleanKey = key.trim();

  // Add 0x prefix if missing
  if (!cleanKey.startsWith('0x')) {
    cleanKey = `0x${cleanKey}`;
  }

  // Check length (66 chars with 0x prefix = 64 hex chars)
  if (cleanKey.length !== 66) {
    return {
      valid: false,
      error: `Invalid length: expected 64 hex characters, got ${cleanKey.length - 2}`,
    };
  }

  // Check if it's valid hex
  if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
    return { valid: false, error: 'Invalid format: must be hexadecimal characters only' };
  }

  // Try to derive address
  try {
    const account = privateKeyToAccount(cleanKey as `0x${string}`);
    return { valid: true, address: account.address, normalizedKey: cleanKey };
  } catch (err) {
    return {
      valid: false,
      error: `Invalid key: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// Mnemonic Functions
// ============================================================================

/**
 * Generate a new 12-word mnemonic phrase
 */
export function generateMnemonicPhrase(): string {
  return generateMnemonic(english, 128); // 128 bits = 12 words
}

/**
 * Validate mnemonic phrase
 */
export function validateMnemonicPhrase(mnemonic: string): boolean {
  return validateMnemonic(mnemonic, english);
}

/**
 * Derive private key from mnemonic using standard Ethereum path
 */
export function mnemonicToPrivateKey(mnemonic: string, index = 0): string | null {
  try {
    if (!validateMnemonicPhrase(mnemonic)) {
      return null;
    }

    const seed = mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    
    // Use standard path with account index
    const path = `m/44'/60'/0'/0/${index}`;
    const derived = hdKey.derive(path);
    
    if (!derived.privateKey) {
      return null;
    }

    return `0x${Buffer.from(derived.privateKey).toString('hex')}`;
  } catch {
    return null;
  }
}

/**
 * Get address from mnemonic
 */
export function mnemonicToAddress(mnemonic: string, index = 0): string | null {
  try {
    const account = mnemonicToAccount(mnemonic, { addressIndex: index });
    return account.address;
  } catch {
    return null;
  }
}

// ============================================================================
// Wallet Generation
// ============================================================================

/**
 * Generate a new wallet with mnemonic
 */
export function generateWalletWithMnemonic(): {
  mnemonic: string;
  privateKey: string;
  address: string;
} {
  const mnemonic = generateMnemonicPhrase();
  const privateKey = mnemonicToPrivateKey(mnemonic, 0);
  
  if (!privateKey) {
    throw new Error('Failed to derive private key from mnemonic');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  return {
    mnemonic,
    privateKey,
    address: account.address,
  };
}

/**
 * Generate a new wallet (private key only, no mnemonic)
 */
export function generateWallet(): WalletInfo {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    privateKey,
  };
}

// ============================================================================
// Address Utilities
// ============================================================================

/**
 * Get address from private key
 */
export function getAddressFromKey(privateKey: string): string | null {
  const result = validatePrivateKey(privateKey);
  return result.valid ? result.address || null : null;
}

/**
 * Format address for display (shortened)
 */
export function formatAddress(address: string, chars = 6): string {
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

// ============================================================================
// Legacy Compatibility (for migration)
// ============================================================================

/**
 * Check if encrypted data uses old XOR format
 */
export function isLegacyEncryption(encryptedData: string): boolean {
  try {
    const decoded = Buffer.from(encryptedData, 'base64');
    // New format has minimum length: salt(32) + iv(16) + authTag(16) + data
    // Old XOR format is typically shorter
    return decoded.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 10;
  } catch {
    return true;
  }
}

/**
 * Decrypt legacy XOR encryption (for migration)
 */
export function decryptLegacy(encrypted: string, key: string): string {
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString();
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
}
