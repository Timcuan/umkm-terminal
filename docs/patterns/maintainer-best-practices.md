# Maintainer Best Practices

This guide provides best practices and patterns for maintainers working with the refactored codebase. It covers coding standards, architectural patterns, and maintenance workflows.

## Code Organization Patterns

### Service-Oriented Architecture

The refactored codebase follows a service-oriented architecture with clear separation of concerns:

```
src/
├── services/           # Cross-cutting services
│   ├── validation-service.ts
│   └── reward-recipient-service.ts
├── deployer/          # Deployment-related modules
│   ├── deployer.ts
│   ├── deployment-service.ts
│   ├── factory.ts
│   └── nonce-manager.ts
├── wallet/            # Wallet management modules
│   ├── store.ts
│   ├── encryption-service.ts
│   ├── backup-service.ts
│   └── transaction.ts
├── batch/             # Batch processing modules
│   ├── batch-deployer.ts
│   ├── template-service.ts
│   └── farcaster-integration.ts
├── types/             # Type definitions and validation
│   ├── index.ts
│   ├── runtime-validation.ts
│   └── configuration.ts
└── errors/            # Error handling
    ├── index.ts
    └── standardized-errors.ts
```

### Module Responsibilities

Each module should have a single, well-defined responsibility:

```typescript
// ✅ Good - focused responsibility
// src/services/validation-service.ts
export class ValidationService implements IValidationService {
  // Only validation-related methods
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo> { }
  validateAddress(address: string): ServiceValidationResult<AddressInfo> { }
  validateTokenConfig(config: TokenConfiguration): ServiceValidationResult<TokenConfigInfo> { }
}

// ❌ Bad - mixed responsibilities
export class ValidationAndDeploymentService {
  // Validation methods
  validatePrivateKey(privateKey: string) { }
  
  // Deployment methods (wrong module!)
  deployToken(config: TokenConfig) { }
  
  // Wallet methods (wrong module!)
  saveWallet(wallet: Wallet) { }
}
```

## Dependency Injection Patterns

### Constructor Injection

Always use constructor injection for dependencies:

```typescript
// ✅ Good - constructor injection with defaults
export class Deployer {
  constructor(
    private config: ClankerEnvConfig,
    private validationService: IValidationService = new ValidationService(),
    private rewardService: RewardRecipientService = new RewardRecipientService(),
    private deploymentService: IDeploymentService = new ClankerDeploymentService(clanker)
  ) {}
}

// ❌ Bad - service locator pattern
export class Deployer {
  private validationService: IValidationService;
  
  constructor(private config: ClankerEnvConfig) {
    // Don't use service locator
    this.validationService = ServiceLocator.get('ValidationService');
  }
}

// ❌ Bad - direct instantiation
export class Deployer {
  private validationService: ValidationService;
  
  constructor(private config: ClankerEnvConfig) {
    // Hard dependency - difficult to test
    this.validationService = new ValidationService();
  }
}
```

### Interface Segregation

Keep interfaces focused and cohesive:

```typescript
// ✅ Good - focused interfaces
interface IValidationService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo>;
  validateAddress(address: string): ServiceValidationResult<AddressInfo>;
}

interface IEncryptionService {
  encrypt(plaintext: string, password: string): string;
  decrypt(encrypted: string, password: string): string | null;
}

// ❌ Bad - god interface
interface IEverythingService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo>;
  encrypt(plaintext: string, password: string): string;
  deployToken(config: TokenConfig): Promise<DeployResult>;
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}
```

## Error Handling Patterns

### Typed Errors with Context

Always use typed errors with rich context information:

```typescript
// ✅ Good - typed error with context
export class ValidationService {
  validatePrivateKey(privateKey: string): ServiceValidationResult<PrivateKeyInfo> {
    if (!privateKey || typeof privateKey !== 'string') {
      throw new ValidationError(
        'INVALID_PRIVATE_KEY_FORMAT',
        'Private key must be a non-empty string',
        {
          operation: 'validatePrivateKey',
          component: 'ValidationService',
          input: typeof privateKey,
          timestamp: Date.now()
        }
      );
    }
    
    // More validation...
  }
}

// ❌ Bad - generic error without context
export class ValidationService {
  validatePrivateKey(privateKey: string) {
    if (!privateKey) {
      throw new Error('Invalid private key'); // No context, hard to debug
    }
  }
}
```

