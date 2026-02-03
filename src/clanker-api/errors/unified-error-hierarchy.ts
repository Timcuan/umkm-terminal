/**
 * Unified Error Hierarchy
 * Provides consistent error handling across direct contract and API methods
 */

import type { OperationMethod } from '../types/config-types.js';

// ============================================================================
// Base Error Classes
// ============================================================================

/**
 * Base SDK Error class
 * All Clanker SDK errors extend from this class
 */
export abstract class ClankerSDKError extends Error {
  public readonly code: string;
  public readonly method: OperationMethod;
  public readonly retryable: boolean;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string,
    method: OperationMethod,
    retryable: boolean = false,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.method = method;
    this.retryable = retryable;
    this.context = context;
    this.timestamp = new Date();
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get retry guidance for this error
   */
  getRetryGuidance(): {
    shouldRetry: boolean;
    retryAfter?: number; // milliseconds
    maxRetries?: number;
    backoffStrategy?: 'linear' | 'exponential' | 'fixed';
    suggestion?: string;
  } {
    return {
      shouldRetry: this.retryable,
      suggestion: this.retryable 
        ? 'This error may be temporary. Consider retrying the operation.'
        : 'This error requires manual intervention. Check the error details and fix the underlying issue.',
    };
  }

  /**
   * Convert error to JSON for logging/debugging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      method: this.method,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }
}

// ============================================================================
// Specific Error Types
// ============================================================================

/**
 * Configuration-related errors
 */
export class ConfigurationError extends ClankerSDKError {
  constructor(
    message: string,
    method: OperationMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, 'CONFIGURATION_ERROR', method, false, context, originalError);
  }

  getRetryGuidance() {
    return {
      shouldRetry: false,
      suggestion: 'Check your configuration settings. Ensure API keys, wallet, and client are properly configured.',
    };
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends ClankerSDKError {
  constructor(
    message: string,
    method: OperationMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, 'AUTHENTICATION_ERROR', method, false, context, originalError);
  }

  getRetryGuidance() {
    return {
      shouldRetry: false,
      suggestion: 'Check your API key or wallet credentials. Ensure they are valid and have the necessary permissions.',
    };
  }
}

/**
 * Network and connectivity errors
 */
export class NetworkError extends ClankerSDKError {
  constructor(
    message: string,
    method: OperationMethod,
    retryable: boolean = true,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, 'NETWORK_ERROR', method, retryable, context, originalError);
  }

  getRetryGuidance() {
    return {
      shouldRetry: this.retryable,
      retryAfter: 1000, // 1 second
      maxRetries: 3,
      backoffStrategy: 'exponential' as const,
      suggestion: this.retryable 
        ? 'Network issue detected. Check your internet connection and try again.'
        : 'Persistent network error. Check your network configuration and API endpoints.',
    };
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ClankerSDKError {
  public readonly retryAfter: number;

  constructor(
    message: string,
    method: OperationMethod,
    retryAfter: number = 60000, // 1 minute default
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, 'RATE_LIMIT_ERROR', method, true, context, originalError);
    this.retryAfter = retryAfter;
  }

  getRetryGuidance() {
    return {
      shouldRetry: true,
      retryAfter: this.retryAfter,
      maxRetries: 5,
      backoffStrategy: 'linear' as const,
      suggestion: `Rate limit exceeded. Wait ${Math.ceil(this.retryAfter / 1000)} seconds before retrying.`,
    };
  }
}

/**
 * Validation errors for input data
 */
export class ValidationError extends ClankerSDKError {
  public readonly validationErrors: string[];
  public readonly validationWarnings: string[];

  constructor(
    message: string,
    method: OperationMethod,
    validationErrors: string[] = [],
    validationWarnings: string[] = [],
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, 'VALIDATION_ERROR', method, false, context, originalError);
    this.validationErrors = validationErrors;
    this.validationWarnings = validationWarnings;
  }

