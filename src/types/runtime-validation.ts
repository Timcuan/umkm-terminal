/**
 * Runtime validation that matches TypeScript types
 * Ensures TypeScript type definitions and runtime validation accept the same values
 * Requirements: 9.5 - Add runtime validation that matches TypeScript types
 */

import type { Address } from 'viem';
import type {
  ClankerTokenV4,
  FeeConfig,
  RewardRecipient,
  VaultConfig,
  MevConfig,
  PoolPosition,
  TokenMetadata
} from './index.js';
import type {
  TokenConfiguration,
  BatchConfiguration,
  FeeConfiguration,
  RewardRecipientConfiguration,
  VaultConfiguration
} from './configuration.js';
import type { ErrorContext } from './base-types.js';
import type {
  SimpleDeployConfiguration,
  BatchDeploymentOptions,
  MultiWalletBatchConfiguration,
  ClankerSDKOptions
} from './public-api.js';

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Result type for runtime validation operations
 * @template T The type of data returned on successful validation
 */
export interface RuntimeValidationResult<T> {
  /** Whether the validation was successful */
  readonly success: boolean;
  /** The validated data (only present when success is true) */
  readonly data?: T;
  /** Array of error messages (empty when success is true) */
  readonly errors: readonly string[];
  /** Array of warning messages (may be present even when success is true) */
  readonly warnings: readonly string[];
}

/**
 * Context information for validation operations
 * Used to provide better error messages and control validation behavior
 */
export interface ValidationContext {
  /** The path or field name being validated (for error messages) */
  readonly path: string;
  /** Whether to perform strict validation (reject unsupported values) */
  readonly strict: boolean;
  /** Whether to allow partial validation (incomplete objects) */
  readonly allowPartial: boolean;
}

// ============================================================================
// Core Type Validators
// ============================================================================

/**
 * Validate Ethereum address format
 * Ensures the address follows the standard 0x + 40 hex characters format
 * 
 * @param value - The value to validate as an Ethereum address
 * @param context - Validation context for error reporting and behavior control
 * @returns Validation result with the address as viem Address type if valid
 * 
 * @example
 * ```typescript
 * const result = validateAddress('0x1234567890123456789012345678901234567890');
 * if (result.success) {
 *   console.log('Valid address:', result.data);
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateAddress(value: unknown, context: ValidationContext = { path: '', strict: true, allowPartial: false }): RuntimeValidationResult<Address> {
  if (typeof value !== 'string') {
    return {
      success: false,
      errors: [`${context.path}: Expected string, got ${typeof value}`],
      warnings: []
    };
  }

  if (!value.startsWith('0x') || value.length !== 42) {
    return {
      success: false,
      errors: [`${context.path}: Invalid address format. Expected 0x followed by 40 hex characters`],
      warnings: []
    };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return {
      success: false,
      errors: [`${context.path}: Invalid address format. Contains non-hex characters`],
      warnings: []
    };
  }

  return {
    success: true,
    data: value as Address,
    errors: [],
    warnings: []
  };
}

/**
 * Validate blockchain chain ID
 * Ensures the chain ID is a positive integer and optionally checks against supported chains
 * 
 * @param value - The value to validate as a chain ID
 * @param context - Validation context for error reporting and behavior control
 * @returns Validation result with the chain ID as number if valid
 * 
 * @example
 * ```typescript
 * const result = validateChainId(8453); // Base chain
 * if (result.success) {
 *   console.log('Valid chain ID:', result.data);
 * }
 * 
 * // Strict mode checks against supported chains
 * const strictResult = validateChainId(999, { path: 'chainId', strict: true, allowPartial: false });
 * ```
 */
export function validateChainId(value: unknown, context: ValidationContext = { path: '', strict: true, allowPartial: false }): RuntimeValidationResult<number> {
  if (typeof value !== 'number') {
    return {
      success: false,
      errors: [`${context.path}: Expected number, got ${typeof value}`],
      warnings: []
    };
  }

  if (!Number.isInteger(value) || value <= 0) {
    return {
      success: false,
      errors: [`${context.path}: Chain ID must be a positive integer`],
      warnings: []
    };
  }

  const supportedChains = [1, 8453, 42161, 1301, 34443]; // Ethereum, Base, Arbitrum, Unichain, Monad
  if (context.strict && !supportedChains.includes(value)) {
    return {
      success: false,
      errors: [`${context.path}: Unsupported chain ID ${value}. Supported: ${supportedChains.join(', ')}`],
      warnings: []
    };
  }

  return {
    success: true,
    data: value,
    errors: [],
    warnings: []
  };
}

