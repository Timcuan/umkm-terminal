/**
 * Migration Service
 * Handles legacy wallet migration and compatibility
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { WalletStoreService, getStorePath, getWalletDir } from './store.js';
import { getBackupDir } from './backup-service.js';
import { EnvSyncService } from './env-sync-service.js';
import type { WalletOperationResult } from './types.js';

// ============================================================================
// Migration Service
// ============================================================================

/**
 * Service for handling legacy wallet migrations
 */
export class WalletMigrationService {
  private storeService: WalletStoreService;
  private envSyncService: EnvSyncService;

  constructor(storeService?: WalletStoreService, envSyncService?: EnvSyncService) {
    this.storeService = storeService || new WalletStoreService();
    this.envSyncService = envSyncService || new EnvSyncService();
  }

  /**
   * Import current .env wallet to store
   */
  migrateEnvWalletToStore(
    password: string,
    name = 'Main Wallet'
  ): WalletOperationResult {
    const currentWallet = this.envSyncService.getCurrentWallet();
    if (!currentWallet) {
      return { success: false, error: 'No wallet in .env' };
    }

    // Check if already in store
    const existing = this.storeService.getWalletByAddress(currentWallet.address);
    if (existing) {
      return { success: false, error: 'Wallet already in store' };
    }

    return this.storeService.addWalletToStore(currentWallet.privateKey, name, password, true);
  }

  /**
   * Migrate old wallet store from root to new folder
   */
  migrateOldWalletStore(): boolean {
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

  /**
   * Check if old wallet files exist and need migration
   */
  needsMigration(): { store: boolean; backups: boolean } {
    const oldStorePath = path.join(process.cwd(), '.wallets.json');
    const oldBackupDir = path.join(process.cwd(), 'wallets');

    return {
      store: fs.existsSync(oldStorePath),
      backups: fs.existsSync(oldBackupDir) && fs.readdirSync(oldBackupDir).some(f => f.endsWith('.json')),
    };
  }

  /**
   * Perform automatic migration if needed
   */
  autoMigrate(): { migrated: boolean; details: string[] } {
    const details: string[] = [];
    let migrated = false;

    const needs = this.needsMigration();

    if (needs.store || needs.backups) {
      const result = this.migrateOldWalletStore();
      if (result) {
        migrated = true;
        if (needs.store) details.push('Migrated wallet store from root directory');
        if (needs.backups) details.push('Migrated backup files from old location');
      }
    }

    return { migrated, details };
  }

  /**
   * Clean up old wallet files after successful migration
   */
  cleanupOldFiles(): { cleaned: boolean; details: string[] } {
    const details: string[] = [];
    let cleaned = false;

    const oldStorePath = path.join(process.cwd(), '.wallets.json');
    const oldBackupPath = `${oldStorePath}.bak`;
    const oldBackupDir = path.join(process.cwd(), 'wallets');

    // Remove backup of old store file
    if (fs.existsSync(oldBackupPath)) {
      try {
        fs.unlinkSync(oldBackupPath);
        details.push('Removed old wallet store backup');
        cleaned = true;
      } catch {
        details.push('Failed to remove old wallet store backup');
      }
    }

    // Remove old backup directory if empty or only contains migrated files
    if (fs.existsSync(oldBackupDir)) {
      try {
        const files = fs.readdirSync(oldBackupDir);
        if (files.length === 0) {
          fs.rmdirSync(oldBackupDir);
          details.push('Removed empty old backup directory');
          cleaned = true;
        } else {
          details.push(`Old backup directory still contains ${files.length} files`);
        }
      } catch {
        details.push('Failed to check old backup directory');
      }
    }

    return { cleaned, details };
  }
}

// Create default instance for backward compatibility
const defaultMigrationService = new WalletMigrationService();

// Export functions for backward compatibility
export const migrateEnvWalletToStore = (password: string, name?: string) =>
  defaultMigrationService.migrateEnvWalletToStore(password, name);
export const migrateOldWalletStore = () => defaultMigrationService.migrateOldWalletStore();