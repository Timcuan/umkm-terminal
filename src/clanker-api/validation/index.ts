/**
 * Validation Module
 * Exports type validation functionality for Clanker API integration
 */

export {
  TypeValidator,
  createTypeValidator,
  createStrictTypeValidator,
  createLenientTypeValidator,
  validateTokenConfig,
  validateAPIRequest,
  validateAPIResponse,
  validateSDKConfig,
  assertValidTokenConfig,
  assertValidAPIRequest,
  assertValidAPIResponse,
} from './type-validator.js';

export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SchemaValidationOptions,
} from './type-validator.js';