/**
 * Encryption Service
 * Interface and implementation for wallet encryption and decryption operations
 */

import * as crypto from 'node:crypto';

// ============================================================================
// Constants
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000; // Strong key derivation

// ============================================================================
// Interface
// ============================================================================

/**
 * Interface for wallet encryption operations
 */
export interface IEncryptionService {
  encrypt(plaintext: string, password: string): string;
  decrypt(encrypted: string, password: string): string | null;
  generateSalt(): string;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * AES-256-GCM encryption service with PBKDF2 key derivation
 */
export class EncryptionService implements IEncryptionService {
  /**
   * Derive encryption key from password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypt data using AES-256-GCM
   * Returns: base64(salt + iv + authTag + ciphertext)
   */
  encrypt(plaintext: string, password: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.deriveKey(password, salt);

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine: salt + iv + authTag + ciphertext
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypt data using AES-256-GCM
   * Expects: base64(salt + iv + authTag + ciphertext)
   */
  decrypt(encrypted: string, password: string): string | null {
    try {
      const combined = Buffer.from(encrypted, 'base64');

      if (combined.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
        return null;
      }

      const salt = combined.subarray(0, SALT_LENGTH);
      const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const authTag = combined.subarray(
        SALT_LENGTH + IV_LENGTH,
        SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
      );
      const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

      const key = this.deriveKey(password, salt);

      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return null;
    }
  }

  /**
   * Generate a random salt for key derivation
   */
  generateSalt(): string {
    return crypto.randomBytes(SALT_LENGTH).toString('hex');
  }
}

// ============================================================================
// Legacy Support
// ============================================================================

/**
 * Check if encrypted data uses legacy format
 */
export function isLegacyEncryption(encrypted: string): boolean {
  try {
    const combined = Buffer.from(encrypted, 'base64');
    // Legacy format is shorter and doesn't have proper salt/iv structure
    return combined.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 16;
  } catch {
    return false;
  }
}

/**
 * Decrypt legacy encrypted data (for backward compatibility)
 */
export function decryptLegacy(encrypted: string, password: string): string | null {
  try {
    // Legacy decryption logic - simplified for backward compatibility
    // This is a placeholder - actual legacy logic would depend on the old format
    const key = crypto.createHash('sha256').update(password).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}