# Clanker SDK Migration Guide

## Overview

This guide helps you migrate from the original Clanker SDK to the enhanced version with Clanker API integration. The new version maintains 100% backward compatibility while adding powerful new capabilities.

## What's New

### Clanker API Integration
- **REST API Support**: Deploy tokens via Clanker's REST API
- **Dual-Path Architecture**: Choose between direct contract calls or API calls
- **Intelligent Method Selection**: Automatic selection of the best method
- **Enhanced Error Handling**: Unified error system with retry logic
- **Multi-Chain Support**: Enhanced support for multiple blockchain networks
- **Batch Operations**: Efficient batch deployment capabilities

### New Features
- **Auto Method Selection**: Automatically choose the best deployment method
- **Enhanced Validation**: Comprehensive token configuration validation
- **Retry Logic**: Built-in retry mechanisms with circuit breakers
- **Chain-Specific Optimization**: Optimized configurations per blockchain
- **Backward Compatibility**: Existing code works without changes

## Migration Paths

### Path 1: No Changes Required (Recommended for Existing Code)

Your existing code will continue to work exactly as before:

```typescript
// This code remains unchanged
import { Clanker } from 'clanker-sdk';

const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});

const result = await clanker.deploy({
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
  chainId: 8453,
  image: 'https://example.com/token.png',
});
```

### Path 2: Enhanced Features with Backward Compatibility

Use the new `EnhancedClanker` class for additional features while maintaining compatibility:

```typescript
import { createEnhancedClanker } from 'clanker-sdk';

// Same configuration as before
const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
});

// Same deployment interface
const result = await clanker.deploy(tokenConfig);

// New features available
const validation = await clanker.validateTokenConfig(tokenConfig);
const connection = await clanker.testConnection();
const batchResults = await clanker.batchDeploy([token1, token2]);
```

### Path 3: Full API Integration

Leverage the new Clanker API for enhanced capabilities:

```typescript
import { createEnhancedClanker } from 'clanker-sdk';

const clanker = createEnhancedClanker({
  // API configuration
  api: {
    apiKey: 'your-clanker-api-key',
  },
  operationMethod: 'api', // Use API method
});

// Same deployment interface, powered by API
const result = await clanker.deploy(tokenConfig);
```

### Path 4: Hybrid Approach (Best of Both Worlds)

Use auto method selection for optimal performance:

```typescript
import { createEnhancedClanker } from 'clanker-sdk';

const clanker = createEnhancedClanker({
  // Both configurations available
  wallet: walletClient,
  publicClient: publicClient,
  api: {
    apiKey: 'your-clanker-api-key',
  },
  operationMethod: 'auto', // Intelligent selection
});

// SDK automatically chooses the best method
const result = await clanker.deploy(tokenConfig);
```

## Configuration Migration

### Original Configuration
```typescript
interface OriginalConfig {
  wallet: WalletClient;
  publicClient: PublicClient;
  chain?: Chain;
}
```

### Enhanced Configuration
```typescript
interface EnhancedConfig {
  // Original fields (unchanged)
  wallet?: WalletClient;
  publicClient?: PublicClient;
  chain?: Chain;
  
  // New fields
  operationMethod?: 'direct' | 'api' | 'auto';
  api?: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
}
```

## Token Configuration Updates

### V4 Token Interface

The `ClankerTokenV4` interface now requires `chainId` and `image` fields:

```typescript
// Before (still works with backward compatibility)
const token = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
};

// After (recommended)
const token: ClankerTokenV4 = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
  chainId: 8453,
  image: 'https://example.com/token.png',
  metadata: {
    description: 'My awesome token',
    socials: {
      twitter: '@mytoken',
      website: 'https://mytoken.com',
    },
  },
};
```

## Method Selection Guide

### When to Use Direct Method
- You have wallet and RPC access
- You need maximum control over transactions
- You're working with unsupported chains
- You prefer on-chain interactions

```typescript
const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
  operationMethod: 'direct',
});
```

### When to Use API Method
- You want simplified deployment
- You need enhanced features (AI, analytics)
- You're building web applications
- You want optimized gas usage

```typescript
const clanker = createEnhancedClanker({
  api: { apiKey: 'your-key' },
  operationMethod: 'api',
});
```

### When to Use Auto Method
- You want the best of both worlds
- You have both configurations available
- You want intelligent method selection
- You're building production applications

```typescript
const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: 'your-key' },
  operationMethod: 'auto',
});
```

## Error Handling Updates

### Enhanced Error Types

The new SDK provides structured error types:

```typescript
import { 
  ClankerSDKError,
  ClankerAPIError,
  ConfigurationError,
  AuthenticationError,
  NetworkError 
} from 'clanker-sdk';

try {
  const result = await clanker.deploy(token);
} catch (error) {
  if (error instanceof ClankerAPIError) {
    console.log('API Error:', error.message);
    console.log('Method:', error.method);
    console.log('Context:', error.context);
  } else if (error instanceof ConfigurationError) {
    console.log('Configuration Error:', error.message);
    console.log('Suggestions:', error.context.suggestion);
  }
}
```

