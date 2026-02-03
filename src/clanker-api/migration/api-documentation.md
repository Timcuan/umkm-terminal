# Clanker SDK API Documentation

## Overview

The enhanced Clanker SDK provides a unified interface for token deployment with support for both direct contract interactions and Clanker API integration. This documentation covers all classes, methods, and configuration options.

## Table of Contents

1. [Core Classes](#core-classes)
2. [Configuration](#configuration)
3. [Token Types](#token-types)
4. [Error Handling](#error-handling)
5. [Migration Utilities](#migration-utilities)
6. [Examples](#examples)

## Core Classes

### UnifiedExecutor

The main orchestration class that routes operations between direct contract and API methods.

```typescript
import { UnifiedExecutor, createUnifiedExecutor } from 'clanker-sdk';

const executor = createUnifiedExecutor({
  operationMethod: 'auto',
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: 'your-key' },
});
```

#### Methods

##### `deploy(token: ClankerTokenV4, method?: OperationMethod): Promise<DeployResult>`

Deploy a token using the specified or auto-selected method.

**Parameters:**
- `token`: Token configuration (see [Token Types](#token-types))
- `method`: Optional method override ('direct', 'api', 'auto')

**Returns:** Promise resolving to deployment result with transaction hash and wait function.

**Example:**
```typescript
const result = await executor.deploy({
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
  chainId: 8453,
  image: 'https://example.com/token.png',
});

const receipt = await result.waitForTransaction();
console.log('Token deployed at:', receipt.address);
```

##### `validateTokenConfig(token: ClankerTokenV4, method?: OperationMethod): Promise<ValidationResult>`

Validate token configuration before deployment.

**Parameters:**
- `token`: Token configuration to validate
- `method`: Optional method override

**Returns:** Promise resolving to validation result with errors, warnings, and estimates.

**Example:**
```typescript
const validation = await executor.validateTokenConfig(token);

if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
} else {
  console.log('Estimated Gas:', validation.estimatedGas);
  console.log('Estimated Cost:', validation.estimatedCost);
}
```

##### `testConnection(method?: OperationMethod): Promise<ConnectionResult>`

Test connectivity and authentication for the specified method.

**Parameters:**
- `method`: Optional method to test

**Returns:** Promise resolving to connection test result.

**Example:**
```typescript
const connection = await executor.testConnection();

console.log('Method:', connection.method);
console.log('Connected:', connection.connected);
console.log('Authenticated:', connection.authenticated);
console.log('Latency:', connection.latency);
```

##### `batchDeploy(tokens: ClankerTokenV4[], method?: OperationMethod): Promise<BatchDeploymentResponse>`

Deploy multiple tokens efficiently in batch.

**Parameters:**
- `tokens`: Array of token configurations
- `method`: Optional method override

**Returns:** Promise resolving to batch deployment results.

**Example:**
```typescript
const tokens = [token1, token2, token3];
const batchResult = await executor.batchDeploy(tokens);

console.log('Method Used:', batchResult.method);
console.log('Results:', batchResult.results);
console.log('Chain Summary:', batchResult.chainSummary);
```

##### `getAvailableMethods(): OperationMethod[]`

Get available operation methods based on current configuration.

**Returns:** Array of available methods.

**Example:**
```typescript
const methods = executor.getAvailableMethods();
console.log('Available methods:', methods); // ['direct', 'api', 'auto']
```

##### `getSupportedChains(): ChainSupportInfo`

Get information about supported chains for each method.

**Returns:** Object with chain support information.

**Example:**
```typescript
const chains = executor.getSupportedChains();
console.log('API chains:', chains.api);
console.log('Direct chains:', chains.direct);
console.log('Both methods:', chains.both);
```

##### `getChainInfo(chainId: number): ChainInfo`

Get detailed information about a specific chain.

**Parameters:**
- `chainId`: Chain ID to query

**Returns:** Chain information object.

**Example:**
```typescript
const chainInfo = executor.getChainInfo(8453); // Base

console.log('Supported:', chainInfo.supported);
console.log('Methods:', chainInfo.methods);
console.log('Recommended Method:', chainInfo.recommendedMethod);
console.log('Configuration:', chainInfo.configuration);
```

### EnhancedClanker

Enhanced Clanker class with API integration support while maintaining backward compatibility.

```typescript
import { EnhancedClanker, createEnhancedClanker } from 'clanker-sdk';

const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: 'your-key' },
  operationMethod: 'auto',
});
```

#### Methods

All methods from UnifiedExecutor plus:

##### `updateConfig(updates: Partial<EnhancedClankerConfig>): void`

Update configuration at runtime.

**Parameters:**
- `updates`: Partial configuration updates

**Example:**
```typescript
clanker.updateConfig({
  operationMethod: 'api',
  api: { apiKey: 'new-key' },
});
```

##### `getConfig(): EnhancedClankerConfigInfo`

Get current configuration (without sensitive data).

**Returns:** Configuration information object.

**Example:**
```typescript
const config = clanker.getConfig();
console.log('Operation Method:', config.operationMethod);
console.log('Has API Key:', config.hasApiKey);
console.log('Available Methods:', config.availableMethods);
```

### BackwardCompatibleClanker

Drop-in replacement for the original Clanker class with enhanced features.

```typescript
import { BackwardCompatibleClanker } from 'clanker-sdk';

// Exact same interface as original Clanker
const clanker = new BackwardCompatibleClanker({
  wallet: walletClient,
  publicClient: publicClient,
});

// Works exactly like the original
const result = await clanker.deploy(token);
```

## Configuration

### ClankerSDKConfig

Main configuration interface for the SDK.

```typescript
interface ClankerSDKConfig {
  // Operation method selection
  operationMethod?: 'direct' | 'api' | 'auto';
  
  // Clanker API configuration
  api?: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
  
  // Direct method configuration (viem)
  publicClient?: PublicClient;
  wallet?: WalletClient;
  chain?: Chain;
  chains?: Chain[];
}
```

### EnhancedClankerConfig

Configuration for EnhancedClanker class.

```typescript
interface EnhancedClankerConfig {
  // Original fields (backward compatibility)
  wallet?: WalletClient;
  publicClient?: PublicClient;
  chain?: Chain;
  
  // Enhanced fields
  operationMethod?: 'direct' | 'api' | 'auto';
  api?: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
}
```

### Configuration Examples

#### Direct Method Only
```typescript
const config = {
  operationMethod: 'direct',
  wallet: walletClient,
  publicClient: publicClient,
};
```

#### API Method Only
```typescript
const config = {
  operationMethod: 'api',
  api: {
    apiKey: 'your-clanker-api-key',
    timeout: 30000,
    retries: 3,
  },
};
```

#### Auto Method (Hybrid)
```typescript
const config = {
  operationMethod: 'auto',
  wallet: walletClient,
  publicClient: publicClient,
  api: {
    apiKey: 'your-clanker-api-key',
  },
};
```

#### Environment-based Configuration
```typescript
// Set environment variables
process.env.CLANKER_API_KEY = 'your-key';
process.env.CLANKER_OPERATION_METHOD = 'auto';

// Create from environment
import { createEnhancedClankerFromEnv } from 'clanker-sdk';
const clanker = createEnhancedClankerFromEnv();
```

## Token Types

### ClankerTokenV4

Complete V4 token configuration interface.

```typescript
interface ClankerTokenV4 {
  // Required fields
  name: string;
  symbol: string;
  tokenAdmin: `0x${string}`;
  chainId: number;
  image: string;
  
  // Optional metadata
  metadata?: {
    description?: string;
    socials?: {
      twitter?: string;
      telegram?: string;
      discord?: string;
      website?: string;
    };
    [key: string]: unknown;
  };
  
  // Advanced configuration
  poolPositions?: PoolPosition[];
  fees?: FeeConfig;
  vault?: VaultConfig;
  mev?: MevConfig;
  rewards?: RewardsConfig;
  pairedToken?: `0x${string}`;
  salt?: `0x${string}`;
  context?: Record<string, unknown>;
}
```

### Token Configuration Examples

#### Minimal Token
```typescript
const minimalToken: ClankerTokenV4 = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453,
  image: 'https://example.com/token.png',
};
```

#### Token with Metadata
```typescript
const tokenWithMetadata: ClankerTokenV4 = {
  name: 'Community Token',
  symbol: 'COMM',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453,
  image: 'https://example.com/community.png',
  metadata: {
    description: 'A token for our amazing community',
    socials: {
      twitter: '@communitytoken',
      telegram: '@communitytokengroup',
      website: 'https://communitytoken.com',
      discord: 'https://discord.gg/community',
    },
  },
};
```

#### Advanced Token Configuration
```typescript
const advancedToken: ClankerTokenV4 = {
  name: 'Advanced Token',
  symbol: 'ADV',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453,
  image: 'https://example.com/advanced.png',
  metadata: {
    description: 'An advanced token with custom features',
  },
  fees: {
    type: 'static',
    clankerFee: 100, // 1%
    pairedFee: 50,   // 0.5%
  },
  vault: {
    percentage: 20,
    lockupDuration: 86400 * 30, // 30 days
    vestingDuration: 86400 * 90, // 90 days
  },
  mev: {
    type: 'blockDelay',
    blockDelay: 2,
  },
};
```

## Error Handling

### Error Types

The SDK provides structured error types for better error handling.

#### ClankerSDKError (Base)
```typescript
class ClankerSDKError extends Error {
  code: string;
  method: OperationMethod;
  context?: Record<string, unknown>;
  retryable: boolean;
}
```

#### ClankerAPIError
```typescript
class ClankerAPIError extends ClankerSDKError {
  statusCode?: number;
  apiResponse?: unknown;
}
```

#### ConfigurationError
```typescript
class ConfigurationError extends ClankerSDKError {
  configField?: string;
  suggestion?: string;
}
```

#### AuthenticationError
```typescript
class AuthenticationError extends ClankerSDKError {
  authMethod?: string;
}
```

#### NetworkError
```typescript
class NetworkError extends ClankerSDKError {
  networkDetails?: {
    url?: string;
    timeout?: number;
    retries?: number;
  };
}
```

### Error Handling Examples

#### Basic Error Handling
```typescript
try {
  const result = await clanker.deploy(token);
} catch (error) {
  if (error instanceof ClankerAPIError) {
    console.log('API Error:', error.message);
    console.log('Status Code:', error.statusCode);
    console.log('Retryable:', error.retryable);
  } else if (error instanceof ConfigurationError) {
    console.log('Configuration Error:', error.message);
    console.log('Suggestion:', error.context?.suggestion);
  } else {
    console.log('Unknown Error:', error);
  }
}
```

#### Retry Logic
```typescript
async function deployWithRetry(token: ClankerTokenV4, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await clanker.deploy(token);
    } catch (error) {
      if (error instanceof ClankerSDKError && error.retryable && attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
}
```

## Migration Utilities

### MigrationUtility

Utility class for analyzing and performing migrations from original SDK.

```typescript
import { 
  MigrationUtility,
  analyzeMigration,
  performMigration,
  generateMigrationReport 
} from 'clanker-sdk';
```

#### Methods

##### `analyzeMigration(config, tokens, options?): MigrationAnalysis`

Analyze existing configuration for migration requirements.

**Example:**
```typescript
const analysis = analyzeMigration(existingConfig, existingTokens, {
  preferredMethod: 'auto',
  enableAPIFeatures: true,
});

console.log('Migration Path:', analysis.migrationPath);
console.log('Estimated Effort:', analysis.estimatedEffort);
```

##### `performMigration(config, tokens, options?): MigrationResult`

Perform automatic migration with recommendations.

**Example:**
```typescript
const result = performMigration(existingConfig, existingTokens, {
  maintainBackwardCompatibility: true,
});

if (result.success) {
  console.log('Migrated Config:', result.migratedConfig);
  console.log('Migrated Tokens:', result.migratedTokens);
}
```

##### `generateMigrationReport(result): string`

Generate detailed migration report.

**Example:**
```typescript
const report = generateMigrationReport(migrationResult);
console.log(report); // Detailed markdown report
```

## Examples

### Basic Usage

```typescript
import { createEnhancedClanker } from 'clanker-sdk';

// Create instance
const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
  operationMethod: 'direct',
});

// Deploy token
const token = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453,
  image: 'https://example.com/token.png',
};

const result = await clanker.deploy(token);
const receipt = await result.waitForTransaction();
console.log('Token deployed at:', receipt.address);
```

### API Integration

```typescript
import { createEnhancedClanker } from 'clanker-sdk';

// Create API-enabled instance
const clanker = createEnhancedClanker({
  api: {
    apiKey: 'your-clanker-api-key',
    timeout: 30000,
    retries: 3,
  },
  operationMethod: 'api',
});

// Validate before deployment
const validation = await clanker.validateTokenConfig(token);
if (!validation.valid) {
  throw new Error(`Invalid token: ${validation.errors.join(', ')}`);
}

// Deploy with API
const result = await clanker.deploy(token);
```

### Batch Deployment

```typescript
const tokens = [
  {
    name: 'Token 1',
    symbol: 'TK1',
    tokenAdmin: '0x...',
    chainId: 8453,
    image: 'https://example.com/token1.png',
  },
  {
    name: 'Token 2',
    symbol: 'TK2',
    tokenAdmin: '0x...',
    chainId: 8453,
    image: 'https://example.com/token2.png',
  },
];

const batchResult = await clanker.batchDeploy(tokens);

batchResult.results.forEach((result, index) => {
  if (result.success) {
    console.log(`Token ${index + 1} deployed successfully`);
  } else {
    console.log(`Token ${index + 1} failed:`, result.error);
  }
});
```

### Auto Method Selection

```typescript
// Configure both methods
const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: 'your-key' },
  operationMethod: 'auto', // Intelligent selection
});

// SDK automatically chooses the best method
const result = await clanker.deploy(token);
```

### Environment Configuration

```bash
# .env file
CLANKER_API_KEY=your-api-key-here
CLANKER_OPERATION_METHOD=auto
CLANKER_API_TIMEOUT=30000
CLANKER_API_RETRIES=3
```

```typescript
import { createEnhancedClankerFromEnv } from 'clanker-sdk';

// Automatic configuration from environment
const clanker = createEnhancedClankerFromEnv();
```

## Best Practices

### 1. Always Validate Before Deployment
```typescript
const validation = await clanker.validateTokenConfig(token);
if (!validation.valid) {
  throw new Error(`Invalid token: ${validation.errors.join(', ')}`);
}
```

### 2. Use Auto Method for Production
```typescript
const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: process.env.CLANKER_API_KEY },
  operationMethod: 'auto',
});
```

### 3. Handle Errors Gracefully
```typescript
try {
  const result = await clanker.deploy(token);
} catch (error) {
  if (error instanceof ClankerSDKError) {
    console.log('SDK Error:', error.message);
    console.log('Method:', error.method);
    console.log('Retryable:', error.retryable);
  }
}
```

### 4. Use Batch Operations for Multiple Tokens
```typescript
// More efficient than individual deployments
const results = await clanker.batchDeploy(tokens);
```

### 5. Monitor Chain Support
```typescript
const chainInfo = clanker.getChainInfo(chainId);
if (!chainInfo.supported) {
  console.log('Chain not supported, consider using different chain');
}
```

## Support

For additional help:
- Check the [Migration Guide](./migration-guide.md)
- Review [Example Implementations](../examples/)
- Use the [Migration Utility](./migration-utility.ts)
- Contact support for complex migration scenarios