  getRetryGuidance() {
    return {
      shouldRetry: false,
      suggestion: 'Fix the validation errors in your input data and try again. Check the validationErrors array for specific issues.',
    };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors,
      validationWarnings: this.validationWarnings,
    };
  }
}

/**
 * Deployment-specific errors
 */
export class DeploymentError extends ClankerSDKError {
  public readonly phase: 'validation' | 'submission' | 'confirmation' | 'completion';
  public readonly txHash?: string;

  constructor(
    message: string,
    method: OperationMethod,
    phase: 'validation' | 'submission' | 'confirmation' | 'completion',
    retryable: boolean = false,
    context: Record<string, any> = {},
    txHash?: string,
    originalError?: Error
  ) {
    super(message, 'DEPLOYMENT_ERROR', method, retryable, context, originalError);
    this.phase = phase;
    this.txHash = txHash;
  }

  getRetryGuidance() {
    const baseGuidance = super.getRetryGuidance();
    
    switch (this.phase) {
      case 'validation':
        return {
          ...baseGuidance,
          suggestion: 'Token configuration validation failed. Check your token parameters and try again.',
        };
      case 'submission':
        return {
          ...baseGuidance,
          shouldRetry: true,
          retryAfter: 5000, // 5 seconds
          maxRetries: 3,
          suggestion: 'Transaction submission failed. This may be due to network congestion or insufficient gas.',
        };
      case 'confirmation':
        return {
          ...baseGuidance,
          shouldRetry: true,
          retryAfter: 10000, // 10 seconds
          maxRetries: 10,
          suggestion: 'Transaction submitted but confirmation failed. Check the transaction status on the blockchain.',
        };
      case 'completion':
        return {
          ...baseGuidance,
          suggestion: 'Deployment process failed to complete. Check the transaction and contract state.',
        };
      default:
        return baseGuidance;
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      phase: this.phase,
      txHash: this.txHash,
    };
  }
}

/**
 * API-specific errors
 */
export class APIError extends ClankerSDKError {
  public readonly statusCode?: number;
  public readonly apiResponse?: any;

  constructor(
    message: string,
    statusCode?: number,
    retryable: boolean = false,
    context: Record<string, any> = {},
    apiResponse?: any,
    originalError?: Error
  ) {
    super(message, 'API_ERROR', 'api', retryable, context, originalError);
    this.statusCode = statusCode;
    this.apiResponse = apiResponse;
  }

  getRetryGuidance() {
    const baseGuidance = super.getRetryGuidance();

    if (!this.statusCode) {
      return baseGuidance;
    }

    if (this.statusCode >= 500) {
      return {
        shouldRetry: true,
        retryAfter: 2000, // 2 seconds
        maxRetries: 5,
        backoffStrategy: 'exponential' as const,
        suggestion: 'Server error detected. The API service may be temporarily unavailable.',
      };
    }

    if (this.statusCode === 429) {
      return {
        shouldRetry: true,
        retryAfter: 60000, // 1 minute
        maxRetries: 3,
        backoffStrategy: 'linear' as const,
        suggestion: 'Rate limit exceeded. Reduce request frequency and try again later.',
      };
    }

    if (this.statusCode >= 400 && this.statusCode < 500) {
      return {
        shouldRetry: false,
        suggestion: 'Client error detected. Check your request parameters and authentication.',
      };
    }

    return baseGuidance;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      apiResponse: this.apiResponse,
    };
  }
}

/**
 * Contract interaction errors
 */
export class ContractError extends ClankerSDKError {
  public readonly contractAddress?: string;
  public readonly functionName?: string;
  public readonly txHash?: string;

  constructor(
    message: string,
    retryable: boolean = false,
    context: Record<string, any> = {},
    contractAddress?: string,
    functionName?: string,
    txHash?: string,
    originalError?: Error
  ) {
    super(message, 'CONTRACT_ERROR', 'direct', retryable, context, originalError);
    this.contractAddress = contractAddress;
    this.functionName = functionName;
    this.txHash = txHash;
  }

