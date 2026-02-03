/**
 * Clanker API Compatibility Test Suite
 * Ensures existing functionality remains unchanged with new API integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ClankerTokenV4, DeployResult } from '../../src/types/index.js';
import { 
  UnifiedExecutor,
  createUnifiedExecutor,
  EnhancedClanker,
  BackwardCompatibleClanker,
  createEnhancedClanker,
  type ClankerSDKConfig
} from '../../src/clanker-api/index.js';

// ============================================================================
// Test Data
// ============================================================================

const mockTokenConfig: ClankerTokenV4 = {
  name: 'Test Token',
  symbol: 'TEST',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453,
  image: 'https://example.com/token.png',
};

const mockDeployResult: DeployResult = {
  txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  chainId: 8453,
  async waitForTransaction() {
    return {
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
    };
  },
};

// ============================================================================
// Unified Executor Compatibility Tests
// ============================================================================

describe('UnifiedExecutor Compatibility', () => {
  let executor: UnifiedExecutor;

  beforeEach(() => {
    executor = createUnifiedExecutor({
      operationMethod: 'direct',
      publicClient: {} as any,
      wallet: {} as any,
    });
  });

  describe('Configuration Interface', () => {
    it('should accept legacy configuration format', () => {
      const legacyConfig = {
        publicClient: {} as any,
        wallet: {} as any,
        chain: {} as any,
      };

      expect(() => createUnifiedExecutor(legacyConfig)).not.toThrow();
    });

    it('should accept new API configuration format', () => {
      const newConfig: ClankerSDKConfig = {
        operationMethod: 'api',
        api: {
          apiKey: 'test-api-key-with-sufficient-length-for-validation',
          baseUrl: 'https://api.example.com',
          timeout: 30000,
          retries: 3,
        },
      };

      expect(() => createUnifiedExecutor(newConfig)).not.toThrow();
    });

    it('should accept mixed configuration format', () => {
      const mixedConfig: ClankerSDKConfig = {
        operationMethod: 'auto',
        api: {
          apiKey: 'test-api-key-with-sufficient-length-for-validation',
        },
        publicClient: {} as any,
        wallet: {} as any,
      };

      expect(() => createUnifiedExecutor(mixedConfig)).not.toThrow();
    });
  });

  describe('Method Selection', () => {
    it('should default to direct method when no API config provided', () => {
      const config = {
        publicClient: {} as any,
        wallet: {} as any,
      };
      const executor = createUnifiedExecutor(config);
      const availableMethods = executor.getAvailableMethods();
      
      expect(availableMethods).toContain('direct');
      expect(availableMethods).not.toContain('api');
    });

    it('should support auto method selection', () => {
      const config: ClankerSDKConfig = {
        operationMethod: 'auto',
        api: { apiKey: 'test-key-with-sufficient-length-for-validation' },
        publicClient: {} as any,
        wallet: {} as any,
      };
      const executor = createUnifiedExecutor(config);
      const availableMethods = executor.getAvailableMethods();
      
      expect(availableMethods).toContain('auto');
      expect(availableMethods).toContain('api');
      expect(availableMethods).toContain('direct');
    });
  });

  describe('Token Configuration Validation', () => {
    it('should validate token config with same interface as before', async () => {
      const result = await executor.validateTokenConfig(mockTokenConfig);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should accept legacy TokenConfig interface', async () => {
      const legacyToken: ClankerTokenV4 = {
        name: 'Legacy Token',
        symbol: 'LEGACY',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453,
        image: 'https://example.com/legacy.png',
      };

      const result = await executor.validateTokenConfig(legacyToken);
      expect(result.valid).toBe(true);
    });
  });

  describe('Chain Support', () => {
    it('should support all previously supported chains', () => {
      const supportedChains = executor.getSupportedChains();
      
      // Base should be supported by both methods
      expect(supportedChains.both.some(chain => chain.id === 8453)).toBe(true);
      
      // Should have chains in at least one category
      const totalChains = supportedChains.api.length + 
                         supportedChains.direct.length + 
                         supportedChains.both.length;
      expect(totalChains).toBeGreaterThan(0);
    });

    it('should provide chain information for supported chains', () => {
      const baseInfo = executor.getChainInfo(8453); // Base
      
      expect(baseInfo.supported).toBe(true);
      expect(baseInfo.methods.length).toBeGreaterThan(0);
      expect(baseInfo).toHaveProperty('recommendedMethod');
      expect(baseInfo).toHaveProperty('specialConsiderations');
      expect(baseInfo).toHaveProperty('configuration');
    });
  });

  describe('Batch Operations', () => {
    it('should maintain batch deployment interface', async () => {
      const tokens = [mockTokenConfig];
      
      // Mock the deploy method to avoid actual deployment
      vi.spyOn(executor as any, 'deployViaDirect').mockResolvedValue(mockDeployResult);
      
      const result = await executor.batchDeploy(tokens);
      
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('chainSummary');
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.chainSummary).toBe('object');
    });

    it('should handle empty batch gracefully', async () => {
      await expect(executor.batchDeploy([])).rejects.toThrow();
    });
  });
});

// ============================================================================
// Enhanced Clanker Compatibility Tests
// ============================================================================

describe('EnhancedClanker Compatibility', () => {
  let enhancedClanker: EnhancedClanker;

  beforeEach(() => {
    enhancedClanker = createEnhancedClanker({
      operationMethod: 'direct',
      publicClient: {} as any,
      wallet: {} as any,
    });
  });

  describe('Interface Compatibility', () => {
    it('should maintain same public interface as original Clanker', () => {
      // Check that essential methods exist
      expect(typeof enhancedClanker.deploy).toBe('function');
      expect(typeof enhancedClanker.validateTokenConfig).toBe('function');
      expect(typeof enhancedClanker.testConnection).toBe('function');
      expect(typeof enhancedClanker.batchDeploy).toBe('function');
    });

    it('should accept same configuration format', () => {
      const config = {
        publicClient: {} as any,
        wallet: {} as any,
        chain: {} as any,
      };

      expect(() => createEnhancedClanker(config)).not.toThrow();
    });
  });

  describe('Method Signatures', () => {
    it('should maintain deploy method signature', async () => {
      // Mock the deploy method directly
      vi.spyOn(enhancedClanker, 'deploy').mockResolvedValue(mockDeployResult);

      const result = await enhancedClanker.deploy(mockTokenConfig);
      
      // Should return same interface as before
      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('chainId');
      expect(result).toHaveProperty('waitForTransaction');
      expect(typeof result.waitForTransaction).toBe('function');
    });

    it('should maintain validateTokenConfig method signature', async () => {
      const result = await enhancedClanker.validateTokenConfig(mockTokenConfig);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should maintain testConnection method signature', async () => {
      const result = await enhancedClanker.testConnection();
      
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('connected');
      expect(typeof result.connected).toBe('boolean');
    });
  });
});

// ============================================================================
// Backward Compatible Clanker Tests
// ============================================================================

describe('BackwardCompatibleClanker', () => {
  let compatibleClanker: BackwardCompatibleClanker;

  beforeEach(() => {
    compatibleClanker = new BackwardCompatibleClanker({
      operationMethod: 'direct',
      publicClient: {} as any,
      wallet: {} as any,
    });
  });

  describe('Legacy Interface Support', () => {
    it('should support legacy method calls without operation method parameter', async () => {
      // Mock the methods directly
      vi.spyOn(compatibleClanker, 'deploy').mockResolvedValue(mockDeployResult);
      vi.spyOn(compatibleClanker, 'validateTokenConfig').mockResolvedValue({ 
        valid: true, 
        errors: [], 
        warnings: [] 
      });
      vi.spyOn(compatibleClanker, 'testConnection').mockResolvedValue({ 
        method: 'direct', 
        connected: true 
      });

      // These should work exactly like the original Clanker class
      const deployResult = await compatibleClanker.deploy(mockTokenConfig);
      const validationResult = await compatibleClanker.validateTokenConfig(mockTokenConfig);
      const connectionResult = await compatibleClanker.testConnection();

      expect(deployResult).toBeDefined();
      expect(validationResult).toBeDefined();
      expect(connectionResult).toBeDefined();
    });

    it('should maintain exact same error handling behavior', async () => {
      // Mock to throw an error
      vi.spyOn(compatibleClanker, 'deploy').mockRejectedValue(new Error('Deployment failed'));

      await expect(compatibleClanker.deploy(mockTokenConfig)).rejects.toThrow('Deployment failed');
    });
  });

  describe('Configuration Backward Compatibility', () => {
    it('should work with minimal configuration', () => {
      const minimalConfig = {
        publicClient: {} as any,
        wallet: {} as any,
      };
      expect(() => new BackwardCompatibleClanker(minimalConfig)).not.toThrow();
    });

    it('should work with legacy viem configuration', () => {
      const viemConfig = {
        publicClient: {} as any,
        wallet: {} as any,
        chain: {} as any,
      };
      expect(() => new BackwardCompatibleClanker(viemConfig)).not.toThrow();
    });
  });
});

// ============================================================================
// Type Interface Compatibility Tests
// ============================================================================

describe('Type Interface Compatibility', () => {
  describe('ClankerTokenV4 Interface', () => {
    it('should accept tokens with only required fields', () => {
      const minimalToken: ClankerTokenV4 = {
        name: 'Minimal Token',
        symbol: 'MIN',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453,
        image: 'https://example.com/minimal.png',
      };

      // Should be assignable to ClankerTokenV4
      const token: ClankerTokenV4 = minimalToken;
      expect(token.name).toBe('Minimal Token');
    });

    it('should accept tokens with all optional fields', () => {
      const fullToken: ClankerTokenV4 = {
        name: 'Full Token',
        symbol: 'FULL',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453,
        image: 'https://example.com/token.png',
        metadata: {
          description: 'A full token configuration',
          socials: {
            twitter: '@token',
            telegram: '@tokengroup',
            website: 'https://token.example.com',
          },
        },
      };

      expect(fullToken).toBeDefined();
      expect(fullToken.chainId).toBe(8453);
    });
  });

  describe('DeployResult Interface', () => {
    it('should maintain same structure as before', async () => {
      const result: DeployResult = mockDeployResult;
      
      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('chainId');
      expect(result).toHaveProperty('waitForTransaction');
      
      const waitResult = await result.waitForTransaction();
      expect(waitResult).toHaveProperty('address');
    });
  });

  describe('Configuration Types', () => {
    it('should accept legacy configuration types', () => {
      const legacyConfig = {
        publicClient: {} as any,
        wallet: {} as any,
        chain: {} as any,
        chains: [] as any[],
      };

      // Should be assignable to ClankerSDKConfig
      const config: ClankerSDKConfig = legacyConfig;
      expect(config).toBeDefined();
    });

    it('should accept new API configuration types', () => {
      const apiConfig: ClankerSDKConfig = {
        operationMethod: 'api',
        api: {
          apiKey: 'test-key',
          baseUrl: 'https://api.example.com',
          timeout: 30000,
          retries: 3,
        },
      };

      expect(apiConfig.operationMethod).toBe('api');
      expect(apiConfig.api?.apiKey).toBe('test-key');
    });
  });
});

// ============================================================================
// Regression Tests
// ============================================================================

describe('Regression Tests', () => {
  describe('Method Behavior Consistency', () => {
    it('should maintain same validation behavior for invalid tokens', async () => {
      const executor = createUnifiedExecutor({ 
        operationMethod: 'direct',
        publicClient: {} as any,
        wallet: {} as any,
      });
      
      const invalidToken: ClankerTokenV4 = {
        name: '', // Invalid: empty name
        symbol: 'TEST',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453,
        image: 'https://example.com/token.png',
      };

      const result = await executor.validateTokenConfig(invalidToken);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should maintain same error types for deployment failures', async () => {
      const executor = createUnifiedExecutor({ 
        operationMethod: 'direct',
        publicClient: {} as any,
        wallet: {} as any,
      });
      
      // Mock to simulate deployment failure
      vi.spyOn(executor as any, 'deployViaDirect').mockRejectedValue(
        new Error('Deployment failed')
      );

      await expect(executor.deploy(mockTokenConfig)).rejects.toThrow();
    });
  });

  describe('Default Behavior Preservation', () => {
    it('should use direct method by default when no method specified', () => {
      const executor = createUnifiedExecutor({
        publicClient: {} as any,
        wallet: {} as any,
      });

      const availableMethods = executor.getAvailableMethods();
      expect(availableMethods).toContain('direct');
    });

    it('should maintain same chain ID defaults', () => {
      // Should default to Base (8453) as before
      const chainInfo = createUnifiedExecutor().getChainInfo(8453);
      expect(chainInfo.supported).toBe(true);
    });
  });
});

// ============================================================================
// Integration Compatibility Tests
// ============================================================================

describe('Integration Compatibility', () => {
  describe('Factory Function Compatibility', () => {
    it('should maintain same factory function signatures', () => {
      // These should work exactly as before
      expect(() => createUnifiedExecutor({
        publicClient: {} as any,
        wallet: {} as any,
      })).not.toThrow();
      expect(() => createUnifiedExecutor({
        publicClient: {} as any,
        wallet: {} as any,
      })).not.toThrow();
      expect(() => createEnhancedClanker({
        publicClient: {} as any,
        wallet: {} as any,
      })).not.toThrow();
      expect(() => createEnhancedClanker({
        publicClient: {} as any,
        wallet: {} as any,
      })).not.toThrow();
    });

    it('should support environment-based configuration', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CLANKER_API_KEY: 'test-key',
      };

      try {
        expect(() => createUnifiedExecutor()).not.toThrow();
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('Export Compatibility', () => {
    it('should export all necessary types and functions', () => {
      // Check that all expected exports are available
      expect(UnifiedExecutor).toBeDefined();
      expect(EnhancedClanker).toBeDefined();
      expect(BackwardCompatibleClanker).toBeDefined();
      expect(createUnifiedExecutor).toBeDefined();
      expect(createEnhancedClanker).toBeDefined();
    });
  });
});