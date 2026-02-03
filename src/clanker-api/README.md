# Clanker API Integration

This module provides REST API integration for the Clanker SDK, enabling AI-powered token deployment alongside traditional direct contract methods.

## Overview

The Clanker API integration follows a dual-path architecture:

- **Direct Method**: Traditional on-chain contract interactions (unchanged)
- **API Method**: REST API with AI-powered optimization and enhanced features
- **Auto Method**: Intelligent selection with automatic fallback

## Key Features

- ✅ **100% Backward Compatibility**: Existing code works unchanged
- ✅ **Intelligent Method Selection**: Automatic optimization per chain and operation
- ✅ **Enhanced Error Handling**: Comprehensive error types with retry logic
- ✅ **Multi-Chain Support**: Unified interface across all supported chains
- ✅ **Batch Operations**: Optimized bulk deployments with coordination
- ✅ **Configuration Management**: Runtime updates and validation
- ✅ **AI-Powered Features**: Smart routing and optimization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Clanker SDK v4.25                       │
├─────────────────────────────────────────────────────────────┤
│  Enhanced Clanker Class (Backward Compatible Interface)    │
├─────────────────────────────────────────────────────────────┤
│                  Unified Executor                          │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Method Selector│    │    Configuration Manager       │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Direct Method  │    │        API Method               │ │
│  │  (Unchanged)    │    │  ┌─────────────────────────────┐ │ │
│  │                 │    │  │     API Client             │ │ │
│  │  • Contract     │    │  │  ┌─────────────────────────┐│ │ │
│  │    Interactions │    │  │  │    Field Mapper        ││ │ │
│  │  • Wallet       │    │  │  │  ┌─────────────────────┐││ │ │
│  │    Integration  │    │  │  │  │   Retry Handler    │││ │ │
│  │  • Gas          │    │  │  │  └─────────────────────┘││ │ │
│  │    Optimization │    │  │  └─────────────────────────┘│ │ │
│  └─────────────────┘    │  └─────────────────────────────┘ │ │
│                         └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Error Handling Layer                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Unified Error Hierarchy + Circuit Breakers            │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

```
src/clanker-api/
├── index.ts                    # Main exports
├── README.md                   # This file
│
├── types/                      # Type definitions
│   ├── index.ts
│   ├── api-types.ts           # API request/response types
│   ├── config-types.ts        # Configuration types
│   ├── error-types.ts         # Error type definitions
│   └── mapper-types.ts        # Field mapping types
│
├── config/                     # Configuration management
│   ├── index.ts
│   ├── config-manager.ts      # Main configuration manager
│   ├── config-validator.ts    # Configuration validation
│   └── method-selector.ts     # Method selection logic
│
├── client/                     # API client implementation
│   ├── index.ts
│   ├── api-client.ts          # HTTP client with auth
│   ├── request-builder.ts     # Request construction
│   └── response-parser.ts     # Response parsing
│
├── mapper/                     # Data format mapping
│   ├── index.ts
│   ├── field-mapper.ts        # Core field mapping
│   ├── chain-mapper.ts        # Chain identifier mapping
│   ├── fees-mapper.ts         # Fee configuration mapping
│   ├── metadata-mapper.ts     # Metadata mapping
│   └── rewards-mapper.ts      # Rewards mapping
│
├── executor/                   # Main execution logic
│   ├── index.ts
│   ├── unified-executor.ts    # Main orchestrator
│   └── api-method.ts          # API method implementation
│
├── compatibility/              # Backward compatibility
│   ├── index.ts
│   └── enhanced-clanker.ts    # Enhanced Clanker class
│
├── errors/                     # Error handling
│   ├── index.ts
│   └── unified-error-hierarchy.ts
│
├── retry/                      # Retry logic
│   ├── index.ts
│   └── retry-handler.ts       # Retry and circuit breaker
│
├── validation/                 # Type validation
│   ├── index.ts
│   └── type-validator.ts      # Runtime type checking
│
├── batch/                      # Batch operations
│   ├── index.ts
│   └── batch-coordinator.ts   # Enhanced batch processing
│
└── migration/                  # Migration utilities
    ├── index.ts
    ├── migration-utility.ts   # Migration helpers
    ├── migration-guide.md     # Migration documentation
    └── api-documentation.md   # API documentation
```

## Core Components

### UnifiedExecutor

The main orchestration class that routes operations between direct contract and API methods.

```typescript
import { UnifiedExecutor } from 'clanker-sdk';

const executor = new UnifiedExecutor({
  operationMethod: 'auto',
  api: { apiKey: 'your-api-key' },
  wallet: walletClient,
  publicClient: publicClient,
});

const result = await executor.deploy(tokenConfig);
```

### EnhancedClanker

Enhanced version of the main Clanker class with API integration support.

```typescript
import { EnhancedClanker } from 'clanker-sdk';

const clanker = new EnhancedClanker({
  operationMethod: 'auto',
  api: { apiKey: 'your-api-key' },
});

const result = await clanker.deploy(tokenConfig);
```