  getRetryGuidance() {
    return {
      shouldRetry: this.retryable,
      retryAfter: 3000, // 3 seconds
      maxRetries: 3,
      backoffStrategy: 'exponential' as const,
      suggestion: this.retryable 
        ? 'Contract interaction failed. This may be due to network congestion or gas estimation issues.'
        : 'Contract interaction failed permanently. Check the contract state and transaction parameters.',
    };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      contractAddress: this.contractAddress,
      functionName: this.functionName,
      txHash: this.txHash,
    };
  }
}

// ============================================================================
// Error Mapping and Factory Functions
// ============================================================================

/**
 * Map API errors to unified error types
 */
export function mapAPIError(
  apiError: any,
  method: OperationMethod = 'api',
  context: Record<string, any> = {}
): ClankerSDKError {
  // Handle different API error formats
  if (typeof apiError === 'string') {
    return new APIError(apiError, undefined, false, context);
  }

  if (apiError && typeof apiError === 'object') {
    const message = apiError.message || apiError.error || 'Unknown API error';
    const statusCode = apiError.status || apiError.statusCode;
    const retryable = statusCode >= 500 || statusCode === 429;

    // Map specific error codes
    if (apiError.code === 'AUTH_FAILED' || statusCode === 401 || statusCode === 403) {
      return new AuthenticationError(message, method, context, apiError);
    }

    if (apiError.code === 'RATE_LIMIT' || statusCode === 429) {
      const retryAfter = apiError.retryAfter || 60000;
      return new RateLimitError(message, method, retryAfter, context, apiError);
    }

    if (apiError.code === 'VALIDATION_ERROR' || statusCode === 400) {
      const validationErrors = apiError.validationErrors || [];
      const validationWarnings = apiError.validationWarnings || [];
      return new ValidationError(message, method, validationErrors, validationWarnings, context, apiError);
    }

    if (apiError.code === 'NETWORK_ERROR' || !statusCode) {
      return new NetworkError(message, method, true, context, apiError);
    }

    return new APIError(message, statusCode, retryable, context, apiError);
  }

  return new APIError('Unknown API error', undefined, false, context, apiError);
}

/**
 * Map contract errors to unified error types
 */
export function mapContractError(
  contractError: any,
  context: Record<string, any> = {}
): ClankerSDKError {
  if (typeof contractError === 'string') {
    return new ContractError(contractError, false, context);
  }

  if (contractError && typeof contractError === 'object') {
    const message = contractError.message || 'Contract interaction failed';
    const retryable = contractError.code === 'NETWORK_ERROR' || 
                     contractError.message?.includes('network') ||
                     contractError.message?.includes('timeout');

    // Extract contract details if available
    const contractAddress = contractError.contractAddress || context.contractAddress;
    const functionName = contractError.functionName || context.functionName;
    const txHash = contractError.txHash || context.txHash;

    return new ContractError(
      message,
      retryable,
      context,
      contractAddress,
      functionName,
      txHash,
      contractError
    );
  }

  return new ContractError('Unknown contract error', false, context, undefined, undefined, undefined, contractError);
}

/**
 * Create configuration error
 */
export function createConfigurationError(
  message: string,
  method: OperationMethod,
  context: Record<string, any> = {},
  originalError?: Error
): ConfigurationError {
  return new ConfigurationError(message, method, context, originalError);
}

/**
 * Create authentication error
 */
export function createAuthenticationError(
  message: string,
  method: OperationMethod,
  context: Record<string, any> = {},
  originalError?: Error
): AuthenticationError {
  return new AuthenticationError(message, method, context, originalError);
}

/**
 * Create network error
 */
export function createNetworkError(
  message: string,
  method: OperationMethod,
  retryable: boolean = true,
  context: Record<string, any> = {},
  originalError?: Error
): NetworkError {
  return new NetworkError(message, method, retryable, context, originalError);
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string,
  method: OperationMethod,
  validationErrors: string[] = [],
  validationWarnings: string[] = [],
  context: Record<string, any> = {},
  originalError?: Error
): ValidationError {
  return new ValidationError(message, method, validationErrors, validationWarnings, context, originalError);
}

