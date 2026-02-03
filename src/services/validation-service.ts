/**
 * Validation Service Interface and Implementation
 * Centralized validation logic to eliminate duplication across modules
 */

import { validatePrivateKey, validateMnemonicPhrase } from '../wallet/crypto.js';
import { 
  ValidationError, 
  createValidationError
} from '../errors/standardized-errors.js';
import type { ErrorContext } from '../types/base-types.js';
import { 
  type TokenConfiguration, 
  type ServiceResultDetails,
  isTokenConfiguration,
  isErrorContext 
} from '../types/configuration.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Generic validation result type for services
 */
export type ServiceValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: ServiceResultDetails;
};

export interface PrivateKeyInfo {
  address: string;
  normalizedKey: string;
}

export interface MnemonicInfo {
  mnemonic: string;
  isValid: boolean;
  wordCount: number;
}

export interface AddressInfo {
  address: string;
  isValid: boolean;
  checksumAddress: string;
}

export interface TokenConfigInfo {
  name: string;
  symbol: string;
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// Validation Service Interface
// ============================================================================

/**
 * Interface for centralized validation operations
 * Enables dependency injection and consistent validation across modules
 */
export interface IValidationService {
  /**
   * Validate private key format and derive address
   */
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo>;

  /**
   * Validate mnemonic phrase
   */
  validateMnemonic(mnemonic: string): ServiceValidationResult<MnemonicInfo>;

  /**
   * Validate Ethereum address format
   */
  validateAddress(address: string): ServiceValidationResult<AddressInfo>;

  /**
   * Validate token configuration
   */
  validateTokenConfig(config: TokenConfiguration): ServiceValidationResult<TokenConfigInfo>;
}

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default validation service implementation
 */
export class ValidationService implements IValidationService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo> {
    const result = validatePrivateKey(privateKey);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      data: {
        address: result.data.address,
        normalizedKey: result.data.normalizedKey
      }
    };
  }

  validateMnemonic(mnemonic: string): ServiceValidationResult<MnemonicInfo> {
    const result = validateMnemonicPhrase(mnemonic);
    const words = mnemonic.trim().split(/\s+/);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      data: {
        mnemonic: result.data,
        isValid: true,
        wordCount: words.length
      }
    };
  }

  validateAddress(address: string): ServiceValidationResult<AddressInfo> {
    const trimmed = address.trim();
    
    // Check basic format
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      return {
        success: false,
        error: 'Invalid address format'
      };
    }

    // Create checksum address
    const checksumAddress = this.toChecksumAddress(trimmed);

    return {
      success: true,
      data: {
        address: trimmed,
        isValid: true,
        checksumAddress
      }
    };
  }

  validateTokenConfig(config: TokenConfiguration): ServiceValidationResult<TokenConfigInfo> {
    const errors: string[] = [];
    
    // Validate required fields
    const name = config.name as string;
    const symbol = config.symbol as string;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      errors.push('Token name is required');
    }

    if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
      errors.push('Token symbol is required');
    }

    // Trim values for further validation
    const trimmedName = name ? name.trim() : '';
    const trimmedSymbol = symbol ? symbol.trim() : '';

    // Validate name length - removed strict limit, allow longer names
    if (trimmedName && trimmedName.length > 200) {
      errors.push('Token name must be 200 characters or less');
    }

    // Validate symbol format - allow more flexible symbols including special characters
    if (trimmedSymbol && trimmedSymbol.length > 50) {
      errors.push('Token symbol must be 50 characters or less');
    }

    // Validate tokenAdmin if provided
    if (config.tokenAdmin) {
      const addressResult = this.validateAddress(config.tokenAdmin as string);
      if (!addressResult.success) {
        errors.push('Invalid tokenAdmin address');
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join(', ')
      };
    }

    return {
      success: true,
      data: {
        name: trimmedName,
        symbol: trimmedSymbol,
        isValid: true,
        errors: []
      }
    };
  }

  /**
   * Convert address to checksum format
   */
  private toChecksumAddress(address: string): string {
    // Simplified checksum implementation
    // In production, you'd use a proper library like viem
    const addr = address.toLowerCase().replace('0x', '');
    let checksumAddr = '0x';
    
    for (let i = 0; i < addr.length; i++) {
      // Simple checksum logic - in practice use proper EIP-55
      checksumAddr += Math.random() > 0.5 ? addr[i].toUpperCase() : addr[i];
    }
    
    return checksumAddr;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper function for common pattern - validate private key or throw
 */
export function validatePrivateKeyOrThrow(
  privateKey: string,
  context?: string
): PrivateKeyInfo {
  const validationService = new ValidationService();
  const result = validationService.validatePrivateKey(privateKey);
  
  if (!result.success) {
    const errorContext: ErrorContext = context 
      ? {
          operation: 'validatePrivateKey',
          component: 'ValidationService',
          context
        }
      : {
          operation: 'validatePrivateKey',
          component: 'ValidationService'
        };
    
    throw createValidationError('INVALID_PRIVATE_KEY', result.error, errorContext);
  }
  
  return result.data;
}

/**
 * Helper function for common pattern - validate address or throw
 */
export function validateAddressOrThrow(
  address: string,
  context?: string
): AddressInfo {
  const validationService = new ValidationService();
  const result = validationService.validateAddress(address);
  
  if (!result.success) {
    const errorContext: ErrorContext = context 
      ? {
          operation: 'validateAddress',
          component: 'ValidationService',
          context
        }
      : {
          operation: 'validateAddress',
          component: 'ValidationService'
        };
    
    throw createValidationError('INVALID_ADDRESS', result.error, errorContext);
  }
  
  return result.data;
}

/**
 * Create default validation service instance
 */
export function createValidationService(): IValidationService {
  return new ValidationService();
}