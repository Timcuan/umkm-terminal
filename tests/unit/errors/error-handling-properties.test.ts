/**
 * Property-based tests for error handling consistency
 * Tests universal properties that should hold across all error handling patterns
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3 - Standardize error handling patterns
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  ClankerError as StandardizedClankerError,
  ValidationError as StandardizedValidationError,
  DeploymentError as StandardizedDeploymentError,
  WalletError as StandardizedWalletError,
  Result,
  UIErrorResponse,
  ErrorContext,
  success,
  failure,
  resultToUIResponse,
  trySync,
  tryAsync,
  isErrorType,
  getErrorCode,
  createValidationError,
  createDeploymentError,
  createWalletError,
  VALIDATION_ERRORS,
  DEPLOYMENT_ERRORS,
  WALLET_ERRORS,
} from '../../../src/errors/standardized-errors.js';

// ============================================================================
// Property Test Generators
// ============================================================================

/**
 * Generator for error codes
 */
const errorCodeArb = fc.oneof(
  fc.constantFrom(...Object.values(VALIDATION_ERRORS)),
  fc.constantFrom(...Object.values(DEPLOYMENT_ERRORS)),
  fc.constantFrom(...Object.values(WALLET_ERRORS)),
  fc.string({ minLength: 1, maxLength: 50 }).map(s => s.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))
);

/**
 * Generator for error messages
 */
const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 });

/**
 * Generator for error context
 */
const errorContextArb = fc.record({
  operation: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  component: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  tokenIndex: fc.option(fc.integer({ min: 0, max: 1000 })),
  walletAddress: fc.option(fc.string({ minLength: 42, maxLength: 42 }).map(s => `0x${s.padStart(40, '0')}`)),
  chainId: fc.option(fc.constantFrom(1, 8453, 42161, 130, 10143)),
}, { requiredKeys: [] });

/**
 * Generator for ClankerError instances
 */
const clankerErrorArb = fc.tuple(errorCodeArb, errorMessageArb, fc.option(errorContextArb))
  .map(([code, message, context]) => new StandardizedClankerError(code, message, context));

/**
 * Generator for ValidationError instances
 */
const validationErrorArb = fc.tuple(errorCodeArb, errorMessageArb, fc.option(errorContextArb))
  .map(([code, message, context]) => new StandardizedValidationError(code, message, context));

/**
 * Generator for DeploymentError instances
 */
const deploymentErrorArb = fc.tuple(errorCodeArb, errorMessageArb, fc.option(errorContextArb))
  .map(([code, message, context]) => new StandardizedDeploymentError(code, message, context));

/**
 * Generator for WalletError instances
 */
const walletErrorArb = fc.tuple(errorCodeArb, errorMessageArb, fc.option(errorContextArb))
  .map(([code, message, context]) => new StandardizedWalletError(code, message, context));

/**
 * Generator for any standardized error
 */
const anyStandardizedErrorArb = fc.oneof(
  clankerErrorArb,
  validationErrorArb,
  deploymentErrorArb,
  walletErrorArb
);

/**
 * Generator for Result types
 */
const resultArb = <T>(dataArb: fc.Arbitrary<T>) => fc.oneof(
  dataArb.map(data => success(data)),
  errorMessageArb.map(error => failure(error))
);

// ============================================================================
// Property Tests
// ============================================================================