### Result Types for Sync Operations

Use Result types for operations that can fail without throwing:

```typescript
// ✅ Good - Result type for sync operations
export function parseConfiguration(input: string): Result<Configuration, ValidationError> {
  try {
    const parsed = JSON.parse(input);
    const validation = validateConfiguration(parsed);
    
    if (!validation.success) {
      return Result.error(new ValidationError(
        'INVALID_CONFIGURATION',
        validation.error,
        { operation: 'parseConfiguration' }
      ));
    }
    
    return Result.ok(validation.data);
  } catch (error) {
    return Result.error(new ValidationError(
      'PARSE_ERROR',
      'Failed to parse configuration JSON',
      { operation: 'parseConfiguration', cause: error }
    ));
  }
}

// Usage
const result = parseConfiguration(userInput);
if (result.isOk()) {
  console.log('Configuration:', result.value);
} else {
  console.error('Parse error:', result.error.message);
}

// ❌ Bad - mixed error handling patterns
export function parseConfiguration(input: string): Configuration {
  try {
    const parsed = JSON.parse(input);
    
    if (!isValidConfiguration(parsed)) {
      return null; // Inconsistent - sometimes throws, sometimes returns null
    }
    
    return parsed;
  } catch (error) {
    throw error; // Inconsistent error types
  }
}
```

## Testing Patterns

### Test Structure

Organize tests to match the service architecture:

```
tests/
├── unit/              # Unit tests for individual components
│   ├── services/
│   │   ├── validation-service.test.ts
│   │   └── reward-recipient-service.test.ts
│   ├── deployer/
│   │   ├── deployer.test.ts
│   │   └── nonce-manager.test.ts
│   └── wallet/
│       ├── store.test.ts
│       └── encryption-service.test.ts
├── integration/       # Integration tests for service interactions
│   ├── deployment-flow.test.ts
│   └── wallet-management.test.ts
├── properties/        # Property-based tests
│   ├── validation-properties.test.ts
│   ├── error-handling-properties.test.ts
│   └── type-safety.test.ts
└── fixtures/          # Test data and utilities
    ├── mock-services.ts
    └── test-data.ts
```

### Mock Service Creation

Create consistent mock services for testing:

```typescript
// ✅ Good - comprehensive mock service factory
export function createMockValidationService(overrides: Partial<IValidationService> = {}): IValidationService {
  const defaultMock: IValidationService = {
    validatePrivateKey: jest.fn().mockReturnValue({
      success: true,
      data: { address: '0xmockaddress', normalizedKey: '0xmockkey' }
    }),
    validateAddress: jest.fn().mockReturnValue({
      success: true,
      data: { address: '0xmockaddress', isValid: true, checksumAddress: '0xMockAddress' }
    }),
    validateTokenConfig: jest.fn().mockReturnValue({
      success: true,
      data: { name: 'MockToken', symbol: 'MOCK', isValid: true, errors: [] }
    }),
    validateMnemonic: jest.fn().mockReturnValue({
      success: true,
      data: { mnemonic: 'mock mnemonic', isValid: true, wordCount: 12 }
    })
  };
  
  return { ...defaultMock, ...overrides };
}

// Usage in tests
describe('Deployer', () => {
  it('should handle validation errors', () => {
    const mockValidation = createMockValidationService({
      validatePrivateKey: jest.fn().mockReturnValue({
        success: false,
        error: 'Invalid private key format'
      })
    });
    
    const deployer = new Deployer(config, mockValidation);
    
    expect(() => {
      deployer.deploy(tokenConfig);
    }).toThrow('Invalid private key format');
  });
});

// ❌ Bad - inconsistent mock creation
describe('Deployer', () => {
  it('should handle validation errors', () => {
    // Inconsistent mock structure
    const mockValidation = {
      validatePrivateKey: () => false, // Wrong return type
      validateAddress: jest.fn(), // No return value
      // Missing other methods
    };
    
    const deployer = new Deployer(config, mockValidation as any);
    // Test will likely fail due to incomplete mock
  });
});
```

