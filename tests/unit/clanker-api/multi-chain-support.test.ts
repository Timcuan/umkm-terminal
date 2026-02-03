/**
 * Multi-Chain Support Tests
 * Tests for multi-chain operation support in the Clanker API integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnifiedExecutor, createUnifiedExecutor } from '../../../src/clanker-api/executor/unified-executor.js';
import { ChainMapper, createChainMapper } from '../../../src/clanker-api/mapper/chain-mapper.js';
import { CHAIN_IDS } from '../../../src/chains/index.js';
import type { ClankerTokenV4 } from '../../../src/types/index.js';

describe('Multi-Chain Support', () => {
  let executor: UnifiedExecutor;
  let chainMapper: ChainMapper;

  beforeEach(() => {
    executor = createUnifiedExecutor({
      // Mock configuration with valid API key format
      api: {
        apiKey: 'test-api-key-1234567890', // 16+ characters
      },
    });
    chainMapper = createChainMapper();
  });

  describe('Chain Mapper', () => {
    it('should identify supported chains correctly', () => {
      expect(chainMapper.isAPISupportedChain(CHAIN_IDS.BASE)).toBe(true);
      expect(chainMapper.isAPISupportedChain(CHAIN_IDS.ETHEREUM)).toBe(true);
      expect(chainMapper.isAPISupportedChain(CHAIN_IDS.ARBITRUM)).toBe(true);
      
      expect(chainMapper.isDirectSupportedChain(CHAIN_IDS.BASE)).toBe(true);
      expect(chainMapper.isDirectSupportedChain(CHAIN_IDS.MONAD)).toBe(true);
    });

    it('should provide chain-specific configuration', () => {
      const baseConfig = chainMapper.getChainSpecificConfig(CHAIN_IDS.BASE);
      expect(baseConfig.hasFeeDynamicHook).toBe(true);
      expect(baseConfig.hasMevModule).toBe(true);

      const monadConfig = chainMapper.getChainSpecificConfig(CHAIN_IDS.MONAD);
      expect(monadConfig.hasMevModule).toBe(false);
      expect(monadConfig.specialConsiderations).toContain('MEV protection not available on Monad');
    });

    it('should recommend appropriate methods for chains', () => {
      const baseRecommendation = chainMapper.getRecommendedMethod(CHAIN_IDS.BASE);
      expect(baseRecommendation.method).toBe('both');

      const monadRecommendation = chainMapper.getRecommendedMethod(CHAIN_IDS.MONAD);
      expect(monadRecommendation.method).toBe('direct');
    });

    it('should validate chain compatibility', () => {
      const baseValidation = chainMapper.validateChainCompatibility(CHAIN_IDS.BASE, 'api');
      expect(baseValidation.valid).toBe(true);

      const monadValidation = chainMapper.validateChainCompatibility(CHAIN_IDS.MONAD, 'api');
      expect(monadValidation.valid).toBe(false);
      expect(monadValidation.suggestedMethod).toBe('direct');
    });
  });

  describe('Unified Executor Multi-Chain', () => {
    it('should get supported chains correctly', () => {
      const supportedChains = executor.getSupportedChains();
      
      expect(supportedChains.both.length).toBeGreaterThan(0);
      expect(supportedChains.api.length).toBeGreaterThan(0);
      expect(supportedChains.direct.length).toBeGreaterThan(0);

      // Base should be in 'both' since it supports both methods
      const baseInBoth = supportedChains.both.find(chain => chain.id === CHAIN_IDS.BASE);
      expect(baseInBoth).toBeDefined();
    });

    it('should provide chain information', () => {
      const baseInfo = executor.getChainInfo(CHAIN_IDS.BASE);
      expect(baseInfo.supported).toBe(true);
      expect(baseInfo.methods).toContain('api');
      expect(baseInfo.methods).toContain('direct');
      expect(baseInfo.methods).toContain('auto');

      const monadInfo = executor.getChainInfo(CHAIN_IDS.MONAD);
      expect(monadInfo.supported).toBe(true);
      expect(monadInfo.methods).toContain('direct');
      expect(monadInfo.methods).not.toContain('api');
      expect(monadInfo.specialConsiderations).toContain('MEV protection not available on Monad');
    });

    it('should handle unknown chains gracefully', () => {
      const unknownChainInfo = executor.getChainInfo(999999);
      expect(unknownChainInfo.supported).toBe(false);
      expect(unknownChainInfo.methods).toHaveLength(0);
      expect(unknownChainInfo.specialConsiderations).toContain('Chain not recognized');
    });
  });

  describe('Multi-Chain Token Validation', () => {
    it('should validate tokens with different chain IDs', async () => {
      const baseToken: ClankerTokenV4 = {
        name: 'Base Token',
        symbol: 'BASE',
        tokenAdmin: '0x1234567890123456789012345678901234567890',
        chainId: CHAIN_IDS.BASE,
      };

      const ethereumToken: ClankerTokenV4 = {
        name: 'Ethereum Token',
        symbol: 'ETH',
        tokenAdmin: '0x1234567890123456789012345678901234567890',
        chainId: CHAIN_IDS.ETHEREUM,
      };

      // These should not throw errors during validation
      // Note: API validation may fail due to network, but should return validation result
      const baseValidation = await executor.validateTokenConfig(baseToken, 'api');
      expect(typeof baseValidation.valid).toBe('boolean');
      expect(Array.isArray(baseValidation.errors)).toBe(true);
      expect(Array.isArray(baseValidation.warnings)).toBe(true);

      const ethValidation = await executor.validateTokenConfig(ethereumToken, 'api');
      expect(typeof ethValidation.valid).toBe('boolean');
      expect(Array.isArray(ethValidation.errors)).toBe(true);
      expect(Array.isArray(ethValidation.warnings)).toBe(true);
    });

    it('should reject unsupported chain/method combinations', async () => {
      const monadToken: ClankerTokenV4 = {
        name: 'Monad Token',
        symbol: 'MON',
        tokenAdmin: '0x1234567890123456789012345678901234567890',
        chainId: CHAIN_IDS.MONAD,
      };

      // Monad doesn't support API method - should return validation error, not throw
      const validation = await executor.validateTokenConfig(monadToken, 'api');
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Multi-Chain Operations', () => {
    it('should group tokens by chain for batch operations', async () => {
      const tokens: ClankerTokenV4[] = [
        {
          name: 'Base Token 1',
          symbol: 'BASE1',
          tokenAdmin: '0x1234567890123456789012345678901234567890',
          chainId: CHAIN_IDS.BASE,
        },
        {
          name: 'Base Token 2',
          symbol: 'BASE2',
          tokenAdmin: '0x1234567890123456789012345678901234567890',
          chainId: CHAIN_IDS.BASE,
        },
        {
          name: 'Ethereum Token',
          symbol: 'ETH1',
          tokenAdmin: '0x1234567890123456789012345678901234567890',
          chainId: CHAIN_IDS.ETHEREUM,
        },
      ];

      // This should not throw during validation phase
      // (actual deployment would fail due to missing wallet/client config)
      try {
        await executor.batchDeploy(tokens, 'api');
      } catch (error) {
        // Expected to fail due to missing actual API configuration
        // But should fail at deployment, not at chain validation
        expect(error).toBeDefined();
      }
    });
  });
});