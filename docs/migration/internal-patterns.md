# Internal Migration Patterns

This guide documents the internal migration patterns for maintainers working with the refactored codebase.

## Overview

The refactoring introduced several new patterns and service interfaces while maintaining 100% backward compatibility for public APIs. This guide helps maintainers understand how to work with the new internal patterns.

## Service Interface Patterns

### Before: Direct Implementation

```typescript
// Old pattern - direct validation in each module
function deployToken(config: TokenConfig) {
  // Inline validation logic (duplicated across modules)
  if (!config.privateKey || !config.privateKey.startsWith('0x')) {
    throw new Error('Invalid private key');
  }
  
  // Deployment logic...
}
```

### After: Service Injection

```typescript
// New pattern - injected validation service
import { IValidationService } from '../services/validation-service.js';

class Deployer {
  constructor(
    private config: Config,
    private validationService: IValidationService
  ) {}
  
  deploy(config: TokenConfig) {
    // Use injected service
    const result = this.validationService.validatePrivateKey(config.privateKey);
    if (!result.success) {
      throw new ValidationError('INVALID_PRIVATE_KEY', result.error);
    }
    
    // Deployment logic...
  }
}
```

## Error Handling Migration

### Before: Inconsistent Errors

```typescript
// Old pattern - inconsistent error handling
function validateInput(input: string) {
  if (!input) {
    throw new Error('Input required'); // Generic Error
  }
  if (input.length > 100) {
    return { error: 'Too long' }; // Inconsistent return type
  }
  return input;
}
```

### After: Standardized Errors and Result Types

```typescript
// New pattern - typed errors and Result types
import { ValidationError, Result } from '../errors/standardized-errors.js';

function validateInput(input: string): Result<string, ValidationError> {
  if (!input) {
    return Result.error(new ValidationError(
      'MISSING_INPUT', 
      'Input is required',
      { operation: 'validateInput', component: 'InputValidator' }
    ));
  }
  
  if (input.length > 100) {
    return Result.error(new ValidationError(
      'INPUT_TOO_LONG',
      'Input must be 100 characters or less',
      { operation: 'validateInput', maxLength: 100, actualLength: input.length }
    ));
  }
  
  return Result.ok(input);
}

// Usage with Result type
const result = validateInput(userInput);
if (result.isOk()) {
  console.log('Valid input:', result.value);
} else {
  console.error('Validation error:', result.error.message);
  console.error('Error context:', result.error.context);
}
```

## Module Organization Migration

### Before: Monolithic Files

```typescript
// Old pattern - everything in one large file
// src/batch/index.ts (500+ lines)

export class BatchDeployer {
  // Template management methods
  loadTemplate() { /* ... */ }
  validateTemplate() { /* ... */ }
  
  // Deployment methods  
  deploy() { /* ... */ }
  deployBatch() { /* ... */ }
  
  // Farcaster integration
  fetchFarcasterWallets() { /* ... */ }
  syncWithFarcaster() { /* ... */ }
  
  // Progress tracking
  updateProgress() { /* ... */ }
  notifyProgress() { /* ... */ }
}
```

### After: Focused Services

```typescript
// New pattern - focused, single-responsibility services

// src/batch/template-service.ts
export class TemplateService {
  loadTemplate() { /* ... */ }
  validateTemplate() { /* ... */ }
}

// src/batch/batch-deployer.ts  
export class BatchDeployer {
  constructor(
    private templateService: TemplateService,
    private farcasterService: FarcasterService
  ) {}
  
  deploy() { /* ... */ }
  deployBatch() { /* ... */ }
}

// src/batch/farcaster-integration.ts
export class FarcasterService {
  fetchFarcasterWallets() { /* ... */ }
  syncWithFarcaster() { /* ... */ }
}

// src/batch/index.ts - clean exports
export { BatchDeployer } from './batch-deployer.js';
export { TemplateService } from './template-service.js';
export { FarcasterService } from './farcaster-integration.js';
```

## Validation Pattern Migration

### Before: Inline Validation

```typescript
// Old pattern - validation scattered throughout code
function processRewardRecipients(recipients: any[]) {
  // Validation mixed with business logic
  if (!recipients || !Array.isArray(recipients)) {
    throw new Error('Invalid recipients');
  }
  
  let totalPercentage = 0;
  const processed = [];
  
  for (const recipient of recipients) {
    if (!recipient.address || !recipient.address.startsWith('0x')) {
      throw new Error('Invalid address');
    }
    
    const percentage = recipient.percentage || 0;
    if (percentage < 0 || percentage > 100) {
      throw new Error('Invalid percentage');
    }
    
    totalPercentage += percentage;
    processed.push({ address: recipient.address, percentage });
  }
  
  if (totalPercentage !== 100) {
    throw new Error('Percentages must sum to 100');
  }
  
  return processed;
}
```

