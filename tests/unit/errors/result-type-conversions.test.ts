/**
 * Tests for Result type conversions in sync operations
 * Validates that sync operations now use Result types instead of throwing
 * Requirements: 5.2 - Update sync operations to use Result types
 */

import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../../src/config/index.js';
import { validateVanityPattern } from '../../../src/cli/vanity.js';
import { validatePrivateKey, validateMnemonicPhrase } from '../../../src/wallet/crypto.js';
import { validatePoolPositions } from '../../../src/utils/index.js';
import type { ClankerEnvConfig } from '../../../src/config/index.js';
import type { PoolPosition } from '../../../src/types/index.js';

describe('Result Type Conversions', () => {
  describe('Config Validation', () => {
    it('should return success Result for valid config', () => {
      const validConfig: ClankerEnvConfig = {
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        chainId: 8453,
        vaultPercentage: 50,
        mevBlockDelay: 5
      };

      const result = validateConfig(validConfig);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
    });

    it('should return failure Result for invalid config', () => {
      const invalidConfig: ClankerEnvConfig = {
        privateKey: 'invalid-key',
        chainId: 999999, // Invalid chain
        vaultPercentage: 150, // Invalid percentage
        mevBlockDelay: -5 // Invalid delay
      };

      const result = validateConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Array.isArray(result.error)).toBe(true);
        expect(result.error.length).toBeGreaterThan(0);
        expect(result.error).toContain('Invalid private key format');
        expect(result.error).toContain('Unsupported chain ID: 999999');
        expect(result.error).toContain('Vault percentage must be 0-90');
        expect(result.error).toContain('MEV block delay must be 0-100');
      }
    });
  });

  describe('Vanity Pattern Validation', () => {
    it('should return success Result for valid pattern', () => {
      const result = validateVanityPattern('abc');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('abc');
      }
    });

    it('should return success Result for empty pattern', () => {
      const result = validateVanityPattern('');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('');
      }
    });

    it('should return failure Result for pattern too long', () => {
      const result = validateVanityPattern('abcdef');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Max 3 characters to avoid timeout during deploy');
      }
    });

    it('should return failure Result for invalid hex', () => {
      const result = validateVanityPattern('xyz');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Must be hexadecimal (0-9, a-f)');
      }
    });
  });

  describe('Private Key Validation', () => {
    it('should return success Result for valid private key', () => {
      const validKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = validatePrivateKey(validKey);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.normalizedKey).toBe(validKey);
        expect(result.data.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });

    it('should return success Result for key without 0x prefix', () => {
      const keyWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = validatePrivateKey(keyWithoutPrefix);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.normalizedKey).toBe(`0x${keyWithoutPrefix}`);
        expect(result.data.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });

    it('should return failure Result for invalid length', () => {
      const result = validatePrivateKey('0x123');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid length');
      }
    });

    it('should return failure Result for invalid hex', () => {
      const result = validatePrivateKey('0x123456789012345678901234567890123456789012345678901234567890123g');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid format: must be hexadecimal characters only');
      }
    });
  });

  describe('Mnemonic Validation', () => {
    it('should return success Result for valid mnemonic', () => {
      const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const result = validateMnemonicPhrase(validMnemonic);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validMnemonic);
      }
    });

    it('should return failure Result for invalid mnemonic', () => {
      const invalidMnemonic = 'invalid mnemonic phrase';
      const result = validateMnemonicPhrase(invalidMnemonic);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid mnemonic phrase');
      }
    });

    it('should handle whitespace trimming', () => {
      const mnemonicWithSpaces = '  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about  ';
      const result = validateMnemonicPhrase(mnemonicWithSpaces);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
      }
    });
  });

  describe('Pool Position Validation', () => {
    it('should return success Result for valid positions', () => {
      const validPositions: PoolPosition[] = [
        { tickLower: -1000, tickUpper: 1000, bps: 5000 },
        { tickLower: 1000, tickUpper: 2000, bps: 5000 }
      ];
      
      const result = validatePoolPositions(validPositions);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPositions);
      }
    });

    it('should return failure Result for invalid total BPS', () => {
      const invalidPositions: PoolPosition[] = [
        { tickLower: -1000, tickUpper: 1000, bps: 6000 },
        { tickLower: 1000, tickUpper: 2000, bps: 6000 }
      ];
      
      const result = validatePoolPositions(invalidPositions);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Total BPS must equal 10000, got 12000');
      }
    });

    it('should return failure Result for invalid tick range', () => {
      const invalidPositions: PoolPosition[] = [
        { tickLower: 1000, tickUpper: 500, bps: 10000 } // tickLower > tickUpper
      ];
      
      const result = validatePoolPositions(invalidPositions);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid tick range: tickLower (1000) must be less than tickUpper (500)');
      }
    });

    it('should return failure Result for invalid BPS value', () => {
      const invalidPositions: PoolPosition[] = [
        { tickLower: -1000, tickUpper: 1000, bps: 0 } // Invalid BPS
      ];
      
      const result = validatePoolPositions(invalidPositions);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid BPS value: 0 must be between 1 and 10000');
      }
    });
  });

  describe('Result Type Consistency', () => {
    it('should maintain consistent Result structure across all functions', () => {
      const functions = [
        () => validateConfig({ privateKey: '0x123', chainId: 8453 }),
        () => validateVanityPattern('abc'),
        () => validatePrivateKey('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
        () => validateMnemonicPhrase('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'),
        () => validatePoolPositions([{ tickLower: -1000, tickUpper: 1000, bps: 10000 }])
      ];

      functions.forEach((fn, index) => {
        const result = fn();
        
        // All results should have success property
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
        
        if (result.success) {
          expect(result).toHaveProperty('data');
          expect(result).not.toHaveProperty('error');
        } else {
          expect(result).toHaveProperty('error');
          expect(result).not.toHaveProperty('data');
        }
      });
    });
  });
});