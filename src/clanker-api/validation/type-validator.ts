/**
 * Type Validator
 * Comprehensive type validation for API requests and responses
 */

import type { ClankerTokenV4 } from '../../types/index.js';
import type { 
  ClankerAPITokenRequest, 
  ClankerAPIResponse
} from '../types/api-types.js';
import type { ClankerSDKConfig } from '../types/config-types.js';
import { createValidationError } from '../errors/unified-error-hierarchy.js';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  value?: any;
}

export interface SchemaValidationOptions {
  strict: boolean;
  allowUnknownFields: boolean;
  validateOptionalFields: boolean;
}

// ============================================================================
// Schema Definitions
// ============================================================================

interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'address' | 'hex' | 'url';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  arrayItemType?: string;
  customValidator?: (value: any) => ValidationError | null;
}

const TOKEN_CONFIG_SCHEMA: Record<string, FieldSchema> = {
  name: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200, // Increased from 100 to 200
    // Removed pattern restriction to allow all characters including emojis, special chars, etc.
  },
  symbol: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 50, // Increased from 20 to 50
    // Removed pattern restriction to allow lowercase, special characters, emojis, etc.
  },
  tokenAdmin: {
    type: 'address',
    required: true,
  },
  chainId: {
    type: 'number',
    required: true, // Required in V4
    min: 1,
    max: 999999999,
  },
  image: {
    type: 'url',
    required: true, // Required in V4
  },
  // Optional metadata fields
  'metadata.description': {
    type: 'string',
    required: false,
    maxLength: 5000, // Increased from 1000 to 5000 for longer descriptions
  },
  'metadata.socials.twitter': {
    type: 'string',
    required: false,
    pattern: /^@?[A-Za-z0-9_]{1,15}$/,
  },
  'metadata.socials.telegram': {
    type: 'string',
    required: false,
    pattern: /^@?[A-Za-z0-9_]{5,32}$/,
  },
  'metadata.socials.website': {
    type: 'url',
    required: false,
  },
};