/**
 * Create deployment error
 */
export function createDeploymentError(
  message: string,
  method: OperationMethod,
  phase: 'validation' | 'submission' | 'confirmation' | 'completion',
  retryable: boolean = false,
  context: Record<string, any> = {},
  txHash?: string,
  originalError?: Error
): DeploymentError {
  return new DeploymentError(message, method, phase, retryable, context, txHash, originalError);
}

// ============================================================================
// Error Analysis and Utilities
// ============================================================================

/**
 * Analyze error and provide actionable insights
 */
export function analyzeError(error: ClankerSDKError): {
  category: 'configuration' | 'authentication' | 'network' | 'validation' | 'deployment' | 'api' | 'contract' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  recommendations: string[];
} {
  let category: any = 'unknown';
  let severity: any = 'medium';
  let actionable = true;
  const recommendations: string[] = [];

  // Categorize error
  if (error instanceof ConfigurationError) {
    category = 'configuration';
    severity = 'high';
    recommendations.push('Review your SDK configuration');
    recommendations.push('Ensure all required parameters are provided');
  } else if (error instanceof AuthenticationError) {
    category = 'authentication';
    severity = 'high';
    recommendations.push('Verify your API key or wallet credentials');
    recommendations.push('Check that your credentials have the necessary permissions');
  } else if (error instanceof NetworkError) {
    category = 'network';
    severity = error.retryable ? 'medium' : 'high';
    if (error.retryable) {
      recommendations.push('Retry the operation after a short delay');
      recommendations.push('Check your internet connection');
    } else {
      recommendations.push('Check your network configuration');
      recommendations.push('Verify API endpoints are accessible');
    }
  } else if (error instanceof ValidationError) {
    category = 'validation';
    severity = 'medium';
    recommendations.push('Fix the validation errors in your input data');
    recommendations.push('Review the token configuration parameters');
  } else if (error instanceof DeploymentError) {
    category = 'deployment';
    severity = error.phase === 'validation' ? 'medium' : 'high';
    recommendations.push(`Address the ${error.phase} phase issue`);
    if (error.txHash) {
      recommendations.push(`Check transaction ${error.txHash} on the blockchain explorer`);
    }
  } else if (error instanceof APIError) {
    category = 'api';
    severity = error.statusCode && error.statusCode >= 500 ? 'high' : 'medium';
    if (error.statusCode === 429) {
      recommendations.push('Reduce request frequency');
      recommendations.push('Implement proper rate limiting in your application');
    }
  } else if (error instanceof ContractError) {
    category = 'contract';
    severity = 'high';
    recommendations.push('Check the contract state and parameters');
    if (error.txHash) {
      recommendations.push(`Review transaction ${error.txHash} for details`);
    }
  }

  // Determine if error is actionable
  actionable = error.retryable || recommendations.length > 0;

  return {
    category,
    severity,
    actionable,
    recommendations,
  };
}

/**
 * Check if error should be retried
 */
export function shouldRetryError(error: ClankerSDKError, attemptCount: number = 0): boolean {
  if (!error.retryable) {
    return false;
  }

  const guidance = error.getRetryGuidance();
  if (guidance.maxRetries && attemptCount >= guidance.maxRetries) {
    return false;
  }

  return guidance.shouldRetry;
}

/**
 * Calculate retry delay based on error type and attempt count
 */
export function calculateRetryDelay(error: ClankerSDKError, attemptCount: number = 0): number {
  const guidance = error.getRetryGuidance();
  const baseDelay = guidance.retryAfter || 1000;

  switch (guidance.backoffStrategy) {
    case 'exponential':
      return baseDelay * Math.pow(2, attemptCount);
    case 'linear':
      return baseDelay * (attemptCount + 1);
    case 'fixed':
    default:
      return baseDelay;
  }
}