# Service Interface Migration Guide

This guide provides detailed information about the new service interfaces introduced during the refactoring and how to use them effectively.

## Overview

The refactoring introduced several service interfaces to enable dependency injection, improve testability, and reduce coupling between modules. This guide covers each interface and provides migration examples.

## IValidationService Interface

### Purpose
Centralizes all validation logic to eliminate duplication and ensure consistency across modules.

### Interface Definition
```typescript
interface IValidationService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo>;
  validateMnemonic(mnemonic: string): ServiceValidationResult<MnemonicInfo>;
  validateAddress(address: string): ServiceValidationResult<AddressInfo>;
  validateTokenConfig(config: TokenConfiguration): ServiceValidationResult<TokenConfigInfo>;
}
```

### Migration Examples

#### Before: Inline Validation
```typescript
// Old approach - validation scattered across modules
class Deployer {
  deploy(config: TokenConfig) {
    // Duplicated validation logic
    if (!config.privateKey || !config.privateKey.startsWith('0x')) {
      throw new Error('Invalid private key format');
    }
    
    if (config.privateKey.length !== 66) {
      throw new Error('Private key must be 64 hex characters');
    }
    
    // More validation...
    // Deployment logic...
  }
}

class BatchDeployer {
  deployBatch(configs: TokenConfig[]) {
    for (const config of configs) {
      // Same validation logic duplicated here
      if (!config.privateKey || !config.privateKey.startsWith('0x')) {
        throw new Error('Invalid private key format');
      }
      
      if (config.privateKey.length !== 66) {
        throw new Error('Private key must be 64 hex characters');
      }
      
      // Deployment logic...
    }
  }
}
```

#### After: Service-Based Validation
```typescript
// New approach - centralized validation service
import { IValidationService, ValidationService } from '../services/validation-service.js';

class Deployer {
  constructor(
    private config: Config,
    private validationService: IValidationService = new ValidationService()
  ) {}
  
  deploy(config: TokenConfig) {
    // Use centralized validation
    const result = this.validationService.validatePrivateKey(config.privateKey);
    if (!result.success) {
      throw new ValidationError('INVALID_PRIVATE_KEY', result.error);
    }
    
    // Use validated data
    const { address, normalizedKey } = result.data;
    
    // Deployment logic...
  }
}

class BatchDeployer {
  constructor(
    private validationService: IValidationService = new ValidationService()
  ) {}
  
  deployBatch(configs: TokenConfig[]) {
    // Validate all configs first
    const validatedConfigs = configs.map(config => {
      const result = this.validationService.validatePrivateKey(config.privateKey);
      if (!result.success) {
        throw new ValidationError('INVALID_PRIVATE_KEY', result.error);
      }
      return { ...config, validatedKey: result.data };
    });
    
    // Deploy with validated configs
    for (const config of validatedConfigs) {
      // Deployment logic...
    }
  }
}
```

### Testing with Mock Services
```typescript
// Create mock validation service for testing
class MockValidationService implements IValidationService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo> {
    if (privateKey === 'invalid') {
      return { success: false, error: 'Mock validation failed' };
    }
    return {
      success: true,
      data: {
        address: '0xmockaddress123',
        normalizedKey: privateKey
      }
    };
  }
  
  // Implement other methods...
}

// Use in tests
describe('Deployer', () => {
  it('should handle validation errors', () => {
    const mockValidation = new MockValidationService();
    const deployer = new Deployer(config, mockValidation);
    
    expect(() => {
      deployer.deploy({ privateKey: 'invalid' });
    }).toThrow('Mock validation failed');
  });
});
```

## IEncryptionService Interface

### Purpose
Enables swapping of encryption implementations and improves testability of wallet operations.

### Interface Definition
```typescript
interface IEncryptionService {
  encrypt(plaintext: string, password: string): string;
  decrypt(encrypted: string, password: string): string | null;
}
```

### Migration Examples

#### Before: Hard-coded Encryption
```typescript
// Old approach - encryption logic embedded in wallet store
import * as crypto from 'crypto';

class WalletStore {
  saveWallet(name: string, privateKey: string, password: string) {
    // Hard-coded AES encryption
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Store encrypted data...
  }
}
```

#### After: Injectable Encryption Service
```typescript
// New approach - injectable encryption service
import { IEncryptionService, EncryptionService } from '../wallet/encryption-service.js';

class WalletStore {
  constructor(
    private encryptionService: IEncryptionService = new EncryptionService()
  ) {}
  
  saveWallet(name: string, privateKey: string, password: string) {
    // Use injected encryption service
    const encrypted = this.encryptionService.encrypt(privateKey, password);
    
    // Store encrypted data...
  }
  
  loadWallet(name: string, password: string): string | null {
    // Load encrypted data...
    const encrypted = this.getEncryptedData(name);
    
    // Use injected decryption service
    return this.encryptionService.decrypt(encrypted, password);
  }
}
```

