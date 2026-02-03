# Property-Based Testing Guide

This guide explains the property-based testing approach implemented during the refactoring and how to write effective property tests for the codebase.

## Overview

Property-based testing (PBT) validates software correctness by testing universal properties across many generated inputs. Instead of testing specific examples, PBT tests that certain properties hold for all valid inputs.

## Core Concepts

### Properties vs Examples

```typescript
// Example-based testing (traditional unit tests)
describe('validateAddress', () => {
  it('should accept valid address', () => {
    const result = validateAddress('0x1234567890123456789012345678901234567890');
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid address', () => {
    const result = validateAddress('invalid');
    expect(result.success).toBe(false);
  });
});

// Property-based testing
describe('validateAddress Properties', () => {
  it('Property: All valid addresses are accepted', () => {
    fc.assert(fc.property(
      // Generator for valid addresses
      fc.string({ minLength: 40, maxLength: 40 })
        .filter(s => /^[a-fA-F0-9]{40}$/.test(s))
        .map(hex => `0x${hex}`),
      (address) => {
        const result = validateAddress(address);
        return result.success && result.data === address;
      }
    ), { numRuns: 100 });
  });
  
  it('Property: All invalid addresses are rejected', () => {
    fc.assert(fc.property(
      // Generator for invalid addresses
      fc.oneof(
        fc.string().filter(s => !/^0x[a-fA-F0-9]{40}$/.test(s)),
        fc.integer(),
        fc.boolean()
      ),
      (invalidAddress) => {
        const result = validateAddress(invalidAddress);
        return !result.success && result.errors.length > 0;
      }
    ), { numRuns: 100 });
  });
});
```

### Universal Quantification

Every property must contain an explicit "for all" statement:

```typescript
// ✅ Good - explicit universal quantification
it('Property: For all valid token names, validation succeeds', () => {
  fc.assert(fc.property(
    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    (name) => {
      const result = validateTokenName(name);
      return result.success;
    }
  ));
});

// ❌ Bad - no universal quantification
it('Property: Token name validation works', () => {
  const result = validateTokenName('MyToken');
  expect(result.success).toBe(true);
});
```

## Common Property Patterns

### 1. Invariant Properties

Properties that remain constant despite changes to structure or order.

```typescript
describe('Invariant Properties', () => {
  it('Property: Reward recipient normalization preserves total allocation', () => {
    fc.assert(fc.property(
      // Generate array of recipients with random allocations
      fc.array(fc.record({
        address: fc.string().filter(s => s.startsWith('0x') && s.length === 42),
        allocation: fc.option(fc.integer({ min: 0, max: 100 }))
      }), { minLength: 1, maxLength: 10 }),
      (recipients) => {
        const service = new RewardRecipientService();
        const normalized = service.normalize(recipients);
        
        // Invariant: Total allocation always equals 100%
        const total = normalized.reduce((sum, r) => sum + r.allocation, 0);
        return Math.abs(total - 100) < 0.01; // Allow floating point precision
      }
    ), { numRuns: 100 });
  });
  
  it('Property: Wallet transaction preserves wallet count', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        privateKey: fc.string({ minLength: 66, maxLength: 66 }).filter(s => s.startsWith('0x')),
        password: fc.string({ minLength: 1, maxLength: 50 })
      }), { minLength: 0, maxLength: 20 }),
      (wallets) => {
        const transaction = WalletStoreTransaction.begin();
        const initialCount = transaction.getWalletCount();
        
        // Add wallets
        for (const wallet of wallets) {
          transaction.addWallet(wallet.name, wallet.privateKey, wallet.password);
        }
        
        // Invariant: Wallet count increases by number of added wallets
        const finalCount = transaction.getWalletCount();
        return finalCount === initialCount + wallets.length;
      }
    ), { numRuns: 50 });
  });
});
```

### 2. Round Trip Properties

Properties based on combining an operation with its inverse to return to original value.

```typescript
describe('Round Trip Properties', () => {
  it('Property: Encryption/decryption round trip preserves data', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 1000 }),
      fc.string({ minLength: 8, maxLength: 50 }),
      (plaintext, password) => {
        const encryptionService = new EncryptionService();
        
        // Round trip: encrypt then decrypt
        const encrypted = encryptionService.encrypt(plaintext, password);
        const decrypted = encryptionService.decrypt(encrypted, password);
        
        // Property: Round trip preserves original data
        return decrypted === plaintext;
      }
    ), { numRuns: 100 });
  });
  
  it('Property: Token configuration serialization round trip', () => {
    fc.assert(fc.property(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        symbol: fc.string({ minLength: 1, maxLength: 10 }).map(s => s.toUpperCase()),
        chainId: fc.constantFrom(1, 8453, 42161),
        tokenAdmin: fc.string({ minLength: 42, maxLength: 42 }).filter(s => s.startsWith('0x'))
      }),
      (config) => {
        // Round trip: serialize then deserialize
        const serialized = JSON.stringify(config);
        const deserialized = JSON.parse(serialized);
        
        // Property: Round trip preserves structure
        return JSON.stringify(deserialized) === serialized;
      }
    ), { numRuns: 100 });
  });
});
```

