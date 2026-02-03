/**
 * Configuration Validator Implementation
 * 
 * This module implements the ConfigurationValidator class that provides
 * real-time validation for token configurations with immediate feedback.
 * 
 * Requirements: 1.2, 9.1, 9.3 - Essential field validation with real-time feedback
 */

import type { IConfigurationValidator } from '../interfaces/index.js';
import type {
  TokenConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DuplicateCheckResult,
  DuplicateConflict
} from '../types/core.js';
import {
  validateTokenName,
  validateTokenSymbol,
  validateInitialSupply,
  validateTokenConfig,
  findDuplicates
} from '../utils/index.js';
import { TOKEN_LIMITS, ERROR_CODES, ERROR_MESSAGES } from '../constants/index.js';

/**
 * ConfigurationValidator class provides real-time validation for token configurations
 * 
 * Features:
 * - Essential field validation (name, symbol, initialSupply)
 * - Real-time validation with immediate feedback
 * - Duplicate detection within batches
 * - Supply range validation
 * - Advanced configuration validation
 */
export class ConfigurationValidator implements IConfigurationValidator {
  
  // ============================================================================
  // Individual Token Validation Methods
  // ============================================================================

  /**
   * Validates a complete token configuration
   * Requirements: 1.2 - Essential field validation
   */
  validateTokenConfig(config: TokenConfig): ValidationResult {
    return validateTokenConfig(config);
  }

  /**
   * Validates token name with real-time feedback
   * Requirements: 9.1, 9.3 - Real-time validation with immediate feedback
   */
  validateTokenName(name: string): ValidationResult {
    return validateTokenName(name);
  }

  /**
   * Validates token symbol with real-time feedback
   * Requirements: 9.1, 9.3 - Real-time validation with immediate feedback
   */
  validateTokenSymbol(symbol: string): ValidationResult {
    return validateTokenSymbol(symbol);
  }

  /**
   * Validates initial supply with real-time feedback
   * Requirements: 9.1, 9.3 - Real-time validation with immediate feedback
   */
  validateInitialSupply(supply: string): ValidationResult {
    return validateInitialSupply(supply);
  }

  // ============================================================================
  // Batch Validation Methods
  // ============================================================================

  /**
   * Validates an array of token configurations
   * Requirements: 9.2 - Check for duplicates within batch
   */
  validateBatchConfig(configs: TokenConfig[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validatedConfigs: TokenConfig[] = [];

    // Validate each individual config
    configs.forEach((config, index) => {
      const result = this.validateTokenConfig(config);
      
      // Add index information to errors for batch context
      result.errors.forEach(error => {
        errors.push({
          ...error,
          field: `configs[${index}].${error.field}`,
          value: error.value
        });
      });

      result.warnings.forEach(warning => {
        warnings.push({
          ...warning,
          field: `configs[${index}].${warning.field}`,
          value: warning.value
        });
      });

      if (result.valid && result.data) {
        validatedConfigs.push(result.data as TokenConfig);
      }
    });

    // Check for duplicates
    const duplicateResult = this.checkDuplicates(configs);
    if (duplicateResult.hasDuplicates) {
      // Add duplicate errors
      duplicateResult.nameConflicts.forEach(conflict => {
        conflict.indices.forEach(index => {
          errors.push({
            field: `configs[${index}].name`,
            message: `Token name "${conflict.value}" is duplicated in this batch`,
            code: ERROR_CODES.E004,
            value: conflict.value
          });
        });
      });

      duplicateResult.symbolConflicts.forEach(conflict => {
        conflict.indices.forEach(index => {
          errors.push({
            field: `configs[${index}].symbol`,
            message: `Token symbol "${conflict.value}" is duplicated in this batch`,
            code: ERROR_CODES.E005,
            value: conflict.value
          });
        });
      });
    }

    // Check batch size limits
    if (configs.length > TOKEN_LIMITS.MAX_BATCH_SIZE) {
      errors.push({
        field: 'configs',
        message: `Batch size exceeds maximum limit of ${TOKEN_LIMITS.MAX_BATCH_SIZE} tokens`,
        code: ERROR_CODES.E501,
        value: configs.length,
        suggestion: TOKEN_LIMITS.MAX_BATCH_SIZE
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: errors.length === 0 ? validatedConfigs : undefined
    };
  }

  /**
   * Checks for duplicate names and symbols within a batch
   * Requirements: 9.2 - Duplicate detection
   */
  checkDuplicates(configs: TokenConfig[]): DuplicateCheckResult {
    const nameConflicts = findDuplicates(configs, config => config.name.toLowerCase())
      .map(duplicate => ({
        value: duplicate.value,
        indices: duplicate.indices,
        field: 'name' as const
      }));

    const symbolConflicts = findDuplicates(configs, config => config.symbol.toUpperCase())
      .map(duplicate => ({
        value: duplicate.value,
        indices: duplicate.indices,
        field: 'symbol' as const
      }));

    return {
      hasDuplicates: nameConflicts.length > 0 || symbolConflicts.length > 0,
      nameConflicts,
      symbolConflicts
    };
  }

  // ============================================================================
  // Advanced Validation Methods
  // ============================================================================

  /**
   * Validates supply range against acceptable limits
   * Requirements: 9.4 - Supply range validation
   */
  validateSupplyRange(supply: string): ValidationResult {
    return this.validateInitialSupply(supply);
  }

  /**
   * Validates advanced token configuration options
   */
  validateAdvancedConfig(advanced?: TokenConfig['advanced']): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!advanced) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        data: undefined
      };
    }

