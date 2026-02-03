/**
 * Regression Test Suite
 * Tests to ensure existing SDK methods continue to work unchanged
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ClankerTokenV4 } from '../../src/types/index.js';
import { 
  UnifiedExecutor,
  createUnifiedExecutor,
  type ClankerSDKConfig,
  validateTokenConfig,
  validateSDKConfig,
  assertValidTokenConfig,
} from '../../src/clanker-api/index.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const validTokenConfig: ClankerTokenV4 = {
  name: 'Regression Test Token',
  symbol: 'RTT',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453,
  description: 'Token for regression testing',
};

const invalidTokenConfig = {
  name: '', // Invalid: empty name
  symbol: 'INVALID',
  tokenAdmin: 'not-an-address', // Invalid: not a valid address
};

// ============================================================================
// Validation Function Regression Tests
// ============================================================================

describe('Validation Function Regression', () => {
  describe('validateTokenConfig', () => {
    it('should validate valid token configurations', () => {
      const result = validateTokenConfig(validTokenConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should reject invalid token configurations', () => {
      const result = validateTokenConfig(invalidTokenConfig as any);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should provide detailed error messages', () => {
      const result = validateTokenConfig(invalidTokenConfig as any);
      
      expect(result.errors.some(error => 
        error.message.toLowerCase().includes('name')
      )).toBe(true);
      expect(result.errors.some(error => 
        error.message.toLowerCase().includes('address')
      )).toBe(true);
    });

    it('should handle null/undefined inputs gracefully', () => {
      expect(() => validateTokenConfig(null as any)).not.toThrow();
      expect(() => validateTokenConfig(undefined as any)).not.toThrow();
      
      const nullResult = validateTokenConfig(null as any);
      expect(nullResult.valid).toBe(false);
    });
  });

  describe('validateSDKConfig', () => {
    it('should validate empty configuration', () => {
      const result = validateSDKConfig({});
      expect(result.valid).toBe(true);
    });

    it('should validate API configuration', () => {
      const apiConfig: ClankerSDKConfig = {
        operationMethod: 'api',
        api: {
          apiKey: 'test-key-with-sufficient-length',
          baseUrl: 'https://api.example.com',
          timeout: 30000,
          retries: 3,
        },
      };

      const result = validateSDKConfig(apiConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid API configuration', () => {
      const invalidApiConfig: ClankerSDKConfig = {
        operationMethod: 'api',
        api: {
          apiKey: 'short', // Too short
          baseUrl: 'not-a-url', // Invalid URL
          timeout: -1, // Invalid timeout
          retries: 20, // Too many retries
        },
      };

      const result = validateSDKConfig(invalidApiConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('assertValidTokenConfig', () => {
    it('should pass for valid configurations', () => {
      expect(() => assertValidTokenConfig(validTokenConfig)).not.toThrow();
    });

    it('should throw for invalid configurations', () => {
      expect(() => assertValidTokenConfig(invalidTokenConfig as any)).toThrow();
    });

    it('should throw structured errors', () => {
      try {
        assertValidTokenConfig(invalidTokenConfig as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('method');
      }
    });
  });
});

// ============================================================================
// UnifiedExecutor Method Regression Tests
// ============================================================================

describe('UnifiedExecutor Method Regression', () => {
  let executor: UnifiedExecutor;

  beforeEach(() => {
    executor = createUnifiedExecutor({
      operationMethod: 'direct',
    });
  });

  describe('Configuration Methods', () => {
    it('should maintain getConfig method behavior', () => {
      const config = executor.getConfig();
      
      expect(typeof config).toBe('object');
      expect(config).toHaveProperty('operationMethod');
    });

    it('should maintain updateConfig method behavior', () => {
      const newConfig = { operationMethod: 'auto' as const };
      
      expect(() => executor.updateConfig(newConfig)).not.toThrow();
      
      const updatedConfig = executor.getConfig();
      expect(updatedConfig.operationMethod).toBe('auto');
    });

    it('should maintain getAvailableMethods method behavior', () => {
      const methods = executor.getAvailableMethods();
      
      expect(Array.isArray(methods)).toBe(true);
      expect(methods.length).toBeGreaterThan(0);
      expect(methods.every(method => 
        ['direct', 'api', 'auto'].includes(method)
      )).toBe(true);
    });
  });

  describe('Chain Information Methods', () => {
    it('should maintain getSupportedChains method behavior', () => {
      const chains = executor.getSupportedChains();
      
      expect(chains).toHaveProperty('api');
      expect(chains).toHaveProperty('direct');
      expect(chains).toHaveProperty('both');
      expect(Array.isArray(chains.api)).toBe(true);
      expect(Array.isArray(chains.direct)).toBe(true);
      expect(Array.isArray(chains.both)).toBe(true);
    });

    it('should maintain getChainInfo method behavior', () => {
      const baseInfo = executor.getChainInfo(8453); // Base
      
      expect(baseInfo).toHaveProperty('supported');
      expect(baseInfo).toHaveProperty('methods');
      expect(baseInfo).toHaveProperty('recommendedMethod');
      expect(baseInfo).toHaveProperty('specialConsiderations');
      expect(baseInfo).toHaveProperty('configuration');
      
      expect(typeof baseInfo.supported).toBe('boolean');
      expect(Array.isArray(baseInfo.methods)).toBe(true);
      expect(Array.isArray(baseInfo.specialConsiderations)).toBe(true);
    });

    it('should handle unknown chains gracefully', () => {
      const unknownChainInfo = executor.getChainInfo(999999);
      
      expect(unknownChainInfo.supported).toBe(false);
      expect(unknownChainInfo.methods).toHaveLength(0);
      expect(unknownChainInfo.specialConsiderations.length).toBeGreaterThan(0);
    });
  });

  describe('Method Selection Context', () => {
    it('should maintain getMethodSelectionContext method behavior', () => {
      const context = executor.getMethodSelectionContext('deploy');
      
      expect(context).toHaveProperty('operationType');
      expect(context).toHaveProperty('hasApiKey');
      expect(context).toHaveProperty('hasWallet');
      expect(context).toHaveProperty('chainSupported');
      expect(context).toHaveProperty('userPreference');
      
      expect(context.operationType).toBe('deploy');
      expect(typeof context.hasApiKey).toBe('boolean');
      expect(typeof context.hasWallet).toBe('boolean');
      expect(typeof context.chainSupported).toBe('boolean');
    });

    it('should support all operation types', () => {
      const operationTypes = ['deploy', 'claim', 'update', 'vault'] as const;
      
      operationTypes.forEach(opType => {
        const context = executor.getMethodSelectionContext(opType);
        expect(context.operationType).toBe(opType);
      });
    });
  });

  describe('Validation Methods', () => {
    it('should maintain validateTokenConfig async method behavior', async () => {
      const result = await executor.validateTokenConfig(validTokenConfig);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should maintain testConnection method behavior', async () => {
      const result = await executor.testConnection();
      
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('connected');
      expect(typeof result.method).toBe('string');
      expect(typeof result.connected).toBe('boolean');
      
      if (result.authenticated !== undefined) {
        expect(typeof result.authenticated).toBe('boolean');
      }
      if (result.latency !== undefined) {
        expect(typeof result.latency).toBe('number');
      }
    });
  });
});

// ============================================================================
// Error Handling Regression Tests
// ============================================================================

describe('Error Handling Regression', () => {
  let executor: UnifiedExecutor;

  beforeEach(() => {
    executor = createUnifiedExecutor({
      operationMethod: 'direct',
    });
  });

  describe('Configuration Errors', () => {
    it('should throw structured errors for invalid configurations', () => {
      expect(() => createUnifiedExecutor({
        operationMethod: 'invalid' as any,
      })).toThrow();
    });

    it('should provide helpful error messages', () => {
      try {
        createUnifiedExecutor({
          operationMethod: 'api',
          api: {
            apiKey: '', // Invalid: empty API key
          },
        });
        // If we reach here, the constructor didn't throw as expected
        throw new Error('Should have thrown an error');
      } catch (error) {
        // Skip the test error we threw ourselves
        if (error instanceof Error && error.message === 'Should have thrown an error') {
          throw error;
        }
        
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
      }
    });
  });

  describe('Method Availability Errors', () => {
    it('should throw when API method selected but not available', async () => {
      const executor = createUnifiedExecutor({
        operationMethod: 'direct', // No API config
      });

      await expect(
        executor.deploy(validTokenConfig, 'api')
      ).rejects.toThrow();
    });

    it('should throw when direct method selected but not available', async () => {
      const executor = createUnifiedExecutor({
        operationMethod: 'api',
        api: { apiKey: 'test-key' },
        // No wallet/publicClient config
      });

      await expect(
        executor.deploy(validTokenConfig, 'direct')
      ).rejects.toThrow();
    });
  });

  describe('Validation Errors', () => {
    it('should throw for invalid token configurations in deploy', async () => {
      await expect(
        executor.deploy(invalidTokenConfig as any)
      ).rejects.toThrow();
    });

    it('should throw for empty batch deployments', async () => {
      await expect(
        executor.batchDeploy([])
      ).rejects.toThrow();
    });

    it('should throw for invalid tokens in batch', async () => {
      await expect(
        executor.batchDeploy([invalidTokenConfig as any])
      ).rejects.toThrow();
    });
  });
});

// ============================================================================
// Performance Regression Tests
// ============================================================================

describe('Performance Regression', () => {
  describe('Configuration Creation Performance', () => {
    it('should create executor instances quickly', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        createUnifiedExecutor({});
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Validation Performance', () => {
    it('should validate token configurations quickly', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        validateTokenConfig(validTokenConfig);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should validate SDK configurations quickly', () => {
      const config: ClankerSDKConfig = {
        operationMethod: 'api',
        api: { apiKey: 'test-key-with-sufficient-length' },
      };
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        validateSDKConfig(config);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Method Selection Performance', () => {
    it('should select methods quickly', () => {
      const executor = createUnifiedExecutor({
        operationMethod: 'auto',
        api: { apiKey: 'test-key' },
      });
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        executor.getMethodSelectionContext('deploy');
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete in under 0.5 seconds
    });
  });
});

// ============================================================================
// Memory Usage Regression Tests
// ============================================================================

describe('Memory Usage Regression', () => {
  describe('Configuration Memory Usage', () => {
    it('should not leak memory when creating multiple executors', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and discard many executors
      for (let i = 0; i < 100; i++) {
        const executor = createUnifiedExecutor({});
        // Use executor briefly
        executor.getAvailableMethods();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Validation Memory Usage', () => {
    it('should not accumulate memory during repeated validations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many validations
      for (let i = 0; i < 1000; i++) {
        validateTokenConfig(validTokenConfig);
        validateSDKConfig({ operationMethod: 'direct' });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});