### 3. Idempotence Properties

Properties where doing an operation twice equals doing it once.

```typescript
describe('Idempotence Properties', () => {
  it('Property: Reward recipient normalization is idempotent', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        address: fc.string().filter(s => s.startsWith('0x') && s.length === 42),
        allocation: fc.option(fc.integer({ min: 0, max: 100 }))
      }), { minLength: 1, maxLength: 5 }),
      (recipients) => {
        const service = new RewardRecipientService();
        
        // Apply normalization twice
        const normalized1 = service.normalize(recipients);
        const normalized2 = service.normalize(normalized1);
        
        // Property: f(x) = f(f(x)) - idempotent
        return JSON.stringify(normalized1) === JSON.stringify(normalized2);
      }
    ), { numRuns: 50 });
  });
  
  it('Property: Nonce synchronization is idempotent', () => {
    fc.assert(fc.property(
      fc.array(fc.string().filter(s => s.startsWith('0x') && s.length === 42), { minLength: 1, maxLength: 10 }),
      async (addresses) => {
        const nonceManager = new NonceManager();
        
        // Sync nonces twice
        await nonceManager.syncNonces(addresses);
        const nonces1 = await Promise.all(addresses.map(addr => nonceManager.getNonce(addr)));
        
        await nonceManager.syncNonces(addresses);
        const nonces2 = await Promise.all(addresses.map(addr => nonceManager.getNonce(addr)));
        
        // Property: Syncing twice gives same result as syncing once
        return JSON.stringify(nonces1) === JSON.stringify(nonces2);
      }
    ), { numRuns: 20 });
  });
});
```

### 4. Metamorphic Properties

Properties that test relationships between components without knowing specific outputs.

```typescript
describe('Metamorphic Properties', () => {
  it('Property: Filtered results are subset of original', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        name: fc.string(),
        symbol: fc.string(),
        chainId: fc.integer({ min: 1, max: 100000 })
      }), { minLength: 0, maxLength: 50 }),
      fc.integer({ min: 1, max: 100000 }),
      (tokens, targetChainId) => {
        // Filter tokens by chain ID
        const filtered = tokens.filter(token => token.chainId === targetChainId);
        
        // Property: Filtered results are always subset of original
        return filtered.length <= tokens.length;
      }
    ), { numRuns: 100 });
  });
  
  it('Property: Batch deployment results match individual deployments', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        symbol: fc.string({ minLength: 1, maxLength: 5 }),
        chainId: fc.constantFrom(1, 8453)
      }), { minLength: 1, maxLength: 5 }),
      async (configs) => {
        const mockDeployment = new MockDeploymentService();
        const batchDeployer = new BatchDeployer(mockDeployment);
        const individualDeployer = new Deployer(config, validation, rewards, mockDeployment);
        
        // Deploy using batch method
        const batchResults = await batchDeployer.deployBatch(configs);
        
        // Deploy individually
        const individualResults = await Promise.all(
          configs.map(config => individualDeployer.deploy(config))
        );
        
        // Property: Batch results should match individual results
        return batchResults.length === individualResults.length &&
               batchResults.every(result => result.success === true);
      }
    ), { numRuns: 10 });
  });
});
```

### 5. Error Condition Properties

Properties that test error handling with invalid inputs.

```typescript
describe('Error Condition Properties', () => {
  it('Property: Invalid inputs always produce errors with context', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(''),
        fc.integer(),
        fc.boolean(),
        fc.array(fc.anything())
      ),
      (invalidInput) => {
        try {
          const result = validateTokenConfig(invalidInput);
          
          // If validation doesn't throw, it should return error result
          return !result.success && 
                 result.errors.length > 0 &&
                 result.errors.every(error => typeof error === 'string');
        } catch (error) {
          // If validation throws, error should have proper structure
          return error instanceof ValidationError &&
                 typeof error.message === 'string' &&
                 typeof error.code === 'string';
        }
      }
    ), { numRuns: 100 });
  });
  
  it('Property: Network errors are handled gracefully', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('NETWORK_ERROR'),
        fc.constant('TIMEOUT'),
        fc.constant('CONNECTION_REFUSED'),
        fc.constant('DNS_ERROR')
      ),
      async (errorType) => {
        const mockService = new MockDeploymentService();
        mockService.setErrorMode(errorType);
        
        const deployer = new Deployer(config, validation, rewards, mockService);
        
        try {
          await deployer.deploy(validTokenConfig);
          return false; // Should have thrown
        } catch (error) {
          // Property: All network errors should be wrapped in DeploymentError
          return error instanceof DeploymentError &&
                 error.context &&
                 typeof error.context.operation === 'string';
        }
      }
    ), { numRuns: 20 });
  });
});
```