    // Validate custom gas limit if provided
    if (advanced.customGasLimit !== undefined) {
      if (!Number.isInteger(advanced.customGasLimit) || advanced.customGasLimit < 21000) {
        errors.push({
          field: 'advanced.customGasLimit',
          message: 'Custom gas limit must be an integer greater than or equal to 21000',
          code: ERROR_CODES.E301,
          value: advanced.customGasLimit,
          suggestion: 2000000
        });
      } else if (advanced.customGasLimit > 10000000) {
        warnings.push({
          field: 'advanced.customGasLimit',
          message: 'Custom gas limit is very high and may cause deployment failures',
          code: 'W001',
          value: advanced.customGasLimit
        });
      }
    }

    // Validate token admin address if provided
    if (advanced.tokenAdmin !== undefined) {
      if (typeof advanced.tokenAdmin !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(advanced.tokenAdmin)) {
        errors.push({
          field: 'advanced.tokenAdmin',
          message: 'Token admin must be a valid Ethereum address',
          code: ERROR_CODES.E001,
          value: advanced.tokenAdmin
        });
      }
    }

    // Validate metadata if provided
    if (advanced.metadata) {
      const metadata = advanced.metadata;
      
      if (metadata.description && metadata.description.length > 5000) {
        warnings.push({
          field: 'advanced.metadata.description',
          message: 'Token description is very long and may not display properly',
          code: 'W002',
          value: metadata.description
        });
      }

      if (metadata.image && !this.isValidUrl(metadata.image)) {
        errors.push({
          field: 'advanced.metadata.image',
          message: 'Token image must be a valid URL',
          code: ERROR_CODES.E001,
          value: metadata.image
        });
      }

      // Validate social links
      if (metadata.socials) {
        const socials = metadata.socials;
        
        if (socials.website && !this.isValidUrl(socials.website)) {
          errors.push({
            field: 'advanced.metadata.socials.website',
            message: 'Website URL is not valid',
            code: ERROR_CODES.E001,
            value: socials.website
          });
        }

        if (socials.twitter && (socials.twitter.length > 50 || socials.twitter.includes(' '))) {
          errors.push({
            field: 'advanced.metadata.socials.twitter',
            message: 'Twitter handle should be 50 characters or less without spaces',
            code: ERROR_CODES.E001,
            value: socials.twitter
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: advanced
    };
  }

  // ============================================================================
  // Real-time Field Validation
  // ============================================================================

  /**
   * Validates a specific field with context
   * Requirements: 9.1, 9.3 - Real-time validation
   */
  validateField(field: string, value: unknown, context?: TokenConfig): ValidationResult {
    switch (field) {
      case 'name':
        return this.validateTokenName(value as string);
      
      case 'symbol':
        return this.validateTokenSymbol(value as string);
      
      case 'initialSupply':
        return this.validateInitialSupply(value as string);
      
      case 'decimals':
        return this.validateDecimals(value as number);
      
      case 'advanced':
        return this.validateAdvancedConfig(value as TokenConfig['advanced']);
      
      default:
        return {
          valid: true,
          errors: [],
          warnings: [],
          data: value
        };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validates decimals value
   */
  private validateDecimals(decimals: number): ValidationResult {
    const errors: ValidationError[] = [];

    if (decimals === undefined || decimals === null) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        data: TOKEN_LIMITS.DEFAULT_DECIMALS
      };
    }

    if (!Number.isInteger(decimals)) {
      errors.push({
        field: 'decimals',
        message: 'Decimals must be an integer',
        code: ERROR_CODES.E003,
        value: decimals,
        suggestion: TOKEN_LIMITS.DEFAULT_DECIMALS
      });
    } else if (decimals < 0) {
      errors.push({
        field: 'decimals',
        message: 'Decimals cannot be negative',
        code: ERROR_CODES.E003,
        value: decimals,
        suggestion: TOKEN_LIMITS.DEFAULT_DECIMALS
      });
    } else if (decimals > 18) {
      errors.push({
        field: 'decimals',
        message: 'Decimals cannot exceed 18',
        code: ERROR_CODES.E003,
        value: decimals,
        suggestion: 18
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      data: errors.length === 0 ? decimals : undefined
    };
  }

  /**
   * Validates if a string is a valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create a ConfigurationValidator instance
 */
export function createConfigurationValidator(): IConfigurationValidator {
  return new ConfigurationValidator();
}

/**
 * Default export for convenience
 */
export default ConfigurationValidator;