/**
 * Unit tests for standardized error types and Result type
 * Tests the new error handling patterns from the design document
 * Requirements: 5.1, 5.2, 5.4, 5.5 - Standardize error handling patterns
 */

import { describe, it, expect } from 'vitest';
import {
  ClankerError as StandardizedClankerError,
  ValidationError as StandardizedValidationError,
  DeploymentError as StandardizedDeploymentError,
  WalletError as StandardizedWalletError,
  Result,
  ErrorContext,
  success,
  failure,
  resultToUIResponse,
  trySync,
  tryAsync,
  isErrorType,
  getErrorCode,
  createError,
  VALIDATION_ERRORS,
  DEPLOYMENT_ERRORS,
  WALLET_ERRORS,
  createValidationError,
  createDeploymentError,
  createWalletError,
} from '../../../src/errors/standardized-errors.js';

describe('Standardized Error Types', () => {
  describe('ClankerError Base Class', () => {
    it('should create error with code and message', () => {
      const error = new StandardizedClankerError('TEST_CODE', 'Test message');
      
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('ClankerError');
      expect(error.context).toBeUndefined();
    });

    it('should create error with context', () => {
      const context: ErrorContext = {
        operation: 'deploy',
        component: 'Deployer',
        chainId: 8453
      };
      
      const error = new StandardizedClankerError('TEST_CODE', 'Test message', context);
      
      expect(error.context).toEqual(context);
    });

    it('should provide JSON serialization', () => {
      const context: ErrorContext = { operation: 'test' };
      const error = new StandardizedClankerError('TEST_CODE', 'Test message', context);
      
      const json = error.toJSON();
      
      expect(json.name).toBe('ClankerError');
      expect(json.code).toBe('TEST_CODE');
      expect(json.message).toBe('Test message');
      expect(json.context).toEqual(context);
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it('should provide display message with context', () => {
      const error1 = new StandardizedClankerError('TEST_CODE', 'Test message');
      expect(error1.getDisplayMessage()).toBe('Test message');
      
      const error2 = new StandardizedClankerError('TEST_CODE', 'Test message', { operation: 'deploy' });
      expect(error2.getDisplayMessage()).toBe('deploy: Test message');
    });
  });

  describe('Specific Error Types', () => {
    it('should create ValidationError', () => {
      const error = new StandardizedValidationError('INVALID_INPUT', 'Invalid input provided');
      
      expect(error).toBeInstanceOf(StandardizedClankerError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.message).toBe('Invalid input provided');
    });

    it('should create DeploymentError', () => {
      const context: ErrorContext = { chainId: 8453, tokenIndex: 5 };
      const error = new StandardizedDeploymentError('DEPLOYMENT_FAILED', 'Deployment failed', context);
      
      expect(error).toBeInstanceOf(StandardizedClankerError);
      expect(error.name).toBe('DeploymentError');
      expect(error.code).toBe('DEPLOYMENT_FAILED');
      expect(error.context).toEqual(context);
    });

    it('should create WalletError', () => {
      const context: ErrorContext = { walletAddress: '0x123...', operation: 'decrypt' };
      const error = new StandardizedWalletError('INVALID_PASSWORD', 'Invalid password', context);
      
      expect(error).toBeInstanceOf(StandardizedClankerError);
      expect(error.name).toBe('WalletError');
      expect(error.code).toBe('INVALID_PASSWORD');
      expect(error.context).toEqual(context);
    });
  });

  describe('Result Type', () => {
    it('should create successful result', () => {
      const result: Result<string> = success('test data');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test data');
      }
    });

    it('should create failed result', () => {
      const result: Result<string> = failure('error message');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('error message');
        expect(result.details).toBeUndefined();
      }
    });

    it('should create failed result with details', () => {
      const details = { field: 'name', value: 'invalid' };
      const result: Result<string> = failure('validation failed', details);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('validation failed');
        expect(result.details).toEqual(details);
      }
    });

    it('should work with custom error types', () => {
      const customError = new StandardizedValidationError('CUSTOM_ERROR', 'Custom error');
      const result: Result<string, StandardizedValidationError> = {
        success: false,
        error: customError
      };
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(StandardizedValidationError);
        expect(result.error.code).toBe('CUSTOM_ERROR');
      }
    });
  });

  describe('UI Error Response', () => {
    it('should convert successful result to UI response', () => {
      const result: Result<string> = success('test data');
      const uiResponse = resultToUIResponse(result);
      
      expect(uiResponse.success).toBe(true);
      expect(uiResponse.error).toBeUndefined();
    });

    it('should convert failed result to UI response', () => {
      const result: Result<string> = failure('operation failed', { code: 'TEST_ERROR' });
      const uiResponse = resultToUIResponse(result);
      
      expect(uiResponse.success).toBe(false);
      expect(uiResponse.error).toBe('operation failed');
      expect(uiResponse.details).toEqual({ code: 'TEST_ERROR' });
    });

    it('should handle non-string errors in UI response', () => {
      const result: Result<string> = { success: false, error: 'Operation failed' };
      const uiResponse = resultToUIResponse(result);
      
      expect(uiResponse.success).toBe(false);
      expect(uiResponse.error).toBe('Operation failed');
    });
  });

  describe('Utility Functions', () => {
    describe('trySync', () => {
      it('should wrap successful sync function', () => {
        const result = trySync(() => 'success');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('success');
        }
      });

      it('should wrap failing sync function', () => {
        const result = trySync(() => {
          throw new Error('sync error');
        });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('sync error');
        }
      });

      it('should handle non-Error throws', () => {
        const result = trySync(() => {
          throw 'string error';
        });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Unknown error');
        }
      });
    });

    describe('tryAsync', () => {
      it('should wrap successful async function', async () => {
        const result = await tryAsync(async () => 'async success');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('async success');
        }
      });

      it('should wrap failing async function', async () => {
        const result = await tryAsync(async () => {
          throw new Error('async error');
        });
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('async error');
        }
      });
    });

    describe('isErrorType', () => {
      it('should identify error types correctly', () => {
        const validationError = new StandardizedValidationError('TEST', 'test');
        const deploymentError = new StandardizedDeploymentError('TEST', 'test');
        const walletError = new StandardizedWalletError('TEST', 'test');
        const regularError = new Error('regular error');
        
        expect(isErrorType(validationError, StandardizedValidationError)).toBe(true);
        expect(isErrorType(validationError, StandardizedDeploymentError)).toBe(false);
        expect(isErrorType(deploymentError, StandardizedDeploymentError)).toBe(true);
        expect(isErrorType(walletError, StandardizedWalletError)).toBe(true);
        expect(isErrorType(regularError, StandardizedValidationError)).toBe(false);
      });
    });

    describe('getErrorCode', () => {
      it('should extract error codes', () => {
        const clankerError = new StandardizedClankerError('CLANKER_CODE', 'message');
        const regularError = new Error('regular error');
        const nonError = 'not an error';
        
        expect(getErrorCode(clankerError)).toBe('CLANKER_CODE');
        expect(getErrorCode(regularError)).toBe('UNKNOWN_ERROR');
        expect(getErrorCode(nonError)).toBe('INVALID_ERROR');
      });
    });

    describe('createError', () => {
      it('should create errors using factory', () => {
        const validationError = createError(StandardizedValidationError, 'TEST_CODE', 'test message');
        const deploymentError = createError(StandardizedDeploymentError, 'DEPLOY_CODE', 'deploy message');
        const walletError = createError(StandardizedWalletError, 'WALLET_CODE', 'wallet message');
        
        expect(validationError).toBeInstanceOf(StandardizedValidationError);
        expect(validationError.code).toBe('TEST_CODE');
        
        expect(deploymentError).toBeInstanceOf(StandardizedDeploymentError);
        expect(deploymentError.code).toBe('DEPLOY_CODE');
        
        expect(walletError).toBeInstanceOf(StandardizedWalletError);
        expect(walletError.code).toBe('WALLET_CODE');
      });
    });
  });

  describe('Error Codes and Factory Functions', () => {
    it('should have predefined validation error codes', () => {
      expect(VALIDATION_ERRORS.INVALID_PRIVATE_KEY).toBe('INVALID_PRIVATE_KEY');
      expect(VALIDATION_ERRORS.INVALID_ADDRESS).toBe('INVALID_ADDRESS');
      expect(VALIDATION_ERRORS.INVALID_MNEMONIC).toBe('INVALID_MNEMONIC');
    });

    it('should have predefined deployment error codes', () => {
      expect(DEPLOYMENT_ERRORS.DEPLOYMENT_FAILED).toBe('DEPLOYMENT_FAILED');
      expect(DEPLOYMENT_ERRORS.INSUFFICIENT_FUNDS).toBe('INSUFFICIENT_FUNDS');
      expect(DEPLOYMENT_ERRORS.GAS_LIMIT_EXCEEDED).toBe('GAS_LIMIT_EXCEEDED');
    });

    it('should have predefined wallet error codes', () => {
      expect(WALLET_ERRORS.WALLET_NOT_FOUND).toBe('WALLET_NOT_FOUND');
      expect(WALLET_ERRORS.INVALID_PASSWORD).toBe('INVALID_PASSWORD');
      expect(WALLET_ERRORS.ENCRYPTION_FAILED).toBe('ENCRYPTION_FAILED');
    });

    it('should create errors using factory functions', () => {
      const validationError = createValidationError('INVALID_PRIVATE_KEY', 'Invalid key format');
      const deploymentError = createDeploymentError('DEPLOYMENT_FAILED', 'Deploy failed');
      const walletError = createWalletError('WALLET_NOT_FOUND', 'Wallet not found');
      
      expect(validationError.code).toBe('INVALID_PRIVATE_KEY');
      expect(deploymentError.code).toBe('DEPLOYMENT_FAILED');
      expect(walletError.code).toBe('WALLET_NOT_FOUND');
    });

    it('should create errors with context using factory functions', () => {
      const context: ErrorContext = { operation: 'test', component: 'TestComponent' };
      
      const validationError = createValidationError('INVALID_CONFIG', 'Invalid config', context);
      
      expect(validationError.context).toEqual(context);
      expect(validationError.getDisplayMessage()).toBe('test: Invalid config');
    });
  });

  describe('Error Consistency', () => {
    it('should maintain consistent error structure across types', () => {
      const context: ErrorContext = { operation: 'test' };
      
      const validationError = new StandardizedValidationError('CODE1', 'Message1', context);
      const deploymentError = new StandardizedDeploymentError('CODE2', 'Message2', context);
      const walletError = new StandardizedWalletError('CODE3', 'Message3', context);
      
      // All should have same structure
      expect(validationError.toJSON()).toHaveProperty('name');
      expect(validationError.toJSON()).toHaveProperty('code');
      expect(validationError.toJSON()).toHaveProperty('message');
      expect(validationError.toJSON()).toHaveProperty('context');
      expect(validationError.toJSON()).toHaveProperty('timestamp');
      
      expect(deploymentError.toJSON()).toHaveProperty('name');
      expect(deploymentError.toJSON()).toHaveProperty('code');
      expect(deploymentError.toJSON()).toHaveProperty('message');
      expect(deploymentError.toJSON()).toHaveProperty('context');
      expect(deploymentError.toJSON()).toHaveProperty('timestamp');
      
      expect(walletError.toJSON()).toHaveProperty('name');
      expect(walletError.toJSON()).toHaveProperty('code');
      expect(walletError.toJSON()).toHaveProperty('message');
      expect(walletError.toJSON()).toHaveProperty('context');
      expect(walletError.toJSON()).toHaveProperty('timestamp');
    });

    it('should provide consistent context information', () => {
      const context: ErrorContext = {
        operation: 'deploy',
        component: 'Deployer',
        tokenIndex: 5,
        walletAddress: '0x123...',
        chainId: 8453
      };
      
      const error = new StandardizedDeploymentError('DEPLOYMENT_FAILED', 'Failed to deploy token', context);
      
      expect(error.context?.operation).toBe('deploy');
      expect(error.context?.component).toBe('Deployer');
      expect(error.context?.tokenIndex).toBe(5);
      expect(error.context?.walletAddress).toBe('0x123...');
      expect(error.context?.chainId).toBe(8453);
    });
  });
});