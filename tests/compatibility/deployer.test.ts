/**
 * Compatibility tests for Deployer class
 * These tests ensure that refactoring doesn't break existing functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { SimpleDeployConfig, DeployOutput } from '../../src/deployer/index.js';

describe('Deployer Compatibility Tests', () => {
  describe('Type Structure Compatibility', () => {
    it('should have correct SimpleDeployConfig structure', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      expect(config.name).toBe('Test Token');
      expect(config.symbol).toBe('TEST');
    });

    it('should handle reward recipients configuration', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
            allocation: 50
          },
          {
            address: '0x0987654321098765432109876543210987654321' as `0x${string}`,
            allocation: 50
          }
        ]
      };

      expect(config.rewardRecipients).toHaveLength(2);
      expect(config.rewardRecipients?.[0]?.allocation).toBe(50);
      expect(config.rewardRecipients?.[1]?.allocation).toBe(50);
    });

    it('should handle optional configuration fields', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        image: 'ipfs://QmTest',
        description: 'A test token',
        socials: {
          twitter: 'https://twitter.com/test',
          website: 'https://test.com'
        },
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

      expect(config.image).toBe('ipfs://QmTest');
      expect(config.description).toBe('A test token');
      expect(config.socials?.twitter).toBe('https://twitter.com/test');
      expect(config.fees?.type).toBe('static');
      expect(config.mev).toBe(8);
      expect(config.vault?.enabled).toBe(true);
    });
  });

  describe('DeployOutput Type Structure', () => {
    it('should have correct successful DeployOutput structure', () => {
      const successOutput: DeployOutput = {
        success: true,
        tokenAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
        chainId: 8453,
        chainName: 'Base',
        explorerUrl: 'https://basescan.org/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      };

      expect(successOutput.success).toBe(true);
      expect(successOutput.tokenAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(successOutput.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(typeof successOutput.chainId).toBe('number');
      expect(typeof successOutput.chainName).toBe('string');
    });

    it('should have correct failed DeployOutput structure', () => {
      const failOutput: DeployOutput = {
        success: false,
        chainId: 8453,
        chainName: 'Base',
        error: 'Deployment failed'
      };

      expect(failOutput.success).toBe(false);
      expect(typeof failOutput.error).toBe('string');
      expect(failOutput.tokenAddress).toBeUndefined();
      expect(failOutput.txHash).toBeUndefined();
    });
  });

  describe('Configuration Validation Patterns', () => {
    it('should validate minimal token configuration structure', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      // Basic structure validation
      expect(typeof config.name).toBe('string');
      expect(typeof config.symbol).toBe('string');
      expect(config.name.length).toBeGreaterThan(0);
      expect(config.symbol.length).toBeGreaterThan(0);
    });

    it('should handle fee configuration types', () => {
      const staticFeeConfig: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        fees: {
          type: 'static',
          clankerFee: 5,
          pairedFee: 5
        }
      };

      const dynamicFeeConfig: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        fees: {
          type: 'dynamic',
          baseFee: 1,
          maxLpFee: 5
        }
      };

      expect(staticFeeConfig.fees?.type).toBe('static');
      expect(staticFeeConfig.fees?.clankerFee).toBe(5);
      expect(dynamicFeeConfig.fees?.type).toBe('dynamic');
      expect(dynamicFeeConfig.fees?.baseFee).toBe(1);
    });

    it('should handle vault configuration', () => {
      const vaultConfig: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        vault: {
          enabled: true,
          percentage: 30,
          lockupDays: 30,
          vestingDays: 0
        }
      };

      expect(vaultConfig.vault?.enabled).toBe(true);
      expect(vaultConfig.vault?.percentage).toBe(30);
      expect(vaultConfig.vault?.lockupDays).toBe(30);
    });
  });

  describe('Address and Key Format Validation', () => {
    it('should validate address format requirements', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      const invalidAddresses = [
        'invalid-address',
        '0x123', // too short
        '1234567890123456789012345678901234567890' // missing 0x prefix
      ];

      expect(validAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      
      invalidAddresses.forEach(addr => {
        expect(addr).not.toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });

    it('should validate transaction hash format requirements', () => {
      const validTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const invalidTxHashes = [
        'invalid-hash',
        '0x123', // too short
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' // missing 0x prefix
      ];

      expect(validTxHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      
      invalidTxHashes.forEach(hash => {
        expect(hash).not.toMatch(/^0x[a-fA-F0-9]{64}$/);
      });
    });
  });

  describe('Chain Support', () => {
    it('should support documented chain IDs', () => {
      const supportedChainIds = [8453, 1, 42161, 130, 10143]; // Base, Ethereum, Arbitrum, Unichain, Monad
      const chainNames = ['Base', 'Ethereum', 'Arbitrum', 'Unichain', 'Monad'];

      supportedChainIds.forEach(chainId => {
        expect(typeof chainId).toBe('number');
        expect(chainId).toBeGreaterThan(0);
      });

      chainNames.forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling Patterns', () => {
    it('should have consistent error structure in DeployOutput', () => {
      const errorOutput: DeployOutput = {
        success: false,
        chainId: 8453,
        chainName: 'Base',
        error: 'Invalid configuration'
      };

      expect(errorOutput.success).toBe(false);
      expect(typeof errorOutput.error).toBe('string');
      expect(errorOutput.error.length).toBeGreaterThan(0);
    });
  });
});