### After: Service-Based Validation

```typescript
// New pattern - dedicated service with clear separation
import { RewardRecipientService } from '../services/reward-recipient-service.js';

class RewardProcessor {
  constructor(private rewardService: RewardRecipientService) {}
  
  processRewardRecipients(recipients: RewardRecipientConfig[]) {
    // Normalize recipients (handles missing allocations, etc.)
    const normalized = this.rewardService.normalize(recipients);
    
    // Validate normalized recipients
    const validation = this.rewardService.validate(normalized);
    if (!validation.success) {
      throw new ValidationError('INVALID_RECIPIENTS', validation.error);
    }
    
    return normalized;
  }
}
```

## Runtime Validation Migration

### Before: TypeScript Only

```typescript
// Old pattern - TypeScript types only (no runtime validation)
interface TokenConfig {
  name: string;
  symbol: string;
  chainId: number;
}

function deployToken(config: TokenConfig) {
  // No runtime validation - assumes TypeScript caught all issues
  // Runtime errors possible if config comes from external source
  return deploy(config);
}
```

### After: Runtime + Compile-time Validation

```typescript
// New pattern - runtime validation that matches TypeScript types
import { validateClankerTokenV4, createValidationContext } from '../types/runtime-validation.js';

interface TokenConfig {
  name: string;
  symbol: string;
  chainId: number;
}

function deployToken(config: unknown): TokenConfig {
  // Runtime validation with proper error handling
  const context = createValidationContext('tokenConfig', true, false);
  const result = validateClankerTokenV4(config, context);
  
  if (!result.success) {
    throw new ValidationError(
      'INVALID_TOKEN_CONFIG',
      `Configuration validation failed: ${result.errors.join(', ')}`,
      { operation: 'deployToken', errors: result.errors, warnings: result.warnings }
    );
  }
  
  // Now we know config is valid at runtime
  return result.data;
}
```

## Testing Pattern Migration

### Before: Manual Mocking

```typescript
// Old pattern - manual mocking with lots of setup
describe('Deployer', () => {
  it('should deploy token', async () => {
    // Manual mock setup
    const mockClanker = {
      deploy: jest.fn().mockResolvedValue({ txHash: '0x123' })
    };
    
    // Monkey patching or complex setup
    const originalDeploy = Deployer.prototype.deploy;
    Deployer.prototype.deploy = mockClanker.deploy;
    
    const deployer = new Deployer(config);
    const result = await deployer.deploy(tokenConfig);
    
    expect(result.txHash).toBe('0x123');
    
    // Cleanup
    Deployer.prototype.deploy = originalDeploy;
  });
});
```

### After: Dependency Injection Testing

```typescript
// New pattern - clean dependency injection for testing
describe('Deployer', () => {
  it('should deploy token', async () => {
    // Clean mock services
    const mockValidation = createMockValidationService();
    const mockRewardService = createMockRewardService();
    const mockDeploymentService = createMockDeploymentService({
      deploy: jest.fn().mockResolvedValue({ txHash: '0x123' })
    });
    
    // Inject mocks via constructor
    const deployer = new Deployer(
      config,
      mockValidation,
      mockRewardService,
      mockDeploymentService
    );
    
    const result = await deployer.deploy(tokenConfig);
    
    expect(result.txHash).toBe('0x123');
    expect(mockDeploymentService.deploy).toHaveBeenCalledWith(tokenConfig);
  });
});

// Helper functions for creating consistent mocks
function createMockValidationService(): IValidationService {
  return {
    validatePrivateKey: jest.fn().mockReturnValue({ success: true, data: { address: '0x123', normalizedKey: '0xkey' } }),
    validateAddress: jest.fn().mockReturnValue({ success: true, data: { address: '0x123', isValid: true, checksumAddress: '0x123' } }),
    // ... other methods
  };
}
```

## Property-Based Testing Integration

### Adding Property Tests

```typescript
// New pattern - property-based testing for universal properties
import * as fc from 'fast-check';

describe('RewardRecipientService', () => {
  // Traditional unit test for specific case
  it('should normalize recipients with missing allocations', () => {
    const service = new RewardRecipientService();
    const recipients = [
      { address: '0xabc', allocation: 50 },
      { address: '0xdef' } // Missing allocation
    ];
    
    const result = service.normalize(recipients);
    expect(result).toHaveLength(2);
    expect(result[1].allocation).toBe(50); // Remaining allocation
  });
  
  // Property-based test for universal behavior
  it('Property: Normalized recipients always sum to 100%', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        address: fc.string().filter(s => s.startsWith('0x') && s.length === 42),
        allocation: fc.option(fc.integer({ min: 0, max: 100 }))
      }), { minLength: 1, maxLength: 10 }),
      (recipients) => {
        const service = new RewardRecipientService();
        const normalized = service.normalize(recipients);
        const total = normalized.reduce((sum, r) => sum + r.allocation, 0);
        return Math.abs(total - 100) < 0.01; // Allow for floating point precision
      }
    ), { numRuns: 100 });
  });
});
```