### Retry Logic

The new SDK includes automatic retry logic:

```typescript
// Automatic retries with exponential backoff
const result = await clanker.deploy(token);

// Configure retry behavior
const clanker = createEnhancedClanker({
  api: {
    apiKey: 'your-key',
    retries: 5, // Number of retries
    timeout: 30000, // Request timeout
  },
});
```

## New Capabilities

### Token Validation

```typescript
// Validate token configuration before deployment
const validation = await clanker.validateTokenConfig(token);

if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
} else {
  console.log('Estimated Gas:', validation.estimatedGas);
  console.log('Estimated Cost:', validation.estimatedCost);
}
```

### Connection Testing

```typescript
// Test connectivity and authentication
const connection = await clanker.testConnection();

console.log('Method:', connection.method);
console.log('Connected:', connection.connected);
console.log('Authenticated:', connection.authenticated);
console.log('Latency:', connection.latency);
```

### Batch Deployments

```typescript
// Deploy multiple tokens efficiently
const tokens = [token1, token2, token3];
const batchResult = await clanker.batchDeploy(tokens);

console.log('Method Used:', batchResult.method);
console.log('Results:', batchResult.results);
console.log('Chain Summary:', batchResult.chainSummary);
```

### Chain Information

```typescript
// Get chain-specific information
const chainInfo = clanker.getChainInfo(8453); // Base

console.log('Supported:', chainInfo.supported);
console.log('Methods:', chainInfo.methods);
console.log('Recommended Method:', chainInfo.recommendedMethod);
console.log('Configuration:', chainInfo.configuration);
```

## Environment Configuration

### Environment Variables

Set up environment variables for easier configuration:

```bash
# .env file
CLANKER_API_KEY=your-api-key-here
CLANKER_OPERATION_METHOD=auto
CLANKER_API_BASE_URL=https://api.clanker.world
CLANKER_API_TIMEOUT=30000
CLANKER_API_RETRIES=3
```

```typescript
// Automatic configuration from environment
import { createEnhancedClankerFromEnv } from 'clanker-sdk';

const clanker = createEnhancedClankerFromEnv();
```

## Best Practices

### 1. Use Auto Method for Production
```typescript
const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: process.env.CLANKER_API_KEY },
  operationMethod: 'auto',
});
```

### 2. Always Validate Before Deployment
```typescript
const validation = await clanker.validateTokenConfig(token);
if (!validation.valid) {
  throw new Error(`Invalid token: ${validation.errors.join(', ')}`);
}
```

### 3. Handle Errors Gracefully
```typescript
try {
  const result = await clanker.deploy(token);
} catch (error) {
  if (error instanceof ClankerAPIError && error.retryable) {
    // Retry logic is handled automatically
    console.log('Deployment failed, but retries are in progress');
  } else {
    console.error('Deployment failed permanently:', error.message);
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
const supportedChains = clanker.getSupportedChains();
console.log('API Chains:', supportedChains.api);
console.log('Direct Chains:', supportedChains.direct);
console.log('Both Methods:', supportedChains.both);
```

## Troubleshooting

### Common Issues

#### 1. "Invalid SDK configuration" Error
```typescript
// Ensure you have either wallet/publicClient OR API key
const clanker = createEnhancedClanker({
  // Option 1: Direct method
  wallet: walletClient,
  publicClient: publicClient,
  
  // Option 2: API method
  // api: { apiKey: 'your-key' },
});
```

#### 2. "API key appears to be too short" Error
```typescript
// Ensure your API key is at least 8 characters
const clanker = createEnhancedClanker({
  api: {
    apiKey: 'your-actual-api-key-here', // Must be 8+ characters
  },
});
```

#### 3. "Chain not supported" Error
```typescript
// Check supported chains
const chainInfo = clanker.getChainInfo(yourChainId);
if (!chainInfo.supported) {
  console.log('Chain not supported, use direct method');
}
```

#### 4. "No methods available" Error
```typescript
// Provide at least one configuration
const clanker = createEnhancedClanker({
  // Must have either:
  wallet: walletClient, // For direct method
  // OR
  api: { apiKey: 'your-key' }, // For API method
});
```

## Migration Checklist

- [ ] Update imports to use new classes/functions
- [ ] Add required fields to token configurations (`chainId`, `image`)
- [ ] Configure API key if using API method
- [ ] Update error handling to use new error types
- [ ] Test with validation methods before deployment
- [ ] Consider using batch operations for multiple tokens
- [ ] Set up environment variables for production
- [ ] Update CI/CD pipelines with new environment variables
- [ ] Test both direct and API methods in staging
- [ ] Monitor deployment success rates and performance

## Support

For additional help with migration:

1. Check the [API Documentation](./api-documentation.md)
2. Review [Example Implementations](../examples/)
3. Test with the [Migration Utility](./migration-utility.ts)
4. Contact support if you encounter issues

## Next Steps

After migration, consider exploring:

- Advanced token configurations (vaults, rewards, MEV protection)
- Multi-chain deployment strategies
- Batch operation optimization
- Custom retry and error handling logic
- Integration with your existing infrastructure