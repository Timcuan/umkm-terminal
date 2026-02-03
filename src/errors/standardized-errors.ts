/**
 * Standardized Error Types and Result Type
 * Implements the design document specifications for consistent error handling
 * Requirements: 5.1, 5.2, 5.4, 5.5 - Standardize error handling patterns
 */

import { type ErrorContext } from '../types/base-types.js';
import { type ServiceResultDetails } from '../types/configuration.js';

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class with context support
 * All async operations should throw typed errors extending this class
 */
export class ClankerError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'ClankerError';
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get error details as JSON for logging
   */
  toJSON(): ErrorContext {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: Date.now(),
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message with context
   */
  getDisplayMessage(): string {
    if (this.context?.operation) {
      return `${this.context.operation}: ${this.message}`;
    }
    return this.message;
  }
}

// ============================================================================
// Specific Error Types
// ============================================================================

/**
 * Validation errors for input validation failures
 */
export class ValidationError extends ClankerError {
  constructor(code: string, message: string, context?: ErrorContext) {
    super(code, message, context);
    this.name = 'ValidationError';
  }
}

/**
 * Deployment errors for token deployment failures
 */
export class DeploymentError extends ClankerError {
  constructor(code: string, message: string, context?: ErrorContext) {
    super(code, message, context);
    this.name = 'DeploymentError';
  }
}

/**
 * Wallet errors for wallet management failures
 */
export class WalletError extends ClankerError {
  constructor(code: string, message: string, context?: ErrorContext) {
    super(code, message, context);
    this.name = 'WalletError';
  }
}

// ============================================================================
// Result Type for Sync Operations
// ============================================================================

/**
 * Result type for sync operations that can fail
 * Provides predictable error handling without throwing exceptions
 */
export type Result<T, E = string> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
  details?: ServiceResultDetails;
};

// ============================================================================
// UI Error Response Type
// ============================================================================

/**
 * Standardized error response for UI operations
 * Provides consistent structure for user feedback
 */
export interface UIErrorResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: ServiceResultDetails;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a successful Result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed Result
 */
export function failure<E = string>(error: E, details?: ServiceResultDetails): Result<never, E> {
  return { success: false, error, details };
}

/**
 * Convert a Result to a UI response
 */
export function resultToUIResponse<T>(result: Result<T>): UIErrorResponse {
  if (result.success) {
    return { success: true };
  } else {
    return {
      success: false,
      error: typeof result.error === 'string' ? result.error : 'Operation failed',
      details: result.details
    };
  }
}

/**
 * Wrap a function that might throw into a Result
 */
export function trySync<T>(fn: () => T): Result<T, string> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Wrap an async function that might throw into a Result
 */
export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, string>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Check if an error is a specific ClankerError type
 */
export function isErrorType<T extends ClankerError>(
  error: unknown,
  ErrorClass: new (...args: readonly unknown[]) => T
): error is T {
  return error instanceof ErrorClass;
}

/**
 * Extract error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof ClankerError) {
    return error.code;
  }
  if (error instanceof Error) {
    return 'UNKNOWN_ERROR';
  }
  return 'INVALID_ERROR';
}

/**
 * Create error with context helper
 */
export function createError<T extends ClankerError>(
  ErrorClass: new (code: string, message: string, context?: ErrorContext) => T,
  code: string,
  message: string,
  context?: ErrorContext
): T {
  return new ErrorClass(code, message, context);
}

// ============================================================================
// Common Error Codes
// ============================================================================

/**
 * Common validation error codes
 */
export const VALIDATION_ERRORS = {
  INVALID_PRIVATE_KEY: 'INVALID_PRIVATE_KEY',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_MNEMONIC: 'INVALID_MNEMONIC',
  INVALID_CONFIG: 'INVALID_CONFIG',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
} as const;

/**
 * Common deployment error codes
 */
export const DEPLOYMENT_ERRORS = {
  DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  GAS_LIMIT_EXCEEDED: 'GAS_LIMIT_EXCEEDED',
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  TRANSACTION_REVERTED: 'TRANSACTION_REVERTED',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

/**
 * Common wallet error codes
 */
export const WALLET_ERRORS = {
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  WALLET_ALREADY_EXISTS: 'WALLET_ALREADY_EXISTS',
  BACKUP_FAILED: 'BACKUP_FAILED',
} as const;

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create validation error with common patterns
 */
export function createValidationError(
  code: keyof typeof VALIDATION_ERRORS,
  message: string,
  context?: ErrorContext
): ValidationError {
  return new ValidationError(VALIDATION_ERRORS[code], message, context);
}

/**
 * Create deployment error with common patterns
 */
export function createDeploymentError(
  code: keyof typeof DEPLOYMENT_ERRORS,
  message: string,
  context?: ErrorContext
): DeploymentError {
  return new DeploymentError(DEPLOYMENT_ERRORS[code], message, context);
}

/**
 * Create wallet error with common patterns
 */
export function createWalletError(
  code: keyof typeof WALLET_ERRORS,
  message: string,
  context?: ErrorContext
): WalletError {
  return new WalletError(WALLET_ERRORS[code], message, context);
}