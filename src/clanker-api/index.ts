/**
 * Bankrbot API Integration
 * 
 * This module provides Bankrbot API integration for programmatic token deployment
 * with customizable parameters and verified token status, alongside the existing 
 * direct contract method.
 */

// Export types first to avoid conflicts
export type * from './types/index.js';

// Export core functionality
export * from './client/index.js';
export * from './config/index.js';
export * from './mapper/index.js';
export * from './executor/index.js';
export * from './compatibility/index.js';
export * from './retry/index.js';
export * from './validation/index.js';
export * from './batch/index.js';
export * from './migration/index.js';
export * from './utils/index.js';

// Export Bankrbot-specific functionality
export {
  BankrbotAPIMethod,
  createBankrbotAPIMethod,
  createBankrbotAPIMethodFromEnv,
} from './executor/api-method.js';

export {
  mapTokenToBankrbotAPI,
  mapBankrbotAPIResponse,
} from './mapper/field-mapper.js';

// Export legacy functionality for backward compatibility
export {
  ClankerAPIMethod,
  createAPIMethod,
  createAPIMethodFromEnv,
} from './executor/api-method.js';

export {
  mapTokenToAPI,
  mapAPIResponse,
} from './mapper/field-mapper.js';
export {
  ClankerSDKError,
  ConfigurationError,
  AuthenticationError,
  NetworkError,
} from './errors/unified-error-hierarchy.js';

export {
  createConfigError,
  createAuthError,
  createNetworkError,
  createValidationError as createClankerValidationError,
} from './types/error-types.js';