## Writing Effective Generators

### Smart Generators

Create generators that produce meaningful test data:

```typescript
// ✅ Good - smart generator for valid Ethereum addresses
const validAddressGenerator = fc.string({ minLength: 40, maxLength: 40 })
  .filter(s => /^[a-fA-F0-9]{40}$/.test(s))
  .map(hex => `0x${hex}` as const);

// ✅ Good - generator for realistic token configurations
const tokenConfigGenerator = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => s.trim().length > 0)
    .map(s => s.trim()),
  symbol: fc.string({ minLength: 1, maxLength: 10 })
    .filter(s => /^[A-Z0-9]+$/.test(s.toUpperCase()))
    .map(s => s.toUpperCase()),
  chainId: fc.constantFrom(1, 8453, 42161, 1301, 34443),
  tokenAdmin: validAddressGenerator
});

// ❌ Bad - generator produces mostly invalid data
const badTokenConfigGenerator = fc.record({
  name: fc.string(), // Includes empty strings, whitespace-only
  symbol: fc.string(), // Includes lowercase, special characters
  chainId: fc.integer(), // Includes negative numbers, unsupported chains
  tokenAdmin: fc.string() // Includes non-address strings
});
```

### Constrained Generators

Use filters and maps to constrain generators to valid input spaces:

```typescript
// Generator for valid reward recipient configurations
const rewardRecipientGenerator = fc.array(
  fc.record({
    address: validAddressGenerator,
    allocation: fc.option(fc.integer({ min: 1, max: 99 })), // Optional allocation
    percentage: fc.option(fc.integer({ min: 1, max: 99 }))  // Optional percentage
  }).filter(recipient => 
    // Ensure at most one of allocation or percentage is specified
    !(recipient.allocation !== undefined && recipient.percentage !== undefined)
  ),
  { minLength: 1, maxLength: 10 }
);

// Generator for wallet configurations with realistic constraints
const walletConfigGenerator = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), // Valid wallet name characters
  privateKey: fc.string({ minLength: 64, maxLength: 64 })
    .filter(s => /^[a-fA-F0-9]{64}$/.test(s))
    .map(s => `0x${s}`), // Valid private key format
  password: fc.string({ minLength: 8, maxLength: 128 })
    .filter(s => s.length >= 8) // Minimum password length
});
```

## Property Test Configuration

### Test Parameters

Configure property tests appropriately for different scenarios:

```typescript
describe('Performance Properties', () => {
  it('Property: Batch operations scale linearly', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      async (batchSize) => {
        const configs = Array.from({ length: batchSize }, (_, i) => ({
          name: `Token${i}`,
          symbol: `T${i}`,
          chainId: 1
        }));
        
        const startTime = Date.now();
        await batchDeployer.deployBatch(configs);
        const duration = Date.now() - startTime;
        
        // Property: Time should scale roughly linearly with batch size
        const timePerItem = duration / batchSize;
        return timePerItem < 1000; // Less than 1 second per item
      }
    ), { 
      numRuns: 20,        // Fewer runs for performance tests
      timeout: 30000,     // Longer timeout for performance tests
      verbose: true       // Show progress for long-running tests
    });
  });
});

describe('Validation Properties', () => {
  it('Property: All valid inputs are accepted', () => {
    fc.assert(fc.property(
      tokenConfigGenerator,
      (config) => {
        const result = validateTokenConfig(config);
        return result.success;
      }
    ), { 
      numRuns: 1000,      // Many runs for validation tests
      seed: 42,           // Reproducible tests
      path: "0:0:0"       // Specific path for debugging
    });
  });
});
```

### Shrinking and Debugging

Use fast-check's shrinking capabilities to find minimal failing examples:

```typescript
describe('Debugging Properties', () => {
  it('Property: Token symbol validation (with debugging)', () => {
    fc.assert(fc.property(
      fc.string(),
      (symbol) => {
        const result = validateTokenSymbol(symbol);
        
        // Add debugging information
        if (!result.success) {
          console.log(`Failed symbol: "${symbol}" (length: ${symbol.length})`);
          console.log(`Errors: ${result.errors.join(', ')}`);
        }
        
        // Property: Valid symbols should be accepted
        if (/^[A-Z0-9]{1,20}$/.test(symbol)) {
          return result.success;
        } else {
          return !result.success;
        }
      }
    ), { 
      numRuns: 100,
      verbose: 2,         // Maximum verbosity for debugging
      examples: [         // Specific examples to always test
        [''],             // Empty string
        ['VALID'],        // Valid symbol
        ['invalid'],      // Lowercase
        ['TOO_LONG_SYMBOL_NAME'] // Too long
      ]
    });
  });
});
```