/**
 * Validate token name
 * Ensures the token name is a non-empty string within length limits
 * 
 * @param value - The value to validate as a token name
 * @param context - Validation context for error reporting and behavior control
 * @returns Validation result with the trimmed token name if valid
 * 
 * @example
 * ```typescript
 * const result = validateTokenName('My Awesome Token');
 * if (result.success) {
 *   console.log('Valid token name:', result.data);
 * }
 * ```
 */
export function validateTokenName(value: unknown, context: ValidationContext = { path: '', strict: true, allowPartial: false }): RuntimeValidationResult<string> {
  if (typeof value !== 'string') {
    return {
      success: false,
      errors: [`${context.path}: Expected string, got ${typeof value}`],
      warnings: []
    };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return {
      success: false,
      errors: [`${context.path}: Token name cannot be empty`],
      warnings: []
    };
  }

  if (trimmed.length > 100) {
    return {
      success: false,
      errors: [`${context.path}: Token name too long (max 100 characters)`],
      warnings: []
    };
  }

  const warnings: string[] = [];
  if (trimmed.length < 3) {
    warnings.push(`${context.path}: Token name is very short (${trimmed.length} characters)`);
  }

  return {
    success: true,
    data: trimmed,
    errors: [],
    warnings
  };
}

/**
 * Validate token symbol
 * Ensures the token symbol is a non-empty string with uppercase alphanumeric characters only
 * 
 * @param value - The value to validate as a token symbol
 * @param context - Validation context for error reporting and behavior control
 * @returns Validation result with the normalized (uppercase) token symbol if valid
 * 
 * @example
 * ```typescript
 * const result = validateTokenSymbol('mytoken');
 * if (result.success) {
 *   console.log('Valid token symbol:', result.data); // 'MYTOKEN'
 * }
 * ```
 */
export function validateTokenSymbol(value: unknown, context: ValidationContext = { path: '', strict: true, allowPartial: false }): RuntimeValidationResult<string> {
  if (typeof value !== 'string') {
    return {
      success: false,
      errors: [`${context.path}: Expected string, got ${typeof value}`],
      warnings: []
    };
  }

  const trimmed = value.trim().toUpperCase();
  if (trimmed.length === 0) {
    return {
      success: false,
      errors: [`${context.path}: Token symbol cannot be empty`],
      warnings: []
    };
  }

  if (trimmed.length > 20) {
    return {
      success: false,
      errors: [`${context.path}: Token symbol too long (max 20 characters)`],
      warnings: []
    };
  }

  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return {
      success: false,
      errors: [`${context.path}: Token symbol must contain only uppercase letters and numbers`],
      warnings: []
    };
  }

  const warnings: string[] = [];
  if (trimmed.length < 2) {
    warnings.push(`${context.path}: Token symbol is very short (${trimmed.length} characters)`);
  }

  return {
    success: true,
    data: trimmed,
    errors: [],
    warnings
  };
}

// ============================================================================
// Complex Type Validators
// ============================================================================

/**
 * Validate fee configuration
 */
export function validateFeeConfig(value: unknown, context: ValidationContext = { path: '', strict: true, allowPartial: false }): RuntimeValidationResult<FeeConfig> {
  if (!value || typeof value !== 'object') {
    return {
      success: false,
      errors: [`${context.path}: Expected object, got ${typeof value}`],
      warnings: []
    };
  }

  const config = value as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate type
  if (config.type !== 'static' && config.type !== 'dynamic') {
    errors.push(`${context.path}.type: Must be 'static' or 'dynamic'`);
    return { success: false, errors, warnings };
  }

  if (config.type === 'static') {
    // Validate static fee config
    const staticConfig: any = { type: 'static' };

    if (config.clankerFee !== undefined) {
      if (typeof config.clankerFee !== 'number' || config.clankerFee < 0 || config.clankerFee > 10000) {
        errors.push(`${context.path}.clankerFee: Must be a number between 0 and 10000 (basis points)`);
      } else {
        staticConfig.clankerFee = config.clankerFee;
      }
    }

    if (config.pairedFee !== undefined) {
      if (typeof config.pairedFee !== 'number' || config.pairedFee < 0 || config.pairedFee > 10000) {
        errors.push(`${context.path}.pairedFee: Must be a number between 0 and 10000 (basis points)`);
      } else {
        staticConfig.pairedFee = config.pairedFee;
      }
    }

    if (errors.length === 0) {
      return { success: true, data: staticConfig, errors: [], warnings };
    }
  } else {
    // Validate dynamic fee config
    const dynamicConfig: any = { type: 'dynamic' };
    
    // Add validation for dynamic fee fields
    const numericFields = [
      'startingSniperFee', 'endingSniperFee', 'baseFee', 'maxFee', 
      'clankerFee', 'referenceTickFilterPeriod', 'resetPeriod', 
      'resetTickFilter', 'feeControlNumerator', 'decayFilterBps', 'decayDuration'
    ];

    for (const field of numericFields) {
      if (config[field] !== undefined) {
        if (typeof config[field] !== 'number' || (config[field] as number) < 0) {
          errors.push(`${context.path}.${field}: Must be a non-negative number`);
        } else {
          dynamicConfig[field] = config[field];
        }
      }
    }

    if (errors.length === 0) {
      return { success: true, data: dynamicConfig, errors: [], warnings };
    }
  }

  return { success: false, errors, warnings };
}