### Custom Encryption Implementation
```typescript
// Example: Custom encryption service for testing
class TestEncryptionService implements IEncryptionService {
  encrypt(plaintext: string, password: string): string {
    // Simple base64 encoding for testing (NOT secure for production)
    const combined = `${password}:${plaintext}`;
    return Buffer.from(combined).toString('base64');
  }
  
  decrypt(encrypted: string, password: string): string | null {
    try {
      const combined = Buffer.from(encrypted, 'base64').toString('utf8');
      const [storedPassword, plaintext] = combined.split(':');
      
      if (storedPassword !== password) {
        return null; // Wrong password
      }
      
      return plaintext;
    } catch {
      return null; // Decryption failed
    }
  }
}

// Use in tests
const testEncryption = new TestEncryptionService();
const walletStore = new WalletStore(testEncryption);
```

## IDeploymentService Interface

### Purpose
Abstracts deployment operations to enable testing with mock implementations and support different deployment backends.

### Interface Definition
```typescript
interface IDeploymentService {
  deploy(config: ClankerTokenV4): Promise<DeployResult>;
  getAvailableFees(tokenAddress: `0x${string}`, recipient: `0x${string}`): Promise<bigint>;
  claimFees(tokenAddress: `0x${string}`, recipient: `0x${string}`): Promise<string>;
  updateImage(tokenAddress: `0x${string}`, newImage: string): Promise<string>;
  updateMetadata(tokenAddress: `0x${string}`, metadata: string): Promise<string>;
  // ... other methods
}
```

### Migration Examples

#### Before: Direct SDK Usage
```typescript
// Old approach - direct dependency on Clanker SDK
import { Clanker } from '@clanker/sdk';

class Deployer {
  private clanker: Clanker;
  
  constructor(config: Config) {
    this.clanker = new Clanker(config.privateKey, config.chainId);
  }
  
  async deploy(config: TokenConfig) {
    // Direct SDK usage - hard to test
    const result = await this.clanker.deploy(config);
    return result;
  }
}
```

#### After: Service Abstraction
```typescript
// New approach - abstracted deployment service
import { IDeploymentService, ClankerDeploymentService } from '../deployer/deployment-service.js';

class Deployer {
  constructor(
    private config: Config,
    private validationService: IValidationService,
    private rewardService: RewardRecipientService,
    private deploymentService: IDeploymentService = new ClankerDeploymentService(clanker)
  ) {}
  
  async deploy(config: TokenConfig) {
    // Validate configuration
    const validation = this.validationService.validateTokenConfig(config);
    if (!validation.success) {
      throw new ValidationError('INVALID_CONFIG', validation.error);
    }
    
    // Process rewards
    const rewards = this.rewardService.normalize(config.rewards);
    
    // Deploy using abstracted service
    const deployConfig = { ...config, rewards };
    const result = await this.deploymentService.deploy(deployConfig);
    
    return result;
  }
}
```

### Mock Deployment Service for Testing
```typescript
// Mock deployment service for testing
class MockDeploymentService implements IDeploymentService {
  private deployCount = 0;
  
  async deploy(config: ClankerTokenV4): Promise<DeployResult> {
    this.deployCount++;
    
    return {
      txHash: `0xmocktx${this.deployCount}`,
      async waitForTransaction() {
        return { 
          address: `0xmocktoken${this.deployCount}` as `0x${string}` 
        };
      }
    };
  }
  
  async getAvailableFees(): Promise<bigint> {
    return BigInt(1000000); // Mock fee amount
  }
  
  async claimFees(): Promise<string> {
    return '0xmockclaimtx';
  }
  
  // Implement other methods as needed...
}

// Use in tests
describe('Deployer Integration', () => {
  it('should deploy multiple tokens', async () => {
    const mockDeployment = new MockDeploymentService();
    const deployer = new Deployer(config, validation, rewards, mockDeployment);
    
    const result1 = await deployer.deploy(tokenConfig1);
    const result2 = await deployer.deploy(tokenConfig2);
    
    expect(result1.txHash).toBe('0xmocktx1');
    expect(result2.txHash).toBe('0xmocktx2');
  });
});
```

## IDeployerFactory Interface

### Purpose
Enables creation of deployers with different configurations while maintaining dependency injection.

### Interface Definition
```typescript
interface IDeployerFactory {
  createDeployer(chainId: number, privateKey?: string): Promise<Deployer>;
  createBatchDeployer(chainId: number, options?: BatchOptions): Promise<BatchDeployer>;
}
```

### Migration Examples

#### Before: Direct Instantiation
```typescript
// Old approach - direct instantiation with configuration
async function deployTokens(configs: TokenConfig[]) {
  const deployers = new Map<number, Deployer>();
  
  for (const config of configs) {
    if (!deployers.has(config.chainId)) {
      // Direct instantiation - hard to test and configure
      const deployer = new Deployer({
        chainId: config.chainId,
        privateKey: config.privateKey,
        rpcUrl: getRpcUrl(config.chainId)
      });
      deployers.set(config.chainId, deployer);
    }
    
    const deployer = deployers.get(config.chainId)!;
    await deployer.deploy(config);
  }
}
```

