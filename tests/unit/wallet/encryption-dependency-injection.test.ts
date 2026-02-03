/**
 * Unit tests for wallet module encryption service dependency injection
 * Tests that wallet services accept IEncryptionService implementations
 * Requirements: 4.3 - Implement encryption service interface in wallet module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletStoreService } from '../../../src/wallet/store.js';
import { WalletBackupService } from '../../../src/wallet/backup-service.js';
import { WalletStoreTransaction } from '../../../src/wallet/transaction.js';
import type { IEncryptionService } from '../../../src/wallet/encryption-service.js';

// Mock the crypto module
vi.mock('../../../src/wallet/crypto.js', () => ({
  validatePrivateKey: vi.fn().mockReturnValue({
    valid: true,
    address: '0x1234567890123456789012345678901234567890',
    normalizedKey: '0x1234567890123456789012345678901234567890123456789012345678901234'
  }),
  formatAddress: vi.fn().mockReturnValue('0x1234...7890')
}));

// Mock fs operations
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('{"version":2,"activeAddress":null,"wallets":[]}'),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([])
}));

describe('Wallet Module Encryption Dependency Injection', () => {
  let mockEncryptionService: IEncryptionService;

  beforeEach(() => {
    mockEncryptionService = {
      encrypt: vi.fn().mockReturnValue('mock-encrypted-data'),
      decrypt: vi.fn().mockReturnValue('mock-decrypted-data'),
      generateSalt: vi.fn().mockReturnValue('mock-salt')
    };
  });

  describe('WalletStoreService Dependency Injection', () => {
    it('should accept IEncryptionService through constructor', () => {
      const storeService = new WalletStoreService(mockEncryptionService);
      expect(storeService).toBeDefined();
    });

    it('should use injected encryption service for wallet operations', () => {
      const storeService = new WalletStoreService(mockEncryptionService);
      
      const result = storeService.addWalletToStore(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'Test Wallet',
        'password123'
      );

      expect(result.success).toBe(true);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'password123'
      );
    });

    it('should use injected encryption service for mnemonic encryption', () => {
      const storeService = new WalletStoreService(mockEncryptionService);
      
      const result = storeService.addWalletWithMnemonicToStore(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'Test Wallet',
        'password123',
        0,
        true
      );

      expect(result.success).toBe(true);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledTimes(2); // Once for key, once for mnemonic
    });

    it('should fall back to default encryption service when none provided', () => {
      // This should not throw an error
      const storeService = new WalletStoreService();
      expect(storeService).toBeDefined();
    });
  });

  describe('WalletBackupService Dependency Injection', () => {
    it('should accept IEncryptionService through constructor', () => {
      const backupService = new WalletBackupService(mockEncryptionService);
      expect(backupService).toBeDefined();
    });

    it('should use injected encryption service for backup creation', () => {
      const backupService = new WalletBackupService(mockEncryptionService);
      
      const result = backupService.createBackupFile(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'password123',
        'Test Wallet'
      );

      expect(result.success).toBe(true);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'password123'
      );
    });

    it('should use injected encryption service for backup with mnemonic', () => {
      const backupService = new WalletBackupService(mockEncryptionService);
      
      const result = backupService.createBackupFile(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'password123',
        'Test Wallet',
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      );

      expect(result.success).toBe(true);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledTimes(2); // Once for key, once for mnemonic
    });

    it('should fall back to default encryption service when none provided', () => {
      // This should not throw an error
      const backupService = new WalletBackupService();
      expect(backupService).toBeDefined();
    });
  });

  describe('WalletStoreTransaction Dependency Injection', () => {
    it('should work with custom encryption service through services', () => {
      // The transaction uses services internally, so we test that it works
      const transaction = new WalletStoreTransaction({ autoCommit: false });
      expect(transaction).toBeDefined();
    });

    it('should handle wallet operations with encryption', () => {
      const transaction = new WalletStoreTransaction({ autoCommit: false });
      
      const result = transaction.addWallet(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'Test Wallet',
        'password123',
        true
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Mock Compatibility', () => {
    it('should enable easy mocking for testing', () => {
      // Create a mock that tracks encryption calls
      const trackingEncryptionService: IEncryptionService = {
        encrypt: vi.fn().mockImplementation((plaintext, password) => {
          return `encrypted:${plaintext}:with:${password}`;
        }),
        decrypt: vi.fn().mockImplementation((encrypted, password) => {
          if (encrypted.startsWith(`encrypted:`) && encrypted.includes(`:with:${password}`)) {
            return encrypted.split(':')[1]; // Extract original plaintext
          }
          return null;
        }),
        generateSalt: vi.fn().mockReturnValue('tracking-salt')
      };

      const storeService = new WalletStoreService(trackingEncryptionService);
      
      const result = storeService.addWalletToStore(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'Test Wallet',
        'password123'
      );

      expect(result.success).toBe(true);
      expect(trackingEncryptionService.encrypt).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'password123'
      );
    });

    it('should allow testing different encryption implementations', () => {
      // Create a simple ROT13-style mock encryption for testing
      const simpleEncryptionService: IEncryptionService = {
        encrypt: vi.fn().mockImplementation((plaintext, password) => {
          // Simple XOR-style encryption for testing
          return Buffer.from(plaintext).toString('base64') + ':' + password.length;
        }),
        decrypt: vi.fn().mockImplementation((encrypted, password) => {
          const [encoded, lengthStr] = encrypted.split(':');
          if (parseInt(lengthStr) === password.length) {
            return Buffer.from(encoded, 'base64').toString();
          }
          return null;
        }),
        generateSalt: vi.fn().mockReturnValue('simple-salt')
      };

      const storeService = new WalletStoreService(simpleEncryptionService);
      
      const result = storeService.addWalletToStore(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'Test Wallet',
        'password123'
      );

      expect(result.success).toBe(true);
      expect(simpleEncryptionService.encrypt).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interface Compliance', () => {
    it('should work with any implementation that satisfies IEncryptionService', () => {
      // Create a custom encryption service implementation
      class CustomEncryptionService implements IEncryptionService {
        encrypt(plaintext: string, password: string): string {
          return `custom-encrypted-${plaintext.length}-${password.length}`;
        }

        decrypt(encrypted: string, password: string): string | null {
          if (encrypted.startsWith('custom-encrypted-')) {
            return 'decrypted-by-custom-service';
          }
          return null;
        }

        generateSalt(): string {
          return 'custom-salt-' + Date.now();
        }
      }

      const customEncryption = new CustomEncryptionService();
      const storeService = new WalletStoreService(customEncryption);
      
      const result = storeService.addWalletToStore(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'Test Wallet',
        'password123'
      );

      expect(result.success).toBe(true);
    });

    it('should enable swapping of encryption implementations', () => {
      // Test that we can easily swap between different encryption services
      const encryptionV1: IEncryptionService = {
        encrypt: vi.fn().mockReturnValue('v1-encrypted'),
        decrypt: vi.fn().mockReturnValue('v1-decrypted'),
        generateSalt: vi.fn().mockReturnValue('v1-salt')
      };

      const encryptionV2: IEncryptionService = {
        encrypt: vi.fn().mockReturnValue('v2-encrypted'),
        decrypt: vi.fn().mockReturnValue('v2-decrypted'),
        generateSalt: vi.fn().mockReturnValue('v2-salt')
      };

      // Use V1 encryption
      const storeServiceV1 = new WalletStoreService(encryptionV1);
      storeServiceV1.addWalletToStore('0x123...', 'Wallet V1', 'password');
      expect(encryptionV1.encrypt).toHaveBeenCalled();

      // Use V2 encryption
      const storeServiceV2 = new WalletStoreService(encryptionV2);
      storeServiceV2.addWalletToStore('0x123...', 'Wallet V2', 'password');
      expect(encryptionV2.encrypt).toHaveBeenCalled();

      // Both should work independently
      expect(encryptionV1.encrypt).toHaveBeenCalledTimes(1);
      expect(encryptionV2.encrypt).toHaveBeenCalledTimes(1);
    });
  });
});