### Property Test Integration

Integrate property tests with unit tests effectively:

```typescript
describe('RewardRecipientService', () => {
  // Unit tests for specific scenarios
  describe('Unit Tests', () => {
    it('should handle empty recipients array', () => {
      const service = new RewardRecipientService();
      const result = service.normalize([], '0xdefault');
      
      expect(result).toEqual([{ address: '0xdefault', allocation: 100 }]);
    });
    
    it('should distribute remaining allocation equally', () => {
      const service = new RewardRecipientService();
      const recipients = [
        { address: '0xabc', allocation: 50 },
        { address: '0xdef' }, // No allocation
        { address: '0x123' }  // No allocation
      ];
      
      const result = service.normalize(recipients);
      
      expect(result).toEqual([
        { address: '0xabc', allocation: 50 },
        { address: '0xdef', allocation: 25 },
        { address: '0x123', allocation: 25 }
      ]);
    });
  });
  
  // Property tests for universal behavior
  describe('Property Tests', () => {
    it('Property: Total allocation always equals 100%', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          address: fc.string().filter(s => s.startsWith('0x') && s.length === 42),
          allocation: fc.option(fc.integer({ min: 0, max: 100 }))
        }), { minLength: 1, maxLength: 10 }),
        (recipients) => {
          const service = new RewardRecipientService();
          const normalized = service.normalize(recipients);
          const total = normalized.reduce((sum, r) => sum + r.allocation, 0);
          return Math.abs(total - 100) < 0.01;
        }
      ), { numRuns: 100 });
    });
  });
});
```

## Performance Patterns

### Batch Operations

Prefer batch operations over sequential processing:

```typescript
// ✅ Good - batch processing
export class NonceManager {
  async syncNonces(addresses: string[]): Promise<void> {
    if (addresses.length === 0) return;
    
    // Batch all nonce requests into single network call
    const batchRequest = this.createBatchNonceRequest(addresses);
    const results = await this.executeBatchRequest(batchRequest);
    this.updateNonceCache(addresses, results);
  }
}

// Usage
const addresses = ['0xabc', '0xdef', '0x123'];
await nonceManager.syncNonces(addresses); // Single network call

// ❌ Bad - sequential processing
export class NonceManager {
  async syncNonces(addresses: string[]): Promise<void> {
    for (const address of addresses) {
      // Sequential network calls - slow for large batches
      const nonce = await this.fetchNonce(address);
      this.updateNonce(address, nonce);
    }
  }
}
```

### Streaming for Large Datasets

Use streaming patterns for large datasets to avoid memory accumulation:

```typescript
// ✅ Good - streaming pattern
export class BatchDeployer {
  async* deployStream(
    configs: AsyncIterable<TokenConfig>,
    options: StreamingOptions = {}
  ): AsyncGenerator<DeployResult, void, unknown> {
    
    for await (const chunk of this.chunkConfigs(configs, options.chunkSize || 10)) {
      const results = await this.deployChunk(chunk);
      
      for (const result of results) {
        yield result; // Stream results immediately
        await this.cleanupResources(result); // Clean up after each result
      }
    }
  }
}

// Usage - constant memory usage
for await (const result of deployer.deployStream(configs)) {
  console.log('Deployed:', result.address);
  // Process result immediately, no accumulation
}

// ❌ Bad - accumulating pattern
export class BatchDeployer {
  async deployBatch(configs: TokenConfig[]): Promise<DeployResult[]> {
    const results: DeployResult[] = [];
    
    for (const config of configs) {
      const result = await this.deploy(config);
      results.push(result); // Accumulates in memory
    }
    
    return results; // Large memory usage for big batches
  }
}
```

