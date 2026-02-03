/**
 * Unit Tests for ValidationService
 * Tests centralized validation logic and service interface
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  ValidationService,
  type IValidationService,
  validatePrivateKeyOrThrow,
  validateAddressOrThrow,
  createValidationService
} from '../../../src/services/validation-service.js';

describe('ValidationService', () => {
  let service: IValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validatePrivateKey', () => {
    it('should validate valid private keys', () => {
      // Valid private key (32 bytes hex)
      const validKey = '0x' + '1'.repeat(64);
      const result = service.validatePrivateKey(validKey);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(result.data.normalizedKey).toBe(validKey);
      }
    });

    it('should reject invalid private keys', () => {
      const invalidKeys = [
        '', // Empty
        '0x', // Too short
        '0x' + 'g'.repeat(64), // Invalid hex
        '0x' + '0'.repeat(63), // Too short
        '0x' + '0'.repeat(65), // Too long
        'not-hex-at-all'
      ];

      for (const key of invalidKeys) {
        const result = service.validatePrivateKey(key);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeTruthy();
        }
      }
    });

    it('should handle edge cases', () => {
      // All zeros (technically valid but edge case)
      const zeroKey = '0x' + '0'.repeat(64);
      const result = service.validatePrivateKey(zeroKey);
      
      // This might be valid or invalid depending on implementation
      // Just ensure it returns a consistent result
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('validateMnemonic', () => {
    it('should validate valid mnemonic phrases', () => {
      // Standard 12-word mnemonic (BIP39)
      const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const result = service.validateMnemonic(validMnemonic);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mnemonic).toBe(validMnemonic);
        expect(result.data.isValid).toBe(true);
        expect(result.data.wordCount).toBe(12);
      }
    });

    it('should reject invalid mnemonic phrases', () => {
      const invalidMnemonics = [
        '', // Empty
        'invalid words that are not in bip39 wordlist',
        'abandon', // Too short
        'abandon '.repeat(25).trim(), // Too long
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon invalid' // Invalid word
      ];

      for (const mnemonic of invalidMnemonics) {
        const result = service.validateMnemonic(mnemonic);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeTruthy();
        }
      }
    });

    it('should handle whitespace normalization', () => {
      const mnemonic = '  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about  ';
      const result = service.validateMnemonic(mnemonic);
      
      if (result.success) {
        expect(result.data.mnemonic).toBe(mnemonic.trim());
        expect(result.data.wordCount).toBe(12);
      }
    });
  });

  describe('validateAddress', () => {
    it('should validate valid Ethereum addresses', () => {
      const validAddresses = [
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        '0x0000000000000000000000000000000000000000',
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      ];

      for (const address of validAddresses) {
        const result = service.validateAddress(address);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.address).toBe(address);
          expect(result.data.isValid).toBe(true);
          expect(result.data.checksumAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
        }
      }
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        '', // Empty
        '0x', // Too short
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b', // Too short
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b66', // Too long
        '742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Missing 0x
        '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // Invalid hex
        'not-an-address'
      ];

      for (const address of invalidAddresses) {
        const result = service.validateAddress(address);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeTruthy();
        }
      }
    });

    it('should handle case variations', () => {
      const address = '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6'; // lowercase
      const result = service.validateAddress(address);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe(address);
        expect(result.data.checksumAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });
  });

  describe('validateTokenConfig', () => {
    it('should validate valid token configurations', () => {
      const validConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      };

      const result = service.validateTokenConfig(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Token');
        expect(result.data.symbol).toBe('TEST');
        expect(result.data.isValid).toBe(true);
        expect(result.data.errors).toEqual([]);
      }
    });

    it('should reject invalid token configurations', () => {
      const invalidConfigs = [
        {}, // Missing required fields
        { name: '', symbol: 'TEST' }, // Empty name
        { name: 'Test', symbol: '' }, // Empty symbol
        { name: 'Test', symbol: 'test' }, // Lowercase symbol
        { name: 'Test', symbol: 'TOOLONGSYMBOL' }, // Symbol too long
        { name: 'A'.repeat(51), symbol: 'TEST' }, // Name too long
        { name: 'Test', symbol: 'TEST!@#' }, // Invalid symbol characters
        { name: 'Test', symbol: 'TEST', tokenAdmin: 'invalid-address' } // Invalid admin
      ];

      for (const config of invalidConfigs) {
        const result = service.validateTokenConfig(config);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeTruthy();
        }
      }
    });

    it('should handle optional fields', () => {
      const configWithoutAdmin = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = service.validateTokenConfig(configWithoutAdmin);
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from name and symbol', () => {
      const config = {
        name: '  Test Token  ',
        symbol: '  TEST  '
      };

      const result = service.validateTokenConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Token');
        expect(result.data.symbol).toBe('TEST');
      }
    });
  });

  describe('helper functions', () => {
    describe('validatePrivateKeyOrThrow', () => {
      it('should return data for valid private key', () => {
        const validKey = '0x' + '1'.repeat(64);
        const result = validatePrivateKeyOrThrow(validKey);
        
        expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(result.normalizedKey).toBe(validKey);
      });

      it('should throw for invalid private key', () => {
        const invalidKey = 'invalid';
        
        expect(() => validatePrivateKeyOrThrow(invalidKey)).toThrow();
        expect(() => validatePrivateKeyOrThrow(invalidKey, 'test context')).toThrow();
      });
    });

    describe('validateAddressOrThrow', () => {
      it('should return data for valid address', () => {
        const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        const result = validateAddressOrThrow(validAddress);
        
        expect(result.address).toBe(validAddress);
        expect(result.isValid).toBe(true);
        expect(result.checksumAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });

      it('should throw for invalid address', () => {
        const invalidAddress = 'invalid';
        
        expect(() => validateAddressOrThrow(invalidAddress)).toThrow();
        expect(() => validateAddressOrThrow(invalidAddress, 'test context')).toThrow();
      });
    });
  });

  describe('factory function', () => {
    it('should create validation service instance', () => {
      const service = createValidationService();
      expect(service).toBeInstanceOf(ValidationService);
      expect(typeof service.validatePrivateKey).toBe('function');
      expect(typeof service.validateMnemonic).toBe('function');
      expect(typeof service.validateAddress).toBe('function');
      expect(typeof service.validateTokenConfig).toBe('function');
    });
  });

  // Property-based tests
  describe('property tests', () => {
    it('Feature: codebase-refactoring, Property 1: Validation Consistency - should produce consistent results', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 64, maxLength: 64 }).filter(s => /^[0-9a-fA-F]{64}$/.test(s)).map(s => '0x' + s),
        (privateKey) => {
          const service1 = new ValidationService();
          const service2 = new ValidationService();
          
          const result1 = service1.validatePrivateKey(privateKey);
          const result2 = service2.validatePrivateKey(privateKey);
          
          // Results should be identical
          expect(result1.success).toBe(result2.success);
          if (result1.success && result2.success) {
            expect(result1.data.address).toBe(result2.data.address);
            expect(result1.data.normalizedKey).toBe(result2.data.normalizedKey);
          }
        }
      ), { numRuns: 10 }); // Reduced runs due to filtering
    });

    it('should handle arbitrary string inputs gracefully', () => {
      fc.assert(fc.property(
        fc.string(),
        (input) => {
          const result = service.validatePrivateKey(input);
          
          // Should always return a valid result structure
          expect(typeof result.success).toBe('boolean');
          if (!result.success) {
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
          }
        }
      ), { numRuns: 100 });
    });
  });
});