#### After: Factory Pattern
```typescript
// New approach - factory-based creation
import { IDeployerFactory, DeployerFactory } from '../deployer/factory.js';

class MultiChainDeployer {
  constructor(
    private deployerFactory: IDeployerFactory = new DeployerFactory()
  ) {}
  
  async deployTokens(configs: TokenConfig[]) {
    const deployers = new Map<number, Deployer>();
    
    for (const config of configs) {
      if (!deployers.has(config.chainId)) {
        // Use factory to create deployer
        const deployer = await this.deployerFactory.createDeployer(
          config.chainId,
          config.privateKey
        );
        deployers.set(config.chainId, deployer);
      }
      
      const deployer = deployers.get(config.chainId)!;
      await deployer.deploy(config);
    }
  }
}
```

### Custom Factory Implementation
```typescript
// Custom factory for testing or special configurations
class TestDeployerFactory implements IDeployerFactory {
  constructor(
    private mockServices: {
      validation?: IValidationService;
      rewards?: RewardRecipientService;
      deployment?: IDeploymentService;
    } = {}
  ) {}
  
  async createDeployer(chainId: number, privateKey?: string): Promise<Deployer> {
    const config = { chainId, privateKey: privateKey || '0xtest' };
    
    return new Deployer(
      config,
      this.mockServices.validation || new ValidationService(),
      this.mockServices.rewards || new RewardRecipientService(),
      this.mockServices.deployment || new MockDeploymentService()
    );
  }
  
  async createBatchDeployer(chainId: number, options?: BatchOptions): Promise<BatchDeployer> {
    const deployer = await this.createDeployer(chainId);
    return new BatchDeployer(deployer, options);
  }
}

// Use in tests
describe('MultiChainDeployer', () => {
  it('should deploy across multiple chains', async () => {
    const testFactory = new TestDeployerFactory({
      deployment: new MockDeploymentService()
    });
    
    const multiChain = new MultiChainDeployer(testFactory);
    
    const configs = [
      { chainId: 1, name: 'Token1', symbol: 'T1' },
      { chainId: 8453, name: 'Token2', symbol: 'T2' }
    ];
    
    await multiChain.deployTokens(configs);
    
    // Verify deployments happened on both chains
  });
});
```

## Best Practices for Service Interfaces

### 1. Interface Segregation
Keep interfaces focused on a single responsibility:

```typescript
// ✅ Good - focused interface
interface IValidationService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo>;
  validateAddress(address: string): ServiceValidationResult<AddressInfo>;
}

// ❌ Bad - too many responsibilities
interface IEverythingService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo>;
  deployToken(config: TokenConfig): Promise<DeployResult>;
  encryptWallet(wallet: Wallet, password: string): string;
  sendNotification(message: string): void;
}
```

### 2. Consistent Error Handling
Use consistent patterns across all service interfaces:

```typescript
// ✅ Good - consistent Result type
interface IValidationService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo>;
  validateAddress(address: string): ServiceValidationResult<AddressInfo>;
}

// ❌ Bad - inconsistent error handling
interface IInconsistentService {
  validatePrivateKey(privateKey: string): PrivateKeyInfo; // Throws on error
  validateAddress(address: string): AddressInfo | null; // Returns null on error
}
```

### 3. Default Implementations
Always provide default implementations in constructors:

```typescript
// ✅ Good - default implementation provided
class Deployer {
  constructor(
    private config: Config,
    private validationService: IValidationService = new ValidationService(),
    private deploymentService: IDeploymentService = new ClankerDeploymentService()
  ) {}
}

// ❌ Bad - no defaults, harder to use
class Deployer {
  constructor(
    private config: Config,
    private validationService: IValidationService,
    private deploymentService: IDeploymentService
  ) {}
}
```

### 4. Async Interface Design
Be consistent with async/sync patterns:

```typescript
// ✅ Good - consistent async pattern
interface IDeploymentService {
  deploy(config: TokenConfig): Promise<DeployResult>;
  getAvailableFees(token: string): Promise<bigint>;
  claimFees(token: string): Promise<string>;
}

// ❌ Bad - mixed async/sync patterns
interface IInconsistentService {
  deploy(config: TokenConfig): Promise<DeployResult>; // Async
  getAvailableFees(token: string): bigint; // Sync
  claimFees(token: string): Promise<string>; // Async
}
```

## Migration Checklist

When migrating to use service interfaces:

### ✅ Planning
- [ ] Identify which services your module needs
- [ ] Determine if you need custom implementations for testing
- [ ] Plan the dependency injection strategy

### ✅ Implementation
- [ ] Update constructor to accept service interfaces
- [ ] Provide default implementations for backward compatibility
- [ ] Replace direct implementations with service calls
- [ ] Update error handling to use service result types

### ✅ Testing
- [ ] Create mock implementations for testing
- [ ] Test both success and error paths
- [ ] Verify service interactions work correctly
- [ ] Add integration tests for service combinations

### ✅ Documentation
- [ ] Document which services are required
- [ ] Provide usage examples
- [ ] Document custom implementation requirements
- [ ] Update API documentation

This guide should help you effectively migrate to and use the new service interfaces while maintaining clean, testable, and maintainable code.