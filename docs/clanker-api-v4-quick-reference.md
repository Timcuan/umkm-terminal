# Clanker API v4 Quick Reference

Quick reference untuk fitur-fitur baru Clanker API v4.

## 🚀 Quick Start

```typescript
import { Clanker } from 'clanker-sdk/v4';

const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: process.env.CLANKER_API_KEY },
  operationMethod: 'auto',
});
```

## 📚 New Methods

### 1. Get Tokens by Admin

```typescript
const result = await clanker.getTokensByAdmin(
  '0x...', // admin address
  cursor,  // optional: pagination cursor
  20       // optional: limit (default 20)
);

if (result.success) {
  console.log('Total:', result.data.total);
  result.data.data.forEach(token => {
    console.log(token.name, token.contract_address);
  });
  
  // Next page
  if (result.data.cursor) {
    const next = await clanker.getTokensByAdmin('0x...', result.data.cursor);
  }
}
```

### 2. Get Uncollected Fees

```typescript
// v4 tokens (with recipient)
const result = await clanker.getUncollectedFees(
  '0x...', // token address
  '0x...'  // reward recipient (required for v4)
);

// v3 tokens (backward compatible)
const result = await clanker.getUncollectedFees('0x...');

if (result.success) {
  console.log('Token0:', result.data.token0UncollectedRewards);
  console.log('Token1:', result.data.token1UncollectedRewards);
}
```

### 3. Index Token

```typescript
const result = await clanker.indexToken(
  '0x...', // token address
  8453,    // chain ID
  {        // optional metadata
    name: 'Token Name',
    symbol: 'TKN',
    image: 'https://...',
    description: 'Description'
  }
);

if (result.success && result.data.indexed) {
  console.log('Token indexed!');
}
```

### 4. Get Token Info

```typescript
const result = await clanker.getTokenInfo('0x...');

if (result.success) {
  console.log('Name:', result.data.name);
  console.log('Symbol:', result.data.symbol);
  console.log('Admin:', result.data.admin);
  console.log('Chain:', result.data.chain_id);
  console.log('Pool:', result.data.pool_address);
}
```

### 5. Get All Tokens

```typescript
const result = await clanker.getTokens(
  cursor,  // optional: pagination cursor
  50,      // optional: limit
  8453     // optional: chain ID filter
);

if (result.success) {
  console.log('Total:', result.data.total);
  result.data.data.forEach(token => {
    console.log(token.name, token.symbol);
  });
}
```

## 🔑 Request Key Utilities

```typescript
import { 
  generateRequestKey, 
  validateRequestKey,
  ensureRequestKey 
} from 'clanker-sdk/clanker-api/utils';

// Generate new key
const key = generateRequestKey();
// => "abcdef1234567890abcdef1234567890"

// Validate key
const isValid = validateRequestKey(key);
// => true

// Ensure key exists
const key1 = ensureRequestKey();           // Generates new
const key2 = ensureRequestKey('existing'); // Uses existing
```

## 📦 Response Format

All methods return consistent format:

```typescript
{
  success: boolean;
  data?: T;      // Response data if successful
  error?: string; // Error message if failed
}
```

## 🔄 Backward Compatibility

### ✅ Old Code Still Works

```typescript
// This still works exactly as before
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});

await clanker.deploy(token); // ✓ Works
```

### ✅ RequestKey Now Optional

```typescript
// Before (required)
const token = {
  name: 'Token',
  symbol: 'TKN',
  tokenAdmin: '0x...',
  requestKey: 'abcdef...' // REQUIRED
};

// Now (optional - auto-generated)
const token = {
  name: 'Token',
  symbol: 'TKN',
  tokenAdmin: '0x...',
  // requestKey auto-generated
};
```

## 🎯 Common Patterns

### Pattern 1: Token Dashboard

