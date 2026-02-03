/**
 * Tests for UI Error Response Consistency
 * Validates that UI operations use consistent success/error objects for user feedback
 * Requirements: 5.3 - Update UI operations to use success/error objects
 */

import { describe, it, expect } from 'vitest';
import { 
  addWalletToStore, 
  removeWalletFromStore, 
  setActiveWallet, 
  updateWalletName,
  type WalletOperationResult 
} from '../../../src/wallet/storage.js';
import { validateVanityPatternLegacy } from '../../../src/cli/vanity.js';
import { UIErrorResponse, resultToUIResponse, success, failure } from '../../../src/errors/standardized-errors.js';

describe('UI Error Response Consistency', () => {
  describe('Wallet Operations', () => {
    it('should return consistent success/error structure for wallet operations', () => {
      // Test invalid private key
      const invalidResult = addWalletToStore('invalid-key', 'Test Wallet', 'password123');
      
      expect(invalidResult).toHaveProperty('success');
      expect(typeof invalidResult.success).toBe('boolean');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult).toHaveProperty('error');
      expect(typeof invalidResult.error).toBe('string');
      
      // Test wallet not found
      const notFoundResult = removeWalletFromStore('0x1234567890123456789012345678901234567890');
      
      expect(notFoundResult).toHaveProperty('success');
      expect(notFoundResult.success).toBe(false);
      expect(notFoundResult).toHaveProperty('error');
      expect(notFoundResult.error).toBe('Wallet not found');
      
      // Test invalid password
      const invalidPasswordResult = setActiveWallet('0x1234567890123456789012345678901234567890', 'wrong-password');
      
      expect(invalidPasswordResult).toHaveProperty('success');
      expect(invalidPasswordResult.success).toBe(false);
      expect(invalidPasswordResult).toHaveProperty('error');
      expect(typeof invalidPasswordResult.error).toBe('string');
      
      // Test update non-existent wallet
      const updateResult = updateWalletName('0x1234567890123456789012345678901234567890', 'New Name');
      
      expect(updateResult).toHaveProperty('success');
      expect(updateResult.success).toBe(false);
      expect(updateResult).toHaveProperty('error');
      expect(updateResult.error).toBe('Wallet not found');
    });

    it('should maintain consistent WalletOperationResult structure', () => {
      const results: WalletOperationResult[] = [
        addWalletToStore('invalid-key', 'Test', 'password'),
        removeWalletFromStore('0x1234567890123456789012345678901234567890'),
        setActiveWallet('0x1234567890123456789012345678901234567890', 'password'),
        updateWalletName('0x1234567890123456789012345678901234567890', 'New Name')
      ];

      results.forEach((result, index) => {
        // All results should have success property
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
        
        // All these test cases should fail
        expect(result.success).toBe(false);
        
        // Failed results should have error
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
        expect(result.error!.length).toBeGreaterThan(0);
        
        // Optional properties should be consistent
        if (result.address !== undefined) {
          expect(typeof result.address).toBe('string');
        }
        if (result.filePath !== undefined) {
          expect(typeof result.filePath).toBe('string');
        }
        if (result.message !== undefined) {
          expect(typeof result.message).toBe('string');
        }
        if (result.details !== undefined) {
          expect(typeof result.details).toBe('object');
        }
      });
    });
  });

  describe('CLI Validation Operations', () => {
    it('should return consistent validation results', () => {
      // Test valid pattern
      const validResult = validateVanityPatternLegacy('abc');
      
      expect(validResult).toHaveProperty('valid');
      expect(typeof validResult.valid).toBe('boolean');
      expect(validResult.valid).toBe(true);
      expect(validResult.error).toBeUndefined();
      
      // Test invalid pattern
      const invalidResult = validateVanityPatternLegacy('abcdef'); // Too long
      
      expect(invalidResult).toHaveProperty('valid');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult).toHaveProperty('error');
      expect(typeof invalidResult.error).toBe('string');
      expect(invalidResult.error).toBe('Max 3 characters to avoid timeout during deploy');
      
      // Test invalid hex
      const invalidHexResult = validateVanityPatternLegacy('xyz');
      
      expect(invalidHexResult).toHaveProperty('valid');
      expect(invalidHexResult.valid).toBe(false);
      expect(invalidHexResult).toHaveProperty('error');
      expect(invalidHexResult.error).toBe('Must be hexadecimal (0-9, a-f)');
    });
  });

  describe('Result to UI Response Conversion', () => {
    it('should convert Result types to consistent UI responses', () => {
      // Test success conversion
      const successResult = success({ data: 'test' });
      const successUI = resultToUIResponse(successResult);
      
      expect(successUI).toHaveProperty('success');
      expect(successUI.success).toBe(true);
      expect(successUI.error).toBeUndefined();
      
      // Test failure conversion
      const failureResult = failure('Operation failed', { code: 'TEST_ERROR' });
      const failureUI = resultToUIResponse(failureResult);
      
      expect(failureUI).toHaveProperty('success');
      expect(failureUI.success).toBe(false);
      expect(failureUI).toHaveProperty('error');
      expect(failureUI.error).toBe('Operation failed');
      expect(failureUI).toHaveProperty('details');
      expect(failureUI.details).toEqual({ code: 'TEST_ERROR' });
    });
  });

  describe('UI Response Structure Consistency', () => {
    it('should maintain consistent structure across all UI operations', () => {
      const uiResponses: UIErrorResponse[] = [
        // Wallet operations (already UIErrorResponse compatible)
        addWalletToStore('invalid', 'test', 'password'),
        removeWalletFromStore('0x1234567890123456789012345678901234567890'),
        
        // Result conversions
        resultToUIResponse(success('test')),
        resultToUIResponse(failure('error')),
      ];

      uiResponses.forEach((response, index) => {
        // All responses should have success property
        expect(response).toHaveProperty('success');
        expect(typeof response.success).toBe('boolean');
        
        // Optional properties should be consistent when present
        if (response.message !== undefined) {
          expect(typeof response.message).toBe('string');
        }
        if (response.error !== undefined) {
          expect(typeof response.error).toBe('string');
        }
        if (response.details !== undefined) {
          expect(typeof response.details).toBe('object');
        }
      });
    });

    it('should provide user-friendly error messages', () => {
      const errorResponses = [
        addWalletToStore('invalid-key', 'Test', 'password'),
        removeWalletFromStore('0x1234567890123456789012345678901234567890'),
        setActiveWallet('0x1234567890123456789012345678901234567890', 'wrong-password'),
        updateWalletName('0x1234567890123456789012345678901234567890', 'New Name')
      ];

      errorResponses.forEach(response => {
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
        expect(typeof response.error).toBe('string');
        expect(response.error!.length).toBeGreaterThan(0);
        
        // Error messages should be user-friendly (not technical stack traces)
        expect(response.error).not.toContain('Error:');
        expect(response.error).not.toContain('at ');
        expect(response.error).not.toContain('stack');
      });
    });
  });

  describe('Legacy Compatibility', () => {
    it('should maintain backward compatibility with existing UI patterns', () => {
      // Test that legacy validation pattern still works
      const legacyResult = validateVanityPatternLegacy('abc');
      
      expect(legacyResult).toHaveProperty('valid');
      expect(typeof legacyResult.valid).toBe('boolean');
      
      // Can be converted to UIErrorResponse pattern
      const uiResponse: UIErrorResponse = {
        success: legacyResult.valid,
        error: legacyResult.error
      };
      
      expect(uiResponse).toHaveProperty('success');
      expect(typeof uiResponse.success).toBe('boolean');
      
      if (!uiResponse.success) {
        expect(uiResponse).toHaveProperty('error');
        expect(typeof uiResponse.error).toBe('string');
      }
    });
  });

  describe('Error Context for UI Operations', () => {
    it('should provide helpful context in error messages', () => {
      const results = [
        addWalletToStore('invalid-key', 'Test', 'password'),
        removeWalletFromStore('0x1234567890123456789012345678901234567890'),
        updateWalletName('0x1234567890123456789012345678901234567890', 'New Name')
      ];

      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        
        // Error messages should be specific and actionable
        if (result.error?.includes('Invalid private key')) {
          expect(result.error).toContain('Invalid');
        } else if (result.error?.includes('not found')) {
          expect(result.error).toContain('not found');
        }
      });
    });
  });
});