### Caching Strategies

Implement intelligent caching with proper invalidation:

```typescript
// ✅ Good - intelligent caching with TTL and invalidation
export class NonceManager {
  private nonceCache = new Map<string, CachedNonce>();
  private readonly cacheMaxAge = 30000; // 30 seconds
  
  async getNonce(address: string): Promise<number> {
    const cached = this.nonceCache.get(address.toLowerCase());
    
    // Check cache validity
    if (cached && !this.isCacheStale(cached)) {
      return cached.nonce + cached.pendingTransactions;
    }
    
    // Fetch fresh nonce
    const nonce = await this.fetchNonce(address);
    this.updateCache(address, nonce);
    
    return nonce;
  }
  
  private isCacheStale(cached: CachedNonce): boolean {
    return Date.now() - cached.lastUpdated > this.cacheMaxAge || cached.isDirty;
  }
  
  invalidateCache(address: string): void {
    const cached = this.nonceCache.get(address.toLowerCase());
    if (cached) {
      cached.isDirty = true; // Mark for refresh
    }
  }
}

// ❌ Bad - naive caching without invalidation
export class NonceManager {
  private nonceCache = new Map<string, number>();
  
  async getNonce(address: string): Promise<number> {
    // No cache invalidation - stale data risk
    if (this.nonceCache.has(address)) {
      return this.nonceCache.get(address)!;
    }
    
    const nonce = await this.fetchNonce(address);
    this.nonceCache.set(address, nonce);
    return nonce;
  }
}
```

## Documentation Patterns

### JSDoc Standards

Follow consistent JSDoc patterns:

```typescript
/**
 * Validates and normalizes reward recipient configurations
 * 
 * This method handles complex scenarios including missing allocations,
 * percentage distribution, and rounding errors while ensuring the total
 * always equals exactly 100%.
 * 
 * @param recipients - Array of recipient configurations to normalize
 * @param defaultRecipient - Optional default recipient for remaining allocation
 * @returns Normalized recipients with exact 100% total allocation
 * 
 * @example
 * ```typescript
 * const service = new RewardRecipientService();
 * const recipients = [
 *   { address: '0xabc', allocation: 50 },
 *   { address: '0xdef' } // No allocation specified
 * ];
 * 
 * const normalized = service.normalize(recipients, '0xdefault');
 * console.log(normalized);
 * // [
 * //   { address: '0xabc', allocation: 50 },
 * //   { address: '0xdef', allocation: 50 }
 * // ]
 * ```
 * 
 * @throws {ValidationError} When recipient addresses are invalid
 * @throws {ValidationError} When allocations are negative or exceed 100%
 * 
 * @see {@link validateRewardRecipientsOrThrow} For validation-only version
 * @since 2.0.0
 */
normalize(
  recipients: RewardRecipientConfig[],
  defaultRecipient?: string
): NormalizedRewardRecipient[] {
  // Implementation...
}
```

### Code Comments for Complex Logic

Add explanatory comments for complex algorithms:

```typescript
/**
 * Token Bucket Rate Limiting Algorithm
 * 
 * This algorithm provides O(1) rate limiting by maintaining a bucket of tokens
 * that refill at a constant rate. Each operation consumes one token.
 */
export class RateLimiter {
  private tokens: number;           // Current number of tokens in bucket
  private lastRefillTime: number;   // Timestamp of last token refill
  
  tryConsume(): boolean {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefillTime;
    
    // Step 1: Calculate new tokens based on elapsed time
    // Formula: newTokens = elapsedTime * refillRate
    const tokensToAdd = timeSinceLastRefill * this.refillRate;
    
    // Step 2: Refill bucket but don't exceed maximum capacity
    // This prevents token accumulation beyond burst capacity
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
    
    // Step 3: Check availability and consume token
    if (this.tokens >= 1) {
      this.tokens -= 1; // Consume one token
      return true;      // Request allowed
    }
    
    return false; // No tokens available, request rate limited
  }
}
```

