/**
 * Type definitions for Clanker API integration
 */

// Re-export all types
export * from './api-types.js';
export * from './config-types.js';
export * from './error-types.js';
export * from './mapper-types.js';

// Re-export validation types for external consumption
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SchemaValidationOptions,
} from '../validation/type-validator.js';

// Re-export strict types for advanced TypeScript usage (temporarily disabled due to build issues)
// export * from './strict-types.js';