describe('Error Handling Properties', () => {
  describe('Feature: codebase-refactoring, Property 6: Error Structure Consistency', () => {
    it('should maintain consistent structure across all error types', () => {
      fc.assert(fc.property(
        anyStandardizedErrorArb,
        (error) => {
          // All errors should have consistent JSON structure
          const json = error.toJSON();
          
          expect(json).toHaveProperty('name');
          expect(json).toHaveProperty('code');
          expect(json).toHaveProperty('message');
          expect(json).toHaveProperty('context');
          expect(json).toHaveProperty('timestamp');
          expect(json).toHaveProperty('stack');
          
          // All errors should be instances of Error
          expect(error).toBeInstanceOf(Error);
          expect(error).toBeInstanceOf(StandardizedClankerError);
          
          // Code and message should match constructor inputs
          expect(typeof error.code).toBe('string');
          expect(typeof error.message).toBe('string');
          expect(error.code.length).toBeGreaterThan(0);
          expect(error.message.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });

    it('should provide consistent display messages with context', () => {
      fc.assert(fc.property(
        errorCodeArb,
        errorMessageArb,
        fc.option(errorContextArb),
        (code, message, context) => {
          const error = new StandardizedClankerError(code, message, context);
          const displayMessage = error.getDisplayMessage();
          
          if (context?.operation) {
            // Should include operation in display message
            expect(displayMessage).toBe(`${context.operation}: ${message}`);
          } else {
            // Should return original message
            expect(displayMessage).toBe(message);
          }
        }
      ), { numRuns: 100 });
    });

    it('should maintain error inheritance hierarchy', () => {
      fc.assert(fc.property(
        anyStandardizedErrorArb,
        (error) => {
          // All standardized errors should inherit from ClankerError
          expect(error).toBeInstanceOf(StandardizedClankerError);
          expect(error).toBeInstanceOf(Error);
          
          // Specific error types should maintain their identity
          if (error instanceof StandardizedValidationError) {
            expect(error.name).toBe('ValidationError');
          } else if (error instanceof StandardizedDeploymentError) {
            expect(error.name).toBe('DeploymentError');
          } else if (error instanceof StandardizedWalletError) {
            expect(error.name).toBe('WalletError');
          } else {
            expect(error.name).toBe('ClankerError');
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe('Feature: codebase-refactoring, Property 7: Result Type Consistency', () => {
    it('should maintain consistent Result type structure', () => {
      fc.assert(fc.property(
        resultArb(fc.string()),
        (result) => {
          if (result.success) {
            // Success results should have data property
            expect(result).toHaveProperty('data');
            expect(result).not.toHaveProperty('error');
            expect(result).not.toHaveProperty('details');
          } else {
            // Failure results should have error property
            expect(result).toHaveProperty('error');
            expect(result).not.toHaveProperty('data');
            // details is optional
          }
        }
      ), { numRuns: 100 });
    });

    it('should convert Results to UI responses consistently', () => {
      fc.assert(fc.property(
        resultArb(fc.string()),
        (result) => {
          const uiResponse = resultToUIResponse(result);
          
          // UI response should always have success property
          expect(uiResponse).toHaveProperty('success');
          expect(typeof uiResponse.success).toBe('boolean');
          
          if (result.success) {
            expect(uiResponse.success).toBe(true);
            expect(uiResponse.error).toBeUndefined();
          } else {
            expect(uiResponse.success).toBe(false);
            expect(uiResponse.error).toBeDefined();
            expect(typeof uiResponse.error).toBe('string');
          }
        }
      ), { numRuns: 100 });
    });

    it('should handle trySync consistently', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.string().map(value => () => value), // Success function
          fc.string().map(message => () => { throw new Error(message); }) // Error function
        ),
        (fn) => {
          const result = trySync(fn);
          
          // Result should always have consistent structure
          if (result.success) {
            expect(result).toHaveProperty('data');
            expect(result).not.toHaveProperty('error');
          } else {
            expect(result).toHaveProperty('error');
            expect(result).not.toHaveProperty('data');
            expect(typeof result.error).toBe('string');
          }
        }
      ), { numRuns: 100 });
    });

    it('should handle tryAsync consistently', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.string().map(value => async () => value), // Success function
          fc.string().map(message => async () => { throw new Error(message); }) // Error function
        ),
        async (fn) => {
          const result = await tryAsync(fn);
          
          // Result should always have consistent structure
          if (result.success) {
            expect(result).toHaveProperty('data');
            expect(result).not.toHaveProperty('error');
          } else {
            expect(result).toHaveProperty('error');
            expect(result).not.toHaveProperty('data');
            expect(typeof result.error).toBe('string');
          }
        }
      ), { numRuns: 50 }); // Fewer runs for async tests
    });
  });

  describe('Feature: codebase-refactoring, Property 8: UI Error Response Consistency', () => {
    it('should provide consistent UI error responses', () => {
      fc.assert(fc.property(
        resultArb(fc.anything()),
        (result) => {
          const uiResponse = resultToUIResponse(result);
          
          // UI response should have consistent structure
          expect(uiResponse).toHaveProperty('success');
          expect(typeof uiResponse.success).toBe('boolean');
          
          // Optional properties should be consistent
          if (uiResponse.message !== undefined) {
            expect(typeof uiResponse.message).toBe('string');
          }
          if (uiResponse.error !== undefined) {
            expect(typeof uiResponse.error).toBe('string');
          }
          if (uiResponse.details !== undefined) {
            expect(typeof uiResponse.details).toBe('object');
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe('Feature: codebase-refactoring, Property 11: Error Type Predictability', () => {
    it('should consistently produce same error types for same conditions', () => {
      fc.assert(fc.property(
        fc.constantFrom('INVALID_PRIVATE_KEY', 'INVALID_ADDRESS', 'INVALID_CONFIG'),
        errorMessageArb,
        fc.option(errorContextArb),
        (code, message, context) => {
          // Create multiple errors with same parameters
          const error1 = createValidationError(code as keyof typeof VALIDATION_ERRORS, message, context);
          const error2 = createValidationError(code as keyof typeof VALIDATION_ERRORS, message, context);
          
          // Should have same type and properties
          expect(error1.constructor).toBe(error2.constructor);
          expect(error1.name).toBe(error2.name);
          expect(error1.code).toBe(error2.code);
          expect(error1.message).toBe(error2.message);
          expect(error1.context).toEqual(error2.context);
        }
      ), { numRuns: 100 });
    });

    it('should identify error types consistently', () => {
      fc.assert(fc.property(
        anyStandardizedErrorArb,
        (error) => {
          // isErrorType should be consistent
          const isValidation = isErrorType(error, StandardizedValidationError);
          const isDeployment = isErrorType(error, StandardizedDeploymentError);
          const isWallet = isErrorType(error, StandardizedWalletError);
          const isClanker = isErrorType(error, StandardizedClankerError);
          
          // Should always be a ClankerError
          expect(isClanker).toBe(true);
          
          // Should be exactly one specific type (or base ClankerError)
          const specificTypeCount = [isValidation, isDeployment, isWallet].filter(Boolean).length;
          expect(specificTypeCount).toBeLessThanOrEqual(1);
          
          // Type identification should match instanceof
          expect(isValidation).toBe(error instanceof StandardizedValidationError);
          expect(isDeployment).toBe(error instanceof StandardizedDeploymentError);
          expect(isWallet).toBe(error instanceof StandardizedWalletError);
        }
      ), { numRuns: 100 });
    });

    it('should extract error codes consistently', () => {
      fc.assert(fc.property(
        anyStandardizedErrorArb,
        (error) => {
          const extractedCode = getErrorCode(error);
          
          // Should match the error's code property
          expect(extractedCode).toBe(error.code);
          expect(typeof extractedCode).toBe('string');
          expect(extractedCode.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });
  });

  describe('Error Factory Functions Consistency', () => {
    it('should create validation errors consistently', () => {
      fc.assert(fc.property(
        fc.constantFrom(...Object.keys(VALIDATION_ERRORS) as Array<keyof typeof VALIDATION_ERRORS>),
        errorMessageArb,
        fc.option(errorContextArb),
        (code, message, context) => {
          const error = createValidationError(code, message, context);
          
          expect(error).toBeInstanceOf(StandardizedValidationError);
          expect(error.code).toBe(VALIDATION_ERRORS[code]);
          expect(error.message).toBe(message);
          expect(error.context).toEqual(context);
          expect(error.name).toBe('ValidationError');
        }
      ), { numRuns: 100 });
    });

    it('should create deployment errors consistently', () => {
      fc.assert(fc.property(
        fc.constantFrom(...Object.keys(DEPLOYMENT_ERRORS) as Array<keyof typeof DEPLOYMENT_ERRORS>),
        errorMessageArb,
        fc.option(errorContextArb),
        (code, message, context) => {
          const error = createDeploymentError(code, message, context);
          
          expect(error).toBeInstanceOf(StandardizedDeploymentError);
          expect(error.code).toBe(DEPLOYMENT_ERRORS[code]);
          expect(error.message).toBe(message);
          expect(error.context).toEqual(context);
          expect(error.name).toBe('DeploymentError');
        }
      ), { numRuns: 100 });
    });

    it('should create wallet errors consistently', () => {
      fc.assert(fc.property(
        fc.constantFrom(...Object.keys(WALLET_ERRORS) as Array<keyof typeof WALLET_ERRORS>),
        errorMessageArb,
        fc.option(errorContextArb),
        (code, message, context) => {
          const error = createWalletError(code, message, context);
          
          expect(error).toBeInstanceOf(StandardizedWalletError);
          expect(error.code).toBe(WALLET_ERRORS[code]);
          expect(error.message).toBe(message);
          expect(error.context).toEqual(context);
          expect(error.name).toBe('WalletError');
        }
      ), { numRuns: 100 });
    });
  });

  describe('Context Information Consistency', () => {
    it('should preserve context information across error operations', () => {
      fc.assert(fc.property(
        errorContextArb,
        errorCodeArb,
        errorMessageArb,
        (context, code, message) => {
          const error = new StandardizedClankerError(code, message, context);
          
          // Context should be preserved in JSON serialization
          const json = error.toJSON();
          expect(json.context).toEqual(context);
          
          // Context should be preserved in display message
          const displayMessage = error.getDisplayMessage();
          if (context?.operation) {
            expect(displayMessage).toContain(context.operation);
          }
          
          // Context should be accessible directly
          expect(error.context).toEqual(context);
        }
      ), { numRuns: 100 });
    });
  });
});