## Maintenance Workflows

### Adding New Services

When adding new services, follow this checklist:

1. **Define Interface First**
   ```typescript
   // 1. Create interface in appropriate module
   export interface INewService {
     performOperation(input: InputType): Promise<OutputType>;
   }
   ```

2. **Implement Service**
   ```typescript
   // 2. Create implementation
   export class NewService implements INewService {
     async performOperation(input: InputType): Promise<OutputType> {
       // Implementation
     }
   }
   ```

3. **Add Dependency Injection**
   ```typescript
   // 3. Update consumers to accept interface
   export class Consumer {
     constructor(
       private newService: INewService = new NewService()
     ) {}
   }
   ```

4. **Create Tests**
   ```typescript
   // 4. Add comprehensive tests
   describe('NewService', () => {
     // Unit tests
     // Property tests
     // Integration tests
   });
   ```

5. **Update Documentation**
   - Add JSDoc to all public methods
   - Create usage examples
   - Update architectural documentation

### Modifying Existing Services

When modifying existing services:

1. **Check Backward Compatibility**
   - Run compatibility tests
   - Verify public API signatures unchanged
   - Check for breaking changes

2. **Update Tests**
   - Add tests for new functionality
   - Update existing tests if behavior changed
   - Ensure property tests still pass

3. **Update Documentation**
   - Update JSDoc comments
   - Add examples for new features
   - Update migration guides if needed

### Performance Monitoring

Implement performance monitoring for critical paths:

```typescript
// Add performance monitoring to critical operations
export class Deployer {
  async deploy(config: TokenConfig): Promise<DeployResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.performDeployment(config);
      
      // Log successful deployment metrics
      const duration = Date.now() - startTime;
      this.metrics.recordDeployment(duration, 'success');
      
      return result;
    } catch (error) {
      // Log failed deployment metrics
      const duration = Date.now() - startTime;
      this.metrics.recordDeployment(duration, 'failure');
      
      throw error;
    }
  }
}
```

## Code Review Guidelines

### Review Checklist

When reviewing code changes:

- [ ] **Architecture**: Does the change follow service-oriented patterns?
- [ ] **Dependencies**: Are dependencies injected properly?
- [ ] **Error Handling**: Are typed errors used with proper context?
- [ ] **Testing**: Are both unit and property tests included?
- [ ] **Performance**: Are batch operations used where appropriate?
- [ ] **Documentation**: Is JSDoc complete and accurate?
- [ ] **Backward Compatibility**: Are public APIs preserved?

### Common Issues to Watch For

1. **Service Locator Anti-pattern**
   ```typescript
   // ❌ Avoid service locator
   const service = ServiceLocator.get('ValidationService');
   
   // ✅ Use dependency injection
   constructor(private validationService: IValidationService) {}
   ```

2. **Mixed Error Handling**
   ```typescript
   // ❌ Inconsistent error handling
   function validate(input: string) {
     if (!input) return null;        // Sometimes returns null
     if (input.length > 100) throw new Error('Too long'); // Sometimes throws
     return input;                   // Sometimes returns value
   }
   
   // ✅ Consistent Result type
   function validate(input: string): Result<string, ValidationError> {
     // Always returns Result type
   }
   ```

3. **Missing Property Tests**
   ```typescript
   // ❌ Only unit tests
   describe('validateAddress', () => {
     it('should accept valid address', () => { /* ... */ });
   });
   
   // ✅ Include property tests
   describe('validateAddress', () => {
     // Unit tests for specific cases
     it('should accept valid address', () => { /* ... */ });
     
     // Property tests for universal behavior
     it('Property: All valid addresses are accepted', () => {
       fc.assert(fc.property(validAddressGenerator, (addr) => {
         return validateAddress(addr).success;
       }));
     });
   });
   ```

This guide provides the foundation for maintaining high code quality and consistency across the refactored codebase while enabling future growth and evolution.