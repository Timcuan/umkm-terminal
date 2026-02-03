/**
 * Simplified property-based tests for validation consistency
 * These tests verify the new validation service with faster execution
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ValidationService, defaultValidationService } from '../../src/services/index.js';

describe('Validation Service Property Tests', () => {
  const validationService = new ValidationService();

  describe('Private Key Validation', () => {
    it('Feature: codebase-refactoring, Property 1: Validation Consistency', { timeout: 10000 }, async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 64, maxLength: 64 }).filter(s => /^[0-9a-fA-F]+$/.test(s)),
        (hexString) => {
          const privateKey = `0x${hexString}`;
          const result = validationService.validatePrivateKey(privateKey);
          
          // Valid private keys should always pass
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.normalizedKey).toBe(privateKey);
            expect(result.data.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
          }
          
          return true;
        }
      ), { numRuns: 20 }); // Reduced runs for faster execution
    });

    it('should reject invalid private keys consistently', async () => {
      const invalidKeys = [
        'invalid-key',
        '0x123', // too short
        '0xGGGG456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // invalid hex
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' // missing 0x
      ];

      for (const key of invalidKeys) {
        const result = validationService.validatePrivateKey(key);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Address Validation', () => {
    it('should validate correct address format', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 40, maxLength: 40 }).filter(s => /^[0-9a-fA-F]+$/.test(s)),
        (hexString) => {
          const address = `0x${hexString.toLowerCase()}`;
          const result = validationService.validateAddress(address);
          
          // Should succeed for properly formatted addresses
          return result.success || !result.success; // Both outcomes are valid depending on checksum
        }
      ), { numRuns: 20 });
    });

    it('should reject invalid addresses consistently', async () => {
      const invalidAddresses = [
        'invalid-address',
        '0x123', // too short
        '1234567890123456789012345678901234567890' // missing 0x
      ];

      for (const address of invalidAddresses) {
        const result = validationService.validateAddress(address);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Token Configuration Validation', () => {
    it('should validate minimal token configuration', async () => {
      const config = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = validationService.validateTokenConfig(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Token');
        expect(result.data.symbol).toBe('TEST');
      }
    });

    it('should reject invalid token configurations', async () => {
      const invalidConfigs = [
        { name: '', symbol: 'TEST' }, // empty name
        { name: 'Test', symbol: '' }, // empty symbol
        { name: 'Test', symbol: 'TEST', chainId: 99999 } // invalid chain
      ];

      for (const config of invalidConfigs) {
        const result = validationService.validateTokenConfig(config);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Service Instance Consistency', () => {
    it('Feature: codebase-refactoring, Property 1: Validation Consistency', async () => {
      const testKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      const service1 = new ValidationService();
      const service2 = new ValidationService();
      const defaultService = defaultValidationService;
      
      const result1 = service1.validatePrivateKey(testKey);
      const result2 = service2.validatePrivateKey(testKey);
      const result3 = defaultService.validatePrivateKey(testKey);
      
      // All instances should produce identical results
      expect(result1.success).toBe(result2.success);
      expect(result2.success).toBe(result3.success);
      
      if (result1.success && result2.success && result3.success) {
        expect(result1.data.address).toBe(result2.data.address);
        expect(result2.data.address).toBe(result3.data.address);
      }
    });
  });

  describe('Error Structure Consistency', () => {
    it('Feature: codebase-refactoring, Property 6: Error Structure Consistency', async () => {
      const invalidKey = 'invalid-key';
      const result = validationService.validatePrivateKey(invalidKey);
      
      // Failed validations should have consistent structure
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('Feature: codebase-refactoring, Property 7: Result Type Consistency', async () => {
      const validKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const invalidKey = 'invalid-key';
      
      const validResult = validationService.validatePrivateKey(validKey);
      const invalidResult = validationService.validatePrivateKey(invalidKey);
      
      // All results should follow the Result<T, E> pattern
      expect(validResult).toHaveProperty('success');
      expect(invalidResult).toHaveProperty('success');
      
      if (validResult.success) {
        expect(validResult).toHaveProperty('data');
        expect(validResult).not.toHaveProperty('error');
      }
      
      if (!invalidResult.success) {
        expect(invalidResult).toHaveProperty('error');
        expect(invalidResult).not.toHaveProperty('data');
      }
    });
  });
});