/**
 * Validate reward recipient
 */
export function validateRewardRecipient(value: unknown, context: ValidationContext = { path: '', strict: true, allowPartial: false }): RuntimeValidationResult<RewardRecipient> {
  if (!value || typeof value !== 'object') {
    return {
      success: false,
      errors: [`${context.path}: Expected object, got ${typeof value}`],
      warnings: []
    };
  }

  const recipient = value as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate admin address
  const adminResult = validateAddress(recipient.admin, { ...context, path: `${context.path}.admin` });
  if (!adminResult.success) {
    errors.push(...adminResult.errors);
  }

  // Validate recipient address
  const recipientResult = validateAddress(recipient.recipient, { ...context, path: `${context.path}.recipient` });
  if (!recipientResult.success) {
    errors.push(...recipientResult.errors);
  }

  // Validate bps
  if (typeof recipient.bps !== 'number' || recipient.bps < 0 || recipient.bps > 10000) {
    errors.push(`${context.path}.bps: Must be a number between 0 and 10000 (basis points)`);
  }

  // Validate feePreference
  if (recipient.feePreference !== undefined) {
    const validPreferences = ['Both', 'Paired', 'Clanker'];
    if (!validPreferences.includes(recipient.feePreference as string)) {
      errors.push(`${context.path}.feePreference: Must be one of ${validPreferences.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  return {
    success: true,
    data: {
      admin: adminResult.data!,
      recipient: recipientResult.data!,
      bps: recipient.bps as number,
      feePreference: (recipient.feePreference as 'Both' | 'Paired' | 'Clanker') || 'Both'
    },
    errors: [],
    warnings
  };
}

/**
 * Validate vault configuration
 */
export function validateVaultConfig(value: unknown, context: ValidationContext = { path: '', strict: true, allowPartial: false }): RuntimeValidationResult<VaultConfig> {
  if (!value || typeof value !== 'object') {
    return {
      success: false,
      errors: [`${context.path}: Expected object, got ${typeof value}`],
      warnings: []
    };
  }

  const vault = value as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate percentage
  if (typeof vault.percentage !== 'number' || vault.percentage < 0 || vault.percentage > 90) {
    errors.push(`${context.path}.percentage: Must be a number between 0 and 90`);
  }

  // Validate lockupDuration
  if (typeof vault.lockupDuration !== 'number' || vault.lockupDuration < 604800) { // 7 days minimum
    errors.push(`${context.path}.lockupDuration: Must be at least 604800 seconds (7 days)`);
  }

  // Validate vestingDuration (optional)
  if (vault.vestingDuration !== undefined) {
    if (typeof vault.vestingDuration !== 'number' || vault.vestingDuration < 0) {
      errors.push(`${context.path}.vestingDuration: Must be a non-negative number`);
    }
  }

  // Validate recipient (optional)
  if (vault.recipient !== undefined) {
    const recipientResult = validateAddress(vault.recipient, { ...context, path: `${context.path}.recipient` });
    if (!recipientResult.success) {
      errors.push(...recipientResult.errors);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  return {
    success: true,
    data: {
      percentage: vault.percentage as number,
      lockupDuration: vault.lockupDuration as number,
      vestingDuration: vault.vestingDuration as number | undefined,
      recipient: vault.recipient as Address | undefined
    },
    errors: [],
    warnings
  };
}

// ============================================================================
// High-Level Configuration Validators
// ============================================================================

/**
 * Validate ClankerTokenV4 configuration
 */
export function validateClankerTokenV4(value: unknown, context: ValidationContext = { path: 'token', strict: true, allowPartial: false }): RuntimeValidationResult<ClankerTokenV4> {
  if (!value || typeof value !== 'object') {
    return {
      success: false,
      errors: [`${context.path}: Expected object, got ${typeof value}`],
      warnings: []
    };
  }

  const token = value as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];
  const result: Partial<ClankerTokenV4> = {};

  // Validate required fields
  const nameResult = validateTokenName(token.name, { ...context, path: `${context.path}.name` });
  if (!nameResult.success) {
    errors.push(...nameResult.errors);
  } else {
    result.name = nameResult.data!;
    warnings.push(...nameResult.warnings);
  }

  const symbolResult = validateTokenSymbol(token.symbol, { ...context, path: `${context.path}.symbol` });
  if (!symbolResult.success) {
    errors.push(...symbolResult.errors);
  } else {
    result.symbol = symbolResult.data!;
    warnings.push(...symbolResult.warnings);
  }

  const adminResult = validateAddress(token.tokenAdmin, { ...context, path: `${context.path}.tokenAdmin` });
  if (!adminResult.success) {
    errors.push(...adminResult.errors);
  } else {
    result.tokenAdmin = adminResult.data!;
  }

  const chainResult = validateChainId(token.chainId, { ...context, path: `${context.path}.chainId` });
  if (!chainResult.success) {
    errors.push(...chainResult.errors);
  } else {
    result.chainId = chainResult.data!;
  }

  // Validate optional fields
  if (token.image !== undefined) {
    if (typeof token.image !== 'string') {
      errors.push(`${context.path}.image: Expected string, got ${typeof token.image}`);
    } else {
      result.image = token.image;
    }
  }

  if (token.fees !== undefined) {
    const feesResult = validateFeeConfig(token.fees, { ...context, path: `${context.path}.fees` });
    if (!feesResult.success) {
      errors.push(...feesResult.errors);
    } else {
      result.fees = feesResult.data!;
    }
  }

  if (token.vault !== undefined) {
    const vaultResult = validateVaultConfig(token.vault, { ...context, path: `${context.path}.vault` });
    if (!vaultResult.success) {
      errors.push(...vaultResult.errors);
    } else {
      result.vault = vaultResult.data!;
    }
  }

  if (token.rewards !== undefined && typeof token.rewards === 'object') {
    const rewards = token.rewards as Record<string, unknown>;
    if (Array.isArray(rewards.recipients)) {
      const validatedRecipients: RewardRecipient[] = [];
      for (let i = 0; i < rewards.recipients.length; i++) {
        const recipientResult = validateRewardRecipient(
          rewards.recipients[i], 
          { ...context, path: `${context.path}.rewards.recipients[${i}]` }
        );
        if (!recipientResult.success) {
          errors.push(...recipientResult.errors);
        } else {
          validatedRecipients.push(recipientResult.data!);
        }
      }
      if (validatedRecipients.length > 0) {
        result.rewards = { recipients: validatedRecipients };
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  return {
    success: true,
    data: result as ClankerTokenV4,
    errors: [],
    warnings
  };
}

/**
 * Validate SimpleDeployConfiguration
 */
export function validateSimpleDeployConfiguration(value: unknown, context: ValidationContext = { path: 'config', strict: true, allowPartial: false }): RuntimeValidationResult<SimpleDeployConfiguration> {
  // SimpleDeployConfiguration extends ClankerTokenV4, so validate as such
  const tokenResult = validateClankerTokenV4(value, context);
  
  if (!tokenResult.success) {
    return tokenResult;
  }

  // Additional validation for SimpleDeployConfiguration
  const config = value as Record<string, unknown>;
  const errors: string[] = [];

  // Ensure chainId is present (required for SimpleDeployConfiguration)
  if (!config.chainId) {
    errors.push(`${context.path}.chainId: Required for SimpleDeployConfiguration`);
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings: tokenResult.warnings };
  }

  return {
    success: true,
    data: tokenResult.data as SimpleDeployConfiguration,
    errors: [],
    warnings: tokenResult.warnings
  };
}

/**
 * Validate BatchDeploymentOptions
 */
export function validateBatchDeploymentOptions(value: unknown, context: ValidationContext = { path: 'options', strict: true, allowPartial: false }): RuntimeValidationResult<BatchDeploymentOptions> {
  if (!value || typeof value !== 'object') {
    return {
      success: false,
      errors: [`${context.path}: Expected object, got ${typeof value}`],
      warnings: []
    };
  }

  const options = value as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];
  const result: Partial<{
    concurrency?: number;
    delay?: number;
    retries?: number;
    adaptiveConcurrency?: boolean;
    stopOnError?: boolean;
    onProgress?: (completed: number, total: number) => void;
    onError?: (index: number, error: Error, config: any) => void;
    onSuccess?: (index: number, result: any, config: any) => void;
  }> = {};

  // Validate optional numeric fields
  const numericFields = ['concurrency', 'delay', 'retries'] as const;
  for (const field of numericFields) {
    if (options[field] !== undefined) {
      if (typeof options[field] !== 'number' || (options[field] as number) < 0) {
        errors.push(`${context.path}.${field}: Must be a non-negative number`);
      } else {
        result[field] = options[field] as number;
      }
    }
  }

  // Validate boolean fields
  const booleanFields = ['adaptiveConcurrency', 'stopOnError'] as const;
  for (const field of booleanFields) {
    if (options[field] !== undefined) {
      if (typeof options[field] !== 'boolean') {
        errors.push(`${context.path}.${field}: Must be a boolean`);
      } else {
        result[field] = options[field] as boolean;
      }
    }
  }

  // Validate callback functions
  const callbackFields = ['onProgress', 'onError', 'onSuccess'] as const;
  for (const field of callbackFields) {
    if (options[field] !== undefined) {
      if (typeof options[field] !== 'function') {
        errors.push(`${context.path}.${field}: Must be a function`);
      } else {
        result[field] = options[field] as any;
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  return {
    success: true,
    data: result as BatchDeploymentOptions,
    errors: [],
    warnings
  };
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Combine multiple validation results into a single result
 * Useful for validating multiple related values and collecting all errors
 * 
 * @template T The type of data in each validation result
 * @param results - Array of validation results to combine
 * @returns Combined validation result with all data, errors, and warnings
 * 
 * @example
 * ```typescript
 * const nameResult = validateTokenName('MyToken');
 * const symbolResult = validateTokenSymbol('MTK');
 * const combined = combineValidationResults(nameResult, symbolResult);
 * 
 * if (combined.success) {
 *   console.log('All valid:', combined.data); // ['MyToken', 'MTK']
 * } else {
 *   console.error('Validation errors:', combined.errors);
 * }
 * ```
 */
export function combineValidationResults<T>(...results: RuntimeValidationResult<T>[]): RuntimeValidationResult<T[]> {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const validData: T[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    if (result.success && result.data !== undefined) {
      validData.push(result.data);
    }
  }

  return {
    success: allErrors.length === 0,
    data: allErrors.length === 0 ? validData : undefined,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Create validation context with specified path and options
 * Helper function to create properly typed validation context objects
 * 
 * @param path - The path or field name being validated (for error messages)
 * @param strict - Whether to perform strict validation (default: true)
 * @param allowPartial - Whether to allow partial validation (default: false)
 * @returns Validation context object
 * 
 * @example
 * ```typescript
 * const context = createValidationContext('user.email', true, false);
 * const result = validateAddress(emailValue, context);
 * ```
 */
export function createValidationContext(path: string, strict: boolean = true, allowPartial: boolean = false): ValidationContext {
  return { path, strict, allowPartial };
}

/**
 * Validate array of items using a provided validator function
 * Applies the same validation logic to each item in an array
 * 
 * @template T The type of validated items
 * @param value - The value to validate as an array
 * @param itemValidator - Function to validate each array item
 * @param context - Validation context for error reporting
 * @returns Validation result with array of validated items if successful
 * 
 * @example
 * ```typescript
 * const addresses = ['0x123...', '0x456...'];
 * const result = validateArray(
 *   addresses,
 *   (item, ctx) => validateAddress(item, ctx),
 *   createValidationContext('addresses')
 * );
 * ```
 */
export function validateArray<T>(
  value: unknown,
  itemValidator: (item: unknown, context: ValidationContext) => RuntimeValidationResult<T>,
  context: ValidationContext = { path: '', strict: true, allowPartial: false }
): RuntimeValidationResult<T[]> {
  if (!Array.isArray(value)) {
    return {
      success: false,
      errors: [`${context.path}: Expected array, got ${typeof value}`],
      warnings: []
    };
  }

  const results = value.map((item, index) => 
    itemValidator(item, { ...context, path: `${context.path}[${index}]` })
  );

  return combineValidationResults(...results);
}