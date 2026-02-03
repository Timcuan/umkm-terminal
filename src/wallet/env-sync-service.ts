/**
 * Environment Sync Service
 * Handles .env file synchronization for wallet private keys
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { validatePrivateKey } from './crypto.js';
import type { WalletInfo } from './types.js';

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Get .env file path
 */
export function getEnvPath(): string {
  return path.join(process.cwd(), '.env');
}

// ============================================================================
// Environment Sync Service
// ============================================================================

/**
 * Service for managing .env file synchronization
 */
export class EnvSyncService {
  /**
   * Sync active wallet to .env file
   */
  syncActiveWalletToEnv(privateKey: string): boolean {
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
  getEnvPrivateKey(): string | null {
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
  getCurrentWallet(): WalletInfo | null {
    const privateKey = this.getEnvPrivateKey();
    if (!privateKey) return null;

    const validation = validatePrivateKey(privateKey);
    if (!validation.success) return null;

    return {
      address: validation.data.address,
      privateKey: validation.data.normalizedKey,
    };
  }

  /**
   * Remove private key from .env file
   */
  removePrivateKeyFromEnv(): boolean {
    const envPath = getEnvPath();

    try {
      if (!fs.existsSync(envPath)) return true;

      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/^PRIVATE_KEY=.*$/m, '');
      
      // Clean up empty lines
      envContent = envContent.replace(/\n\n+/g, '\n').trim();
      
      if (envContent) {
        fs.writeFileSync(envPath, envContent + '\n');
      } else {
        // If file is empty, remove it
        fs.unlinkSync(envPath);
      }

      delete process.env.PRIVATE_KEY;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if .env file has a private key
   */
  hasEnvPrivateKey(): boolean {
    return this.getEnvPrivateKey() !== null;
  }

  /**
   * Validate .env private key
   */
  validateEnvPrivateKey(): { valid: boolean; address?: string; error?: string } {
    const privateKey = this.getEnvPrivateKey();
    if (!privateKey) {
      return { valid: false, error: 'No private key in .env file' };
    }

    const validation = validatePrivateKey(privateKey);
    return {
      valid: validation.success,
      address: validation.success ? validation.data.address : undefined,
      error: validation.success ? undefined : validation.error,
    };
  }
}

// Create default instance for backward compatibility
const defaultEnvSyncService = new EnvSyncService();

// Export functions for backward compatibility
export const syncActiveWalletToEnv = (privateKey: string) => defaultEnvSyncService.syncActiveWalletToEnv(privateKey);
export const getEnvPrivateKey = () => defaultEnvSyncService.getEnvPrivateKey();
export const getCurrentWallet = () => defaultEnvSyncService.getCurrentWallet();

// Alias for backward compatibility
export const savePrivateKeyToEnv = syncActiveWalletToEnv;