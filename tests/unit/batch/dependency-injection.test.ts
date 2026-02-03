/**
 * Unit tests for batch deployment dependency injection
 * Tests that BatchDeployer and deployTemplate accept IDeployerFactory
 * Requirements: 4.2 - Implement dependency injection in batch deployment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchDeployer } from '../../../src/batch/batch-deployer.js';
import { deployTemplate } from '../../../src/batch/index.js';
import type { 
  BatchTemplate, 
  BatchOptions 
} from '../../../src/batch/types.js';
import type { IDeployerFactory } from '../../../src/deployer/index.js';

describe('Batch Deployment Dependency Injection', () => {
  let mockDeployer: any;
  let mockFactory: IDeployerFactory;
  let basicTemplate: BatchTemplate;
  let basicOptions: BatchOptions;

  beforeEach(() => {
    // Create mock deployer
    mockDeployer = {
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      deploy: vi.fn().mockResolvedValue({
        success: true,
        tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        txHash: '0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456'
      })
    };

    // Create mock factory
    mockFactory = {
      create: vi.fn().mockReturnValue(mockDeployer),
      createMultiChain: vi.fn()
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
        }
      ]
    };

    // Basic options for testing
    basicOptions = {
      delay: 0, // No delay for faster tests
      retries: 0 // No retries for simpler tests
    };
  });

  describe('BatchDeployer Constructor', () => {
    it('should accept IDeployerFactory through constructor', () => {
      const batchDeployer = new BatchDeployer(basicTemplate, basicOptions, mockFactory);
      
      expect(batchDeployer).toBeDefined();
      expect(mockFactory.create).toHaveBeenCalledWith(8453); // Base chain ID
    });

    it('should use injected factory to create deployer', () => {
      new BatchDeployer(basicTemplate, basicOptions, mockFactory);
      
      expect(mockFactory.create).toHaveBeenCalledTimes(1);
      expect(mockFactory.create).toHaveBeenCalledWith(8453);
    });

    it('should work with different chain IDs through factory', () => {
      const ethereumTemplate = { ...basicTemplate, chain: 'ethereum' as const };
      new BatchDeployer(ethereumTemplate, basicOptions, mockFactory);
      
      expect(mockFactory.create).toHaveBeenCalledWith(1); // Ethereum chain ID
    });
  });

  describe('deployTemplate Function', () => {
    it('should accept IDeployerFactory as third parameter', async () => {
      const result = await deployTemplate(basicTemplate, basicOptions, mockFactory);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFactory.create).toHaveBeenCalledWith(8453);
    });

    it('should pass factory to BatchDeployer', async () => {
      await deployTemplate(basicTemplate, basicOptions, mockFactory);
      
      expect(mockFactory.create).toHaveBeenCalledTimes(1);
      expect(mockDeployer.deploy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mock Compatibility', () => {
    it('should enable easy mocking for testing', async () => {
      // Create a mock that simulates deployment failure
      const failingDeployer = {
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        deploy: vi.fn().mockResolvedValue({
          success: false,
          error: 'Mock deployment failure'
        })
      };

      const failingFactory: IDeployerFactory = {
        create: vi.fn().mockReturnValue(failingDeployer),
        createMultiChain: vi.fn()
      };

      const result = await deployTemplate(basicTemplate, basicOptions, failingFactory);
      
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Mock deployment failure');
    });

    it('should allow testing different deployer implementations', async () => {
      // Use the working mock from beforeEach
      const result = await deployTemplate(basicTemplate, basicOptions, mockFactory);
      
      expect(mockFactory.create).toHaveBeenCalledWith(8453);
      expect(mockDeployer.deploy).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].address).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });
  });

  describe('Interface Compliance', () => {
    it('should work with any implementation that satisfies IDeployerFactory', async () => {
      // Use the working mock from beforeEach to test interface compliance
      const result = await deployTemplate(basicTemplate, basicOptions, mockFactory);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].address).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });
  });
});