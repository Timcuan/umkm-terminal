/**
 * Clean Error Types for Clanker API Integration
 * Simplified approach focusing on essential functionality
 */

import type { OperationMethod } from './config-types.js';

// Re-export selected items from the unified error hierarchy (avoiding conflicts)
export {
  ClankerSDKError,
  ConfigurationError,
  AuthenticationError,
  NetworkError,
  RateLimitError,
  ValidationError,
  DeploymentError,
  APIError,
  ContractError,
  mapAPIError,
  mapContractError,
  createDeploymentError,
  analyzeError,
  shouldRetryError,
  calculateRetryDelay,
} from '../errors/unified-error-hierarchy.js';

// ============================================================================
// Backward Compatibility Layer
// ============================================================================

import { 
  APIError,
  createConfigurationError,
  createAuthenticationError,
  createNetworkError as createUnifiedNetworkError,
  createValidationError as createUnifiedValidationError,
} from '../errors/unified-error-hierarchy.js';

/**
 * Legacy ClankerAPIError for backward compatibility
 */
export class ClankerAPIError extends APIError {
  public readonly code: string;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    context?: Record<string, any>,
    apiResponse?: any,
    statusCode?: number
  ) {
    super(message, statusCode, retryable, context, apiResponse);
    this.code = code;
  }
}

/**
 * Legacy createAPIError function for backward compatibility
 */
export function createAPIError(
  message: string,
  code: string,
  retryable: boolean = false,
  context?: Record<string, any>,
  apiResponse?: any,
  statusCode?: number
): ClankerAPIError {
  return new ClankerAPIError(message, code, retryable, context, apiResponse, statusCode);
}

/**
 * Legacy createConfigError function for backward compatibility
 */
export function createConfigError(
  message: string,
  method: OperationMethod,
  context?: Record<string, any>
) {
  return createConfigurationError(message, method, context);
}

/**
 * Legacy createAuthError function for backward compatibility
 */
export function createAuthError(
  message: string,
  method: OperationMethod,
  context?: Record<string, any>
) {
  return createAuthenticationError(message, method, context);
}

/**
 * Legacy createNetworkError function for backward compatibility
 */
export function createNetworkError(
  message: string,
  method: OperationMethod,
  context?: Record<string, any>
) {
  return createUnifiedNetworkError(message, method, true, context);
}

/**
 * Legacy createValidationError function for backward compatibility
 */
export function createValidationError(
  message: string,
  method: OperationMethod,
  context?: Record<string, any>
) {
  return createUnifiedValidationError(message, method, [], [], context);
}