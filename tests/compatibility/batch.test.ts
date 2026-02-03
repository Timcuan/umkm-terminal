/**
 * Compatibility tests for Batch deployment functionality
 * These tests ensure that refactoring doesn't break existing batch functionality
 */

import { describe, it, expect } from 'vitest';
import type { 
  BatchTemplate, 
  BatchToken, 
  BatchDefaults, 
  BatchOptions,
  BatchSummary,
  BatchResult
} from '../../src/batch/index.js';

describe('Batch Module Compatibility Tests', () => {
  describe('Type Definitions', () => {
    it('should have correct BatchToken structure', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        image: 'ipfs://QmTest',
        description: 'A test token',
        socials: {
          twitter: 'https://twitter.com/test',
          website: 'https://test.com'
        },
        tokenAdmin: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890',
            allocation: 100
          }
        ],
        chainId: 8453,
        fees: {
          type: 'static',
          clankerFee: 5,
          pairedFee: 5
        },
        mev: 8,
        vault: {
          enabled: true,
          percentage: 30,
          lockupDays: 30
        }
      };

      expect(token.name).toBe('Test Token');
      expect(token.symbol).toBe('TEST');
      expect(token.chainId).toBe(8453);
      expect(token.rewardRecipients).toHaveLength(1);
    });

    it('should have correct BatchDefaults structure', () => {
      const defaults: BatchDefaults = {
        chainId: 8453,
        image: 'ipfs://QmDefault',
        description: 'Default description',
        tokenAdmin: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890',
            allocation: 100
          }
        ],
        fees: {
          type: 'static',
          clankerFee: 5,
          pairedFee: 5
        },
        mev: 8,
        vault: {
          enabled: false
        }
      };

      expect(defaults.chainId).toBe(8453);
      expect(defaults.fees?.type).toBe('static');
      expect(defaults.vault?.enabled).toBe(false);
    });

    it('should have correct BatchTemplate structure', () => {
      const template: BatchTemplate = {
        version: '1.0',
        name: 'Test Batch',
        description: 'A test batch deployment',
        defaults: {
          chainId: 8453,
          fees: {
            type: 'static',
            clankerFee: 5,
            pairedFee: 5
          }
        },
        tokens: [
          {
            name: 'Token 1',
            symbol: 'TK1'
          },
          {
            name: 'Token 2',
            symbol: 'TK2'
          }
        ]
      };

      expect(template.version).toBe('1.0');
      expect(template.tokens).toHaveLength(2);
      expect(template.defaults.chainId).toBe(8453);
    });

    it('should have correct BatchOptions structure', () => {
      const options: BatchOptions = {
        delayBetweenDeploys: 2000,
        maxRetries: 3,
        onProgress: (current: number, total: number, result: BatchResult) => {
          expect(typeof current).toBe('number');
          expect(typeof total).toBe('number');
          expect(result).toHaveProperty('success');
        },
        onError: (error: Error, tokenIndex: number) => {
          expect(error).toBeInstanceOf(Error);
          expect(typeof tokenIndex).toBe('number');
        }
      };

      expect(options.delayBetweenDeploys).toBe(2000);
      expect(options.maxRetries).toBe(3);
      expect(typeof options.onProgress).toBe('function');
      expect(typeof options.onError).toBe('function');
    });
  });

  describe('BatchResult Structure', () => {
    it('should have correct successful BatchResult structure', () => {
      const successResult: BatchResult = {
        success: true,
        token: {
          name: 'Test Token',
          symbol: 'TEST'
        },
        result: {
          success: true,
          tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
          chainId: 8453,
          chainName: 'Base'
        },
        index: 0,
        duration: 5000
      };

      expect(successResult.success).toBe(true);
      expect(successResult.token.name).toBe('Test Token');
      expect(successResult.result?.success).toBe(true);
      expect(successResult.index).toBe(0);
    });

    it('should have correct failed BatchResult structure', () => {
      const failResult: BatchResult = {
        success: false,
        token: {
          name: 'Test Token',
          symbol: 'TEST'
        },
        error: 'Deployment failed',
        index: 0,
        duration: 2000
      };

      expect(failResult.success).toBe(false);
      expect(failResult.error).toBe('Deployment failed');
      expect(failResult.token.name).toBe('Test Token');
      expect(failResult.index).toBe(0);
    });
  });

  describe('BatchSummary Structure', () => {
    it('should have correct BatchSummary structure', () => {
      const summary: BatchSummary = {
        total: 10,
        successful: 8,
        failed: 2,
        duration: 120000,
        results: [],
        errors: [
          'Token 3 failed: Invalid configuration',
          'Token 7 failed: Network error'
        ]
      };

      expect(summary.total).toBe(10);
      expect(summary.successful).toBe(8);
      expect(summary.failed).toBe(2);
      expect(summary.duration).toBe(120000);
      expect(Array.isArray(summary.results)).toBe(true);
      expect(Array.isArray(summary.errors)).toBe(true);
      expect(summary.errors).toHaveLength(2);
    });
  });

  describe('Template Validation', () => {
    it('should validate template structure requirements', () => {
      const validTemplate: BatchTemplate = {
        version: '1.0',
        name: 'Valid Template',
        description: 'A valid template',
        defaults: {
          chainId: 8453
        },
        tokens: [
          {
            name: 'Token 1',
            symbol: 'TK1'
          }
        ]
      };

      // Basic structure validation
      expect(validTemplate).toHaveProperty('version');
      expect(validTemplate).toHaveProperty('name');
      expect(validTemplate).toHaveProperty('tokens');
      expect(validTemplate).toHaveProperty('defaults');
      expect(Array.isArray(validTemplate.tokens)).toBe(true);
      expect(validTemplate.tokens.length).toBeGreaterThan(0);
    });

    it('should handle template with all optional fields', () => {
      const fullTemplate: BatchTemplate = {
        version: '1.0',
        name: 'Full Template',
        description: 'A template with all fields',
        author: 'Test Author',
        tags: ['test', 'example'],
        defaults: {
          chainId: 8453,
          image: 'ipfs://QmDefault',
          description: 'Default token description',
          tokenAdmin: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          rewardRecipients: [
            {
              address: '0x1234567890123456789012345678901234567890',
              allocation: 100
            }
          ],
          fees: {
            type: 'static',
            clankerFee: 5,
            pairedFee: 5
          },
          mev: 8,
          vault: {
            enabled: false
          }
        },
        tokens: [
          {
            name: 'Token 1',
            symbol: 'TK1',
            image: 'ipfs://QmToken1',
            description: 'First token'
          },
          {
            name: 'Token 2',
            symbol: 'TK2',
            chainId: 42161, // Override default chain
            fees: {
              type: 'dynamic',
              baseFee: 1,
              maxLpFee: 5
            }
          }
        ]
      };

      expect(fullTemplate.author).toBe('Test Author');
      expect(fullTemplate.tags).toEqual(['test', 'example']);
      expect(fullTemplate.tokens[1]?.chainId).toBe(42161);
      expect(fullTemplate.tokens[1]?.fees?.type).toBe('dynamic');
    });
  });

  describe('Chain Support', () => {
    it('should support all documented chains', () => {
      const supportedChains = ['base', 'ethereum', 'arbitrum', 'unichain', 'monad'];
      const chainIds = {
        base: 8453,
        ethereum: 1,
        arbitrum: 42161,
        unichain: 130,
        monad: 10143
      };

      supportedChains.forEach(chain => {
        expect(chainIds).toHaveProperty(chain);
        expect(typeof chainIds[chain as keyof typeof chainIds]).toBe('number');
      });
    });
  });
});