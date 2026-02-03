/**
 * Configuration Validator
 * Provides detailed validation logic for different configuration scenarios
 */

import type { 
  ClankerSDKConfig, 
  ConfigValidationResult, 
  ConfigValidationOptions,
  OperationMethod 
} from '../types/config-types.js';
import type { ClankerAPIConfig } from '../types/api-types.js';

// ============================================================================
// Validation Rules
// ============================================================================

interface ValidationRule {
  name: string;
  validate: (config: ClankerSDKConfig, options: ConfigValidationOptions) => ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Core Validation Rules
// ============================================================================

const API_KEY_RULE: ValidationRule = {
  name: 'api-key',
  validate: (config, options) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.api?.apiKey) {
      // Check API key format
      if (typeof config.api.apiKey !== 'string') {
        errors.push('API key must be a string');
      } else if (config.api.apiKey.length < 16) {
        errors.push('API key is too short (minimum 16 characters)');
      } else if (config.api.apiKey.length < 32) {
        warnings.push('API key appears short (recommended 32+ characters)');
      }

      // Check for common mistakes
      if (config.api.apiKey.includes(' ')) {
        errors.push('API key should not contain spaces');
      }

      if (config.api.apiKey.startsWith('sk_') || config.api.apiKey.startsWith('pk_')) {
        warnings.push('API key format looks like a different service (expected Clanker API key)');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
};

const BASE_URL_RULE: ValidationRule = {
  name: 'base-url',
  validate: (config, options) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.api?.baseUrl) {
      try {
        const url = new URL(config.api.baseUrl);
        
        // Check protocol
        if (url.protocol !== 'https:') {
          warnings.push('Base URL should use HTTPS for security');
        }

        // Check if it looks like the correct API
        if (!url.hostname.includes('clanker')) {
          warnings.push('Base URL does not appear to be a Clanker API endpoint');
        }

      } catch (error) {
        errors.push(`Invalid base URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
};

const TIMEOUT_RULE: ValidationRule = {
  name: 'timeout',
  validate: (config, options) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.api?.timeout !== undefined) {
      if (typeof config.api.timeout !== 'number' || config.api.timeout <= 0) {
        errors.push('Timeout must be a positive number');
      } else if (config.api.timeout < 5000) {
        warnings.push('Timeout is very low (< 5 seconds) - may cause failures');
      } else if (config.api.timeout > 300000) {
        warnings.push('Timeout is very high (> 5 minutes) - may cause long waits');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
};

const RETRIES_RULE: ValidationRule = {
  name: 'retries',
  validate: (config, options) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.api?.retries !== undefined) {
      if (typeof config.api.retries !== 'number' || config.api.retries < 0) {
        errors.push('Retries must be a non-negative number');
      } else if (config.api.retries > 10) {
        warnings.push('High retry count may cause very long delays on failures');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
};

const WALLET_RULE: ValidationRule = {
  name: 'wallet',
  validate: (config, options) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.wallet) {
      // Check if wallet has required properties
      if (!config.wallet.account) {
        errors.push('Wallet must have an account');
      }

      if (!config.wallet.chain) {
        warnings.push('Wallet chain not specified - may cause issues');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
};

const PUBLIC_CLIENT_RULE: ValidationRule = {
  name: 'public-client',
  validate: (config, options) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.publicClient) {
      if (!config.publicClient.chain) {
        warnings.push('Public client chain not specified - may cause issues');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
};

const CHAIN_COMPATIBILITY_RULE: ValidationRule = {
  name: 'chain-compatibility',
  validate: (config, options) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.wallet && config.publicClient) {
      const walletChainId = config.wallet.chain?.id;
      const publicChainId = config.publicClient.chain?.id;

      if (walletChainId && publicChainId && walletChainId !== publicChainId) {
        errors.push(`Chain mismatch: wallet chain ${walletChainId} != public client chain ${publicChainId}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
};

// ============================================================================
// Validation Rule Sets
// ============================================================================

const API_RULES: ValidationRule[] = [
  API_KEY_RULE,
  BASE_URL_RULE,
  TIMEOUT_RULE,
  RETRIES_RULE,
];

const DIRECT_RULES: ValidationRule[] = [
  WALLET_RULE,
  PUBLIC_CLIENT_RULE,
  CHAIN_COMPATIBILITY_RULE,
];

const ALL_RULES: ValidationRule[] = [
  ...API_RULES,
  ...DIRECT_RULES,
];

// ============================================================================
// Validator Class
// ============================================================================

export class ConfigValidator {
  /**
   * Validate configuration for specific operation method
   */
  static validateForMethod(
    config: ClankerSDKConfig,
    method: OperationMethod,
    options: ConfigValidationOptions = {}
  ): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Select appropriate rules based on method
    let rules: ValidationRule[];
    switch (method) {
      case 'api':
        rules = API_RULES;
        // Ensure API config exists
        if (!config.api) {
          errors.push('API configuration is required for API method');
        }
        break;
      case 'direct':
        rules = DIRECT_RULES;
        // Ensure direct config exists
        if (!config.wallet || !config.publicClient) {
          errors.push('Wallet and public client are required for direct method');
        }
        break;
      case 'auto':
        rules = ALL_RULES;
        // Ensure at least one method is available
        const hasAPI = !!(config.api?.apiKey);
        const hasDirect = !!(config.wallet && config.publicClient);
        if (!hasAPI && !hasDirect) {
          errors.push('Auto method requires either API configuration or direct contract configuration');
        }
        break;
      default:
        errors.push(`Unknown operation method: ${method}`);
        rules = [];
    }

    // Run validation rules
    for (const rule of rules) {
      const result = rule.validate(config, options);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      method,
    };
  }

  /**
   * Validate API configuration specifically
   */
  static validateAPIConfig(
    apiConfig: ClankerAPIConfig,
    options: ConfigValidationOptions = {}
  ): ValidationResult {
    const config: ClankerSDKConfig = { api: apiConfig };
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of API_RULES) {
      const result = rule.validate(config, options);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Get validation summary for configuration
   */
  static getValidationSummary(config: ClankerSDKConfig): {
    hasAPI: boolean;
    hasDirect: boolean;
    recommendedMethod: OperationMethod;
    issues: string[];
  } {
    const hasAPI = !!(config.api?.apiKey);
    const hasDirect = !!(config.wallet && config.publicClient);
    const issues: string[] = [];

    // Determine recommended method
    let recommendedMethod: OperationMethod;
    if (hasAPI && hasDirect) {
      recommendedMethod = 'auto';
    } else if (hasAPI) {
      recommendedMethod = 'api';
    } else if (hasDirect) {
      recommendedMethod = 'direct';
    } else {
      recommendedMethod = 'direct'; // Default
      issues.push('No valid configuration found - please configure API or direct method');
    }

    // Check for common issues
    if (config.operationMethod === 'api' && !hasAPI) {
      issues.push('Operation method set to API but no API configuration provided');
    }

    if (config.operationMethod === 'direct' && !hasDirect) {
      issues.push('Operation method set to direct but wallet/publicClient not configured');
    }

    return {
      hasAPI,
      hasDirect,
      recommendedMethod,
      issues,
    };
  }
}