/**
 * Unit tests for validation functionality
 * 
 * These tests verify specific examples and edge cases for the validation
 * functions in the simplified batch deployment system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateTokenName,
  validateTokenSymbol,
  validateInitialSupply,
  validateTokenConfig,
  findDuplicates,
  isValidAddress
} from '../../../src/simplified-batch/utils/index.js';
import { ConfigurationValidator } from '../../../src/simplified-batch/validation/index.js';
import { TOKEN_LIMITS, ERROR_CODES } from '../../../src/simplified-batch/constants/index.js';
import { SAMPLE_TOKEN_CONFIGS, INVALID_TOKEN_CONFIGS } from '../setup.js';
import type { TokenConfig } from '../../../src/simplified-batch/types/core.js';

describe('Simplified Batch Deployment - Validation Unit Tests', () => {

  // ============================================================================
  // Token Name Validation Tests
  // ============================================================================

  describe('validateTokenName', () => {
    it('should accept valid token names', () => {
      const validNames = [
        'Bitcoin',
        'Ethereum Token',
        'My Awesome Token',
        'A',
        'X'.repeat(TOKEN_LIMITS.MAX_NAME_LENGTH)
      ];

      validNames.forEach(name => {
        const result = validateTokenName(name);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.data).toBe(name.trim());
      });
    });

    it('should reject empty or whitespace-only names', () => {
      const invalidNames = ['', '   ', '\t', '\n'];

      invalidNames.forEach(name => {
        const result = validateTokenName(name);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('name');
        expect(result.errors[0].code).toBe(ERROR_CODES.E001);
      });
    });

    it('should reject names that are too long', () => {
      const longName = 'X'.repeat(TOKEN_LIMITS.MAX_NAME_LENGTH + 1);
      const result = validateTokenName(longName);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].code).toBe(ERROR_CODES.E001);
      expect(result.errors[0].suggestion).toBe(longName.substring(0, TOKEN_LIMITS.MAX_NAME_LENGTH));
    });

    it('should trim whitespace from valid names', () => {
      const nameWithWhitespace = '  Valid Token Name  ';
      const result = validateTokenName(nameWithWhitespace);
      
      expect(result.valid).toBe(true);
      expect(result.data).toBe('Valid Token Name');
    });

    it('should handle non-string inputs', () => {
      const invalidInputs = [null, undefined, 123, {}, []];

      invalidInputs.forEach(input => {
        const result = validateTokenName(input as any);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('name');
      });
    });
  });

  // ============================================================================
  // Token Symbol Validation Tests
  // ============================================================================

  describe('validateTokenSymbol', () => {
    it('should accept valid token symbols', () => {
      const validSymbols = [
        'BTC',
        'ETH',
        'USDC',
        'TOKEN123',
        'A',
        'X'.repeat(TOKEN_LIMITS.MAX_SYMBOL_LENGTH)
      ];

      validSymbols.forEach(symbol => {
        const result = validateTokenSymbol(symbol);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.data).toBe(symbol.toUpperCase());
      });
    });

    it('should normalize symbols to uppercase', () => {
      const mixedCaseSymbol = 'btc';
      const result = validateTokenSymbol(mixedCaseSymbol);
      
      expect(result.valid).toBe(true);
      expect(result.data).toBe('BTC');
    });

    it('should reject symbols with special characters', () => {
      const invalidSymbols = ['BTC!', 'ETH@', 'USD$', 'TOKEN-1', 'SYM BOL'];

      invalidSymbols.forEach(symbol => {
        const result = validateTokenSymbol(symbol);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('symbol');
        expect(result.errors[0].code).toBe(ERROR_CODES.E002);
      });
    });

    it('should reject empty symbols', () => {
      const result = validateTokenSymbol('');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('symbol');
    });

    it('should reject symbols that are too long', () => {
      const longSymbol = 'X'.repeat(TOKEN_LIMITS.MAX_SYMBOL_LENGTH + 1);
      const result = validateTokenSymbol(longSymbol);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].suggestion).toBe(longSymbol.substring(0, TOKEN_LIMITS.MAX_SYMBOL_LENGTH));
    });
  });

  // ============================================================================
  // Initial Supply Validation Tests
  // ============================================================================

  describe('validateInitialSupply', () => {
    it('should accept valid supply values', () => {
      const validSupplies = [
        '1',
        '1000',
        '1000000',
        '1000000.5',
        TOKEN_LIMITS.MAX_INITIAL_SUPPLY
      ];

      validSupplies.forEach(supply => {
        const result = validateInitialSupply(supply);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.data).toBe(supply.trim());
      });
    });

    it('should reject non-numeric values', () => {
      const invalidSupplies = ['abc', '1000abc', '', 'not-a-number'];

      invalidSupplies.forEach(supply => {
        const result = validateInitialSupply(supply);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('initialSupply');
        expect(result.errors[0].code).toBe(ERROR_CODES.E003);
      });
    });

    it('should reject values below minimum', () => {
      const result = validateInitialSupply('0');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].suggestion).toBe(TOKEN_LIMITS.MIN_INITIAL_SUPPLY);
    });

    it('should reject values above maximum', () => {
      const tooLarge = (BigInt(TOKEN_LIMITS.MAX_INITIAL_SUPPLY) + BigInt(1)).toString();
      const result = validateInitialSupply(tooLarge);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].suggestion).toBe(TOKEN_LIMITS.MAX_INITIAL_SUPPLY);
    });

    it('should handle decimal values', () => {
      const decimalSupply = '1000.5';
      const result = validateInitialSupply(decimalSupply);
      
      expect(result.valid).toBe(true);
      expect(result.data).toBe(decimalSupply);
    });
  });

  // ============================================================================
  // Token Config Validation Tests
  // ============================================================================

  describe('validateTokenConfig', () => {
    it('should validate complete token configurations', () => {
      SAMPLE_TOKEN_CONFIGS.forEach(config => {
        const result = validateTokenConfig(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.data).toBeDefined();
      });
    });

    it('should reject invalid token configurations', () => {
      INVALID_TOKEN_CONFIGS.forEach(config => {
        const result = validateTokenConfig(config as TokenConfig);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should provide default decimals when not specified', () => {
      const config: TokenConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        initialSupply: '1000000'
      };

      const result = validateTokenConfig(config);
      expect(result.valid).toBe(true);
      expect(result.data).toMatchObject({
        decimals: TOKEN_LIMITS.DEFAULT_DECIMALS
      });
    });

    it('should validate decimals when provided', () => {
      const invalidDecimalsConfigs = [
        { name: 'Test', symbol: 'TEST', initialSupply: '1000', decimals: -1 },
        { name: 'Test', symbol: 'TEST', initialSupply: '1000', decimals: 19 },
        { name: 'Test', symbol: 'TEST', initialSupply: '1000', decimals: 1.5 }
      ];

      invalidDecimalsConfigs.forEach(config => {
        const result = validateTokenConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === 'decimals')).toBe(true);
      });
    });

    it('should accumulate all validation errors', () => {
      const invalidConfig: TokenConfig = {
        name: '', // Invalid
        symbol: 'invalid!', // Invalid
        initialSupply: '0', // Invalid
        decimals: -1 // Invalid
      };

      const result = validateTokenConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('symbol');
      expect(errorFields).toContain('initialSupply');
      expect(errorFields).toContain('decimals');
    });
  });

  // ============================================================================
  // Duplicate Detection Tests
  // ============================================================================

  describe('findDuplicates', () => {
    it('should find duplicate names', () => {
      const configs = [
        { name: 'Token A', symbol: 'TOKA', initialSupply: '1000' },
        { name: 'Token B', symbol: 'TOKB', initialSupply: '2000' },
        { name: 'Token A', symbol: 'TOKC', initialSupply: '3000' } // Duplicate name
      ];

      const duplicates = findDuplicates(configs, config => config.name.toLowerCase());
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].value).toBe('token a');
      expect(duplicates[0].indices).toEqual([0, 2]);
    });

    it('should find duplicate symbols', () => {
      const configs = [
        { name: 'Token A', symbol: 'TOK', initialSupply: '1000' },
        { name: 'Token B', symbol: 'TOKB', initialSupply: '2000' },
        { name: 'Token C', symbol: 'TOK', initialSupply: '3000' } // Duplicate symbol
      ];

      const duplicates = findDuplicates(configs, config => config.symbol.toUpperCase());
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].value).toBe('TOK');
      expect(duplicates[0].indices).toEqual([0, 2]);
    });

    it('should handle multiple duplicates', () => {
      const configs = [
        { name: 'Token A', symbol: 'TOKA', initialSupply: '1000' },
        { name: 'Token A', symbol: 'TOKA', initialSupply: '2000' }, // Duplicate both
        { name: 'Token B', symbol: 'TOKB', initialSupply: '3000' },
        { name: 'Token B', symbol: 'TOKC', initialSupply: '4000' } // Duplicate name only
      ];

      const nameDuplicates = findDuplicates(configs, config => config.name.toLowerCase());
      const symbolDuplicates = findDuplicates(configs, config => config.symbol.toUpperCase());
      
      expect(nameDuplicates).toHaveLength(2); // 'token a' and 'token b'
      expect(symbolDuplicates).toHaveLength(1); // 'TOKA'
    });

    it('should return empty array when no duplicates exist', () => {
      const configs = [
        { name: 'Token A', symbol: 'TOKA', initialSupply: '1000' },
        { name: 'Token B', symbol: 'TOKB', initialSupply: '2000' },
        { name: 'Token C', symbol: 'TOKC', initialSupply: '3000' }
      ];

      const nameDuplicates = findDuplicates(configs, config => config.name.toLowerCase());
      const symbolDuplicates = findDuplicates(configs, config => config.symbol.toUpperCase());
      
      expect(nameDuplicates).toHaveLength(0);
      expect(symbolDuplicates).toHaveLength(0);
    });
  });

  // ============================================================================
  // Address Validation Tests
  // ============================================================================

  describe('isValidAddress', () => {
    it('should accept valid Ethereum addresses', () => {
      const validAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefABCDEF1234567890123456789012345678',
        '0x0000000000000000000000000000000000000000'
      ];

      validAddresses.forEach(address => {
        expect(isValidAddress(address)).toBe(true);
      });
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        '1234567890123456789012345678901234567890', // Missing 0x
        '0x123456789012345678901234567890123456789', // Too short
        '0x12345678901234567890123456789012345678901', // Too long
        '0x123456789012345678901234567890123456789g', // Invalid character
        '0x', // Just prefix
        '', // Empty
        'not-an-address'
      ];

      invalidAddresses.forEach(address => {
        expect(isValidAddress(address)).toBe(false);
      });
    });
  });

  // ============================================================================
  // ConfigurationValidator Class Tests
  // ============================================================================

  describe('ConfigurationValidator', () => {
    let validator: ConfigurationValidator;

    beforeEach(() => {
      validator = new ConfigurationValidator();
    });

    it('should validate individual token configurations', () => {
      SAMPLE_TOKEN_CONFIGS.forEach(config => {
        const result = validator.validateTokenConfig(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should validate batch configurations without duplicates', () => {
      const result = validator.validateBatchConfig(SAMPLE_TOKEN_CONFIGS);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate names in batch', () => {
      const configsWithDuplicateNames = [
        { name: 'Token A', symbol: 'TOKA', initialSupply: '1000' },
        { name: 'Token A', symbol: 'TOKB', initialSupply: '2000' }
      ];

      const result = validator.validateBatchConfig(configsWithDuplicateNames as TokenConfig[]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.E004)).toBe(true);
    });

    it('should detect duplicate symbols in batch', () => {
      const configsWithDuplicateSymbols = [
        { name: 'Token A', symbol: 'TOK', initialSupply: '1000' },
        { name: 'Token B', symbol: 'TOK', initialSupply: '2000' }
      ];

      const result = validator.validateBatchConfig(configsWithDuplicateSymbols as TokenConfig[]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.E005)).toBe(true);
    });

    it('should validate individual fields with real-time feedback', () => {
      // Test valid fields
      expect(validator.validateField('name', 'Valid Token').valid).toBe(true);
      expect(validator.validateField('symbol', 'VALID').valid).toBe(true);
      expect(validator.validateField('initialSupply', '1000000').valid).toBe(true);

      // Test invalid fields
      expect(validator.validateField('name', '').valid).toBe(false);
      expect(validator.validateField('symbol', 'invalid!').valid).toBe(false);
      expect(validator.validateField('initialSupply', '0').valid).toBe(false);
    });

    it('should validate advanced configuration options', () => {
      const validAdvanced = {
        mintable: true,
        burnable: false,
        customGasLimit: 3000000
      };

      const result = validator.validateAdvancedConfig(validAdvanced);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid advanced configuration options', () => {
      const invalidAdvanced = {
        customGasLimit: 10000, // Too low
        tokenAdmin: 'invalid-address' as `0x${string}` // Invalid address format
      };

      const result = validator.validateAdvancedConfig(invalidAdvanced);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check duplicates correctly', () => {
      const configs = [
        { name: 'Token A', symbol: 'TOKA', initialSupply: '1000' },
        { name: 'Token B', symbol: 'TOKB', initialSupply: '2000' },
        { name: 'Token A', symbol: 'TOKC', initialSupply: '3000' }
      ];

      const result = validator.checkDuplicates(configs as TokenConfig[]);
      expect(result.hasDuplicates).toBe(true);
      expect(result.nameConflicts).toHaveLength(1);
      expect(result.nameConflicts[0].value).toBe('token a');
      expect(result.nameConflicts[0].indices).toEqual([0, 2]);
    });

    it('should validate supply range correctly', () => {
      expect(validator.validateSupplyRange('1000000').valid).toBe(true);
      expect(validator.validateSupplyRange('0').valid).toBe(false);
      expect(validator.validateSupplyRange('abc').valid).toBe(false);
    });

    it('should reject batch sizes exceeding maximum limit', () => {
      const largeBatch = Array(TOKEN_LIMITS.MAX_BATCH_SIZE + 1).fill({
        name: 'Token',
        symbol: 'TOK',
        initialSupply: '1000'
      }).map((config, index) => ({
        ...config,
        name: `Token ${index}`,
        symbol: `TOK${index}`
      }));

      const result = validator.validateBatchConfig(largeBatch as TokenConfig[]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'configs')).toBe(true);
    });

  });

});