/**
 * Property-based tests for validation consistency
 * These tests verify that the new validation service provides consistent results
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  createPropertyTest, 
  createConsistencyTest,
  DEFAULT_PBT_CONFIG,
  isValidAddress,
  isValidPrivateKey
} from '../utils/property-test-helpers.js';
import { 
  ethereumAddress, 
  privateKey, 
  invalidAddress, 
  invalidPrivateKey,
  minimalDeployConfig,
  fullDeployConfig,
  invalidTokenConfig
} from '../utils/generators.js';
import { 
  ValidationService,
  validatePrivateKeyOrThrow,
  validateAddressOrThrow,
  validateTokenConfigOrThrow,
  defaultValidationService
} from '../../src/services/index.js';
import { validatePrivateKey as legacyValidatePrivateKey } from '../../src/wallet/crypto.js';

describe('Validation Property Tests', () => {
  const validationService = new ValidationService();

  describe('Private Key Validation Properties', () => {
    createPropertyTest(
      'Valid private keys should always pass validation',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      privateKey(),
      (key) => {
        const result = validationService.validatePrivateKey(key);
        return result.success && result.data.normalizedKey === key;
      }
    );

    createPropertyTest(
      'Invalid private keys should always fail validation',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      invalidPrivateKey(),
      (key) => {
        const result = validationService.validatePrivateKey(key);
        return !result.success;
      }
    );

    createConsistencyTest(
      'New and legacy private key validation should produce equivalent results',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      privateKey(),
      (key) => {
        const newResult = validationService.validatePrivateKey(key);
        return {
          success: newResult.success,
          address: newResult.success ? newResult.data.address : undefined,
          normalizedKey: newResult.success ? newResult.data.normalizedKey : undefined
        };
      },
      (key) => {
        const legacyResult = legacyValidatePrivateKey(key);
        return {
          success: legacyResult.valid,
          address: legacyResult.address,
          normalizedKey: legacyResult.normalizedKey
        };
      }
    );

    createPropertyTest(
      'validatePrivateKeyOrThrow should throw for invalid keys',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      invalidPrivateKey(),
      (key) => {
        try {
          validatePrivateKeyOrThrow(key);
          return false; // Should have thrown
        } catch (error) {
          return error instanceof Error && error.message.includes('INVALID_PRIVATE_KEY');
        }
      }
    );
  });

  describe('Address Validation Properties', () => {
    createPropertyTest(
      'Valid addresses should always pass validation',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      ethereumAddress(),
      (address) => {
        const result = validationService.validateAddress(address);
        return result.success && result.data.address === address;
      }
    );

    createPropertyTest(
      'Invalid addresses should always fail validation',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      invalidAddress(),
      (address) => {
        const result = validationService.validateAddress(address);
        return !result.success;
      }
    );

    createPropertyTest(
      'validateAddressOrThrow should throw for invalid addresses',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      invalidAddress(),
      (address) => {
        try {
          validateAddressOrThrow(address);
          return false; // Should have thrown
        } catch (error) {
          return error instanceof Error && error.message.includes('INVALID_ADDRESS');
        }
      }
    );
  });

  describe('Token Configuration Validation Properties', () => {
    createPropertyTest(
      'Valid minimal token configs should always pass validation',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      minimalDeployConfig(),
      (config) => {
        const result = validationService.validateTokenConfig(config);
        return result.success && 
               result.data.name === config.name.trim() &&
               result.data.symbol === config.symbol.trim().toUpperCase();
      }
    );

    createPropertyTest(
      'Valid full token configs should always pass validation',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      fullDeployConfig(),
      (config) => {
        const result = validationService.validateTokenConfig(config);
        if (!result.success) {
          console.log('Validation failed for config:', config, 'Error:', result.error);
        }
        return result.success;
      }
    );

    createPropertyTest(
      'Invalid token configs should always fail validation',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      invalidTokenConfig(),
      (config) => {
        const result = validationService.validateTokenConfig(config);
        return !result.success;
      }
    );

    createPropertyTest(
      'validateTokenConfigOrThrow should throw for invalid configs',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      invalidTokenConfig(),
      (config) => {
        try {
          validateTokenConfigOrThrow(config);
          return false; // Should have thrown
        } catch (error) {
          return error instanceof Error && error.message.includes('INVALID_TOKEN_CONFIG');
        }
      }
    );
  });

  describe('Validation Service Instance Properties', () => {
    createPropertyTest(
      'Multiple validation service instances should produce identical results',
      1,
      'Validation Consistency',
      ['Requirements 1.1', 'Requirements 1.5'],
      privateKey(),
      (key) => {
        const service1 = new ValidationService();
        const service2 = new ValidationService();
        const defaultService = defaultValidationService;
        
        const result1 = service1.validatePrivateKey(key);
        const result2 = service2.validatePrivateKey(key);
        const result3 = defaultService.validatePrivateKey(key);
        
        return result1.success === result2.success && 
               result2.success === result3.success &&
               (result1.success ? 
                 result1.data.address === result2.data.address &&
                 result2.data.address === result3.data.address : true);
      }
    );
  });

  describe('Error Structure Consistency Properties', () => {
    it('Feature: codebase-refactoring, Property 6: Error Structure Consistency', async () => {
      await fc.assert(fc.asyncProperty(
        invalidPrivateKey(),
        (key) => {
          const result = validationService.validatePrivateKey(key);
          
          // All failed validations should have consistent structure
          if (!result.success) {
            expect(result).toHaveProperty('error');
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
            
            // Should have details for debugging
            if (result.details) {
              expect(typeof result.details).toBe('object');
            }
            
            return true;
          }
          
          return true;
        }
      ), DEFAULT_PBT_CONFIG);
    });

    it('Feature: codebase-refactoring, Property 7: Result Type Consistency', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(privateKey(), invalidPrivateKey()),
        (key) => {
          const result = validationService.validatePrivateKey(key);
          
          // All results should follow the Result<T, E> pattern
          expect(result).toHaveProperty('success');
          expect(typeof result.success).toBe('boolean');
          
          if (result.success) {
            expect(result).toHaveProperty('data');
            expect(result.data).toHaveProperty('address');
            expect(result.data).toHaveProperty('normalizedKey');
            expect(result).not.toHaveProperty('error');
          } else {
            expect(result).toHaveProperty('error');
            expect(typeof result.error).toBe('string');
            expect(result).not.toHaveProperty('data');
          }
          
          return true;
        }
      ), DEFAULT_PBT_CONFIG);
    });
  });

  describe('Future Validation Service Properties', () => {
    it('should prepare for cross-module consistency validation', () => {
      // This test validates that we have the foundation for testing
      // consistency across deployer, batch, and wallet modules
      
      const service = new ValidationService();
      expect(service).toBeDefined();
      expect(typeof service.validatePrivateKey).toBe('function');
      expect(typeof service.validateAddress).toBe('function');
      expect(typeof service.validateTokenConfig).toBe('function');
      
      // Helper functions should be available
      expect(typeof validatePrivateKeyOrThrow).toBe('function');
      expect(typeof validateAddressOrThrow).toBe('function');
      expect(typeof validateTokenConfigOrThrow).toBe('function');
      
      // Default instance should be available
      expect(defaultValidationService).toBeDefined();
    });
  });
});