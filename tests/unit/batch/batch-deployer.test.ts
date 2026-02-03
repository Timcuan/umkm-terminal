/**
 * Unit tests for BatchDeployer class
 * Tests deployment orchestration, error handling, and progress callbacks
 * Requirements: 2.2 - Simplify complex functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchDeployer } from '../../../src/batch/batch-deployer.js';
import type { 
  BatchTemplate, 
  BatchToken, 
  BatchOptions, 
  BatchResult 
} from '../../../src/batch/types.js';

// Mock the deployer module
vi.mock('../../../src/deployer/index.js', () => ({
  createDeployer: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    deploy: vi.fn()
  })),
  createDeployerFactory: vi.fn(() => ({
    create: vi.fn(() => ({
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      deploy: vi.fn()
    }))
  }))
}));

describe('BatchDeployer Unit Tests', () => {
  let mockDeployer: any;
  let batchDeployer: BatchDeployer;
  let basicTemplate: BatchTemplate;
  let basicOptions: BatchOptions;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock the createDeployerFactory function
    const { createDeployerFactory } = await import('../../../src/deployer/index.js');
    const mockFactory = {
      create: vi.fn(() => mockDeployer)
    };
    (createDeployerFactory as any).mockReturnValue(mockFactory);
    
    // Mock deployer
    mockDeployer = {
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      deploy: vi.fn()
    };

    // Basic template for testing
    basicTemplate = {
      name: 'Test Batch',
      chain: 'base',
      defaults: {
        fee: 5,
        mev: 8,
        tokenAdmin: '0x1111111111111111111111111111111111111111',
        rewardRecipient: '0x2222222222222222222222222222222222222222',
        rewardToken: 'Both'
      },
      tokens: [
        {
          name: 'Test Token 1',
          symbol: 'TEST1'
        },
        {
          name: 'Test Token 2',
          symbol: 'TEST2'
        }
      ]
    };

    // Basic options for testing
    basicOptions = {
      delay: 1,
      retries: 1
    };

    batchDeployer = new BatchDeployer(basicTemplate, basicOptions);
  });

  describe('Constructor', () => {
    it('should initialize with template and options', () => {
      expect(batchDeployer).toBeDefined();
      expect((batchDeployer as any).template).toEqual(basicTemplate);
      expect((batchDeployer as any).options).toEqual(basicOptions);
    });

    it('should create deployer for specified chain', async () => {
      const { createDeployerFactory } = await import('../../../src/deployer/index.js');
      const mockFactory = (createDeployerFactory as any).mock.results[0].value;
      expect(mockFactory.create).toHaveBeenCalledWith(8453); // Base chain ID
    });

    it('should default to base chain when not specified', async () => {
      const templateWithoutChain = { ...basicTemplate };
      delete templateWithoutChain.chain;
      
      new BatchDeployer(templateWithoutChain, basicOptions);
      
      const { createDeployerFactory } = await import('../../../src/deployer/index.js');
      const mockFactory = (createDeployerFactory as any).mock.results[1].value;
      expect(mockFactory.create).toHaveBeenCalledWith(8453); // Base chain ID
    });

    it('should handle different chain configurations', async () => {
      const chains = [
        { chain: 'ethereum', expectedId: 1 },
        { chain: 'arbitrum', expectedId: 42161 },
        { chain: 'unichain', expectedId: 130 },
        { chain: 'monad', expectedId: 10143 }
      ];

      chains.forEach(({ chain, expectedId }) => {
        const template = { ...basicTemplate, chain: chain as any };
        new BatchDeployer(template, basicOptions);
      });
      
      const { createDeployerFactory } = await import('../../../src/deployer/index.js');
      // Should have been called for each chain + the original calls
      expect(createDeployerFactory).toHaveBeenCalledTimes(5); // 1 original + 4 new
    });
  });

  describe('buildDeployConfig', () => {
    it('should build basic deployment configuration', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const config = batchDeployer.buildDeployConfig(token);

      expect(config.name).toBe('Test Token');
      expect(config.symbol).toBe('TEST');
      expect(config.tokenAdmin).toBe('0x1111111111111111111111111111111111111111');
      expect(config.mev).toBe(8);
    });

    it('should use token-specific values over defaults', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: '0x3333333333333333333333333333333333333333',
        fee: 10,
        mev: 12
      };

      const config = batchDeployer.buildDeployConfig(token);

      expect(config.tokenAdmin).toBe('0x3333333333333333333333333333333333333333');
      expect(config.fees?.type).toBe('static');
      expect((config.fees as any)?.clankerFee).toBe(10);
      expect((config.fees as any)?.pairedFee).toBe(10);
      expect(config.mev).toBe(12);
    });

    it('should use deployer address when no admin specified', () => {
      const templateWithoutAdmin = {
        ...basicTemplate,
        defaults: { ...basicTemplate.defaults }
      };
      delete templateWithoutAdmin.defaults!.tokenAdmin;

      const deployer = new BatchDeployer(templateWithoutAdmin, basicOptions);
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const config = deployer.buildDeployConfig(token);

      expect(config.tokenAdmin).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should build static fee configuration', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        fee: 7
      };

      const config = batchDeployer.buildDeployConfig(token);

      expect(config.fees?.type).toBe('static');
      expect((config.fees as any)?.clankerFee).toBe(7);
      expect((config.fees as any)?.pairedFee).toBe(7);
    });

    it('should build dynamic fee configuration', () => {
      const templateWithDynamicFees = {
        ...basicTemplate,
        defaults: {
          ...basicTemplate.defaults,
          feeType: 'dynamic' as const,
          dynamicBaseFee: 2,
          dynamicMaxFee: 6
        }
      };

      const deployer = new BatchDeployer(templateWithDynamicFees, basicOptions);
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const config = deployer.buildDeployConfig(token);

      expect(config.fees?.type).toBe('dynamic');
      expect((config.fees as any)?.baseFee).toBe(2);
      expect((config.fees as any)?.maxLpFee).toBe(6);
    });

    it('should handle metadata and socials', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        description: 'A test token',
        socials: {
          website: 'https://test.com',
          twitter: 'https://twitter.com/test'
        }
      };

      const config = batchDeployer.buildDeployConfig(token);

      expect(config.description).toBe('A test token');
      expect(config.socials?.website).toBe('https://test.com');
      expect(config.socials?.twitter).toBe('https://twitter.com/test');
    });

    it('should handle vault configuration', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        vault: {
          enabled: true,
          percentage: 25,
          lockupDays: 60,
          vestingDays: 30
        }
      };

      const config = batchDeployer.buildDeployConfig(token);

      expect(config.vault?.enabled).toBe(true);
      expect(config.vault?.percentage).toBe(25);
      expect(config.vault?.lockupDays).toBe(60);
      expect(config.vault?.vestingDays).toBe(30);
    });

    it('should skip vault when not enabled', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        vault: {
          enabled: false,
          percentage: 25
        }
      };

      const config = batchDeployer.buildDeployConfig(token);

      expect(config.vault).toBeUndefined();
    });

    it('should add deployment context', () => {
      const config = batchDeployer.buildDeployConfig({
        name: 'Test Token',
        symbol: 'TEST'
      });

      expect(config.context?.interface).toBe('UMKM Terminal');
      expect(config.context?.platform).toBe('Clanker');
    });
  });

  describe('buildRewardRecipients', () => {
    it('should create single recipient when admin equals recipient', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const templateWithSameRecipient = {
        ...basicTemplate,
        defaults: {
          ...basicTemplate.defaults,
          tokenAdmin: '0x1111111111111111111111111111111111111111',
          rewardRecipient: '0x1111111111111111111111111111111111111111'
        }
      };

      const deployer = new BatchDeployer(templateWithSameRecipient, basicOptions);
      const recipients = (deployer as any).buildRewardRecipients(
        token,
        '0x1111111111111111111111111111111111111111' as `0x${string}`,
        '0x1111111111111111111111111111111111111111',
        'Both'
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0].address).toBe('0x1111111111111111111111111111111111111111');
      expect(recipients[0].allocation).toBe(100);
      expect(recipients[0].rewardToken).toBe('Both');
    });

    it('should create two recipients when admin differs from recipient', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const recipients = (batchDeployer as any).buildRewardRecipients(
        token,
        '0x1111111111111111111111111111111111111111' as `0x${string}`,
        '0x2222222222222222222222222222222222222222',
        'Both'
      );

      expect(recipients).toHaveLength(2);
      expect(recipients[0].address).toBe('0x1111111111111111111111111111111111111111');
      expect(recipients[0].allocation).toBe(1);
      expect(recipients[1].address).toBe('0x2222222222222222222222222222222222222222');
      expect(recipients[1].allocation).toBe(0.1);
    });

    it('should handle custom reward recipients', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x3333333333333333333333333333333333333333',
            allocation: 30
          },
          {
            address: '0x4444444444444444444444444444444444444444',
            allocation: 70
          }
        ]
      };

      const recipients = (batchDeployer as any).buildRewardRecipients(
        token,
        '0x1111111111111111111111111111111111111111' as `0x${string}`,
        '0x2222222222222222222222222222222222222222',
        'Paired'
      );

      expect(recipients).toHaveLength(2);
      expect(recipients[0].address).toBe('0x3333333333333333333333333333333333333333');
      expect(recipients[0].allocation).toBe(30);
      expect(recipients[0].rewardToken).toBe('Paired');
      expect(recipients[1].address).toBe('0x4444444444444444444444444444444444444444');
      expect(recipients[1].allocation).toBe(70);
      expect(recipients[1].rewardToken).toBe('Paired');
    });

    it('should handle missing allocations in custom recipients', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x3333333333333333333333333333333333333333',
            allocation: 40
          },
          {
            address: '0x4444444444444444444444444444444444444444',
            allocation: Number.NaN // Missing allocation
          }
        ]
      };

      const recipients = (batchDeployer as any).buildRewardRecipients(
        token,
        '0x1111111111111111111111111111111111111111' as `0x${string}`,
        '0x2222222222222222222222222222222222222222',
        'Both'
      );

      expect(recipients).toHaveLength(2);
      expect(recipients[0].allocation).toBe(40);
      expect(recipients[1].allocation).toBe(60); // Should get remaining 60%
    });

    it('should throw error when explicit allocations exceed 100%', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x3333333333333333333333333333333333333333',
            allocation: 60
          },
          {
            address: '0x4444444444444444444444444444444444444444',
            allocation: Number.NaN // Missing allocation - this triggers the error check
          },
          {
            address: '0x5555555555555555555555555555555555555555',
            allocation: 50 // This makes explicit total = 60, but with missing allocation it will exceed 100
          }
        ]
      };

      expect(() => {
        (batchDeployer as any).buildRewardRecipients(
          token,
          '0x1111111111111111111111111111111111111111' as `0x${string}`,
          '0x2222222222222222222222222222222222222222',
          'Both'
        );
      }).toThrow('Invalid rewardRecipients allocation: allocations exceed 100');
    });

    it('should throw error when not enough remaining allocation', () => {
      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          {
            address: '0x3333333333333333333333333333333333333333',
            allocation: 99
          },
          {
            address: '0x4444444444444444444444444444444444444444',
            allocation: Number.NaN // Only 1% remaining, but need at least 1% per recipient
          },
          {
            address: '0x5555555555555555555555555555555555555555',
            allocation: Number.NaN // This would need 0%, which is invalid
          }
        ]
      };

      expect(() => {
        (batchDeployer as any).buildRewardRecipients(
          token,
          '0x1111111111111111111111111111111111111111' as `0x${string}`,
          '0x2222222222222222222222222222222222222222',
          'Both'
        );
      }).toThrow('Invalid rewardRecipients allocation: not enough remaining allocation to distribute');
    });
  });

  describe('calculateDelay', () => {
    it('should return base delay when no random variation', () => {
      const deployer = new BatchDeployer(basicTemplate, { delay: 2 });
      const delay = (deployer as any).calculateDelay();
      
      expect(delay).toBe(2000); // 2 seconds in ms
    });

    it('should return base delay when random min equals max', () => {
      const deployer = new BatchDeployer(basicTemplate, { 
        delay: 2, 
        randomDelayMin: 1, 
        randomDelayMax: 1 
      });
      const delay = (deployer as any).calculateDelay();
      
      expect(delay).toBe(2000); // Only base delay, no random addition when min == max
    });

    it('should return delay within random range', () => {
      const deployer = new BatchDeployer(basicTemplate, { 
        delay: 2, 
        randomDelayMin: 1, 
        randomDelayMax: 3 
      });
      
      // Test multiple times to ensure it's within range
      for (let i = 0; i < 10; i++) {
        const delay = (deployer as any).calculateDelay();
        expect(delay).toBeGreaterThanOrEqual(3000); // 2 + 1
        expect(delay).toBeLessThanOrEqual(5000); // 2 + 3
      }
    });

    it('should use default delay when not specified', () => {
      const deployer = new BatchDeployer(basicTemplate, {});
      const delay = (deployer as any).calculateDelay();
      
      expect(delay).toBe(3000); // Default 3 seconds
    });
  });

  describe('normalizeImageUrl', () => {
    it('should return empty string for empty input', () => {
      const result = (batchDeployer as any).normalizeImageUrl('');
      expect(result).toBe('');
    });

    it('should preserve HTTP URLs', () => {
      const url = 'https://example.com/image.png';
      const result = (batchDeployer as any).normalizeImageUrl(url);
      expect(result).toBe(url);
    });

    it('should preserve IPFS URLs', () => {
      const url = 'ipfs://QmTest123';
      const result = (batchDeployer as any).normalizeImageUrl(url);
      expect(result).toBe(url);
    });

    it('should convert IPFS CID to ipfs:// format', () => {
      const cid = 'QmTest123456789';
      const result = (batchDeployer as any).normalizeImageUrl(cid);
      expect(result).toBe(`ipfs://${cid}`);
    });

    it('should handle different IPFS CID formats', () => {
      const cids = [
        'QmTest123',
        'bafyTest456',
        'bafkTest789'
      ];

      cids.forEach(cid => {
        const result = (batchDeployer as any).normalizeImageUrl(cid);
        expect(result).toBe(`ipfs://${cid}`);
      });
    });

    it('should return trimmed input for other formats', () => {
      const input = '  other-format  ';
      const result = (batchDeployer as any).normalizeImageUrl(input);
      expect(result).toBe('other-format');
    });
  });

  describe('deployToken', () => {
    it('should deploy token successfully on first attempt', async () => {
      const mockDeployResult = {
        success: true,
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };
      mockDeployer.deploy.mockResolvedValue(mockDeployResult);

      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = await batchDeployer.deployToken(token, 0);

      expect(result.success).toBe(true);
      expect(result.address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(result.txHash).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      expect(result.index).toBe(0);
      expect(result.name).toBe('Test Token');
      expect(result.symbol).toBe('TEST');
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockFailResult = {
        success: false,
        error: 'Network error'
      };
      const mockSuccessResult = {
        success: true,
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      mockDeployer.deploy
        .mockResolvedValueOnce(mockFailResult)
        .mockResolvedValueOnce(mockSuccessResult);

      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = await batchDeployer.deployToken(token, 0);

      expect(mockDeployer.deploy).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should fail after exhausting retries', async () => {
      const mockFailResult = {
        success: false,
        error: 'Persistent error'
      };
      mockDeployer.deploy.mockResolvedValue(mockFailResult);

      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = await batchDeployer.deployToken(token, 0);

      expect(mockDeployer.deploy).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent error');
    });

    it('should handle invalid token address', async () => {
      const mockDeployResult = {
        success: true,
        tokenAddress: 'invalid-address', // Invalid format
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };
      mockDeployer.deploy.mockResolvedValue(mockDeployResult);

      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = await batchDeployer.deployToken(token, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token address returned');
    });

    it('should handle deployment exceptions', async () => {
      mockDeployer.deploy.mockRejectedValue(new Error('Deployment exception'));

      const token: BatchToken = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = await batchDeployer.deployToken(token, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deployment exception');
    });
  });

  describe('deploy', () => {
    it('should deploy all tokens and return summary', async () => {
      const mockDeployResult = {
        success: true,
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };
      mockDeployer.deploy.mockResolvedValue(mockDeployResult);

      const result = await batchDeployer.deploy();

      expect(result.template).toBe('Test Batch');
      expect(result.chain).toBe('base');
      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should call progress callback for each token', async () => {
      const mockDeployResult = {
        success: true,
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };
      mockDeployer.deploy.mockResolvedValue(mockDeployResult);

      const progressCallback = vi.fn();
      const deployerWithCallback = new BatchDeployer(basicTemplate, {
        ...basicOptions,
        onProgress: progressCallback
      });

      await deployerWithCallback.deploy();

      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 2, expect.objectContaining({
        success: true,
        name: 'Test Token 1'
      }));
      expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 2, expect.objectContaining({
        success: true,
        name: 'Test Token 2'
      }));
    });

    it('should handle mixed success and failure results', async () => {
      const mockSuccessResult = {
        success: true,
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };
      const mockFailResult = {
        success: false,
        error: 'Deployment failed'
      };

      mockDeployer.deploy
        .mockResolvedValueOnce(mockSuccessResult)
        .mockResolvedValue(mockFailResult);

      const result = await batchDeployer.deploy();

      expect(result.total).toBe(2);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });

    it('should use template name or default to "Unnamed"', async () => {
      const mockDeployResult = {
        success: true,
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };
      mockDeployer.deploy.mockResolvedValue(mockDeployResult);

      // Test with named template
      let result = await batchDeployer.deploy();
      expect(result.template).toBe('Test Batch');

      // Test with unnamed template
      const unnamedTemplate = { ...basicTemplate };
      delete unnamedTemplate.name;
      const unnamedDeployer = new BatchDeployer(unnamedTemplate, basicOptions);
      result = await unnamedDeployer.deploy();
      expect(result.template).toBe('Unnamed');
    });
  });
});