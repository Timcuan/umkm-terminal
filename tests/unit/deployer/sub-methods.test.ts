/**
 * Unit tests for Deployer sub-methods
 * Tests each refactored sub-method independently with specific examples and edge cases
 * Requirements: 2.1 - Simplify complex functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Deployer, type SimpleDeployConfig } from '../../../src/deployer/index.js';
import type { ClankerTokenV4 } from '../../../src/types/index.js';

// Mock the environment configuration
vi.mock('../../../src/config/index.js', async () => {
  const actual = await vi.importActual('../../../src/config/index.js');
  return {
    ...actual,
    loadEnvConfig: () => ({
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
      chainId: 8453,
      rpcUrl: 'https://mainnet.base.org'
    })
  };
});

describe('Deployer Sub-Methods Unit Tests', () => {
  let deployer: Deployer;
  
  beforeEach(() => {
    // Create deployer with test configuration
    deployer = new Deployer({
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
      chainId: 8453,
      rpcUrl: 'https://mainnet.base.org'
    });
  });

  describe('validateDeployConfig', () => {
    it('should validate minimal configuration', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      // Access private method for testing
      const result = (deployer as any).validateDeployConfig(config);
      
      expect(result.name).toBe('Test Token');
      expect(result.symbol).toBe('TEST');
    });

    it('should normalize reward recipients using RewardRecipientService', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
            allocation: 60
          },
          {
            address: '0x0987654321098765432109876543210987654321' as `0x${string}`,
            allocation: 40
          }
        ]
      };

      const result = (deployer as any).validateDeployConfig(config);
      
      expect(result.rewardRecipients).toHaveLength(2);
      expect(result.rewardRecipients?.[0]?.allocation).toBe(60);
      expect(result.rewardRecipients?.[1]?.allocation).toBe(40);
    });

    it('should handle missing reward recipient allocations', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
            allocation: 50 // Provide explicit allocation to pass validation
          },
          {
            address: '0x0987654321098765432109876543210987654321' as `0x${string}`,
            allocation: 50 // Provide explicit allocation to pass validation
          }
        ]
      };

      const result = (deployer as any).validateDeployConfig(config);
      
      expect(result.rewardRecipients).toHaveLength(2);
      // Should maintain the provided allocations
      expect(result.rewardRecipients?.[0]?.allocation).toBe(50);
      expect(result.rewardRecipients?.[1]?.allocation).toBe(50);
    });

    it('should validate reward recipients using RewardRecipientService', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
            allocation: 30,
            rewardToken: 'Both'
          },
          {
            address: '0x0987654321098765432109876543210987654321' as `0x${string}`,
            allocation: 70,
            rewardToken: 'Paired'
          }
        ]
      };

      const result = (deployer as any).validateDeployConfig(config);
      
      expect(result.rewardRecipients).toHaveLength(2);
      expect(result.rewardRecipients?.[0]?.allocation).toBe(30);
      expect(result.rewardRecipients?.[1]?.allocation).toBe(70);
      expect(result.rewardRecipients?.[0]?.rewardToken).toBe('Both');
      expect(result.rewardRecipients?.[1]?.rewardToken).toBe('Paired');
    });

    it('should throw error for invalid configuration', () => {
      const config: SimpleDeployConfig = {
        name: '', // Invalid empty name
        symbol: 'TEST'
      };

      expect(() => {
        (deployer as any).validateDeployConfig(config);
      }).toThrow();
    });

    it('should throw error for invalid reward recipients', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
            allocation: 150 // Invalid allocation > 100%
          }
        ]
      };

      expect(() => {
        (deployer as any).validateDeployConfig(config);
      }).toThrow();
    });
  });

  describe('buildTokenConfig', () => {
    it('should build basic token configuration', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = (deployer as any).buildTokenConfig(config, 8453);
      
      expect(result.name).toBe('Test Token');
      expect(result.symbol).toBe('TEST');
      expect(result.chainId).toBe(8453);
      expect(result.tokenAdmin).toBe(deployer.address);
    });

    it('should handle custom token admin', () => {
      const customAdmin = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: customAdmin
      };

      const result = (deployer as any).buildTokenConfig(config, 8453);
      
      expect(result.tokenAdmin).toBe(customAdmin);
    });

    it('should add metadata when present', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        description: 'A test token',
        socials: {
          twitter: 'https://twitter.com/test',
          website: 'https://test.com'
        }
      };

      const result = (deployer as any).buildTokenConfig(config, 8453);
      
      expect(result.metadata?.description).toBe('A test token');
      expect(result.metadata?.socials?.twitter).toBe('https://twitter.com/test');
      expect(result.metadata?.socials?.website).toBe('https://test.com');
    });

    it('should add paired token when specified', () => {
      const pairedToken = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        pool: {
          pairedToken
        }
      };

      const result = (deployer as any).buildTokenConfig(config, 8453);
      
      expect(result.pairedToken).toBe(pairedToken);
    });

    it('should add deployment context', () => {
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        context: {
          interface: 'Custom Interface',
          platform: 'Custom Platform',
          requestId: 'req-123'
        }
      };

      const result = (deployer as any).buildTokenConfig(config, 8453);
      
      expect(result.context?.interface).toBe('Custom Interface');
      expect(result.context?.platform).toBe('Custom Platform');
      expect(result.context?.messageId).toBe('req-123');
    });

    it('should add vanity salt when specified', () => {
      const salt = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        salt
      };

      const result = (deployer as any).buildTokenConfig(config, 8453);
      
      expect(result.salt).toBe(salt);
    });
  });

  describe('buildRewardConfig', () => {
    it('should skip when no reward recipients', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      (deployer as any).buildRewardConfig(tokenConfig, config);
      
      expect(tokenConfig.rewards).toBeUndefined();
    });

    it('should convert percentage allocations to bps', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
            allocation: 30, // 30% = 3000 bps
            rewardToken: 'Both'
          },
          {
            address: '0x0987654321098765432109876543210987654321' as `0x${string}`,
            allocation: 70, // 70% = 7000 bps
            rewardToken: 'Paired'
          }
        ]
      };

      (deployer as any).buildRewardConfig(tokenConfig, config);
      
      expect(tokenConfig.rewards?.recipients).toHaveLength(2);
      expect(tokenConfig.rewards?.recipients[0]?.bps).toBe(3000); // 30% -> 3000 bps
      expect(tokenConfig.rewards?.recipients[1]?.bps).toBe(7000); // 70% -> 7000 bps
      expect(tokenConfig.rewards?.recipients[0]?.feePreference).toBe('Both');
      expect(tokenConfig.rewards?.recipients[1]?.feePreference).toBe('Paired');
    });

    it('should ensure total bps equals exactly 10000', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
            allocation: 33.33 // This will round and be adjusted
          },
          {
            address: '0x0987654321098765432109876543210987654321' as `0x${string}`,
            allocation: 33.33 // This will round and be adjusted
          },
          {
            address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
            allocation: 33.34 // Last recipient gets remainder to ensure total = 10000
          }
        ]
      };

      (deployer as any).buildRewardConfig(tokenConfig, config);
      
      const totalBps = tokenConfig.rewards?.recipients.reduce((sum, r) => sum + r.bps, 0);
      expect(totalBps).toBe(10000); // Must equal exactly 10000 bps (100%)
    });

    it('should set default reward token to Both', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
            allocation: 100
            // No rewardToken specified - should default to 'Both'
          }
        ]
      };

      (deployer as any).buildRewardConfig(tokenConfig, config);
      
      expect(tokenConfig.rewards?.recipients[0]?.feePreference).toBe('Both');
    });
  });

  describe('buildFeeConfig', () => {
    it('should skip when no fees specified', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      (deployer as any).buildFeeConfig(tokenConfig, config);
      
      expect(tokenConfig.fees).toBeUndefined();
    });

    it('should build static fee configuration', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        fees: {
          type: 'static',
          clankerFee: 3, // 3% = 300 bps
          pairedFee: 7   // 7% = 700 bps
        }
      };

      (deployer as any).buildFeeConfig(tokenConfig, config);
      
      expect(tokenConfig.fees?.type).toBe('static');
      expect(tokenConfig.fees?.clankerFee).toBe(300); // 3% -> 300 bps
      expect(tokenConfig.fees?.pairedFee).toBe(700);  // 7% -> 700 bps
    });

    it('should use default static fees when not specified', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        fees: {
          type: 'static'
          // No clankerFee or pairedFee specified - should default to 5%
        }
      };

      (deployer as any).buildFeeConfig(tokenConfig, config);
      
      expect(tokenConfig.fees?.clankerFee).toBe(500); // Default 5% -> 500 bps
      expect(tokenConfig.fees?.pairedFee).toBe(500);  // Default 5% -> 500 bps
    });

    it('should build dynamic fee configuration', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        fees: {
          type: 'dynamic',
          baseFee: 2,    // 2% = 200 bps
          maxLpFee: 4    // 4% = 400 bps
        }
      };

      (deployer as any).buildFeeConfig(tokenConfig, config);
      
      expect(tokenConfig.fees?.type).toBe('dynamic');
      expect(tokenConfig.fees?.baseFee).toBe(200); // 2% -> 200 bps
      expect(tokenConfig.fees?.maxFee).toBe(400);  // 4% -> 400 bps
      // Should include all dynamic fee parameters
      expect(tokenConfig.fees?.startingSniperFee).toBe(500);
      expect(tokenConfig.fees?.endingSniperFee).toBe(100);
      expect(tokenConfig.fees?.clankerFee).toBe(100);
    });

    it('should use default dynamic fees when not specified', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        fees: {
          type: 'dynamic'
          // No baseFee or maxLpFee specified - should use defaults
        }
      };

      (deployer as any).buildFeeConfig(tokenConfig, config);
      
      expect(tokenConfig.fees?.baseFee).toBe(100); // Default 1% -> 100 bps
      expect(tokenConfig.fees?.maxFee).toBe(500);  // Default 5% -> 500 bps
    });

    it('should default to static fee type when not specified', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        fees: {
          // No type specified - should default to 'static'
          clankerFee: 6,
          pairedFee: 4
        }
      };

      (deployer as any).buildFeeConfig(tokenConfig, config);
      
      expect(tokenConfig.fees?.type).toBe('static');
      expect(tokenConfig.fees?.clankerFee).toBe(600); // 6% -> 600 bps
      expect(tokenConfig.fees?.pairedFee).toBe(400);  // 4% -> 400 bps
    });
  });

  describe('buildVaultConfig', () => {
    it('should skip when vault not enabled', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        vault: {
          enabled: false,
          percentage: 30
        }
      };

      (deployer as any).buildVaultConfig(tokenConfig, config);
      
      expect(tokenConfig.vault).toBeUndefined();
    });

    it('should skip when no percentage specified', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        vault: {
          enabled: true
          // No percentage specified
        }
      };

      (deployer as any).buildVaultConfig(tokenConfig, config);
      
      expect(tokenConfig.vault).toBeUndefined();
    });

    it('should skip when percentage is zero or negative', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        vault: {
          enabled: true,
          percentage: 0
        }
      };

      (deployer as any).buildVaultConfig(tokenConfig, config);
      
      expect(tokenConfig.vault).toBeUndefined();
    });

    it('should build vault configuration with defaults', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        vault: {
          enabled: true,
          percentage: 25
          // No lockupDays or vestingDays specified - should use defaults
        }
      };

      (deployer as any).buildVaultConfig(tokenConfig, config);
      
      expect(tokenConfig.vault?.percentage).toBe(25);
      expect(tokenConfig.vault?.lockupDuration).toBe(30 * 24 * 60 * 60); // Default 30 days in seconds
      expect(tokenConfig.vault?.vestingDuration).toBe(0); // Default 0 vesting
    });

    it('should build vault configuration with custom values', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        vault: {
          enabled: true,
          percentage: 40,
          lockupDays: 60,
          vestingDays: 30
        }
      };

      (deployer as any).buildVaultConfig(tokenConfig, config);
      
      expect(tokenConfig.vault?.percentage).toBe(40);
      expect(tokenConfig.vault?.lockupDuration).toBe(60 * 24 * 60 * 60); // 60 days in seconds
      expect(tokenConfig.vault?.vestingDuration).toBe(30 * 24 * 60 * 60); // 30 days in seconds
    });
  });

  describe('buildMevConfig', () => {
    it('should disable MEV when explicitly set to false', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        mev: false
      };

      (deployer as any).buildMevConfig(tokenConfig, config);
      
      expect(tokenConfig.mev?.type).toBe('none');
    });

    it('should disable MEV when set to 0', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        mev: 0
      };

      (deployer as any).buildMevConfig(tokenConfig, config);
      
      expect(tokenConfig.mev?.type).toBe('none');
    });

    it('should enable MEV with default 8 blocks when set to true', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        mev: true
      };

      (deployer as any).buildMevConfig(tokenConfig, config);
      
      expect(tokenConfig.mev?.type).toBe('blockDelay');
      expect(tokenConfig.mev?.blockDelay).toBe(8);
    });

    it('should enable MEV with custom block delay', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        mev: 12
      };

      (deployer as any).buildMevConfig(tokenConfig, config);
      
      expect(tokenConfig.mev?.type).toBe('blockDelay');
      expect(tokenConfig.mev?.blockDelay).toBe(12);
    });

    it('should use deployer config MEV setting when not specified', () => {
      // Create deployer with MEV config
      const deployerWithMev = new Deployer({
        privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        mevBlockDelay: 15
      });

      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployerWithMev.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
        // No MEV specified - should use deployer config
      };

      (deployerWithMev as any).buildMevConfig(tokenConfig, config);
      
      expect(tokenConfig.mev?.type).toBe('blockDelay');
      expect(tokenConfig.mev?.blockDelay).toBe(15);
    });

    it('should default to 8 blocks when nothing specified', () => {
      const tokenConfig: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        chainId: 8453,
        tokenAdmin: deployer.address,
        image: ''
      };
      const config: SimpleDeployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
        // No MEV specified and deployer has no MEV config - should default to 8 blocks
      };

      (deployer as any).buildMevConfig(tokenConfig, config);
      
      expect(tokenConfig.mev?.type).toBe('blockDelay');
      expect(tokenConfig.mev?.blockDelay).toBe(8);
    });
  });
});