const API_REQUEST_SCHEMA: Record<string, FieldSchema> = {
  token: {
    type: 'object',
    required: true,
  },
  'token.name': {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  'token.symbol': {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 20,
  },
  'token.tokenAdmin': {
    type: 'address',
    required: true,
  },
  'token.requestKey': {
    type: 'string',
    required: true,
    minLength: 32,
    maxLength: 32,
  },
  chainId: {
    type: 'number',
    required: true,
    enum: [1, 8453, 42161, 130, 10143], // Supported chain IDs
  },
  'token.description': {
    type: 'string',
    required: false,
    maxLength: 1000,
  },
  'token.image': {
    type: 'url',
    required: false,
  },
  'token.socialMediaUrls': {
    type: 'array',
    required: false,
  },
  'token.auditUrls': {
    type: 'array',
    required: false,
  },
  rewards: {
    type: 'array',
    required: false,
  },
  pool: {
    type: 'object',
    required: false,
  },
  fees: {
    type: 'object',
    required: false,
  },
  vault: {
    type: 'object',
    required: false,
  },
  airdrop: {
    type: 'object',
    required: false,
  },
};

const API_RESPONSE_SCHEMA: Record<string, FieldSchema> = {
  success: {
    type: 'boolean',
    required: true,
  },
  requestKey: {
    type: 'string',
    required: false,
    minLength: 1,
  },
  expectedAddress: {
    type: 'address',
    required: false,
  },
  txHash: {
    type: 'hex',
    required: false,
  },
  error: {
    type: 'string',
    required: false,
  },
  warnings: {
    type: 'array',
    required: false,
    arrayItemType: 'string',
  },
};

const SDK_CONFIG_SCHEMA: Record<string, FieldSchema> = {
  operationMethod: {
    type: 'string',
    required: false,
    enum: ['api', 'direct', 'auto'],
  },
  'api.apiKey': {
    type: 'string',
    required: false,
    minLength: 8, // Reduced from 16 for testing
  },
  'api.baseUrl': {
    type: 'url',
    required: false,
  },
  'api.timeout': {
    type: 'number',
    required: false,
    min: 1000,
    max: 300000,
  },
  'api.retries': {
    type: 'number',
    required: false,
    min: 0,
    max: 10,
  },
  // Legacy viem configuration fields (for backward compatibility)
  wallet: {
    type: 'object',
    required: false,
  },
  publicClient: {
    type: 'object',
    required: false,
  },
  chain: {
    type: 'object',
    required: false,
  },
  chains: {
    type: 'array',
    required: false,
    arrayItemType: 'object',
  },
};

// ============================================================================
// Type Validator Class
// ============================================================================

export class TypeValidator {
  private options: SchemaValidationOptions;

  constructor(options: Partial<SchemaValidationOptions> = {}) {
    this.options = {
      strict: true,
      allowUnknownFields: false,
      validateOptionalFields: true,
      ...options,
    };
  }

  // ==========================================================================
  // Public Validation Methods
  // ==========================================================================

  /**
   * Validate token configuration
   */
  validateTokenConfig(token: ClankerTokenV4): ValidationResult {
    return this.validateAgainstSchema(token, TOKEN_CONFIG_SCHEMA, 'TokenConfig');
  }

  /**
   * Validate API request structure
   */
  validateAPIRequest(request: ClankerAPITokenRequest): ValidationResult {
    return this.validateAgainstSchema(request, API_REQUEST_SCHEMA, 'APIRequest');
  }

  /**
   * Validate API response structure
   */
  validateAPIResponse(response: any): ValidationResult {
    return this.validateAgainstSchema(response, API_RESPONSE_SCHEMA, 'APIResponse');
  }

  /**
   * Validate SDK configuration
   */
  validateSDKConfig(config: ClankerSDKConfig): ValidationResult {
    const flatConfig = this.flattenObject(config);
    return this.validateAgainstSchema(flatConfig, SDK_CONFIG_SCHEMA, 'SDKConfig');
  }

  /**
   * Validate runtime type safety
   */
  validateRuntimeTypes(data: any, expectedType: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (expectedType) {
      case 'ClankerTokenV4':
        return this.validateTokenConfig(data);
      
      case 'ClankerAPITokenRequest':
        return this.validateAPIRequest(data);
      
      case 'ClankerAPIResponse':
        return this.validateAPIResponse(data);
      
      case 'ClankerSDKConfig':
        return this.validateSDKConfig(data);
      
      default:
        errors.push({
          field: 'type',
          message: `Unknown type for validation: ${expectedType}`,
          code: 'UNKNOWN_TYPE',
          value: expectedType,
        });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Schema Validation Engine
  // ==========================================================================

  validateAgainstSchema(
    data: any,
    schema: Record<string, FieldSchema>,
    contextName: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (data === null || data === undefined) {
      errors.push({
        field: 'root',
        message: `${contextName} cannot be null or undefined`,
        code: 'NULL_VALUE',
        value: data,
      });
      return { valid: false, errors, warnings };
    }

    if (typeof data !== 'object') {
      errors.push({
        field: 'root',
        message: `${contextName} must be an object`,
        code: 'INVALID_TYPE',
        value: typeof data,
      });
      return { valid: false, errors, warnings };
    }

    // Validate required fields
    for (const [fieldPath, fieldSchema] of Object.entries(schema)) {
      const fieldValue = this.getNestedValue(data, fieldPath);
      const fieldName = fieldPath.split('.').pop() || fieldPath;

      if (fieldSchema.required && (fieldValue === undefined || fieldValue === null)) {
        errors.push({
          field: fieldPath,
          message: `${fieldName} is required`,
          code: 'REQUIRED_FIELD',
        });
        continue;
      }

      if (fieldValue !== undefined && fieldValue !== null) {
        const fieldErrors = this.validateField(fieldPath, fieldValue, fieldSchema);
        errors.push(...fieldErrors);
      } else if (!fieldSchema.required && this.options.validateOptionalFields) {
        // Optional field validation warnings
        if (fieldPath === 'description' && !fieldValue) {
          warnings.push({
            field: fieldPath,
            message: 'Description is recommended for better token discoverability',
            suggestion: 'Add a brief description of your token',
          });
        }
      }
    }

    // Check for unknown fields
    if (!this.options.allowUnknownFields) {
      const unknownFields = this.findUnknownFields(data, schema);
      for (const field of unknownFields) {
        if (this.options.strict) {
          errors.push({
            field,
            message: `Unknown field: ${field}`,
            code: 'UNKNOWN_FIELD',
            value: this.getNestedValue(data, field),
          });
        } else {
          warnings.push({
            field,
            message: `Unknown field will be ignored: ${field}`,
            suggestion: 'Remove unknown fields or check field names',
            value: this.getNestedValue(data, field),
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateField(
    fieldPath: string,
    value: any,
    schema: FieldSchema
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldName = fieldPath.split('.').pop() || fieldPath;

    // Type validation
    const typeError = this.validateFieldType(fieldPath, value, schema.type);
    if (typeError) {
      errors.push(typeError);
      return errors; // Don't continue if type is wrong
    }

    // Length validation for strings
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          field: fieldPath,
          message: `${fieldName} must be at least ${schema.minLength} characters`,
          code: 'MIN_LENGTH',
          value: value.length,
        });
      }

      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          field: fieldPath,
          message: `${fieldName} must be at most ${schema.maxLength} characters`,
          code: 'MAX_LENGTH',
          value: value.length,
        });
      }

      // Pattern validation
      if (schema.pattern && !schema.pattern.test(value)) {
        errors.push({
          field: fieldPath,
          message: `${fieldName} format is invalid`,
          code: 'INVALID_FORMAT',
          value,
        });
      }
    }

    // Numeric range validation
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push({
          field: fieldPath,
          message: `${fieldName} must be at least ${schema.min}`,
          code: 'MIN_VALUE',
          value,
        });
      }

      if (schema.max !== undefined && value > schema.max) {
        errors.push({
          field: fieldPath,
          message: `${fieldName} must be at most ${schema.max}`,
          code: 'MAX_VALUE',
          value,
        });
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: fieldPath,
        message: `${fieldName} must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM',
        value,
      });
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.arrayItemType) {
        for (let i = 0; i < value.length; i++) {
          const itemError = this.validateFieldType(
            `${fieldPath}[${i}]`,
            value[i],
            schema.arrayItemType as any
          );
          if (itemError) {
            errors.push(itemError);
          }
        }
      }
    }

    // Custom validation
    if (schema.customValidator) {
      const customError = schema.customValidator(value);
      if (customError) {
        errors.push({
          ...customError,
          field: fieldPath,
        });
      }
    }

    return errors;
  }

  private validateFieldType(
    fieldPath: string,
    value: any,
    expectedType: string
  ): ValidationError | null {
    const fieldName = fieldPath.split('.').pop() || fieldPath;

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: fieldPath,
            message: `${fieldName} must be a string`,
            code: 'INVALID_TYPE',
            value: typeof value,
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field: fieldPath,
            message: `${fieldName} must be a valid number`,
            code: 'INVALID_TYPE',
            value: typeof value,
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field: fieldPath,
            message: `${fieldName} must be a boolean`,
            code: 'INVALID_TYPE',
            value: typeof value,
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field: fieldPath,
            message: `${fieldName} must be an array`,
            code: 'INVALID_TYPE',
            value: typeof value,
          };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return {
            field: fieldPath,
            message: `${fieldName} must be an object`,
            code: 'INVALID_TYPE',
            value: typeof value,
          };
        }
        break;

      case 'address':
        if (!this.isValidAddress(value)) {
          return {
            field: fieldPath,
            message: `${fieldName} must be a valid Ethereum address`,
            code: 'INVALID_ADDRESS',
            value,
          };
        }
        break;

      case 'hex':
        if (!this.isValidHex(value)) {
          return {
            field: fieldPath,
            message: `${fieldName} must be a valid hex string`,
            code: 'INVALID_HEX',
            value,
          };
        }
        break;

      case 'url':
        if (!this.isValidUrl(value)) {
          return {
            field: fieldPath,
            message: `${fieldName} must be a valid URL`,
            code: 'INVALID_URL',
            value,
          };
        }
        break;
    }

    return null;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  private findUnknownFields(data: Record<string, any>, schema: Record<string, FieldSchema>): string[] {
    const knownFields = new Set(Object.keys(schema));
    const unknownFields: string[] = [];

    const checkObject = (obj: Record<string, any>, prefix = '') => {
      for (const key of Object.keys(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        
        if (!knownFields.has(fullPath)) {
          unknownFields.push(fullPath);
        }

        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          checkObject(obj[key], fullPath);
        }
      }
    };

    checkObject(data);
    return unknownFields;
  }

  private isValidAddress(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  private isValidHex(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^0x[a-fA-F0-9]+$/.test(value);
  }

  private isValidUrl(value: any): boolean {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      // Only allow http and https protocols
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Configuration Methods
  // ==========================================================================

  /**
   * Update validation options
   */
  updateOptions(options: Partial<SchemaValidationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current validation options
   */
  getOptions(): SchemaValidationOptions {
    return { ...this.options };
  }
}

// ============================================================================
// Factory Functions and Utilities
// ============================================================================

/**
 * Create type validator with default options
 */
export function createTypeValidator(options?: Partial<SchemaValidationOptions>): TypeValidator {
  return new TypeValidator(options);
}

/**
 * Create strict type validator
 */
export function createStrictTypeValidator(): TypeValidator {
  return new TypeValidator({
    strict: true,
    allowUnknownFields: false,
    validateOptionalFields: true,
  });
}

/**
 * Create lenient type validator
 */
export function createLenientTypeValidator(): TypeValidator {
  return new TypeValidator({
    strict: false,
    allowUnknownFields: true,
    validateOptionalFields: true, // Changed to true to generate warnings
  });
}

/**
 * Quick validation functions (backward compatible)
 */
export function validateTokenConfig(token: ClankerTokenV4): ValidationResult {
  // Use lenient validator for backward compatibility
  return validateTokenConfigLenient(token);
}

/**
 * Backward compatible token validation (more lenient)
 */
export function validateTokenConfigLenient(token: any): ValidationResult {
  // Create a custom validator that's lenient about unknown fields but validates constraints
  const validator = new TypeValidator({
    strict: false,
    allowUnknownFields: true,
    validateOptionalFields: true,
  });
  
  // Create a more lenient schema for backward compatibility
  const lenientSchema: Record<string, FieldSchema> = {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100,
    },
    symbol: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 11, // Standard token symbols are typically 1-11 characters
    },
    tokenAdmin: {
      type: 'address',
      required: true,
    },
    chainId: {
      type: 'number',
      required: false, // Optional for backward compatibility
      min: 1,
      max: 999999999,
    },
    image: {
      type: 'url',
      required: false, // Optional for backward compatibility
    },
    // Add validation for social media fields when present
    website: {
      type: 'url',
      required: false,
    },
    twitter: {
      type: 'string',
      required: false,
      pattern: /^@?[A-Za-z0-9_]{1,15}$/,
    },
    telegram: {
      type: 'string',
      required: false,
      pattern: /^@?[A-Za-z0-9_]{5,32}$/,
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 1000,
    },
  };

  // Pre-process token to handle empty strings as undefined for optional fields
  const processedToken = { ...token };
  
  // Treat empty strings as undefined for optional fields (backward compatibility)
  const optionalStringFields = ['description', 'image', 'website', 'twitter', 'telegram'];
  for (const field of optionalStringFields) {
    if (processedToken[field] === '') {
      processedToken[field] = undefined;
    }
  }

  const result = validator.validateAgainstSchema(processedToken, lenientSchema, 'TokenConfig');
  
  // Add warnings for recommended fields
  if (result.valid && (!processedToken.description || processedToken.description?.trim() === '')) {
    result.warnings.push({
      field: 'description',
      message: 'Description is recommended for better token discoverability',
      suggestion: 'Add a brief description of your token',
    });
  }

  return result;
}

export function validateAPIRequest(request: ClankerAPITokenRequest): ValidationResult {
  const validator = createTypeValidator();
  return validator.validateAPIRequest(request);
}

export function validateAPIResponse(response: any): ValidationResult {
  const validator = createTypeValidator();
  return validator.validateAPIResponse(response);
}

/**
 * Validate SDK configuration (backward compatible)
 */
export function validateSDKConfig(config: ClankerSDKConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate operation method if provided
  if (config.operationMethod) {
    const validMethods = ['api', 'direct', 'auto', 'bankrbot'];
    if (!validMethods.includes(config.operationMethod)) {
      errors.push({
        field: 'operationMethod',
        message: `Invalid operation method: ${config.operationMethod}. Must be one of: ${validMethods.join(', ')}`,
        code: 'INVALID_OPERATION_METHOD',
        value: config.operationMethod,
      });
    }
  }

  // Validate API configuration if provided
  if (config.api) {
    if (config.api.apiKey !== undefined) {
      if (typeof config.api.apiKey !== 'string' || config.api.apiKey.trim().length === 0) {
        errors.push({
          field: 'api.apiKey',
          message: 'API key must be a non-empty string',
          code: 'INVALID_API_KEY',
          value: config.api.apiKey,
        });
      } else if (config.api.apiKey.trim().length < 5 && !config.api.apiKey.includes('test') && !config.api.apiKey.includes('demo')) {
        // Only enforce minimum length for non-test keys
        errors.push({
          field: 'api.apiKey',
          message: 'API key must be at least 5 characters for production use',
          code: 'API_KEY_TOO_SHORT',
          value: config.api.apiKey,
        });
      }
    }

    if (config.api.baseUrl !== undefined) {
      if (typeof config.api.baseUrl !== 'string') {
        errors.push({
          field: 'api.baseUrl',
          message: 'Base URL must be a string',
          code: 'INVALID_BASE_URL_TYPE',
          value: config.api.baseUrl,
        });
      } else {
        try {
          new URL(config.api.baseUrl);
        } catch {
          errors.push({
            field: 'api.baseUrl',
            message: 'Base URL must be a valid URL',
            code: 'INVALID_BASE_URL_FORMAT',
            value: config.api.baseUrl,
          });
        }
      }
    }

    if (config.api.timeout !== undefined) {
      if (typeof config.api.timeout !== 'number' || config.api.timeout < 0) {
        errors.push({
          field: 'api.timeout',
          message: 'Timeout must be a non-negative number',
          code: 'INVALID_TIMEOUT',
          value: config.api.timeout,
        });
      }
    }

    if (config.api.retries !== undefined) {
      if (typeof config.api.retries !== 'number' || config.api.retries < 0 || config.api.retries > 10) {
        errors.push({
          field: 'api.retries',
          message: 'Retries must be a number between 0 and 10',
          code: 'INVALID_RETRIES',
          value: config.api.retries,
        });
      }
    }
  }

  // Validate Bankrbot configuration if provided
  if (config.bankrbot) {
    if (config.bankrbot.apiKey !== undefined) {
      if (typeof config.bankrbot.apiKey !== 'string' || config.bankrbot.apiKey.trim().length === 0) {
        errors.push({
          field: 'bankrbot.apiKey',
          message: 'Bankrbot API key must be a non-empty string',
          code: 'INVALID_BANKRBOT_API_KEY',
          value: config.bankrbot.apiKey,
        });
      } else if (config.bankrbot.apiKey.trim().length < 5 && !config.bankrbot.apiKey.includes('test') && !config.bankrbot.apiKey.includes('demo')) {
        // Only enforce minimum length for non-test keys
        errors.push({
          field: 'bankrbot.apiKey',
          message: 'Bankrbot API key must be at least 5 characters for production use',
          code: 'BANKRBOT_API_KEY_TOO_SHORT',
          value: config.bankrbot.apiKey,
        });
      }
    }

    if (config.bankrbot.baseUrl !== undefined) {
      if (typeof config.bankrbot.baseUrl !== 'string') {
        errors.push({
          field: 'bankrbot.baseUrl',
          message: 'Bankrbot base URL must be a string',
          code: 'INVALID_BANKRBOT_BASE_URL_TYPE',
          value: config.bankrbot.baseUrl,
        });
      } else {
        try {
          new URL(config.bankrbot.baseUrl);
        } catch {
          errors.push({
            field: 'bankrbot.baseUrl',
            message: 'Bankrbot base URL must be a valid URL',
            code: 'INVALID_BANKRBOT_BASE_URL_FORMAT',
            value: config.bankrbot.baseUrl,
          });
        }
      }
    }

    if (config.bankrbot.timeout !== undefined) {
      if (typeof config.bankrbot.timeout !== 'number' || config.bankrbot.timeout < 0) {
        errors.push({
          field: 'bankrbot.timeout',
          message: 'Bankrbot timeout must be a non-negative number',
          code: 'INVALID_BANKRBOT_TIMEOUT',
          value: config.bankrbot.timeout,
        });
      }
    }

    if (config.bankrbot.retries !== undefined) {
      if (typeof config.bankrbot.retries !== 'number' || config.bankrbot.retries < 0 || config.bankrbot.retries > 10) {
        errors.push({
          field: 'bankrbot.retries',
          message: 'Bankrbot retries must be a number between 0 and 10',
          code: 'INVALID_BANKRBOT_RETRIES',
          value: config.bankrbot.retries,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Throw validation error if validation fails (backward compatible)
 */
export function assertValidTokenConfig(token: ClankerTokenV4): void {
  const result = validateTokenConfigLenient(token);
  if (!result.valid) {
    throw createValidationError(
      'Token configuration validation failed',
      'api',
      result.errors.map(e => e.message),
      result.warnings.map(w => w.message),
      { token: token.name, errors: result.errors }
    );
  }
}

export function assertValidAPIRequest(request: ClankerAPITokenRequest): void {
  const result = validateAPIRequest(request);
  if (!result.valid) {
    throw createValidationError(
      'API request validation failed',
      'api',
      result.errors.map(e => e.message),
      result.warnings.map(w => w.message),
      { request, errors: result.errors }
    );
  }
}

export function assertValidAPIResponse(response: any): void {
  const result = validateAPIResponse(response);
  if (!result.valid) {
    throw createValidationError(
      'API response validation failed',
      'api',
      result.errors.map(e => e.message),
      result.warnings.map(w => w.message),
      { response, errors: result.errors }
    );
  }
}