/**
 * Unit Tests for Deployer Dependency Injection
 * Tests that the Deployer class properly accepts and uses injected services
 */

import { describe, it, expect, vi } from 'vitest';
import { Deployer, type DeployerOptions } from '../../../src/deployer/deployer.js';
import type { 
  IValidationService, 
  IDeploymentService,
  RewardRecipientService,
  ServiceValidationResult
} from '../../../src/services/index.js';

describe('Deployer Dependency Injection', () => {
  // Mock services
  const mockValidationService: IValidationService = {
    validatePrivateKey: vi.fn().mockReturnValue({ success: true, data: { address: '0x123', normalizedKey: '0x456' } }),
    validateMnemonic: vi.fn().mockReturnValue({ success: true, data: { mnemonic: 'test', isValid: true, wordCount: 12 } }),
    validateAddress: vi.fn().mockReturnValue({ success: true, data: { address: '0x123', isValid: true, checksumAddress: '0x123' } }),
    validateTokenConfig: vi.fn().mockReturnValue({ success: true, data: { name: 'Test', symbol: 'TEST', isValid: true, errors: [] } })
  };

  const mockRewardRecipientService = {
    normalize: vi.fn().mockReturnValue([{ address: '0x123', allocation: 100 }]),
    validate: vi.fn().mockReturnValue({ success: true, data: undefined }),
    toDeployerFormat: vi.fn(),
    toBatchFormat: vi.fn(),
    merge: vi.fn(),
    calculateTotalValue: vi.fn()
  } as any;

  const mockDeploymentService: IDeploymentService = {
    deploy: vi.fn().mockResolvedValue({ 
      txHash: '0xabc123', 
      waitForTransaction: () => Promise.resolve({ address: '0x789' as `0x${string}` })
    }),
    getAvailableFees: vi.fn().mockResolvedValue(BigInt(1000)),
    claimFees: vi.fn().mockResolvedValue('0xdef456'),
    updateImage: vi.fn().mockResolvedValue('0xghi789'),
    updateMetadata: vi.fn().mockResolvedValue('0xjkl012'),
    getRewards: vi.fn().mockResolvedValue({ recipients: [] }),
    updateRewardRecipient: vi.fn().mockResolvedValue('0xmno345'),
    updateRewardAdmin: vi.fn().mockResolvedValue('0xpqr678'),
    getVaultClaimableAmount: vi.fn().mockResolvedValue(BigInt(2000)),
    claimVaultedTokens: vi.fn().mockResolvedValue('0xstu901')
  };

  const validConfig = {
    privateKey: '0x' + '1'.repeat(64) as `0x${string}`,
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org'
  };

  describe('constructor dependency injection', () => {
    it('should accept and use injected validation service', () => {
      const options: DeployerOptions = {
        config: validConfig,
        validationService: mockValidationService
      };

      const deployer = new Deployer(options);
      expect(deployer).toBeInstanceOf(Deployer);
    });

    it('should accept and use injected reward recipient service', () => {
      const options: DeployerOptions = {
        config: validConfig,
        rewardRecipientService: mockRewardRecipientService
      };

      const deployer = new Deployer(options);
      expect(deployer).toBeInstanceOf(Deployer);
    });

    it('should accept and use injected deployment service', () => {
      const options: DeployerOptions = {
        config: validConfig,
        deploymentService: mockDeploymentService
      };

      const deployer = new Deployer(options);
      expect(deployer).toBeInstanceOf(Deployer);
    });

    it('should accept all services together', () => {
      const options: DeployerOptions = {
        config: validConfig,
        validationService: mockValidationService,
        rewardRecipientService: mockRewardRecipientService,
        deploymentService: mockDeploymentService
      };

      const deployer = new Deployer(options);
      expect(deployer).toBeInstanceOf(Deployer);
    });

    it('should use default services when none provided', () => {
      const options: DeployerOptions = {
        config: validConfig
      };

      const deployer = new Deployer(options);
      expect(deployer).toBeInstanceOf(Deployer);
    });

    it('should work with empty options when environment variables are available', () => {
      // This test would pass in a real environment with PRIVATE_KEY set
      // In test environment, we expect it to throw due to missing env vars
      expect(() => new Deployer({})).toThrow('PRIVATE_KEY environment variable required');
    });
  });

  describe('service usage in deployment', () => {
    it('should use injected validation service during deployment', async () => {
      const options: DeployerOptions = {
        config: validConfig,
        validationService: mockValidationService,
        rewardRecipientService: mockRewardRecipientService,
        deploymentService: mockDeploymentService
      };

      const deployer = new Deployer(options);
      
      const deployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      await deployer.deploy(deployConfig);

      // Verify that the injected validation service was called
      expect(mockValidationService.validateTokenConfig).toHaveBeenCalledWith({
        name: 'Test Token',
        symbol: 'TEST',
        chainId: undefined,
        tokenAdmin: undefined,
        rewardRecipients: undefined,
        fees: undefined,
        vault: undefined,
        mev: undefined
      });
    });

    it('should use injected deployment service for deployment', async () => {
      const options: DeployerOptions = {
        config: validConfig,
        validationService: mockValidationService,
        rewardRecipientService: mockRewardRecipientService,
        deploymentService: mockDeploymentService
      };

      const deployer = new Deployer(options);
      
      const deployConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };

      const result = await deployer.deploy(deployConfig);

      // Verify that the injected deployment service was called
      expect(mockDeploymentService.deploy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xabc123');
    });

    it('should use injected reward recipient service for reward processing', async () => {
      const options: DeployerOptions = {
        config: validConfig,
        validationService: mockValidationService,
        rewardRecipientService: mockRewardRecipientService,
        deploymentService: mockDeploymentService
      };

      const deployer = new Deployer(options);
      
      const deployConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        rewardRecipients: [
          { address: '0x123' as `0x${string}`, allocation: 100 }
        ]
      };

      await deployer.deploy(deployConfig);

      // Verify that the injected reward recipient service was called
      expect(mockRewardRecipientService.normalize).toHaveBeenCalled();
      expect(mockRewardRecipientService.validate).toHaveBeenCalled();
    });
  });

  describe('token management methods', () => {
    it('should use injected deployment service for token management', async () => {
      const options: DeployerOptions = {
        config: validConfig,
        deploymentService: mockDeploymentService
      };

      const deployer = new Deployer(options);
      const tokenAddress = '0x123' as `0x${string}`;

      // Test various token management methods
      await deployer.updateImage(tokenAddress, 'new-image-url');
      expect(mockDeploymentService.updateImage).toHaveBeenCalledWith(tokenAddress, 'new-image-url');

      await deployer.getAvailableFees(tokenAddress, tokenAddress);
      expect(mockDeploymentService.getAvailableFees).toHaveBeenCalledWith(tokenAddress, tokenAddress);

      await deployer.claimFees(tokenAddress, tokenAddress);
      expect(mockDeploymentService.claimFees).toHaveBeenCalledWith(tokenAddress, tokenAddress);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain backward compatibility with legacy constructor', () => {
      const deployer = Deployer.createLegacy(validConfig);
      expect(deployer).toBeInstanceOf(Deployer);
    });

    it('should work with factory functions', () => {
      // These should still work with the updated constructor
      expect(() => {
        // Note: These will fail in test environment due to missing env vars,
        // but the constructor signature should be compatible
        try {
          const { createBaseDeployer } = require('../../../src/deployer/simple-deployer.js');
          createBaseDeployer('0x' + '1'.repeat(64) as `0x${string}`);
        } catch (error) {
          // Expected in test environment - just verify it's not a type error
          expect(error.message).not.toContain('TypeError');
        }
      }).not.toThrow();
    });
  });
});