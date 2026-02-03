# Service Usage Examples

This document provides practical examples of using the refactored service interfaces and classes.

## Validation Service

### Basic Usage

```typescript
import { ValidationService, validatePrivateKeyOrThrow } from '../src/services/validation-service.js';

// Create service instance
const validationService = new ValidationService();

// Validate private key
const result = validationService.validatePrivateKey('0x1234...');
if (result.success) {
  console.log('Address:', result.data.address);
  console.log('Normalized key:', result.data.normalizedKey);
} else {
  console.error('Validation error:', result.error);
}

// Helper function that throws on error
try {
  const keyInfo = validatePrivateKeyOrThrow('0x1234...', 'deployment');
  console.log('Valid key for address:', keyInfo.address);
} catch (error) {
  console.error('Invalid private key:', error.message);
}
```

### Token Configuration Validation

```typescript
import { ValidationService } from '../src/services/validation-service.js';

const validationService = new ValidationService();

const tokenConfig = {
  name: 'My Awesome Token',
  symbol: 'MAT',
  tokenAdmin: '0x1234567890123456789012345678901234567890'
};

const result = validationService.validateTokenConfig(tokenConfig);
if (result.success) {
  console.log('Valid token config:', result.data);
} else {
  console.error('Configuration errors:', result.error);
}
```

## Reward Recipient Service

### Normalizing Recipients

```typescript
import { RewardRecipientService } from '../src/services/reward-recipient-service.js';

const rewardService = new RewardRecipientService();

// Recipients with mixed allocation formats
const recipients = [
  { address: '0xabc...', allocation: 50 },
  { address: '0xdef...', percentage: 30 },
  { address: '0x123...' } // No allocation specified
];

// Normalize to consistent format
const normalized = rewardService.normalize(recipients, '0xdefault...');
console.log('Normalized recipients:', normalized);

// Validate the normalized recipients
const validation = rewardService.validate(normalized);
if (!validation.success) {
  console.error('Validation errors:', validation.error);
}
```

### Format Conversion

```typescript
import { RewardRecipientService } from '../src/services/reward-recipient-service.js';

const rewardService = new RewardRecipientService();
const normalized = [
  { address: '0xabc...', allocation: 60 },
  { address: '0xdef...', allocation: 40 }
];

// Convert to deployer format
const deployerFormat = rewardService.toDeployerFormat(normalized);
console.log('Deployer format:', deployerFormat);

// Convert to batch format
const batchFormat = rewardService.toBatchFormat(normalized);
console.log('Batch format:', batchFormat);
```

## Dependency Injection Examples

### Custom Validation Service

```typescript
import { IValidationService, ServiceValidationResult, PrivateKeyInfo } from '../src/services/validation-service.js';
import { Deployer } from '../src/deployer/deployer.ts';

// Custom validation service for testing
class MockValidationService implements IValidationService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo> {
    // Mock implementation for testing
    return {
      success: true,
      data: {
        address: '0xmockaddress...',
        normalizedKey: privateKey
      }
    };
  }

  // ... implement other methods
}

// Inject custom service into deployer
const mockValidation = new MockValidationService();
const deployer = new Deployer(config, mockValidation);
```

### Custom Encryption Service

```typescript
import { IEncryptionService } from '../src/wallet/encryption-service.js';
import { WalletStoreService } from '../src/wallet/store.js';

// Custom encryption service
class TestEncryptionService implements IEncryptionService {
  encrypt(plaintext: string, password: string): string {
    // Simple base64 encoding for testing (NOT secure)
    return Buffer.from(plaintext).toString('base64');
  }

  decrypt(encrypted: string, password: string): string | null {
    try {
      return Buffer.from(encrypted, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
}

// Use custom encryption service
const testEncryption = new TestEncryptionService();
const walletStore = new WalletStoreService(testEncryption);
```

## Error Handling Examples

### Using Result Types

```typescript
import { validateTokenName } from '../src/types/runtime-validation.js';

// Sync operation with Result type
const nameResult = validateTokenName('My Token');
if (nameResult.success) {
  console.log('Valid name:', nameResult.data);
} else {
  console.error('Validation errors:', nameResult.errors);
  console.warn('Warnings:', nameResult.warnings);
}
```

### Handling Typed Errors

```typescript
import { ClankerError, ValidationError, DeploymentError } from '../src/errors/standardized-errors.js';

try {
  // Some operation that might throw
  await deployToken(config);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Context:', error.context);
  } else if (error instanceof DeploymentError) {
    console.error('Deployment failed:', error.message);
    console.error('Error code:', error.code);
  } else if (error instanceof ClankerError) {
    console.error('Clanker error:', error.getDisplayMessage());
    console.log('Full error details:', error.toJSON());
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Runtime Validation Examples

### Validating Configuration Objects

```typescript
import { 
  validateClankerTokenV4, 
  validateBatchDeploymentOptions,
  createValidationContext 
} from '../src/types/runtime-validation.js';