### ConfigManager

Manages configuration validation, inheritance, and runtime updates.

```typescript
import { ConfigManager } from 'clanker-sdk/clanker-api';

const manager = new ConfigManager({
  operationMethod: 'auto',
  api: { apiKey: 'your-api-key' },
});

const isAPIAvailable = manager.isAPIAvailable();
const config = manager.getConfig();
```

### FieldMapper

Handles bidirectional data format conversion between SDK and API formats.

```typescript
import { FieldMapper } from 'clanker-sdk/clanker-api';

const mapper = new FieldMapper();
const apiRequest = mapper.toAPIFormat(tokenConfig);
const sdkFormat = mapper.fromAPIFormat(apiResponse);
```

### RetryHandler

Implements intelligent retry logic with circuit breakers and backoff strategies.

```typescript
import { RetryHandler } from 'clanker-sdk/clanker-api';

const retryHandler = new RetryHandler({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
});

const result = await retryHandler.execute(operation);
```

## Usage Patterns

### Basic Integration

```typescript
import { Clanker } from 'clanker-sdk/v4';

// Add API support to existing code
const clanker = new Clanker({
  // Existing configuration
  wallet: walletClient,
  publicClient: publicClient,
  
  // New API configuration
  api: { apiKey: process.env.CLANKER_API_KEY },
  operationMethod: 'auto',
});
```

### Method Selection

```typescript
// Force specific method
await clanker.deploy(token, 'api');     // Use API only
await clanker.deploy(token, 'direct');  // Use direct only
await clanker.deploy(token, 'auto');    // Intelligent selection

// Check available methods
const methods = clanker.getAvailableMethods();
console.log('Available:', methods); // ['direct', 'api', 'auto']
```

### Error Handling

```typescript
try {
  const result = await clanker.deploy(token);
} catch (error) {
  if (error.code === 'API_RATE_LIMIT') {
    // Retry with direct method
    const result = await clanker.deploy(token, 'direct');
  } else if (error.code === 'NETWORK_ERROR') {
    // Handle network issues
    console.log('Network error, retrying...');
  }
}
```

### Batch Operations

```typescript
const tokens = [token1, token2, token3];
const result = await clanker.batchDeploy(tokens, 'auto');

console.log(`Deployed ${result.results.filter(r => r.success).length} tokens`);
```

## Configuration

### Environment Variables

```bash
CLANKER_API_KEY=your-api-key-here
CLANKER_API_BASE_URL=https://api.clanker.world
CLANKER_OPERATION_METHOD=auto
CLANKER_API_TIMEOUT=30000
CLANKER_API_RETRIES=3
```

### Programmatic Configuration

```typescript
const config = {
  operationMethod: 'auto' as const,
  api: {
    apiKey: process.env.CLANKER_API_KEY!,
    baseUrl: 'https://api.clanker.world',
    timeout: 30000,
    retries: 3,
  },
  wallet: walletClient,
  publicClient: publicClient,
};
```

## Error Types

The integration provides comprehensive error types:

- `ConfigurationError`: Configuration validation errors
- `AuthenticationError`: API authentication failures
- `NetworkError`: Network connectivity issues
- `ValidationError`: Token configuration validation errors
- `RateLimitError`: API rate limiting
- `DeploymentError`: Deployment failures

## Testing

### Unit Tests

```bash
npm test -- tests/clanker-api/
```

### Integration Tests

```bash
npm test -- tests/clanker-api/compatibility.test.ts
```

### Property-Based Tests

```bash
npm test -- tests/properties/
```

## Migration

See [Migration Guide](./migration/migration-guide.md) for detailed migration instructions.

### Quick Migration

1. **No changes required** - existing code works unchanged
2. **Add API key** to environment variables (optional)
3. **Update configuration** to include API support (optional)
4. **Test enhanced features** like batch deployment (optional)

## Best Practices

1. **Use `auto` method** for optimal performance and fallback
2. **Handle errors gracefully** with method-specific retry logic
3. **Validate tokens** before batch deployment
4. **Monitor API usage** and rate limits
5. **Keep direct method** as backup
6. **Use environment variables** for sensitive configuration

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   ```typescript
   const connection = await clanker.testConnection('api');
   if (!connection.authenticated) {
     console.error('Check API key configuration');
   }
   ```

2. **Method Not Available**
   ```typescript
   const methods = clanker.getAvailableMethods();
   console.log('Available methods:', methods);
   ```

3. **Chain Not Supported**
   ```typescript
   const chainInfo = clanker.getChainInfo(chainId);
   if (!chainInfo.supported) {
     console.error('Chain not supported');
   }
   ```

### Debug Mode

Enable debug logging for detailed information:

```typescript
const clanker = new Clanker({
  api: {
    apiKey: process.env.CLANKER_API_KEY,
    debug: true,
  },
});
```

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update documentation for any API changes
4. Maintain backward compatibility
5. Follow TypeScript strict mode requirements

## License

Same as the main Clanker SDK license.