```typescript
async function getMyTokens(address: string) {
  const result = await clanker.getTokensByAdmin(address);
  
  if (!result.success) {
    console.error(result.error);
    return [];
  }
  
  return result.data.data;
}

async function getTokenFees(tokenAddress: string, recipient: string) {
  const result = await clanker.getUncollectedFees(tokenAddress, recipient);
  
  if (!result.success) {
    console.error(result.error);
    return null;
  }
  
  return {
    token0: result.data.token0UncollectedRewards,
    token1: result.data.token1UncollectedRewards,
  };
}
```

### Pattern 2: Pagination

```typescript
async function getAllTokens(chainId: number) {
  let cursor: string | undefined;
  let allTokens: any[] = [];
  
  do {
    const result = await clanker.getTokens(cursor, 50, chainId);
    
    if (!result.success) break;
    
    allTokens.push(...result.data.data);
    cursor = result.data.cursor;
    
  } while (cursor);
  
  return allTokens;
}
```

### Pattern 3: Error Handling

```typescript
async function safeGetTokenInfo(address: string) {
  const result = await clanker.getTokenInfo(address);
  
  if (!result.success) {
    // Handle specific errors
    if (result.error?.includes('not enabled')) {
      console.log('API key required');
    } else if (result.error?.includes('not found')) {
      console.log('Token not found');
    } else {
      console.error('Unknown error:', result.error);
    }
    return null;
  }
  
  return result.data;
}
```

## ⚙️ Configuration

### Minimal (Backward Compatible)

```typescript
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});
// New features not available, but old code works
```

### With API (Recommended)

```typescript
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: {
    apiKey: process.env.CLANKER_API_KEY,
  },
  operationMethod: 'auto',
});
// All features available
```

### Full Configuration

```typescript
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: {
    apiKey: process.env.CLANKER_API_KEY,
    baseUrl: 'https://www.clanker.world/api',
    timeout: 30000,
    retries: 3,
  },
  operationMethod: 'auto',
  chain: base,
});
```

## 🔍 Type Definitions

```typescript
import type {
  // Response types
  TokenInfo,
  PaginatedTokenResponse,
  UncollectedFeesResponse,
  IndexTokenResponse,
  
  // Request types
  GetTokensByAdminRequest,
  GetUncollectedFeesRequest,
  IndexTokenRequest,
} from 'clanker-sdk/clanker-api/types';
```

## 📝 Environment Variables

```bash
# Required for new features
CLANKER_API_KEY=your-api-key-here

# Optional
CLANKER_API_BASE_URL=https://www.clanker.world/api
CLANKER_API_TIMEOUT=30000
CLANKER_API_RETRIES=3
```

## ⚠️ Important Notes

1. **API Key Required**: New methods require API key
2. **Rate Limits**: Standard API rate limits apply
3. **Pagination**: Use cursor-based pagination for large datasets
4. **Error Handling**: Always check `result.success` before using `result.data`
5. **Backward Compatible**: All existing code continues to work

## 🆘 Troubleshooting

### Error: "API integration is not enabled"

```typescript
// Solution: Add API key
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: process.env.CLANKER_API_KEY }, // Add this
});
```

### Error: "Invalid request key format"

```typescript
// Solution: Use utility function
import { ensureRequestKey } from 'clanker-sdk/clanker-api/utils';

const requestKey = ensureRequestKey(userProvidedKey);
// Validates and generates if needed
```

### Error: "Rate limit exceeded"

```typescript
// Solution: Implement retry with backoff
async function withRetry(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result.success) return result;
    
    if (result.error?.includes('rate limit')) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      continue;
    }
    
    return result;
  }
}
```

## 📚 More Resources

- **Full Documentation**: `docs/clanker-api-v4-features.md`
- **Examples**: `examples/clanker-api-v4-features.ts`
- **Implementation Summary**: `CLANKER-API-V4-IMPLEMENTATION-SUMMARY.md`
- **API Integration Guide**: `docs/clanker-api-integration.md`

## 🔗 Links

- [Clanker Documentation](https://clanker.gitbook.io/clanker-documentation)
- [GitHub Repository](https://github.com/clanker-sdk)
- [Discord Community](https://discord.gg/clanker)

---

**Version**: v4.25.1  
**Last Updated**: February 3, 2026
