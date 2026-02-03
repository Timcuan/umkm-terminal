/**
 * Retry Handler Tests
 * Tests for the retry logic and circuit breaker functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  RetryHandler, 
  createRetryHandler, 
  createAPIRetryHandler,
  withRetry 
} from '../../../src/clanker-api/retry/retry-handler.js';
import { APIError, NetworkError } from '../../../src/clanker-api/errors/unified-error-hierarchy.js';

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;

  beforeEach(() => {
    retryHandler = createRetryHandler({
      maxRetries: 3,
      baseDelay: 100, // Short delay for tests
      circuitBreakerThreshold: 2,
      circuitBreakerTimeout: 1000,
    });
    retryHandler.resetStats();
    retryHandler.resetAllCircuitBreakers();
  });

  describe('Basic Retry Logic', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryHandler.executeWithRetry(operation, 'api');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toHaveLength(0);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Network timeout', 'api'))
        .mockResolvedValue('success');
      
      const result = await retryHandler.executeWithRetry(operation, 'api');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toHaveLength(1);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new APIError('Bad request', 400, false));
      
      const result = await retryHandler.executeWithRetry(operation, 'api');
      
      expect(result.success).toBe(false);
      expect(result.attempts).toHaveLength(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new NetworkError('Network timeout', 'api'));
      
      const result = await retryHandler.executeWithRetry(operation, 'api');
      
      expect(result.success).toBe(false);
      expect(result.attempts).toHaveLength(4); // 1 initial + 3 retries
      expect(operation).toHaveBeenCalledTimes(4);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new NetworkError('Network timeout', 'api'));
      
      // First operation - should fail and record failure
      await retryHandler.executeWithRetry(operation, 'api', 'test-op');
      
      // Second operation - should fail and trigger circuit breaker
      await retryHandler.executeWithRetry(operation, 'api', 'test-op');
      
      // Third operation - should be blocked by circuit breaker
      const result = await retryHandler.executeWithRetry(operation, 'api', 'test-op');
      
      expect(result.success).toBe(false);
      expect(result.circuitBreakerTriggered).toBe(true);
      expect(result.error?.message).toContain('Circuit breaker is open');
    });

    it('should reset circuit breaker on success', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Network timeout', 'api'))
        .mockResolvedValue('success');
      
      // First operation - should fail
      await retryHandler.executeWithRetry(operation, 'api', 'test-op');
      
      // Second operation - should succeed and reset circuit breaker
      const result = await retryHandler.executeWithRetry(operation, 'api', 'test-op');
      
      expect(result.success).toBe(true);
      
      // Circuit breaker should be reset
      const status = retryHandler.getCircuitBreakerStatus();
      const testOpStatus = status.find(s => s.key === 'test-op');
      expect(testOpStatus?.failureCount).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track retry statistics', async () => {
      const successOp = vi.fn().mockResolvedValue('success');
      const failOp = vi.fn().mockRejectedValue(new APIError('Bad request', 400, false));
      
      await retryHandler.executeWithRetry(successOp, 'api', 'success-op');
      await retryHandler.executeWithRetry(failOp, 'api', 'fail-op');
      
      const stats = retryHandler.getRetryStats();
      expect(stats.totalOperations).toBe(2);
      expect(stats.successfulOperations).toBe(1);
      expect(stats.failedOperations).toBe(1);
    });
  });

  describe('Factory Functions', () => {
    it('should create API retry handler with correct config', () => {
      const apiHandler = createAPIRetryHandler();
      const config = apiHandler.getConfig();
      
      expect(config.maxRetries).toBe(3);
      expect(config.backoffStrategy).toBe('linear');
      expect(config.retryableErrorCodes).toContain('RATE_LIMIT_ERROR');
    });
  });

  describe('Utility Functions', () => {
    it('should work with withRetry utility', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Network timeout', 'api'))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, 'api', { maxRetries: 2 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw error when withRetry fails', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new APIError('Bad request', 400, false));
      
      await expect(withRetry(operation, 'api')).rejects.toThrow('Bad request');
    });
  });
});