## Performance Pattern Migration

### Before: Sequential Operations

```typescript
// Old pattern - sequential nonce fetching
async function deployBatch(configs: TokenConfig[]) {
  const results = [];
  
  for (const config of configs) {
    // Sequential nonce fetching - slow for large batches
    const nonce = await getNonce(config.wallet);
    const result = await deploy({ ...config, nonce });
    results.push(result);
  }
  
  return results;
}
```

### After: Batch Optimization

```typescript
// New pattern - batch nonce fetching and streaming
import { NonceManager } from '../deployer/nonce-manager.js';

class BatchDeployer {
  constructor(private nonceManager: NonceManager) {}
  
  async* deployBatch(configs: TokenConfig[]) {
    // Batch nonce fetching - much faster
    const wallets = configs.map(c => c.wallet);
    await this.nonceManager.syncNonces(wallets);
    
    // Stream results to avoid memory accumulation
    for (const config of configs) {
      const nonce = await this.nonceManager.getNonce(config.wallet); // Now cached
      const result = await this.deploy({ ...config, nonce });
      yield result; // Stream result immediately
    }
  }
}

// Usage with streaming
async function processBatch(configs: TokenConfig[]) {
  const deployer = new BatchDeployer(nonceManager);
  
  for await (const result of deployer.deployBatch(configs)) {
    console.log('Deployment completed:', result.address);
    // Process result immediately, no memory accumulation
  }
}
```

## Migration Checklist

When working with the refactored codebase, use this checklist:

### ✅ Service Integration
- [ ] Use injected services instead of direct implementations
- [ ] Implement service interfaces for new functionality
- [ ] Add proper JSDoc documentation to service methods
- [ ] Create factory functions for backward compatibility

### ✅ Error Handling
- [ ] Use typed error classes (ValidationError, DeploymentError, etc.)
- [ ] Include rich context information in errors
- [ ] Use Result types for sync operations that can fail
- [ ] Provide user-friendly error messages

### ✅ Validation
- [ ] Use runtime validation for external inputs
- [ ] Ensure runtime validation matches TypeScript types
- [ ] Add property-based tests for validation functions
- [ ] Use validation services instead of inline validation

### ✅ Testing
- [ ] Use dependency injection for clean mocking
- [ ] Add property-based tests for universal properties
- [ ] Test both success and error paths
- [ ] Include integration tests for service interactions

### ✅ Performance
- [ ] Use batch operations where applicable
- [ ] Implement streaming for large datasets
- [ ] Add rate limiting for external API calls
- [ ] Monitor and optimize resource usage

### ✅ Documentation
- [ ] Add comprehensive JSDoc to public methods
- [ ] Include usage examples in documentation
- [ ] Document architectural decisions
- [ ] Provide migration guides for breaking changes

## Common Pitfalls

### 1. Forgetting Dependency Injection
```typescript
// ❌ Don't create services directly in constructors
class Deployer {
  constructor(config: Config) {
    this.validationService = new ValidationService(); // Hard dependency
  }
}

// ✅ Accept services as constructor parameters
class Deployer {
  constructor(
    config: Config,
    validationService: IValidationService = new ValidationService()
  ) {
    this.validationService = validationService; // Injected dependency
  }
}
```

### 2. Inconsistent Error Handling
```typescript
// ❌ Don't mix error patterns
function validate(input: string) {
  if (!input) {
    throw new Error('Missing input'); // Generic error
  }
  if (input.length > 100) {
    return { error: 'Too long' }; // Different pattern
  }
  return input; // Different return type
}

// ✅ Use consistent Result types
function validate(input: string): Result<string, ValidationError> {
  if (!input) {
    return Result.error(new ValidationError('MISSING_INPUT', 'Input is required'));
  }
  if (input.length > 100) {
    return Result.error(new ValidationError('INPUT_TOO_LONG', 'Input too long'));
  }
  return Result.ok(input);
}
```

### 3. Skipping Runtime Validation
```typescript
// ❌ Don't assume TypeScript types are enough
function processConfig(config: TokenConfig) {
  // No runtime validation - dangerous for external inputs
  return deploy(config);
}

// ✅ Always validate external inputs at runtime
function processConfig(config: unknown): TokenConfig {
  const result = validateTokenConfig(config);
  if (!result.success) {
    throw new ValidationError('INVALID_CONFIG', result.errors.join(', '));
  }
  return result.data;
}
```

This migration guide should help maintainers understand and work effectively with the refactored patterns while maintaining the high quality and consistency of the codebase.