// Validate token configuration
const tokenConfig = {
  name: 'Test Token',
  symbol: 'TEST',
  chainId: 8453,
  tokenAdmin: '0x1234567890123456789012345678901234567890'
};

const context = createValidationContext('tokenConfig', true, false);
const result = validateClankerTokenV4(tokenConfig, context);

if (result.success) {
  console.log('Valid configuration:', result.data);
} else {
  console.error('Configuration errors:', result.errors);
  if (result.warnings.length > 0) {
    console.warn('Warnings:', result.warnings);
  }
}
```

### Array Validation

```typescript
import { validateArray, validateAddress, createValidationContext } from '../src/types/runtime-validation.js';

const addresses = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
];

const result = validateArray(
  addresses,
  (item, ctx) => validateAddress(item, ctx),
  createValidationContext('recipients')
);

if (result.success) {
  console.log('All addresses valid:', result.data);
} else {
  console.error('Address validation errors:', result.errors);
}
```

## Wallet Store Examples

### Basic Wallet Operations

```typescript
import { WalletStoreService } from '../src/wallet/store.js';

const storeService = new WalletStoreService();

// Add a new wallet
const addResult = storeService.addWallet('MyWallet', '0xprivatekey...', 'password123');
if (addResult.success) {
  console.log('Wallet added:', addResult.data);
} else {
  console.error('Failed to add wallet:', addResult.error);
}

// List all wallets
const listResult = storeService.listWallets();
if (listResult.success) {
  console.log('Available wallets:', listResult.data);
}

// Get wallet by name
const getResult = storeService.getWallet('MyWallet', 'password123');
if (getResult.success) {
  console.log('Wallet private key:', getResult.data.privateKey);
  console.log('Wallet address:', getResult.data.address);
}
```

### Wallet Transactions

```typescript
import { WalletStoreTransaction } from '../src/wallet/transaction.js';

// Begin transaction
const transaction = WalletStoreTransaction.begin();

// Make changes
transaction.addWallet('Wallet1', '0xkey1...', 'password');
transaction.addWallet('Wallet2', '0xkey2...', 'password');
transaction.setActiveWallet('0xaddress1...');

// Commit all changes atomically
const result = transaction.commitAndSync();
if (result.success) {
  console.log('All changes saved successfully');
} else {
  console.error('Failed to save changes:', result.error);
}
```

## Performance Optimization Examples

### Batch Nonce Management

```typescript
import { NonceManager } from '../src/deployer/nonce-manager.js';

const nonceManager = new NonceManager();

// Sync nonces for multiple wallets at once
const walletAddresses = ['0xabc...', '0xdef...', '0x123...'];
await nonceManager.syncNonces(walletAddresses);

// Get nonces (now cached)
for (const address of walletAddresses) {
  const nonce = await nonceManager.getNonce(address);
  console.log(`Nonce for ${address}: ${nonce}`);
}
```

### Rate Limited Operations

```typescript
import { RateLimiter } from '../src/utils/rate-limiter.js';

// Create rate limiter (10 requests per second)
const rateLimiter = new RateLimiter(10, 1000);

// Use in async operations
async function makeRequest(url: string) {
  await rateLimiter.waitForToken();
  // Make the actual request
  return fetch(url);
}

// Batch requests with rate limiting
const urls = ['url1', 'url2', 'url3'];
const promises = urls.map(url => makeRequest(url));
const results = await Promise.all(promises);
```

## Testing Examples

### Property-Based Testing

```typescript
import * as fc from 'fast-check';
import { validateAddress } from '../src/types/runtime-validation.js';

// Property: Valid addresses should always be accepted
fc.assert(fc.property(
  fc.string({ minLength: 40, maxLength: 40 })
    .filter(s => /^[a-fA-F0-9]{40}$/.test(s))
    .map(hex => `0x${hex}`),
  (address) => {
    const result = validateAddress(address);
    return result.success && result.data === address;
  }
), { numRuns: 100 });
```

### Mock Services for Testing

```typescript
import { IDeploymentService, DeployResult } from '../src/deployer/deployment-service.js';

class MockDeploymentService implements IDeploymentService {
  async deploy(config: any): Promise<DeployResult> {
    return {
      txHash: '0xmocktxhash...',
      async waitForTransaction() {
        return { address: '0xmocktoken...' as `0x${string}` };
      }
    };
  }

  // ... implement other methods as needed for testing
}

// Use in tests
const mockService = new MockDeploymentService();
const deployer = new Deployer(config, validationService, rewardService, mockService);
```