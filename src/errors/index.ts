/**
 * Custom Error Classes for Clanker SDK
 * Provides structured error handling with proper error codes and context
 */

import { type ErrorContext, toErrorContext } from '../types/base-types.js';

// Export standardized error types (new design)
export {
  // Base types
  ClankerError as StandardizedClankerError,
  ValidationError as StandardizedValidationError,
  DeploymentError as StandardizedDeploymentError,
  WalletError as StandardizedWalletError,
  
  // Result type
  Result,
  UIErrorResponse,
  
  // Context type
  ErrorContext,
  
  // Utility functions
  success,
  failure,
  resultToUIResponse,
  trySync,
  tryAsync,
  isErrorType as isStandardizedErrorType,
  getErrorCode as getStandardizedErrorCode,
  createError,
  
  // Error codes
  VALIDATION_ERRORS,
  DEPLOYMENT_ERRORS,
  WALLET_ERRORS,
  
  // Factory functions
  createValidationError,
  createDeploymentError,
  createWalletError,
} from './standardized-errors.js';

// ============================================================================
// Legacy Error Classes (for backward compatibility)
// ============================================================================

export interface ClankerError {
  code: string;
  category: string;
  context?: ErrorContext;
  cause?: Error;
  timestamp: Date;
}

export class ClankerErrorImpl extends Error implements ClankerError {
  public readonly code: string;
  public readonly category: string;
  public readonly context?: ErrorContext;
  public readonly cause?: Error;
  public readonly timestamp: Date;

  constructor(
    code: string,
    category: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date();

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
      category: this.category,
      message: this.message,
      context: this.context,
      cause: this.cause?.message,
      timestamp: this.timestamp.toISOString(),
      stack: (this as Error).stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }
}

// ============================================================================
// Network Errors
// ============================================================================

export class NetworkError extends ClankerErrorImpl {
  constructor(
    code: string,
    message: string,
    public readonly url?: string,
    public readonly statusCode?: number,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(code, 'NETWORK', message, { ...context, url, statusCode }, cause);
  }

  getUserMessage(): string {
    if (this.statusCode === 429) {
      return 'Rate limit exceeded. Please try again in a moment.';
    }
    if (this.statusCode && this.statusCode >= 500) {
      return 'Server error. Please try again later.';
    }
    return 'Network connection failed. Please check your internet connection.';
  }
}

export class TimeoutError extends NetworkError {
  constructor(url: string, timeout: number) {
    super('TIMEOUT', `Request timed out after ${timeout}ms`, url, undefined, { timeout });
  }
}

