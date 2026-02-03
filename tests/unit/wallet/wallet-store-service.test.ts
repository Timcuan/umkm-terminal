/**
 * Unit tests for WalletStoreService
 * Validates wallet store operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletStoreService } from '../../../src/wallet/store.js';
import { EncryptionService } from '../../../src/wallet/encryption-service.js';

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
  writeFileSync: vi.fn()
}));

describe('WalletStoreService', () => {
  let storeService: WalletStoreService;
  let mockEncryptionService: EncryptionService;

  beforeEach(() => {
    mockEncryptionService = {
      encrypt: vi.fn().mockReturnValue('encrypted-data'),
      decrypt: vi.fn().mockReturnValue('decrypted-data'),
      generateSalt: vi.fn().mockReturnValue('salt')
    } as any;

    storeService = new WalletStoreService(mockEncryptionService);
  });

  describe('loadWalletStore', () => {
    it('should return default store when file does not exist', () => {
      const store = storeService.loadWalletStore();

      expect(store).toEqual({
        version: 2,
        activeAddress: null,
        wallets: []
      });
    });
  });

  describe('addWalletToStore', () => {
    it('should add wallet successfully', () => {
      const result = storeService.addWalletToStore(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'Test Wallet',
        'password123'
      );

      expect(result.success).toBe(true);
      expect(result.address).toBe('0x1234567890123456789012345678901234567890');
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'password123'
      );
    });

    it('should handle invalid private key', async () => {
      const { validatePrivateKey } = vi.mocked(await import('../../../src/wallet/crypto.js'));
      validatePrivateKey.mockReturnValueOnce({
        valid: false,
        error: 'Invalid private key format'
      });

      const result = storeService.addWalletToStore(
        'invalid-key',
        'Test Wallet',
        'password123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid private key format');
    });
  });

  describe('getAllWallets', () => {
    it('should return all wallets from store', () => {
      const wallets = storeService.getAllWallets();
      expect(Array.isArray(wallets)).toBe(true);
    });
  });

  describe('getWalletByAddress', () => {
    it('should return null when wallet not found', () => {
      const wallet = storeService.getWalletByAddress('0x1111111111111111111111111111111111111111');
      expect(wallet).toBeNull();
    });
  });

  describe('decryptWallet', () => {
    it('should return null when wallet not found', () => {
      const result = storeService.decryptWallet('0x1111111111111111111111111111111111111111', 'password');
      expect(result).toBeNull();
    });
  });
});