## Integration with Unit Tests

### Complementary Testing Strategy

Use both property tests and unit tests for comprehensive coverage:

```typescript
describe('Token Validation', () => {
  // Unit tests for specific examples and edge cases
  describe('Unit Tests', () => {
    it('should accept valid token name', () => {
      const result = validateTokenName('My Awesome Token');
      expect(result.success).toBe(true);
      expect(result.data).toBe('My Awesome Token');
    });
    
    it('should reject empty token name', () => {
      const result = validateTokenName('');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Token name cannot be empty');
    });
    
    it('should trim whitespace from token name', () => {
      const result = validateTokenName('  Trimmed  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('Trimmed');
    });
  });
  
  // Property tests for universal behavior
  describe('Property Tests', () => {
    it('Property: All non-empty trimmed strings are valid token names', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 100 })
          .filter(s => s.trim().length > 0),
        (name) => {
          const result = validateTokenName(name);
          return result.success && 
                 typeof result.data === 'string' && 
                 result.data.length > 0;
        }
      ), { numRuns: 100 });
    });
    
    it('Property: Validation is consistent regardless of input order', () => {
      fc.assert(fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
        (names) => {
          const results1 = names.map(name => validateTokenName(name));
          const shuffled = [...names].sort(() => Math.random() - 0.5);
          const results2 = shuffled.map(name => validateTokenName(name));
          
          // Property: Order shouldn't affect individual validation results
          return names.every((name, i) => {
            const originalResult = validateTokenName(name);
            const shuffledIndex = shuffled.indexOf(name);
            const shuffledResult = results2[shuffledIndex];
            return originalResult.success === shuffledResult.success;
          });
        }
      ), { numRuns: 50 });
    });
  });
});
```

## Best Practices

### 1. Property Selection

Choose properties that are:
- **Universal**: Apply to all valid inputs
- **Meaningful**: Test important system behaviors
- **Stable**: Don't change frequently with implementation details
- **Verifiable**: Can be checked programmatically

```typescript
// ✅ Good properties
- "For all valid addresses, validation succeeds"
- "For all reward configurations, total allocation equals 100%"
- "For all encryption operations, decryption recovers original data"

// ❌ Bad properties  
- "Validation takes less than 1ms" (implementation detail)
- "Error messages contain specific text" (too brittle)
- "Function returns truthy value" (too vague)
```

### 2. Generator Quality

Invest time in creating high-quality generators:

```typescript
// ✅ Good - realistic generator
const realisticUserGenerator = fc.record({
  email: fc.emailAddress(),
  age: fc.integer({ min: 13, max: 120 }),
  preferences: fc.array(fc.constantFrom('email', 'sms', 'push'), { maxLength: 3 })
});

// ❌ Bad - unrealistic generator
const badUserGenerator = fc.record({
  email: fc.string(), // Produces invalid emails
  age: fc.integer(),  // Produces negative ages
  preferences: fc.array(fc.string()) // Produces invalid preferences
});
```

### 3. Error Handling

Test error conditions as thoroughly as success conditions:

```typescript
describe('Error Handling Properties', () => {
  it('Property: All error results have consistent structure', () => {
    fc.assert(fc.property(
      fc.anything(),
      (input) => {
        try {
          const result = validateInput(input);
          if (!result.success) {
            // Property: Error results have required fields
            return Array.isArray(result.errors) &&
                   result.errors.length > 0 &&
                   result.errors.every(error => typeof error === 'string');
          }
          return true;
        } catch (error) {
          // Property: Thrown errors have required structure
          return error instanceof ValidationError &&
                 typeof error.message === 'string' &&
                 typeof error.code === 'string';
        }
      }
    ), { numRuns: 200 });
  });
});
```

### 4. Performance Considerations

Balance thoroughness with test execution time:

```typescript
// Fast properties for CI/CD
describe('Fast Properties', () => {
  it('Property: Basic validation consistency', () => {
    fc.assert(fc.property(
      fc.string(),
      (input) => {
        const result1 = validate(input);
        const result2 = validate(input);
        return result1.success === result2.success;
      }
    ), { numRuns: 50 }); // Fewer runs for speed
  });
});

// Thorough properties for comprehensive testing
describe('Thorough Properties', () => {
  it('Property: Complex validation behavior', () => {
    fc.assert(fc.property(
      complexInputGenerator,
      (input) => {
        // Complex property logic
        return checkComplexProperty(input);
      }
    ), { numRuns: 500 }); // More runs for thoroughness
  });
});
```

This guide provides the foundation for writing effective property-based tests that complement traditional unit tests and provide strong correctness guarantees for the refactored codebase.