export class RetryError extends NetworkError {
  constructor(
    url: string,
    public readonly attempts: number,
    lastError: Error
  ) {
    super(
      'RETRY_FAILED',
      `Request failed after ${attempts} attempts`,
      url,
      undefined,
      { attempts },
      lastError
    );
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

export class ValidationError extends ClankerErrorImpl {
  constructor(
    code: string,
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
    context?: ErrorContext
  ) {
    super(code, 'VALIDATION', message, { ...context, field, value });
  }

  getUserMessage(): string {
    if (this.field) {
      return `Invalid ${this.field}: ${this.message}`;
    }
    return this.message;
  }
}

export class AddressError extends ValidationError {
  constructor(address: string, reason?: string) {
    super('INVALID_ADDRESS', reason || 'Invalid Ethereum address format', 'address', address);
  }
}

export class PrivateKeyError extends ValidationError {
  constructor(reason?: string) {
    super('INVALID_PRIVATE_KEY', reason || 'Invalid private key format', 'privateKey');
  }
}

// ============================================================================
// Deployment Errors
// ============================================================================

export class DeploymentError extends ClankerErrorImpl {
  constructor(
    code: string,
    message: string,
    public readonly chainId?: number,
    public readonly txHash?: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(code, 'DEPLOYMENT', message, { ...context, chainId, txHash }, cause);
  }

  getUserMessage(): string {
    if (this.code === 'INSUFFICIENT_FUNDS') {
      return 'Insufficient funds for deployment. Please check your wallet balance.';
    }
    if (this.code === 'GAS_LIMIT_EXCEEDED') {
      return 'Gas limit exceeded. Try again with higher gas settings.';
    }
    if (this.code === 'NONCE_TOO_LOW') {
      return 'Transaction nonce too low. Please wait for pending transactions to confirm.';
    }
    return `Deployment failed: ${this.message}`;
  }
}

export class MEVError extends DeploymentError {
  constructor(message: string, context?: ErrorContext) {
    super('MEV_FAILED', message, undefined, undefined, context);
  }
}

export class VaultError extends DeploymentError {
  constructor(message: string, context?: ErrorContext) {
    super('VAULT_FAILED', message, undefined, undefined, context);
  }
}

// ============================================================================
// Farcaster Errors
// ============================================================================

export class FarcasterError extends ClankerErrorImpl {
  constructor(
    code: string,
    message: string,
    public readonly fid?: number,
    public readonly username?: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(code, 'FARCASTER', message, { ...context, fid, username }, cause);
  }

  getUserMessage(): string {
    if (this.code === 'USER_NOT_FOUND') {
      return 'Farcaster user not found. Please check the username or FID.';
    }
    if (this.code === 'API_RATE_LIMIT') {
      return 'Farcaster API rate limit exceeded. Please try again later.';
    }
    return `Farcaster error: ${this.message}`;
  }
}

// ============================================================================
// Unknown Error
// ============================================================================

export class UnknownError extends ClankerErrorImpl {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super('UNKNOWN_ERROR', 'UNKNOWN', message, context, cause);
  }
}

// ============================================================================
// Batch Errors
// ============================================================================

export class BatchError extends ClankerErrorImpl {
  constructor(
    code: string,
    message: string,
    public readonly batchIndex?: number,
    public readonly batchSize?: number,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(code, 'BATCH', message, { ...context, batchIndex, batchSize }, cause);
  }

  getUserMessage(): string {
    if (this.batchIndex !== undefined) {
      return `Error in token ${this.batchIndex + 1} of ${this.batchSize}: ${this.message}`;
    }
    return this.message;
  }
}

export class BatchValidationError extends BatchError {
  constructor(message: string, batchIndex?: number, context?: ErrorContext) {
    super('BATCH_VALIDATION_FAILED', message, batchIndex, undefined, context);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an error is a specific type
 */
export function isErrorType<T extends ClankerErrorImpl>(
  error: unknown,
  ErrorClass: new (...args: readonly unknown[]) => T
): error is T {
  return error instanceof ErrorClass;
}

/**
 * Wrap an unknown error in a ClankerError
 */
export function wrapError(
  error: unknown,
  defaultMessage: string = 'Unknown error'
): ClankerErrorImpl {
  if (error instanceof ClankerErrorImpl) {
    return error;
  }

  if (error instanceof Error) {
    return new UnknownError(error.message || defaultMessage, undefined, error);
  }

  return new UnknownError(typeof error === 'string' ? error : defaultMessage, {
    originalError: error,
  });
}

/**
 * Get error code from error
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof ClankerErrorImpl) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    // Retry on timeouts, 5xx errors, and rate limits
    return (
      error instanceof TimeoutError ||
      (error.statusCode !== undefined && (error.statusCode >= 500 || error.statusCode === 429))
    );
  }

  if (error instanceof FarcasterError) {
    return error.code === 'API_RATE_LIMIT' || error.code === 'TIMEOUT';
  }

  return false;
}

// ============================================================================
// Error Logger
// ============================================================================

export interface ErrorLogger {
  log(error: ClankerError): void;
}

export class ConsoleErrorLogger implements ErrorLogger {
  log(error: ClankerErrorImpl): void {
    console.error(`[${error.category}] ${error.code}: ${error.message}`);
    if (error.context) {
      console.error('Context:', error.context);
    }
    if (process.env.NODE_ENV === 'development' && (error as Error).stack) {
      console.error('Stack:', (error as Error).stack);
    }
  }
}

// Global error logger instance
export const errorLogger = new ConsoleErrorLogger();
