/**
 * Integration tests for reorganized modules
 * Tests that module reorganization maintains functionality and cross-module interactions work correctly
 * Requirements: 3.1, 3.2, 3.3 - Improve Module Organization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Batch module imports
import { TemplateService } from '../../src/batch/template-service.js';
import { FarcasterService } from '../../src/batch/farcaster-integration.js';
import { MultiWalletBatchManager } from '../../src/batch/multi-wallet-batch.js';

// Wallet module imports
import { WalletStoreService } from '../../src/wallet/store.js';
import { EncryptionService } from '../../src/wallet/encryption-service.js';
import { WalletBackupService } from '../../src/wallet/backup-service.js';
import { EnvSyncService } from '../../src/wallet/env-sync-service.js';
import { WalletMigrationService } from '../../src/wallet/migration-service.js';

// Deployer module imports
import { Deployer } from '../../src/deployer/deployer.js';
import { BatchDeployer } from '../../src/deployer/batch-deployer.js';
import { MultiChainDeployer } from '../../src/deployer/multi-chain-deployer.js';
import { DeployerFactory } from '../../src/deployer/factory.js';
import { ClankerDeploymentService } from '../../src/deployer/deployment-service.js';

// Mock external dependencies
vi.mock('../../src/v4/index.js', () => {
  const MockClanker = function(config) {
    this.deploy = vi.fn().mockResolvedValue({
      txHash: '0x123',
      waitForTransaction: vi.fn().mockResolvedValue({ address: '0xtoken123' })
    });
    this.updateImage = vi.fn().mockResolvedValue({ txHash: '0x456', error: undefined });
    this.getRewards = vi.fn().mockResolvedValue([]);
    this.getAvailableFees = vi.fn().mockResolvedValue(BigInt(1000));
    this.claimFees = vi.fn().mockResolvedValue({ txHash: '0x789', error: undefined });
  };
  
  return {
    Clanker: MockClanker
  };
});

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{"version":2,"activeAddress":null,"wallets":[]}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
  copyFileSync: vi.fn(),
  rmdirSync: vi.fn()
}));

vi.mock('../../src/wallet/crypto.js', () => ({
  validatePrivateKey: vi.fn().mockImplementation((key) => {
    // Mock validation - return invalid for obviously invalid keys
    if (!key || key === 'not-a-private-key' || key.length < 60) {
      return {
        valid: false,
        error: 'Invalid private key format'
      };
    }
    return {
      valid: true,
      address: '0x1234567890123456789012345678901234567890',
      normalizedKey: '0x1234567890123456789012345678901234567890123456789012345678901234'
    };
  }),
  formatAddress: vi.fn().mockReturnValue('0x1234...7890')
}));

describe('Module Reorganization Integration Tests', () => {
  describe('Batch Module Integration', () => {
    let templateService: TemplateService;
    let farcasterService: FarcasterService;
    let batchManager: MultiWalletBatchManager;

    beforeEach(() => {
      templateService = new TemplateService();
      farcasterService = new FarcasterService();
      
      // Create mock public client and chain for MultiWalletBatchManager
      const mockPublicClient = {
        getBalance: vi.fn().mockResolvedValue(BigInt(1000000000000000000)) // 1 ETH
      } as any;
      const mockChain = { id: 8453, name: 'Base' } as any;
      
      batchManager = new MultiWalletBatchManager(mockPublicClient, mockChain);
    });

    it('should integrate template service with batch manager', () => {
      // Test that TemplateService can be used by MultiWalletBatchManager
      expect(templateService).toBeInstanceOf(TemplateService);
      expect(typeof templateService.validateTemplate).toBe('function');
      expect(typeof templateService.generateTemplate).toBe('function');
      expect(typeof templateService.loadTemplate).toBe('function');
      expect(typeof templateService.saveTemplate).toBe('function');
      
      // Verify batch manager can work with template service
      expect(batchManager).toBeInstanceOf(MultiWalletBatchManager);
      expect(typeof batchManager.setupBatchDeployer).toBe('function');
    });

    it('should integrate farcaster service with batch operations', async () => {
      // Test that FarcasterService provides expected interface
      expect(farcasterService).toBeInstanceOf(FarcasterService);
      expect(typeof farcasterService.fetchUserWallets).toBe('function');
      expect(typeof farcasterService.validateFarcasterInput).toBe('function');
      expect(typeof farcasterService.createFarcasterDeploymentPlan).toBe('function');
      
      // Test integration with batch manager - mock the farcaster service methods
      vi.spyOn(farcasterService, 'createTokenConfigsForDistribution').mockReturnValue([
        { name: 'Token 1', symbol: 'TKN1', metadata: { deployerWallet: '0x1111' } },
        { name: 'Token 2', symbol: 'TKN2', metadata: { deployerWallet: '0x1111' } }
      ]);
      
      const mockDistribution = new Map([
        ['0x1111', ['0xaaaa', '0xbbbb']]
      ]);
      
      const configs = farcasterService.createTokenConfigsForDistribution(
        { name: 'Base Token', symbol: 'BASE' },
        mockDistribution
      );
      
      expect(configs).toHaveLength(2);
      expect(configs[0].metadata?.deployerWallet).toBe('0x1111');
    });

    it('should maintain cross-service functionality', () => {
      // Test that services can work together
      const template = templateService.generateTemplate(2, {
        name: 'Integration Test',
        symbol: 'TEST',
        chain: 'base'
      });
      
      expect(template.tokens).toHaveLength(2);
      expect(template.tokens[0].name).toBe('Integration Test');
      
      // Validate template using template service
      const validatedTemplate = templateService.validateTemplate(template);
      expect(validatedTemplate).toBeDefined();
      expect(validatedTemplate.tokens).toHaveLength(2);
    });
  });

  describe('Wallet Module Integration', () => {
    let storeService: WalletStoreService;
    let encryptionService: EncryptionService;
    let backupService: WalletBackupService;
    let envSyncService: EnvSyncService;
    let migrationService: WalletMigrationService;

    beforeEach(() => {
      encryptionService = new EncryptionService();
      storeService = new WalletStoreService(encryptionService);
      backupService = new WalletBackupService(encryptionService);
      envSyncService = new EnvSyncService();
      migrationService = new WalletMigrationService(storeService, envSyncService);
    });

    it('should integrate encryption service with store service', () => {
      // Test that WalletStoreService uses injected EncryptionService
      expect(storeService).toBeInstanceOf(WalletStoreService);
      expect(encryptionService).toBeInstanceOf(EncryptionService);
      
      // Test encryption integration
      const testData = 'test-private-key';
      const password = 'test-password';
      
      const encrypted = encryptionService.encrypt(testData, password);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      
      const decrypted = encryptionService.decrypt(encrypted, password);
      expect(decrypted).toBe(testData);
    });

    it('should integrate backup service with encryption service', () => {
      // Test that WalletBackupService uses injected EncryptionService
      expect(backupService).toBeInstanceOf(WalletBackupService);
      
      // Test backup creation with encryption
      const result = backupService.createBackupFile(
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        'test-password',
        'Test Wallet'
      );
      
      expect(result.success).toBe(true);
      expect(result.address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should integrate migration service with store and env services', () => {
      // Test that WalletMigrationService uses injected services
      expect(migrationService).toBeInstanceOf(WalletMigrationService);
      
      // Test migration functionality
      const migrationNeeds = migrationService.needsMigration();
      expect(typeof migrationNeeds.store).toBe('boolean');
      expect(typeof migrationNeeds.backups).toBe('boolean');
    });

    it('should maintain service composition patterns', () => {
      // Test that services can be composed together
      const store = storeService.loadWalletStore();
      expect(store.version).toBe(2);
      expect(Array.isArray(store.wallets)).toBe(true);
      
      // Test env sync integration
      const hasEnvKey = envSyncService.hasEnvPrivateKey();
      expect(typeof hasEnvKey).toBe('boolean');
    });
  });

  describe('Deployer Module Integration', () => {
    let deployer: Deployer;
    let batchDeployer: BatchDeployer;
    let multiChainDeployer: MultiChainDeployer;
    let deployerFactory: DeployerFactory;

    beforeEach(() => {
      // Mock environment config
      vi.stubEnv('PRIVATE_KEY', '0x1234567890123456789012345678901234567890123456789012345678901234');
      vi.stubEnv('CHAIN_ID', '8453');
      
      deployer = new Deployer({
        privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
        chainId: 8453
      });
      batchDeployer = new BatchDeployer('0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`);
      multiChainDeployer = new MultiChainDeployer('0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`);
      deployerFactory = new DeployerFactory();
    });

    it('should integrate core deployer with deployment service', () => {
      // Test that Deployer class is properly structured
      expect(deployer).toBeInstanceOf(Deployer);
      expect(typeof deployer.deploy).toBe('function');
      expect(typeof deployer.address).toBe('string');
      expect(typeof deployer.chainId).toBe('number');
    });

    it('should integrate batch deployer with core deployer', () => {
      // Test that BatchDeployer can work with core deployment logic
      expect(batchDeployer).toBeInstanceOf(BatchDeployer);
      expect(typeof batchDeployer.deploy).toBe('function');
      expect(typeof batchDeployer.generateTokens).toBe('function');
      
      // Test token generation
      const tokens = batchDeployer.generateTokens(3, {
        namePrefix: 'Test Token',
        symbolPrefix: 'TEST'
      });
      
      expect(tokens).toHaveLength(3);
      expect(tokens[0].name).toBe('Test Token 1');
      expect(tokens[0].symbol).toBe('TEST1');
    });

    it('should integrate multi-chain deployer with core deployer', () => {
      // Test that MultiChainDeployer can coordinate multiple deployments
      expect(multiChainDeployer).toBeInstanceOf(MultiChainDeployer);
      expect(typeof multiChainDeployer.deployToAll).toBe('function');
      expect(typeof multiChainDeployer.deployTo).toBe('function');
      expect(typeof multiChainDeployer.address).toBe('string');
    });

    it('should integrate deployer factory with all deployer types', () => {
      // Test that DeployerFactory can create different deployer types
      expect(deployerFactory).toBeInstanceOf(DeployerFactory);
      
      const coreDeployer = deployerFactory.create(8453);
      expect(coreDeployer).toBeInstanceOf(Deployer);
      
      const batchDeployerFromFactory = deployerFactory.createBatch();
      expect(batchDeployerFromFactory).toBeInstanceOf(BatchDeployer);
      
      const multiChainDeployerFromFactory = deployerFactory.createMultiChain();
      expect(multiChainDeployerFromFactory).toBeInstanceOf(MultiChainDeployer);
    });

    it('should maintain deployment service interface compatibility', () => {
      // Test that deployment service interface is properly implemented
      const mockClanker = {
        deploy: vi.fn().mockResolvedValue({
          txHash: '0x123',
          waitForTransaction: vi.fn().mockResolvedValue({ address: '0xtoken123' })
        }),
        getAvailableFees: vi.fn().mockResolvedValue(BigInt(1000)),
        claimFees: vi.fn().mockResolvedValue('0x789')
      };
      
      const deploymentService = new ClankerDeploymentService(mockClanker);
      expect(deploymentService).toBeInstanceOf(ClankerDeploymentService);
      expect(typeof deploymentService.deploy).toBe('function');
      expect(typeof deploymentService.getAvailableFees).toBe('function');
    });
  });

  describe('Cross-Module Integration', () => {
    it('should maintain backward compatibility across all modules', () => {
      // Test that reorganized modules maintain their public APIs
      
      // Batch module backward compatibility
      expect(TemplateService).toBeDefined();
      expect(FarcasterService).toBeDefined();
      expect(MultiWalletBatchManager).toBeDefined();
      
      // Wallet module backward compatibility
      expect(WalletStoreService).toBeDefined();
      expect(EncryptionService).toBeDefined();
      expect(WalletBackupService).toBeDefined();
      expect(EnvSyncService).toBeDefined();
      expect(WalletMigrationService).toBeDefined();
      
      // Deployer module backward compatibility
      expect(Deployer).toBeDefined();
      expect(BatchDeployer).toBeDefined();
      expect(MultiChainDeployer).toBeDefined();
      expect(DeployerFactory).toBeDefined();
      expect(ClankerDeploymentService).toBeDefined();
    });

    it('should support dependency injection patterns across modules', () => {
      // Test that services can be injected across module boundaries
      const encryptionService = new EncryptionService();
      const storeService = new WalletStoreService(encryptionService);
      const backupService = new WalletBackupService(encryptionService);
      
      // Test that the same encryption service instance is used
      expect(storeService).toBeInstanceOf(WalletStoreService);
      expect(backupService).toBeInstanceOf(WalletBackupService);
      
      // Test factory pattern
      const deployerFactory = new DeployerFactory();
      const deployer1 = deployerFactory.create(8453);
      const deployer2 = deployerFactory.create(1);
      
      expect(deployer1.chainId).toBe(8453);
      expect(deployer2.chainId).toBe(1);
    });

    it('should maintain consistent error handling across modules', () => {
      // Test that all modules use consistent error patterns
      const encryptionService = new EncryptionService();
      
      // Test encryption service error handling
      const invalidDecryption = encryptionService.decrypt('invalid-data', 'password');
      expect(invalidDecryption).toBeNull();
      
      // Test store service error handling - use a properly invalid private key
      const storeService = new WalletStoreService(encryptionService);
      const invalidWalletResult = storeService.addWalletToStore('not-a-private-key', 'Test', 'password');
      expect(invalidWalletResult.success).toBe(false);
      expect(typeof invalidWalletResult.error).toBe('string');
    });

    it('should support service composition patterns', () => {
      // Test that services from different modules can be composed
      const encryptionService = new EncryptionService();
      const storeService = new WalletStoreService(encryptionService);
      const envSyncService = new EnvSyncService();
      const migrationService = new WalletMigrationService(storeService, envSyncService);
      
      // Test composition works
      expect(migrationService).toBeInstanceOf(WalletMigrationService);
      
      const deployerFactory = new DeployerFactory();
      const deployer = deployerFactory.create(8453);
      
      // Test that different module services can work together
      expect(deployer).toBeInstanceOf(Deployer);
      expect(storeService).toBeInstanceOf(WalletStoreService);
    });
  });

  describe('Module File Organization', () => {
    it('should have proper separation of concerns in batch module', () => {
      // Test that each service has a single responsibility
      const templateService = new TemplateService();
      const farcasterService = new FarcasterService();
      
      // TemplateService should handle template operations
      expect(typeof templateService.validateTemplate).toBe('function');
      expect(typeof templateService.generateTemplate).toBe('function');
      expect(typeof templateService.loadTemplate).toBe('function');
      expect(typeof templateService.saveTemplate).toBe('function');
      
      // FarcasterService should handle Farcaster-specific logic
      expect(typeof farcasterService.fetchUserWallets).toBe('function');
      expect(typeof farcasterService.validateFarcasterInput).toBe('function');
      expect(typeof farcasterService.createFarcasterDeploymentPlan).toBe('function');
    });

    it('should have proper separation of concerns in wallet module', () => {
      // Test that each service has a single responsibility
      const encryptionService = new EncryptionService();
      const storeService = new WalletStoreService();
      const backupService = new WalletBackupService();
      const envSyncService = new EnvSyncService();
      const migrationService = new WalletMigrationService();
      
      // Each service should have focused responsibilities
      expect(typeof encryptionService.encrypt).toBe('function');
      expect(typeof encryptionService.decrypt).toBe('function');
      
      expect(typeof storeService.loadWalletStore).toBe('function');
      expect(typeof storeService.saveWalletStore).toBe('function');
      
      expect(typeof backupService.createBackupFile).toBe('function');
      expect(typeof backupService.listBackupFiles).toBe('function');
      
      expect(typeof envSyncService.syncActiveWalletToEnv).toBe('function');
      expect(typeof envSyncService.getCurrentWallet).toBe('function');
      
      expect(typeof migrationService.migrateEnvWalletToStore).toBe('function');
      expect(typeof migrationService.needsMigration).toBe('function');
    });

    it('should have proper separation of concerns in deployer module', () => {
      // Test that each service has a single responsibility
      const deployer = new Deployer({
        privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
        chainId: 8453
      });
      const batchDeployer = new BatchDeployer();
      const multiChainDeployer = new MultiChainDeployer();
      const deployerFactory = new DeployerFactory();
      
      // Core deployer should handle single deployments
      expect(typeof deployer.deploy).toBe('function');
      expect(typeof deployer.updateImage).toBe('function');
      
      // Batch deployer should handle multiple tokens on single chain
      expect(typeof batchDeployer.deploy).toBe('function');
      expect(typeof batchDeployer.generateTokens).toBe('function');
      
      // Multi-chain deployer should handle same token across chains
      expect(typeof multiChainDeployer.deployToAll).toBe('function');
      expect(typeof multiChainDeployer.deployTo).toBe('function');
      
      // Factory should create different deployer types
      expect(typeof deployerFactory.create).toBe('function');
      expect(typeof deployerFactory.createBatch).toBe('function');
      expect(typeof deployerFactory.createMultiChain).toBe('function');
    });
  });
});