# Clanker API Integration Guide

The Clanker SDK now supports both direct contract deployment and REST API deployment methods, providing enhanced capabilities while maintaining full backward compatibility.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Operation Methods](#operation-methods)
- [Usage Examples](#usage-examples)
- [Migration Guide](#migration-guide)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The enhanced Clanker SDK provides a dual-path architecture:

- **Direct Contract Method**: Traditional on-chain contract interactions (unchanged)
- **Clanker API Method**: REST API integration with AI-powered features
- **Auto Method**: Intelligent selection with automatic fallback

### Key Benefits

- ✅ **100% Backward Compatibility**: Existing code works unchanged
- ✅ **Enhanced Capabilities**: AI-powered deployment optimization
- ✅ **Intelligent Fallback**: Automatic method selection and error recovery
- ✅ **Multi-Chain Support**: Unified interface across all supported chains
- ✅ **Batch Operations**: Efficient bulk deployments with enhanced coordination
- ✅ **Advanced Error Handling**: Comprehensive error types with retry logic

## Quick Start

### Basic Usage (No Changes Required)

```typescript
import { Clanker } from 'clanker-sdk/v4';

// Your existing code works exactly as before
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});

const result = await clanker.deploy({
  name: 'My Token',
  symbol: 'TKN',
  image: 'ipfs://...',
  tokenAdmin: '0x...',
  chainId: 8453,
});
```

### With API Integration

```typescript
import { Clanker } from 'clanker-sdk/v4';

const clanker = new Clanker({
  // Traditional configuration
  wallet: walletClient,
  publicClient: publicClient,
  
  // New API configuration
  api: {
    apiKey: process.env.CLANKER_API_KEY,
  },
  operationMethod: 'auto', // Uses API when available, falls back to direct
});

// Same methods, enhanced capabilities
const result = await clanker.deploy(tokenConfig);
```

## Configuration

### Environment Variables

```bash
# Optional: Clanker API configuration
CLANKER_API_KEY=your-api-key-here
CLANKER_API_BASE_URL=https://api.clanker.world
CLANKER_OPERATION_METHOD=auto
CLANKER_API_TIMEOUT=30000
CLANKER_API_RETRIES=3
```

### Configuration Options

```typescript
interface ClankerConfig {
  // Traditional configuration (unchanged)
  wallet?: WalletClient;
  publicClient?: PublicClient;
  chain?: Chain;
  
  // New API configuration
  operationMethod?: 'direct' | 'api' | 'auto';
  api?: {
    apiKey: string;
    baseUrl?: string;      // Default: https://api.clanker.world
    timeout?: number;      // Default: 30000ms
    retries?: number;      // Default: 3
  };
}
```

### Configuration from Environment

```typescript
import { createEnhancedClankerFromEnv } from 'clanker-sdk';

// Automatically loads configuration from environment variables
const clanker = createEnhancedClankerFromEnv();
```

## Operation Methods

### Direct Method (`'direct'`)

- Uses traditional contract interactions
- Requires wallet and publicClient
- Full control over transactions
- Gas optimization available

```typescript
const result = await clanker.deploy(token, 'direct');
```

### API Method (`'api'`)

- Uses Clanker REST API
- Requires API key
- AI-powered optimization
- Enhanced batch capabilities

```typescript
const result = await clanker.deploy(token, 'api');
```

### Auto Method (`'auto'`)

- Intelligent method selection
- Automatic fallback on errors
- Optimal performance per chain
- Recommended for most use cases

```typescript
const result = await clanker.deploy(token, 'auto');
```

## Usage Examples

### 1. Token Validation

```typescript
// Validate token configuration before deployment
const validation = await clanker.validateTokenConfig({
  name: 'Test Token',
  symbol: 'TEST',
  image: 'https://example.com/token.png',
  tokenAdmin: '0x...',
  chainId: 8453,
});

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
} else {
  console.log('Estimated gas:', validation.estimatedGas);
  console.log('Estimated cost:', validation.estimatedCost);
}
```

### 2. Connection Testing

```typescript
// Test connectivity for different methods
const directTest = await clanker.testConnection('direct');
const apiTest = await clanker.testConnection('api');

console.log('Direct connection:', directTest.connected);
console.log('API connection:', apiTest.connected, apiTest.authenticated);
```

### 3. Batch Deployment

```typescript
const tokens = [
  {
    name: 'Token 1',
    symbol: 'TKN1',
    image: 'https://example.com/token1.png',
    tokenAdmin: '0x...',
    chainId: 8453, // Base
  },
  {
    name: 'Token 2', 
    symbol: 'TKN2',
    image: 'https://example.com/token2.png',
    tokenAdmin: '0x...',
    chainId: 42161, // Arbitrum
  },
];

const batchResult = await clanker.batchDeploy(tokens, 'auto');

console.log('Batch method used:', batchResult.method);
console.log('Successful deployments:', 
  batchResult.results.filter(r => r.success).length
);

// Check results per chain
Object.entries(batchResult.chainSummary).forEach(([chainId, summary]) => {
  console.log(`Chain ${chainId}: ${summary.successful}/${summary.total} successful`);
});
```

### 4. Multi-Chain Support

```typescript
// Get supported chains
const chains = clanker.getSupportedChains();
console.log('API-only chains:', chains.api.length);
console.log('Direct-only chains:', chains.direct.length);
console.log('Both methods:', chains.both.length);

// Get chain-specific information
const baseInfo = clanker.getChainInfo(8453);
console.log('Base chain supported:', baseInfo.supported);
console.log('Recommended method:', baseInfo.recommendedMethod);
console.log('Available methods:', baseInfo.methods);
```

### 5. Configuration Updates

```typescript
// Start with direct method only
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});

console.log('Initial methods:', clanker.getAvailableMethods()); // ['direct']

// Add API support at runtime
clanker.updateConfig({
  api: { apiKey: 'your-api-key' },
  operationMethod: 'auto',
});

console.log('Updated methods:', clanker.getAvailableMethods()); // ['direct', 'api', 'auto']
```

### 6. Enhanced Clanker Usage

```typescript
import { createEnhancedClanker } from 'clanker-sdk';

const enhanced = createEnhancedClanker({
  operationMethod: 'auto',
  api: { apiKey: process.env.CLANKER_API_KEY },
});

// Enhanced features
const config = enhanced.getConfig();
console.log('Has API key:', config.hasApiKey);
console.log('Available methods:', config.availableMethods);

// Method selection context for debugging
const context = enhanced.getMethodSelectionContext('deploy');
console.log('Method selection context:', context);
```

### 7. Unified Executor Usage

```typescript
import { createUnifiedExecutor } from 'clanker-sdk';

const executor = createUnifiedExecutor({
  operationMethod: 'auto',
  api: { apiKey: process.env.CLANKER_API_KEY },
});

// Advanced chain information
const chainInfo = executor.getChainInfo(8453);
console.log('Chain configuration:', chainInfo.configuration);
console.log('Special considerations:', chainInfo.specialConsiderations);

// Validate chain compatibility
const validation = executor.validateChainCompatibility(token, 'auto');
if (!validation.valid) {
  console.log('Suggested method:', validation.suggestedMethod);
}
```

## Migration Guide

### From v4.24 to v4.25

**No changes required!** Your existing code will continue to work exactly as before.

#### Optional: Add API Support

```typescript
// Before (still works)
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});

// After (enhanced capabilities)
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: process.env.CLANKER_API_KEY },
  operationMethod: 'auto',
});
```

#### Optional: Use Enhanced Classes

```typescript
// Enhanced Clanker with additional features
import { EnhancedClanker } from 'clanker-sdk';

const clanker = new EnhancedClanker({
  operationMethod: 'auto',
  api: { apiKey: process.env.CLANKER_API_KEY },
});

// Additional methods available
const context = clanker.getMethodSelectionContext('deploy');
const isAPIAvailable = clanker.isAPIAvailable();
```

### Migration Checklist

- [ ] Existing code works without changes
- [ ] Add API key to environment variables (optional)
- [ ] Update configuration to use `operationMethod: 'auto'` (optional)
- [ ] Test enhanced features like batch deployment (optional)
- [ ] Update error handling for new error types (optional)

## API Reference

### Main Classes

#### `Clanker`

The main SDK class with optional API integration.

```typescript
class Clanker {
  constructor(config?: ClankerConfig);
  
  // Core methods (enhanced)
  deploy(token: ClankerTokenV4, method?: OperationMethod): Promise<DeployResult>;
  validateTokenConfig(token: ClankerTokenV4, method?: OperationMethod): Promise<ValidationResult>;
  testConnection(method?: OperationMethod): Promise<ConnectionResult>;
  batchDeploy(tokens: ClankerTokenV4[], method?: OperationMethod): Promise<BatchResult>;
  
  // Configuration methods (new)
  updateConfig(updates: Partial<ClankerConfig>): void;
  getAvailableMethods(): OperationMethod[];
  getSupportedChains(): ChainSupport;
  isAPIIntegrationEnabled(): boolean;
  
  // Legacy methods (unchanged)
  getAvailableFees(token: Address, recipient: Address): Promise<bigint>;
  claimFees(token: Address, recipient: Address): Promise<TxResult>;
  // ... other legacy methods
}
```

#### `EnhancedClanker`

Enhanced version with additional debugging and configuration features.

```typescript
class EnhancedClanker {
  constructor(config?: EnhancedClankerConfig);
  
  // All Clanker methods plus:
  getConfig(): EnhancedConfig;
  getMethodSelectionContext(operationType: string): MethodSelectionContext;
  isDirectAvailable(): boolean;
  isAPIAvailable(): boolean;
  getDefaultChain(): Chain;
}
```

#### `UnifiedExecutor`

Low-level executor with advanced chain and method management.

```typescript
class UnifiedExecutor {
  constructor(config?: ClankerSDKConfig);
  
  // Core operations
  deploy(token: ClankerTokenV4, method?: OperationMethod): Promise<DeployResult>;
  validateTokenConfig(token: ClankerTokenV4, method?: OperationMethod): Promise<ValidationResult>;
  testConnection(method?: OperationMethod): Promise<ConnectionResult>;
  batchDeploy(tokens: ClankerTokenV4[], method?: OperationMethod): Promise<BatchResult>;
  
  // Advanced features
  getChainInfo(chainId: number): ChainInfo;
  getSupportedChains(): ChainSupport;
  getMethodSelectionContext(operationType: string): MethodSelectionContext;
  updateConfig(updates: Partial<ClankerSDKConfig>): void;
}
```

### Types

#### `OperationMethod`

```typescript
type OperationMethod = 'direct' | 'api' | 'auto';
```

#### `ClankerConfig`

```typescript
interface ClankerConfig {
  wallet?: WalletClient;
  publicClient?: PublicClient;
  chain?: Chain;
  operationMethod?: OperationMethod;
  api?: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
}
```

#### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedGas?: string;
  estimatedCost?: string;
}
```

#### `BatchResult`

```typescript
interface BatchResult {
  method: OperationMethod;
  results: Array<{
    token: string;
    chainId: number;
    success: boolean;
    result?: DeployResult;
    error?: string;
    methodUsed: OperationMethod;
  }>;
  chainSummary: Record<number, ChainSummary>;
}
```

## Best Practices

### 1. Method Selection

```typescript
// ✅ Recommended: Use auto method for optimal performance
const clanker = new Clanker({
  operationMethod: 'auto',
  api: { apiKey: process.env.CLANKER_API_KEY },
  wallet: walletClient,
  publicClient: publicClient,
});

// ✅ Good: Explicit method selection when needed
await clanker.deploy(token, 'api'); // Force API method

// ❌ Avoid: Hardcoding method without fallback
const apiOnlyClanker = new Clanker({
  operationMethod: 'api', // No fallback if API fails
  api: { apiKey: process.env.CLANKER_API_KEY },
});
```

### 2. Error Handling

```typescript
try {
  const result = await clanker.deploy(token);
  console.log('Deployment successful:', result.txHash);
} catch (error) {
  if (error.code === 'API_RATE_LIMIT') {
    // Handle rate limiting
    console.log('Rate limited, retrying with direct method...');
    const result = await clanker.deploy(token, 'direct');
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    // Handle funding issues
    console.log('Insufficient funds for deployment');
  } else {
    // Handle other errors
    console.error('Deployment failed:', error.message);
  }
}
```

### 3. Configuration Management

```typescript
// ✅ Use environment variables for sensitive data
const clanker = new Clanker({
  api: {
    apiKey: process.env.CLANKER_API_KEY, // Never hardcode API keys
    timeout: 30000,
    retries: 3,
  },
  operationMethod: 'auto',
});

// ✅ Validate configuration before use
const methods = clanker.getAvailableMethods();
if (!methods.includes('api')) {
  console.warn('API method not available, check API key configuration');
}
```

### 4. Batch Operations

```typescript
// ✅ Group tokens by chain for optimal performance
const baseTokens = tokens.filter(t => t.chainId === 8453);
const arbTokens = tokens.filter(t => t.chainId === 42161);

const baseResult = await clanker.batchDeploy(baseTokens, 'auto');
const arbResult = await clanker.batchDeploy(arbTokens, 'auto');

// ✅ Handle partial failures gracefully
const allResults = [...baseResult.results, ...arbResult.results];
const successful = allResults.filter(r => r.success);
const failed = allResults.filter(r => !r.success);

console.log(`Deployed ${successful.length}/${allResults.length} tokens`);
```

### 5. Testing and Development

```typescript
// ✅ Test connectivity before deployment
const connection = await clanker.testConnection();
if (!connection.connected) {
  throw new Error(`${connection.method} method not available`);
}

// ✅ Validate tokens before batch deployment
for (const token of tokens) {
  const validation = await clanker.validateTokenConfig(token);
  if (!validation.valid) {
    console.error(`Invalid token ${token.name}:`, validation.errors);
  }
}
```

## Troubleshooting

### Common Issues

#### 1. API Key Not Working

```typescript
// Check API key configuration
const connection = await clanker.testConnection('api');
if (!connection.authenticated) {
  console.error('API key authentication failed');
  // Check: API key format, expiration, permissions
}
```

#### 2. Method Not Available

```typescript
// Check available methods
const methods = clanker.getAvailableMethods();
console.log('Available methods:', methods);

if (!methods.includes('api')) {
  // API key missing or invalid
  console.log('API method not available - check API key');
}

if (!methods.includes('direct')) {
  // Wallet or publicClient missing
  console.log('Direct method not available - check wallet configuration');
}
```

#### 3. Chain Not Supported

```typescript
// Check chain support
const chainInfo = clanker.getChainInfo(chainId);
if (!chainInfo.supported) {
  console.error(`Chain ${chainId} not supported`);
  console.log('Supported chains:', clanker.getSupportedChains());
}
```

#### 4. Batch Deployment Failures

```typescript
const batchResult = await clanker.batchDeploy(tokens);

// Check for partial failures
const failed = batchResult.results.filter(r => !r.success);
if (failed.length > 0) {
  console.log('Failed deployments:');
  failed.forEach(result => {
    console.log(`- ${result.token}: ${result.error}`);
  });
}

// Check chain-specific issues
Object.entries(batchResult.chainSummary).forEach(([chainId, summary]) => {
  if (summary.failed > 0) {
    console.log(`Chain ${chainId} had ${summary.failed} failures`);
  }
});
```

### Debug Mode

```typescript
// Enable debug logging (if available)
const clanker = new Clanker({
  api: {
    apiKey: process.env.CLANKER_API_KEY,
    debug: true, // Enable debug logging
  },
  operationMethod: 'auto',
});

// Get detailed method selection context
const context = clanker.getMethodSelectionContext('deploy');
console.log('Method selection context:', context);
```

### Support

For additional support:

1. Check the [GitHub Issues](https://github.com/clanker-sdk/issues)
2. Review the [API Documentation](https://docs.clanker.world)
3. Join the [Discord Community](https://discord.gg/clanker)

---

## Changelog

### v4.25.0 - Clanker API Integration

- ✅ Added Clanker API integration with dual-path architecture
- ✅ Maintained 100% backward compatibility
- ✅ Added intelligent method selection with auto fallback
- ✅ Enhanced batch deployment capabilities
- ✅ Added comprehensive error handling and retry logic
- ✅ Added multi-chain support with chain-specific optimizations
- ✅ Added configuration validation and runtime updates
- ✅ Added extensive documentation and examples