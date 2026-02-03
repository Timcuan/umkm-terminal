/**
 * Backup Service
 * Handles wallet backup file operations
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { validatePrivateKey, formatAddress } from './crypto.js';
import { EncryptionService, type IEncryptionService, isLegacyEncryption, decryptLegacy } from './encryption-service.js';
import { getWalletDir } from './store.js';
import type { WalletBackup, WalletOperationResult } from './types.js';

// ============================================================================
// Constants
// ============================================================================

const BACKUP_SUBDIR = 'backups'; // Backup files subfolder
const STORE_VERSION = 2; // Version 2 = AES-256-GCM encryption
const BACKUP_TYPE = 'umkm-wallet-backup';

// ============================================================================
// Path Helpers
// ============================================================================

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

// ============================================================================
// Backup Service
// ============================================================================

/**
 * Service for managing wallet backup operations
 */
export class WalletBackupService {
  private encryptionService: IEncryptionService;

  constructor(encryptionService?: IEncryptionService) {
    this.encryptionService = encryptionService || new EncryptionService();
  }

  /**
   * Create wallet backup file
   */
  createBackupFile(
    privateKey: string,
    password: string,
    name?: string,
    mnemonic?: string
  ): WalletOperationResult {
    const validation = validatePrivateKey(privateKey);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const backupDir = getBackupDir();

    try {
      const backup: WalletBackup = {
        version: STORE_VERSION,
        type: BACKUP_TYPE,
        address: validation.data.address,
        name,
        encrypted: this.encryptionService.encrypt(validation.data.normalizedKey, password),
        encryptedMnemonic: mnemonic ? this.encryptionService.encrypt(mnemonic, password) : undefined,
        createdAt: new Date().toISOString(),
        warning: 'This file contains your encrypted wallet. Keep it safe and remember your password!',
      };

      const shortAddr = formatAddress(validation.data.address);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `wallet-${shortAddr}-${timestamp}.json`;
      const filePath = path.join(backupDir, filename);

      fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), { mode: 0o600 });

      return { success: true, filePath, address: validation.data.address };
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
  listBackupFiles(): WalletBackup[] {
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
  readBackupFile(filename: string): WalletBackup | null {
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
  importFromBackup(
    filename: string,
    password: string
  ): { success: boolean; privateKey?: string; mnemonic?: string; address?: string; error?: string } {
    const backup = this.readBackupFile(filename);
    if (!backup) {
      return { success: false, error: 'Could not read backup file' };
    }

    // Try to decrypt private key
    let privateKey = this.encryptionService.decrypt(backup.encrypted, password);

    // Try legacy decryption if new format fails
    if (!privateKey && isLegacyEncryption(backup.encrypted)) {
      privateKey = decryptLegacy(backup.encrypted, password);
    }

    if (!privateKey) {
      return { success: false, error: 'Invalid password or corrupted backup' };
    }

    const validation = validatePrivateKey(privateKey);
    if (!validation.success) {
      return { success: false, error: 'Invalid password or corrupted backup' };
    }

    if (validation.data.address.toLowerCase() !== backup.address.toLowerCase()) {
      return { success: false, error: 'Password incorrect' };
    }

    // Try to decrypt mnemonic if available
    let mnemonic: string | undefined;
    if (backup.encryptedMnemonic) {
      mnemonic = this.encryptionService.decrypt(backup.encryptedMnemonic, password) || undefined;
    }

    return {
      success: true,
      privateKey: validation.data.normalizedKey,
      mnemonic,
      address: validation.data.address,
    };
  }
}

// Create default instance for backward compatibility
const defaultBackupService = new WalletBackupService();

// Export functions for backward compatibility
export const createBackupFile = (privateKey: string, password: string, name?: string, mnemonic?: string) =>
  defaultBackupService.createBackupFile(privateKey, password, name, mnemonic);
export const listBackupFiles = () => defaultBackupService.listBackupFiles();
export const readBackupFile = (filename: string) => defaultBackupService.readBackupFile(filename);
export const importFromBackup = (filename: string, password: string) =>
  defaultBackupService.importFromBackup(filename, password);