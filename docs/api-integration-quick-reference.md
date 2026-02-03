# Clanker API Integration - Quick Reference

## Installation & Setup

```bash
npm install clanker-sdk@latest
```

```bash
# Add to .env file
CLANKER_API_KEY=your-api-key-here
```

## Basic Usage

### Existing Code (No Changes Required)
```typescript
import { Clanker } from 'clanker-sdk/v4';

const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});

const result = await clanker.deploy(tokenConfig);
```

### With API Integration
```typescript
import { Clanker } from 'clanker-sdk/v4';

const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: process.env.CLANKER_API_KEY },
  operationMethod: 'auto', // 'direct' | 'api' | 'auto'
});

const result = await clanker.deploy(tokenConfig);
```

## Method Selection

```typescript
// Auto selection (recommended)
await clanker.deploy(token, 'auto');

// Force API method
await clanker.deploy(token, 'api');

// Force direct method
await clanker.deploy(token, 'direct');

// Check available methods
const methods = clanker.getAvailableMethods();
// Returns: ['direct', 'api', 'auto']
```

## Configuration Options

```typescript
interface ClankerConfig {
  // Traditional (unchanged)
  wallet?: WalletClient;
  publicClient?: PublicClient;
  chain?: Chain;
  
  // New API integration
  operationMethod?: 'direct' | 'api' | 'auto';
  api?: {
    apiKey: string;
    baseUrl?: string;      // Default: https://api.clanker.world
    timeout?: number;      // Default: 30000ms
    retries?: number;      // Default: 3
  };
}
```

## Enhanced Features

### Token Validation
```typescript
const validation = await clanker.validateTokenConfig(token);
if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

### Connection Testing
```typescript
const connection = await clanker.testConnection('api');
console.log('Connected:', connection.connected);
console.log('Authenticated:', connection.authenticated);
```

### Batch Deployment
```typescript
const tokens = [token1, token2, token3];
const result = await clanker.batchDeploy(tokens, 'auto');

console.log('Method used:', result.method);
console.log('Successful:', result.results.filter(r => r.success).length);
```

### Multi-Chain Support
```typescript
const chains = clanker.getSupportedChains();
console.log('API chains:', chains.api.length);
console.log('Direct chains:', chains.direct.length);
console.log('Both methods:', chains.both.length);

const chainInfo = clanker.getChainInfo(8453); // Base
console.log('Recommended method:', chainInfo.recommendedMethod);
```

## Error Handling

```typescript
try {
  const result = await clanker.deploy(token);
} catch (error) {
  switch (error.code) {
    case 'API_RATE_LIMIT':
      // Retry with direct method
      const result = await clanker.deploy(token, 'direct');
      break;
    case 'NETWORK_ERROR':
      console.log('Network issue, retrying...');
      break;
    case 'VALIDATION_ERROR':
      console.log('Token config invalid:', error.message);
      break;
    default:
      console.error('Deployment failed:', error.message);
  }
}
```

## Advanced Usage

### Enhanced Clanker
```typescript
import { createEnhancedClanker } from 'clanker-sdk';

const enhanced = createEnhancedClanker({
  operationMethod: 'auto',
  api: { apiKey: process.env.CLANKER_API_KEY },
});

// Additional methods
const config = enhanced.getConfig();
const context = enhanced.getMethodSelectionContext('deploy');
const isAPIAvailable = enhanced.isAPIAvailable();
```

### Unified Executor
```typescript
import { createUnifiedExecutor } from 'clanker-sdk';

const executor = createUnifiedExecutor({
  operationMethod: 'auto',
  api: { apiKey: process.env.CLANKER_API_KEY },
});

// Advanced features
const chainInfo = executor.getChainInfo(8453);
const supportedChains = executor.getSupportedChains();
```

### Runtime Configuration Updates
```typescript
const clanker = new Clanker({ operationMethod: 'direct' });

// Add API support at runtime
clanker.updateConfig({
  api: { apiKey: 'your-api-key' },
  operationMethod: 'auto',
});
```

## Environment Configuration

```bash
# Required for API integration
CLANKER_API_KEY=your-api-key-here

# Optional configuration
CLANKER_API_BASE_URL=https://api.clanker.world
CLANKER_OPERATION_METHOD=auto
CLANKER_API_TIMEOUT=30000
CLANKER_API_RETRIES=3
```

## Common Patterns

### Validation Before Deployment
```typescript
const validation = await clanker.validateTokenConfig(token);
if (validation.valid) {
  const result = await clanker.deploy(token);
} else {
  console.log('Fix these errors:', validation.errors);
}
```

### Batch with Error Handling
```typescript
const result = await clanker.batchDeploy(tokens);
const failed = result.results.filter(r => !r.success);

if (failed.length > 0) {
  console.log('Failed deployments:');
  failed.forEach(f => console.log(`${f.token}: ${f.error}`));
}
```

### Method Fallback
```typescript
let result;
try {
  result = await clanker.deploy(token, 'api');
} catch (error) {
  if (error.code === 'API_RATE_LIMIT') {
    result = await clanker.deploy(token, 'direct');
  } else {
    throw error;
  }
}
```

## Migration Checklist

- [ ] Existing code works without changes ✅
- [ ] Add `CLANKER_API_KEY` to environment
- [ ] Update config to include `api` and `operationMethod`
- [ ] Test with `operationMethod: 'auto'`
- [ ] Update error handling for new error types
- [ ] Test batch deployment improvements
- [ ] Update team documentation

## Troubleshooting

### API Key Issues
```typescript
const connection = await clanker.testConnection('api');
if (!connection.authenticated) {
  console.error('API key invalid or expired');
}
```

### Method Availability
```typescript
const methods = clanker.getAvailableMethods();
if (!methods.includes('api')) {
  console.error('API method not available - check configuration');
}
```

### Chain Support
```typescript
const chainInfo = clanker.getChainInfo(chainId);
if (!chainInfo.supported) {
  console.error(`Chain ${chainId} not supported`);
  console.log('Supported chains:', clanker.getSupportedChains());
}
```

## Performance Tips

1. **Use `auto` method** for optimal performance
2. **Batch similar operations** for efficiency
3. **Validate tokens** before deployment
4. **Handle rate limits** gracefully
5. **Cache chain information** when possible
6. **Use connection testing** to verify setup

## Support

- 📖 [Full Documentation](./clanker-api-integration.md)
- 🔧 [Migration Guide](../src/clanker-api/migration/migration-guide.md)
- 🐛 [GitHub Issues](https://github.com/clanker-sdk/issues)
- 💬 [Discord Community](https://discord.gg/clanker)