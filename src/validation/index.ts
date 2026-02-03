/**
 * Unified Validation Framework for Clanker SDK
 * Provides comprehensive validation utilities for token configurations
 */

import { getAddress, isAddress } from 'viem';
import { AddressError, ValidationError } from '../errors/index.js';
import { type TokenConfiguration } from '../types/configuration.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValidationRule<T extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  validate: (value: T, context?: ValidationContext) => boolean | string;
  message?: string;
}

export interface ValidationContext {
  field?: string;
  index?: number;
  parent?: string;
  [key: string]: unknown;
}

export interface ValidationErrorInfo {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorInfo[];
  [key: string]: unknown;
}

// ============================================================================
// Base Validator
// ============================================================================

export class Validator {
  private rules: ValidationRule[] = [];

  constructor(private name: string) {}

  /**
   * Add a validation rule
   */
  addRule<T extends Record<string, unknown>>(rule: ValidationRule<T>): Validator {
    // Cast to base type to handle generic type constraints
    this.rules.push(rule as ValidationRule<Record<string, unknown>>);
    return this;
  }

  /**
   * Validate a value against all rules
   */
  validate<T>(value: T, context?: ValidationContext): ValidationResult {
    const errors: ValidationErrorInfo[] = [];

    for (const rule of this.rules) {
      const result = rule.validate(value, context);

      // Handle different return types from validate function
      if (typeof result === 'boolean') {
        if (!result) {
          errors.push({
            code: rule.name || 'VALIDATION_ERROR',
            message: rule.message || 'Validation failed',
            field: context?.field,
            value,
          });
        }
      } else if (typeof result === 'string') {
        // String means validation failed with error message
        errors.push({
          code: rule.name || 'VALIDATION_ERROR',
          message: result,
          field: context?.field,
          value,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate and throw on first error
   */
  validateOrThrow<T>(value: T, context?: ValidationContext): void {
    const result = this.validate(value, context);
    if (!result.valid) {
      throw new ValidationError(
        result.errors[0]?.code || 'VALIDATION_FAILED',
        result.errors[0]?.message || 'Validation failed',
        context?.field,
        value
      );
    }
  }
}

// ============================================================================
// Common Validation Rules
// ============================================================================

export const CommonRules = {
  /**
   * Check if value is required (not empty/null/undefined)
   */
  required: <T>(message?: string): ValidationRule<T> => ({
    name: 'REQUIRED',
    validate: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message: message || 'Field is required',
  }),

  /**
   * Check string length
   */
  length: (min: number, max?: number, message?: string): ValidationRule<string> => ({
    name: 'LENGTH',
    validate: (value) => {
      if (typeof value !== 'string') return false;
      if (value.length < min) return `Must be at least ${min} characters`;
      if (max && value.length > max) return `Must be at most ${max} characters`;
      return true;
    },
    message: message || `Length must be between ${min} and ${max}`,
  }),

  /**
   * Check numeric range
   */
  range: (min: number, max?: number, message?: string): ValidationRule<number> => ({
    name: 'RANGE',
    validate: (value) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return false;
      if (value < min) return `Must be at least ${min}`;
      if (max !== undefined && value > max) return `Must be at most ${max}`;
      return true;
    },
    message: message || `Value must be between ${min} and ${max}`,
  }),

  /**
   * Check if value is one of allowed options
   */
  oneOf: <T>(options: T[], message?: string): ValidationRule<T> => ({
    name: 'ONE_OF',
    validate: (value) => options.includes(value),
    message: message || `Must be one of: ${options.join(', ')}`,
  }),

  /**
   * Check if value matches regex pattern
   */
  regex: (pattern: RegExp, message?: string): ValidationRule<string> => ({
    name: 'REGEX',
    validate: (value) => typeof value === 'string' && pattern.test(value),
    message: message || 'Invalid format',
  }),

  /**
   * Check if URL is valid
   */
  url: (message?: string): ValidationRule<string> => ({
    name: 'URL',
    validate: (value) => {
      if (typeof value !== 'string') return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: message || 'Invalid URL',
  }),
};

// ============================================================================
// Specific Validators
// ============================================================================

/**
 * Ethereum address validator
 */
export const AddressValidator = new Validator('Address')
  .addRule<string>({
    name: 'ADDRESS_FORMAT',
    validate: (value: string) => {
      if (typeof value !== 'string') return false;
      return isAddress(value);
    },
    message: 'Invalid Ethereum address format',
  })
  .addRule<string>({
    name: 'ADDRESS_CHECKSUM',
    validate: (value: string) => {
      try {
        getAddress(value);
        return true;
      } catch {
        return 'Invalid address checksum';
      }
    },
  });

/**
 * Private key validator
 */
export const PrivateKeyValidator = new Validator('PrivateKey').addRule<string>({
  name: 'PRIVATE_KEY_FORMAT',
  validate: (value: string) => {
    if (typeof value !== 'string') return false;
    // Check for 0x prefix and 64 hex characters
    return /^0x[a-fA-F0-9]{64}$/.test(value);
  },
  message: 'Private key must be 0x followed by 64 hex characters',
});

/**
 * Token symbol validator
 */
export const TokenSymbolValidator = new Validator('TokenSymbol').addRule(
  CommonRules.required('Token symbol is required')
);

/**
 * Token name validator
 */
export const TokenNameValidator = new Validator('TokenName').addRule(
  CommonRules.required('Token name is required')
);

/**
 * Chain ID validator
 */
export const ChainIdValidator = new Validator('ChainId')
  .addRule(CommonRules.required('Chain ID is required'))
  .addRule(CommonRules.oneOf([1, 8453, 42161, 130, 10143], 'Unsupported chain ID'));

/**
 * Username validator
 */
export const UsernameValidator = new Validator('Username')
  .addRule(CommonRules.required('Username is required'))
  .addRule(CommonRules.length(3, 15, 'Username must be 3-15 characters'));

/**
 * FID validator
 */
export const FidValidator = new Validator('FID')
  .addRule(CommonRules.required('FID is required'))
  .addRule(CommonRules.range(1, Number.MAX_SAFE_INTEGER, 'FID must be a positive number'));

/**
 * Fee validator
 */
export const FeeValidator = new Validator('Fee')
  .addRule(CommonRules.required('Fee is required'))
  .addRule(CommonRules.range(1, 80, 'Fee must be between 1% and 80%'));

/**
 * Farcaster username validator
 */
export const FarcasterUsernameValidator = new Validator('FarcasterUsername')
  .addRule(CommonRules.required('Username is required'))
  .addRule(CommonRules.length(3, 15, 'Username must be 3-15 characters'))
  .addRule(
    CommonRules.regex(
      /^[a-z0-9._-]+$/i,
      'Username can only contain letters, numbers, dots, hyphens, and underscores'
    )
  );

/**
 * Farcaster FID validator
 */
export const FarcasterFidValidator = new Validator('FarcasterFid')
  .addRule(CommonRules.required('FID is required'))
  .addRule(CommonRules.range(1, Number.MAX_SAFE_INTEGER, 'FID must be a positive number'));

/**
 * MEV block delay validator
 */
export const MEVValidator = new Validator('MEV').addRule(
  CommonRules.range(0, 50, 'MEV block delay must be between 0 and 50')
);

/**
 * Vault percentage validator
 */
export const VaultPercentageValidator = new Validator('VaultPercentage').addRule(
  CommonRules.range(0, 100, 'Vault percentage must be between 0 and 100')
);

/**
 * Vault lockup validator
 */
export const VaultLockupValidator = new Validator('VaultLockup').addRule(
  CommonRules.range(1, 365 * 4, 'Vault lockup must be between 1 day and 4 years')
);

/**
 * Image URL validator (supports HTTP, HTTPS, and IPFS)
 */
export const ImageUrlValidator = new Validator('ImageUrl')
  .addRule(CommonRules.required('Image URL is required'))
  .addRule(CommonRules.url('Invalid image URL format'))
  .addRule({
    name: 'IMAGE_URL_FORMAT',
    validate: (value: string) => {
      if (!value || typeof value !== 'string') return true; // Allow empty
      if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }
      if (value.startsWith('ipfs://')) {
        return /^[a-fA-F0-9]{46,}$/.test(value.split('://')[1] || '');
      }
      return false;
    },
    message: 'Image URL must be a valid HTTP/HTTPS URL or IPFS hash',
  });

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate an array of items
 */
export function validateBatch<T>(
  items: T[],
  validator: Validator,
  context?: ValidationContext
): ValidationResult {
  const errors: ValidationErrorInfo[] = [];

  items.forEach((item, index) => {
    const result = validator.validate(item, {
      ...context,
      field: context?.field ? `${context.field}[${index}]` : `[${index}]`,
      index,
    });

    if (!result.valid) {
      errors.push(...result.errors);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate reward recipients array
 */
export const RewardRecipientsValidator = new Validator('RewardRecipients')
  .addRule({
    name: 'RECIPIENTS_ARRAY',
    validate: (value: Record<string, unknown>) => Array.isArray(value.rewardRecipients),
    message: 'Reward recipients must be an array',
  })
  .addRule({
    name: 'MAX_RECIPIENTS',
    validate: (value: Record<string, unknown>) => !Array.isArray(value.rewardRecipients) || value.rewardRecipients.length <= 7,
    message: 'Maximum 7 reward recipients allowed',
  })
  .addRule({
    name: 'RECIPIENT_FORMAT',
    validate: (value: Record<string, unknown>) => {
      if (!Array.isArray(value.rewardRecipients)) return true;
      return value.rewardRecipients.every(
        (recipient) =>
          typeof recipient === 'object' &&
          recipient !== null &&
          'address' in recipient &&
          ('allocation' in recipient || 'percentage' in recipient)
      );
    },
    message: 'Each recipient must have address and allocation',
  });

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate and normalize an address
 */
export function validateAndNormalizeAddress(address: string, field?: string): `0x${string}` {
  if (!address) {
    throw new AddressError('', 'Address is required');
  }

  const result = AddressValidator.validate(address, { field });
  if (!result.valid) {
    throw result.errors[0];
  }

  return getAddress(address as `0x${string}`);
}

/**
 * Validate private key
 */
export function validatePrivateKey(privateKey: string): `0x${string}` {
  const result = PrivateKeyValidator.validate(privateKey, { field: 'privateKey' });
  if (!result.valid) {
    throw result.errors[0];
  }

  return privateKey as `0x${string}`;
}

/**
 * Validate token configuration
 */
export function validateTokenConfig(config: TokenConfiguration): void {
  // Define interfaces for better type safety
  interface FeeConfig {
    type?: 'static' | 'dynamic';
    clankerFee?: number;
    pairedFee?: number;
    baseFee?: number;
    maxLpFee?: number;
  }

  interface VaultConfig {
    enabled?: boolean;
    percentage?: number;
    lockupDays?: number;
  }

  interface RewardRecipient {
    address?: string;
    allocation?: number;
    percentage?: number;
  }

  // Validate required fields
  TokenNameValidator.validateOrThrow(config.name as string, { field: 'name' });
  TokenSymbolValidator.validateOrThrow(config.symbol as string, { field: 'symbol' });

  // Validate optional fields if present
  if (config.tokenAdmin) {
    validateAndNormalizeAddress(config.tokenAdmin as string, 'tokenAdmin');
  }

  if (config.chainId) {
    ChainIdValidator.validateOrThrow(config.chainId as number, { field: 'chainId' });
  }

  if (config.image) {
    ImageUrlValidator.validateOrThrow(config.image as string, { field: 'image' });
  }

  // Validate fees
  const fees = config.fees as FeeConfig;
  if (fees) {
    if (fees.type === 'static') {
      if (fees.clankerFee !== undefined) {
        FeeValidator.validateOrThrow(fees.clankerFee, { field: 'fees.clankerFee' });
      }
      if (fees.pairedFee !== undefined) {
        FeeValidator.validateOrThrow(fees.pairedFee, { field: 'fees.pairedFee' });
      }
    } else if (fees.type === 'dynamic') {
      if (fees.baseFee !== undefined) {
        const result = CommonRules.range(0.5, 5).validate(fees.baseFee);
        if (result !== true)
          throw new ValidationError('INVALID_DYNAMIC_FEE', String(result), 'fees.baseFee');
      }
      if (fees.maxLpFee !== undefined) {
        const result = CommonRules.range(0.5, 5).validate(fees.maxLpFee);
        if (result !== true)
          throw new ValidationError('INVALID_DYNAMIC_FEE', String(result), 'fees.maxLpFee');
      }
    }
  }

  // Validate MEV
  if (config.mev !== undefined && typeof config.mev === 'number') {
    MEVValidator.validateOrThrow(config.mev, { field: 'mev' });
  }

  // Validate vault
  const vault = config.vault as VaultConfig;
  if (vault?.enabled) {
    if (vault.percentage !== undefined) {
      VaultPercentageValidator.validateOrThrow(vault.percentage, { field: 'vault.percentage' });
    }
    if (vault.lockupDays !== undefined) {
      VaultLockupValidator.validateOrThrow(vault.lockupDays, { field: 'vault.lockupDays' });
    }
  }

  // Validate reward recipients
  const rewardRecipients = config.rewardRecipients as RewardRecipient[];
  if (rewardRecipients) {
    const result = RewardRecipientsValidator.validate(rewardRecipients, {
      field: 'rewardRecipients',
    });
    if (!result.valid) {
      throw result.errors[0];
    }

    // Validate each recipient
    rewardRecipients.forEach((recipient, index: number) => {
      if (recipient.address) {
        validateAndNormalizeAddress(recipient.address, `rewardRecipients[${index}].address`);
      }

      const hasAllocation = recipient.allocation !== undefined && recipient.allocation !== null;
      const hasPercentage = recipient.percentage !== undefined && recipient.percentage !== null;

      if (hasAllocation && hasPercentage && recipient.allocation !== recipient.percentage) {
        throw new ValidationError(
          'ALLOCATION_MISMATCH',
          'Reward recipient allocation and percentage must match',
          `rewardRecipients[${index}]`,
          recipient
        );
      }

      const allocation = hasAllocation ? recipient.allocation : recipient.percentage;

      if (allocation !== undefined) {
        const result = CommonRules.range(0.1, 100).validate(allocation);
        if (result !== true) {
          throw new ValidationError(
            'INVALID_ALLOCATION',
            String(result),
            `rewardRecipients[${index}].allocation`
          );
        }
      }
    });
  }
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize string input
 */
export function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * Sanitize token symbol (uppercase, remove spaces)
 */
export function sanitizeSymbol(value: unknown): string {
  const sanitized = sanitizeString(value);
  return sanitized.toUpperCase().replace(/\s+/g, '');
}

/**
 * Sanitize username (lowercase, remove @ prefix)
 */
export function sanitizeUsername(value: unknown): string {
  const sanitized = sanitizeString(value);
  return sanitized.replace(/^@/, '').toLowerCase();
}
