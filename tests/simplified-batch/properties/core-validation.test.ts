/**
 * Property-based tests for core validation functionality
 * 
 * These tests verify the correctness properties defined in the design document
 * using property-based testing with fast-check.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateTokenName,
  validateTokenSymbol,
  validateInitialSupply,
  validateTokenConfig,
  findDuplicates,
  calculateGasWithBuffer,
  calculateRetryDelay,
  formatWeiToEth,
  formatEthToWei,
  isValidAddress
} from '../../../src/simplified-batch/utils/index.js';
import {
  tokenNameArbitrary,
  tokenSymbolArbitrary,
  initialSupplyArbitrary,
  tokenConfigArbitrary,
  uniqueTokenConfigsArbitrary,
  weiAmountArbitrary,
  gasLimitArbitrary,
  createValidationPropertyTest,
  PROPERTY_TEST_CONFIG
} from '../setup.js';
import { TOKEN_LIMITS, GAS_CONFIG } from '../../../src/simplified-batch/constants/index.js';
import type { TokenConfig } from '../../../src/simplified-batch/types/core.js';

describe('Simplified Batch Deployment - Core Validation Properties', () => {
  
  // ============================================================================
  // Property 2: Essential field validation
  // ============================================================================
  
  it('Property 2: Essential field validation - valid configs with only name, symbol, and initial supply should pass validation', () => {
    /**
     * **Validates: Requirements 1.2**
     * For any token configuration, validation should succeed when only name, symbol, and initial supply are provided
     */
    fc.assert(fc.property(
      tokenNameArbitrary,
      tokenSymbolArbitrary,
      initialSupplyArbitrary,
      (name, symbol, initialSupply) => {
        const config: TokenConfig = { name, symbol, initialSupply };
        const result = validateTokenConfig(config);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.data).toBeDefined();
        expect(result.data).toMatchObject({
          name: name.trim(),
          symbol: symbol.toUpperCase(),
          initialSupply: initialSupply.trim(),
          decimals: TOKEN_LIMITS.DEFAULT_DECIMALS
        });
      }
    ), PROPERTY_TEST_CONFIG);
  });

  // ============================================================================
  // Property 27: Real-time input validation
  // ============================================================================
  
  it('Property 27: Real-time input validation - token name validation should provide immediate feedback', () => {
    /**
     * **Validates: Requirements 9.1, 9.3, 9.5**
     * For any token configuration input, validation should occur immediately and provide instant feedback on validity
     */
    createValidationPropertyTest(
      'Token name validation',
      fc.string(),
      validateTokenName
    );
  });

  it('Property 27: Real-time input validation - token symbol validation should provide immediate feedback', () => {
    /**
     * **Validates: Requirements 9.1, 9.3, 9.5**
     * For any token configuration input, validation should occur immediately and provide instant feedback on validity
     */
    createValidationPropertyTest(
      'Token symbol validation',
      fc.string(),
      validateTokenSymbol
    );
  });

  it('Property 27: Real-time input validation - initial supply validation should provide immediate feedback', () => {
    /**
     * **Validates: Requirements 9.1, 9.3, 9.5**
     * For any token configuration input, validation should occur immediately and provide instant feedback on validity
     */
    createValidationPropertyTest(
      'Initial supply validation',
      fc.string(),
      validateInitialSupply
    );
  });

  // ============================================================================
  // Property 28: Duplicate detection
  // ============================================================================
  
  it('Property 28: Duplicate detection - should detect duplicate token names within batch', () => {
    /**
     * **Validates: Requirements 9.2**
     * For any batch configuration, the system should detect and flag duplicate token names or symbols within the same batch
     */
    fc.assert(fc.property(
      fc.array(tokenConfigArbitrary, { minLength: 2, maxLength: 10 }),
      (configs) => {
        // Create intentional duplicates
        const duplicatedConfigs = [...configs, configs[0]]; // Duplicate first config
        
        const nameDuplicates = findDuplicates(duplicatedConfigs, config => config.name.toLowerCase());
        const symbolDuplicates = findDuplicates(duplicatedConfigs, config => config.symbol.toUpperCase());
        
        // Should detect at least one duplicate (the one we added)
        expect(nameDuplicates.length + symbolDuplicates.length).toBeGreaterThan(0);
        
        // Each duplicate should have at least 2 indices
        nameDuplicates.forEach(duplicate => {
          expect(duplicate.indices.length).toBeGreaterThanOrEqual(2);
        });
        
        symbolDuplicates.forEach(duplicate => {
          expect(duplicate.indices.length).toBeGreaterThanOrEqual(2);
        });
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property 28: Duplicate detection - should not flag false positives for unique configs', () => {
    /**
     * **Validates: Requirements 9.2**
     * For any batch configuration with unique names and symbols, no duplicates should be detected
     */
    fc.assert(fc.property(
      uniqueTokenConfigsArbitrary,
      (configs) => {
        const nameDuplicates = findDuplicates(configs, config => config.name.toLowerCase());
        const symbolDuplicates = findDuplicates(configs, config => config.symbol.toUpperCase());
        
        expect(nameDuplicates).toHaveLength(0);
        expect(symbolDuplicates).toHaveLength(0);
      }
    ), PROPERTY_TEST_CONFIG);
  });

  // ============================================================================
  // Property 29: Supply range validation
  // ============================================================================
  
  it('Property 29: Supply range validation - should accept valid supply values within range', () => {
    /**
     * **Validates: Requirements 9.4**
     * For any initial supply value, the system should validate that it falls within acceptable ranges for token creation
     */
    fc.assert(fc.property(
      initialSupplyArbitrary,
      (supply) => {
        const result = validateInitialSupply(supply);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        
        const numValue = parseFloat(supply);
        expect(numValue).toBeGreaterThanOrEqual(parseFloat(TOKEN_LIMITS.MIN_INITIAL_SUPPLY));
        expect(numValue).toBeLessThanOrEqual(parseFloat(TOKEN_LIMITS.MAX_INITIAL_SUPPLY));
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property 29: Supply range validation - should reject supply values outside acceptable range', () => {
    /**
     * **Validates: Requirements 9.4**
     * For any initial supply value outside the acceptable range, validation should fail
     */
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('0'), // Below minimum
        fc.integer({ min: parseInt(TOKEN_LIMITS.MAX_INITIAL_SUPPLY) + 1, max: Number.MAX_SAFE_INTEGER }).map(n => n.toString()), // Above maximum
        fc.constant('-100'), // Negative
        fc.constant('abc'), // Non-numeric
        fc.constant('') // Empty
      ),
      (invalidSupply) => {
        const result = validateInitialSupply(invalidSupply);
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        
        // Should have appropriate error message
        const error = result.errors[0];
        expect(error.field).toBe('initialSupply');
        expect(error.message).toBeTruthy();
        expect(error.code).toBeTruthy();
      }
    ), PROPERTY_TEST_CONFIG);
  });

  // ============================================================================
  // Property 23: Conservative gas buffer
  // ============================================================================
  
  it('Property 23: Conservative gas buffer - should apply 20% buffer to gas limit', () => {
    /**
     * **Validates: Requirements 7.3**
     * For any deployment transaction, the gas limit should include a 20% buffer above the estimated requirement
     */
    fc.assert(fc.property(
      gasLimitArbitrary,
      (gasLimit) => {
        const bufferedGas = calculateGasWithBuffer(gasLimit, GAS_CONFIG.GAS_BUFFER_PERCENTAGE);
        
        const originalGas = BigInt(gasLimit);
        const bufferedGasNum = BigInt(bufferedGas);
        const expectedBuffer = originalGas * BigInt(GAS_CONFIG.GAS_BUFFER_PERCENTAGE) / BigInt(100);
        const expectedTotal = originalGas + expectedBuffer;
        
        expect(bufferedGasNum).toBe(expectedTotal);
        expect(bufferedGasNum).toBeGreaterThan(originalGas);
        
        // Buffer should be exactly 20%
        const actualBuffer = bufferedGasNum - originalGas;
        expect(actualBuffer).toBe(expectedBuffer);
      }
    ), PROPERTY_TEST_CONFIG);
  });

  // ============================================================================
  // Property 12: Exponential backoff retry
  // ============================================================================
  
  it('Property 12: Exponential backoff retry - delay should increase exponentially with attempt number', () => {
    /**
     * **Validates: Requirements 4.2**
     * For any network error during deployment, retry attempts should follow exponential backoff timing patterns
     */
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 10 }),
      (maxAttempts) => {
        const delays: number[] = [];
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const delay = calculateRetryDelay(attempt);
          delays.push(delay);
          
          // Delay should be positive
          expect(delay).toBeGreaterThan(0);
          
          // Delay should not exceed maximum
          expect(delay).toBeLessThanOrEqual(30000); // MAX_RETRY_DELAY
          
          // Each delay should generally be larger than the previous (allowing for jitter)
          if (attempt > 1) {
            const previousDelay = delays[attempt - 2];
            const baseIncrease = previousDelay * 1.5; // Account for jitter
            expect(delay).toBeGreaterThanOrEqual(Math.min(baseIncrease, 30000));
          }
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });

  // ============================================================================
  // Utility Function Properties
  // ============================================================================
  
  it('Property: Wei to ETH conversion should be reversible', () => {
    /**
     * Converting wei to ETH and back should preserve the original value (within precision limits)
     */
    fc.assert(fc.property(
      fc.integer({ min: 1000000000000000, max: 1000000000000000000 }), // Reasonable wei range
      (weiAmount) => {
        const weiString = weiAmount.toString();
        const ethAmount = formatWeiToEth(weiString);
        const backToWei = formatEthToWei(ethAmount);
        
        // Due to floating point precision, we allow small differences
        const originalWei = BigInt(weiString);
        const convertedWei = BigInt(backToWei);
        const difference = originalWei > convertedWei ? originalWei - convertedWei : convertedWei - originalWei;
        
        // Difference should be less than 1% of original value or very small absolute amount
        const tolerance = originalWei > BigInt(1000) ? originalWei / BigInt(100) : BigInt(1000);
        expect(difference).toBeLessThanOrEqual(tolerance);
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property: Address validation should correctly identify valid addresses', () => {
    /**
     * Valid Ethereum addresses should pass validation, invalid ones should fail
     */
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 40, maxLength: 40 }),
      (hexBytes) => {
        const hexString = hexBytes.map(b => b.toString(16)).join('');
        const validAddress = `0x${hexString}`;
        expect(isValidAddress(validAddress)).toBe(true);
        
        // Invalid variations should fail
        expect(isValidAddress(hexString)).toBe(false); // Missing 0x prefix
        expect(isValidAddress(`0x${hexString}a`)).toBe(false); // Too long
        expect(isValidAddress(`0x${hexString.slice(0, -1)}`)).toBe(false); // Too short
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property: Token name validation should handle edge cases consistently', () => {
    /**
     * Token name validation should handle various edge cases consistently
     */
    fc.assert(fc.property(
      fc.string(),
      (name) => {
        const result = validateTokenName(name);
        
        // Result should always have required properties
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        
        // If name is valid, result should be valid
        const trimmed = name?.trim() || '';
        const isValidLength = trimmed.length >= TOKEN_LIMITS.MIN_NAME_LENGTH && 
                             trimmed.length <= TOKEN_LIMITS.MAX_NAME_LENGTH;
        
        if (trimmed && isValidLength) {
          expect(result.valid).toBe(true);
          expect(result.data).toBe(trimmed);
        } else {
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property: Token symbol validation should normalize to uppercase', () => {
    /**
     * Token symbol validation should always normalize valid symbols to uppercase
     */
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
      (symbol) => {
        const result = validateTokenSymbol(symbol);
        
        if (result.valid) {
          expect(result.data).toBe(symbol.trim().toUpperCase());
          expect(typeof result.data).toBe('string');
          expect(result.data.length).toBeGreaterThan(0);
          expect(result.data.length).toBeLessThanOrEqual(TOKEN_LIMITS.MAX_SYMBOL_LENGTH);
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });

});