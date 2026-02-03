/**
 * Unit tests for utility functions
 * 
 * These tests verify specific examples and edge cases for utility functions
 * in the simplified batch deployment system.
 */

import { describe, it, expect } from 'vitest';
import {
  formatWeiToEth,
  formatEthToWei,
  formatWeiToGwei,
  formatGweiToWei,
  formatDuration,
  formatNumber,
  truncateAddress,
  calculateGasWithBuffer,
  calculateDeploymentCost,
  calculateSafetyBuffer,
  calculateRetryDelay,
  calculateTimeRemaining,
  calculateMovingAverage,
  createDeploymentError,
  isRetryableError,
  categorizeError,
  chunkArray,
  removeDuplicates,
  delay,
  generateSessionId,
  generateTransactionId,
  isTokenConfig
} from '../../../src/simplified-batch/utils/index.js';
import { GAS_CONFIG, RETRY_CONFIG } from '../../../src/simplified-batch/constants/index.js';
import type { Address } from 'viem';

describe('Simplified Batch Deployment - Utility Functions', () => {

  // ============================================================================
  // Formatting Utilities Tests
  // ============================================================================

  describe('formatWeiToEth', () => {
    it('should convert wei to ETH correctly', () => {
      expect(formatWeiToEth('1000000000000000000')).toBe('1.000000'); // 1 ETH
      expect(formatWeiToEth('500000000000000000')).toBe('0.500000'); // 0.5 ETH
      expect(formatWeiToEth('1')).toBe('0.000000'); // 1 wei (rounds to 0)
      expect(formatWeiToEth('0')).toBe('0.000000'); // 0 wei
    });

    it('should handle large wei amounts', () => {
      const largeWei = '1000000000000000000000'; // 1000 ETH
      expect(formatWeiToEth(largeWei)).toBe('1000.000000');
    });
  });

  describe('formatEthToWei', () => {
    it('should convert ETH to wei correctly', () => {
      expect(formatEthToWei('1')).toBe('1000000000000000000'); // 1 ETH
      expect(formatEthToWei('0.5')).toBe('500000000000000000'); // 0.5 ETH
      expect(formatEthToWei('0')).toBe('0'); // 0 ETH
    });

    it('should handle decimal ETH amounts', () => {
      expect(formatEthToWei('1.5')).toBe('1500000000000000000'); // 1.5 ETH
      expect(formatEthToWei('0.000001')).toBe('1000000000000'); // 0.000001 ETH
    });
  });

  describe('formatWeiToGwei', () => {
    it('should convert wei to gwei correctly', () => {
      expect(formatWeiToGwei('1000000000')).toBe('1.00'); // 1 gwei
      expect(formatWeiToGwei('20000000000')).toBe('20.00'); // 20 gwei
      expect(formatWeiToGwei('1500000000')).toBe('1.50'); // 1.5 gwei
    });
  });

  describe('formatGweiToWei', () => {
    it('should convert gwei to wei correctly', () => {
      expect(formatGweiToWei('1')).toBe('1000000000'); // 1 gwei
      expect(formatGweiToWei('20')).toBe('20000000000'); // 20 gwei
      expect(formatGweiToWei('1.5')).toBe('1500000000'); // 1.5 gwei
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(120)).toBe('2m');
      expect(formatDuration(3599)).toBe('59m 59s');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h');
    });
  });

  describe('formatNumber', () => {
    it('should format small numbers as-is', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(999999)).toBe('1000.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(1500000)).toBe('1.5M');
    });

    it('should format billions with B suffix', () => {
      expect(formatNumber(1000000000)).toBe('1.0B');
      expect(formatNumber(1500000000)).toBe('1.5B');
    });

    it('should format trillions with T suffix', () => {
      expect(formatNumber(1000000000000)).toBe('1.0T');
      expect(formatNumber(1500000000000)).toBe('1.5T');
    });
  });

  describe('truncateAddress', () => {
    const address = '0x1234567890123456789012345678901234567890' as Address;

    it('should truncate addresses with default parameters', () => {
      const result = truncateAddress(address);
      expect(result).toBe('0x1234...7890');
    });

    it('should truncate addresses with custom parameters', () => {
      const result = truncateAddress(address, 8, 6);
      expect(result).toBe('0x123456...567890');
    });

    it('should return full address if shorter than truncation length', () => {
      const shortAddress = '0x1234567890' as Address;
      const result = truncateAddress(shortAddress, 6, 4);
      expect(result).toBe(shortAddress);
    });
  });

  // ============================================================================
  // Calculation Utilities Tests
  // ============================================================================

  describe('calculateGasWithBuffer', () => {
    it('should apply default 20% buffer', () => {
      const gasLimit = '1000000';
      const result = calculateGasWithBuffer(gasLimit);
      const expected = (BigInt(gasLimit) * BigInt(120) / BigInt(100)).toString();
      expect(result).toBe(expected);
    });

    it('should apply custom buffer percentage', () => {
      const gasLimit = '1000000';
      const bufferPercentage = 30;
      const result = calculateGasWithBuffer(gasLimit, bufferPercentage);
      const expected = (BigInt(gasLimit) * BigInt(130) / BigInt(100)).toString();
      expect(result).toBe(expected);
    });
  });

  describe('calculateDeploymentCost', () => {
    it('should calculate cost correctly', () => {
      const gasLimit = '2000000';
      const gasPrice = '20000000000'; // 20 gwei
      const result = calculateDeploymentCost(gasLimit, gasPrice);
      const expected = (BigInt(gasLimit) * BigInt(gasPrice)).toString();
      expect(result).toBe(expected);
    });
  });

  describe('calculateSafetyBuffer', () => {
    it('should calculate default 10% safety buffer', () => {
      const totalCost = '1000000000000000000'; // 1 ETH
      const result = calculateSafetyBuffer(totalCost);
      const expected = (BigInt(totalCost) / BigInt(10)).toString(); // 10%
      expect(result).toBe(expected);
    });

    it('should calculate custom safety buffer', () => {
      const totalCost = '1000000000000000000'; // 1 ETH
      const bufferPercentage = 20;
      const result = calculateSafetyBuffer(totalCost, bufferPercentage);
      const expected = (BigInt(totalCost) * BigInt(bufferPercentage) / BigInt(100)).toString();
      expect(result).toBe(expected);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff delays', () => {
      const delay1 = calculateRetryDelay(1);
      const delay2 = calculateRetryDelay(2);
      const delay3 = calculateRetryDelay(3);

      expect(delay1).toBeGreaterThanOrEqual(RETRY_CONFIG.BASE_RETRY_DELAY);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      
      // All delays should be within max limit
      expect(delay1).toBeLessThanOrEqual(RETRY_CONFIG.MAX_RETRY_DELAY);
      expect(delay2).toBeLessThanOrEqual(RETRY_CONFIG.MAX_RETRY_DELAY);
      expect(delay3).toBeLessThanOrEqual(RETRY_CONFIG.MAX_RETRY_DELAY);
    });

    it('should cap delays at maximum', () => {
      const largeAttempt = 20;
      const delay = calculateRetryDelay(largeAttempt);
      expect(delay).toBeLessThanOrEqual(RETRY_CONFIG.MAX_RETRY_DELAY);
    });
  });

  describe('calculateTimeRemaining', () => {
    it('should calculate time remaining correctly', () => {
      const completed = 3;
      const total = 10;
      const averageTime = 5; // 5 seconds per deployment
      
      const result = calculateTimeRemaining(completed, total, averageTime);
      const expected = (total - completed) * averageTime; // 7 * 5 = 35
      expect(result).toBe(expected);
    });

    it('should return 0 when no completions or average time is 0', () => {
      expect(calculateTimeRemaining(0, 10, 5)).toBe(0);
      expect(calculateTimeRemaining(5, 10, 0)).toBe(0);
    });

    it('should return 0 when all items are completed', () => {
      expect(calculateTimeRemaining(10, 10, 5)).toBe(0);
    });
  });

  describe('calculateMovingAverage', () => {
    it('should calculate moving average correctly', () => {
      const values = [1, 2, 3, 4];
      const newValue = 5;
      const result = calculateMovingAverage(values, newValue);
      const expected = (1 + 2 + 3 + 4 + 5) / 5; // 3
      expect(result).toBe(expected);
    });

    it('should limit to max samples', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const newValue = 11;
      const maxSamples = 5;
      const result = calculateMovingAverage(values, newValue, maxSamples);
      const expected = (7 + 8 + 9 + 10 + 11) / 5; // Only last 5 values
      expect(result).toBe(expected);
    });
  });

  // ============================================================================
  // Error Utilities Tests
  // ============================================================================

  describe('createDeploymentError', () => {
    it('should create deployment error with all properties', () => {
      const error = createDeploymentError(
        'network_error',
        'Network connection failed',
        'Connection timeout after 30s',
        'E201',
        true,
        { operation: 'deploy' }
      );

      expect(error.category).toBe('network_error');
      expect(error.message).toBe('Network connection failed');
      expect(error.technicalDetails).toBe('Connection timeout after 30s');
      expect(error.code).toBe('E201');
      expect(error.retryable).toBe(true);
      expect(error.context).toEqual({ operation: 'deploy' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.recoveryAction).toBeDefined();
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable network errors', () => {
      const networkErrors = [
        new Error('Network connection failed'),
        new Error('Request timeout'),
        new Error('Connection refused'),
        new Error('Fetch failed')
      ];

      networkErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should identify retryable gas errors', () => {
      const gasErrors = [
        new Error('Gas estimation failed'),
        new Error('Gas price too low')
      ];

      gasErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        new Error('Insufficient funds'),
        new Error('Invalid configuration'),
        new Error('Contract reverted')
      ];

      nonRetryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('categorizeError', () => {
    it('should categorize insufficient funds errors', () => {
      const error = new Error('Insufficient funds for transaction');
      expect(categorizeError(error)).toBe('insufficient_funds');
    });

    it('should categorize network errors', () => {
      const error = new Error('Network connection timeout');
      expect(categorizeError(error)).toBe('network_error');
    });

    it('should categorize gas errors', () => {
      const error = new Error('Gas estimation failed');
      expect(categorizeError(error)).toBe('gas_estimation_error');
    });

    it('should categorize validation errors', () => {
      const error = new Error('Invalid token configuration');
      expect(categorizeError(error)).toBe('configuration_error');
    });

    it('should categorize contract errors', () => {
      const error = new Error('Contract deployment reverted');
      expect(categorizeError(error)).toBe('contract_error');
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Something unexpected happened');
      expect(categorizeError(error)).toBe('unknown_error');
    });
  });

  // ============================================================================
  // Array Utilities Tests
  // ============================================================================

  describe('chunkArray', () => {
    it('should chunk array into specified sizes', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = chunkArray(array, 3);
      
      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    it('should handle empty arrays', () => {
      const chunks = chunkArray([], 3);
      expect(chunks).toHaveLength(0);
    });

    it('should handle arrays smaller than chunk size', () => {
      const array = [1, 2];
      const chunks = chunkArray(array, 5);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2]);
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicates based on key function', () => {
      const items = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' }, // Duplicate
        { id: 3, name: 'C' }
      ];

      const unique = removeDuplicates(items, item => item.id.toString());
      
      expect(unique).toHaveLength(3);
      expect(unique.map(item => item.id)).toEqual([1, 2, 3]);
    });

    it('should preserve first occurrence of duplicates', () => {
      const items = [
        { id: 1, name: 'First' },
        { id: 1, name: 'Second' } // Duplicate with different name
      ];

      const unique = removeDuplicates(items, item => item.id.toString());
      
      expect(unique).toHaveLength(1);
      expect(unique[0].name).toBe('First');
    });
  });

  // ============================================================================
  // Promise Utilities Tests
  // ============================================================================

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(end - start).toBeLessThan(200); // But not too much
    });
  });

  // ============================================================================
  // ID Generation Tests
  // ============================================================================

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      
      expect(id1).toMatch(/^session-[a-z0-9]+-[a-z0-9]+$/);
      expect(id2).toMatch(/^session-[a-z0-9]+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTransactionId', () => {
    it('should generate unique transaction IDs', () => {
      const id1 = generateTransactionId();
      const id2 = generateTransactionId();
      
      expect(id1).toMatch(/^tx-[a-z0-9]+-[a-z0-9]+$/);
      expect(id2).toMatch(/^tx-[a-z0-9]+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  // ============================================================================
  // Type Guards Tests
  // ============================================================================

  describe('isTokenConfig', () => {
    it('should identify valid token configs', () => {
      const validConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        initialSupply: '1000000',
        decimals: 18
      };

      expect(isTokenConfig(validConfig)).toBe(true);
    });

    it('should identify invalid token configs', () => {
      const invalidConfigs = [
        null,
        undefined,
        {},
        { name: 'Test' }, // Missing required fields
        { name: 123, symbol: 'TEST', initialSupply: '1000' }, // Wrong types
        'not an object'
      ];

      invalidConfigs.forEach(config => {
        expect(isTokenConfig(config)).toBe(false);
      });
    });

    it('should handle optional decimals field', () => {
      const configWithoutDecimals = {
        name: 'Test Token',
        symbol: 'TEST',
        initialSupply: '1000000'
      };

      expect(isTokenConfig(configWithoutDecimals)).toBe(true);
    });
  });

});