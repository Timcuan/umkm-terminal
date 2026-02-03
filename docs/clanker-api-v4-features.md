# Clanker API v4 New Features

This document describes the new features added to support Clanker API v4.0.0 while maintaining full backward compatibility with existing code.

## Overview

The Clanker SDK has been enhanced to support new v4 API endpoints and features without breaking any existing functionality. All new features are **optional** and **backward compatible**.

## New Features

### 1. Auto-Generated Request Keys

**What's New:** Request keys are now optional and auto-generated if not provided.

**Before (v4 required):**
```typescript
const token = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
  requestKey: 'abcdef1234567890abcdef1234567890', // Required!
};
```

**Now (optional):**
```typescript
const token = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
  // requestKey is auto-generated if not provided
};

// Or provide your own:
const tokenWithKey = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
  requestKey: 'your-custom-32-char-key-here',
};
```

**Utility Functions:**
```typescript
import { 
  generateRequestKey, 
  validateRequestKey,
  ensureRequestKey 
} from 'clanker-sdk/clanker-api/utils';

// Generate a new key
const key = generateRequestKey();

// Validate a key
const isValid = validateRequestKey('abcdef1234567890abcdef1234567890');

// Ensure a key exists (generate if not provided)
const key = ensureRequestKey(); // Generates new
const key2 = ensureRequestKey('existing...'); // Uses existing
```

### 2. Get Tokens by Admin

**What's New:** Query all tokens where a specific address is the admin.

```typescript
const clanker = new Clanker({
  api: { apiKey: process.env.CLANKER_API_KEY },
  operationMethod: 'auto',
});

// Get tokens by admin address
const result = await clanker.getTokensByAdmin('0x...');

if (result.success) {
  console.log('Total tokens:', result.data.total);
  
  result.data.data.forEach(token => {
    console.log(`${token.name} (${token.symbol})`);
    console.log(`  Address: ${token.contract_address}`);
    console.log(`  Chain: ${token.chain_id}`);
    console.log(`  Deployed: ${token.deployed_at}`);
  });
  
  // Pagination support
  if (result.data.cursor) {
    const nextPage = await clanker.getTokensByAdmin(
      '0x...', 
      result.data.cursor, 
      20 // limit
    );
  }
}
```

### 3. Get Uncollected Fees (v4 Enhanced)

**What's New:** Get uncollected fees with support for multiple reward recipients (v4 requirement).

```typescript
// For v4 tokens, specify the reward recipient address
const result = await clanker.getUncollected Fees(
  '0x...', // token address
  '0x...'  // reward recipient address (required for v4)
);

if (result.success) {
  console.log('Token0 rewards:', result.data.token0UncollectedRewards);
  console.log('Token1 rewards:', result.data.token1UncollectedRewards);
  
  console.log('Token0:', result.data.token0.name);
  console.log('Token1:', result.data.token1.name);
}

// For v3 tokens (backward compatible)
const v3Result = await clanker.getUncollectedFees('0x...');
```

### 4. Index Token

**What's New:** Index a token for visibility on clanker.world.

```typescript
const result = await clanker.indexToken(
  '0x...', // token address
  8453,    // chain ID
  {
    name: 'My Token',
    symbol: 'MTK',
    image: 'https://...',
    description: 'Token description'
  }
);

if (result.success && result.data.indexed) {
  console.log('Token indexed successfully!');
  console.log('Token ID:', result.data.tokenId);
}
```

### 5. Get Token Information

**What's New:** Retrieve detailed information about any Clanker token.

```typescript
const result = await clanker.getTokenInfo('0x...');

if (result.success) {
  console.log('Name:', result.data.name);
  console.log('Symbol:', result.data.symbol);
  console.log('Admin:', result.data.admin);
  console.log('Chain:', result.data.chain_id);
  console.log('Pool:', result.data.pool_address);
  console.log('Image:', result.data.img_url);
  console.log('Deployed:', result.data.deployed_at);
}
```

### 6. Get All Tokens (Paginated)

**What's New:** Get a paginated list of all deployed tokens with optional filtering.

```typescript
// Get first page
const result = await clanker.getTokens(
  undefined, // cursor
  20,        // limit
  8453       // chain ID filter (optional)
);

if (result.success) {
  console.log('Total tokens:', result.data.total);
  
  result.data.data.forEach(token => {
    console.log(`${token.name} (${token.symbol})`);
  });
  
  // Get next page
  if (result.data.cursor) {
    const nextPage = await clanker.getTokens(
      result.data.cursor,
      20,
      8453
    );
  }
}
```

## Backward Compatibility

### ✅ All Existing Code Works Unchanged

```typescript
// This still works exactly as before
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});

const result = await clanker.deploy({
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
});
```

### ✅ New Features Are Optional

```typescript
// You can use new features when you need them
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: process.env.CLANKER_API_KEY }, // Optional
});

// Old methods still work
await clanker.deploy(token);

// New methods available when API is configured
await clanker.getTokensByAdmin('0x...');
```

### ✅ Graceful Degradation

```typescript
// If API is not configured, new methods return helpful errors
const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  // No API key provided
});

const result = await clanker.getTokensByAdmin('0x...');
// result.success = false
// result.error = 'API integration is not enabled. Please provide an API key...'
```

## Migration Guide

### No Changes Required

Your existing code will continue to work without any modifications.

### Optional: Enable New Features

1. **Add API Key** (if not already configured):
```bash
# .env
CLANKER_API_KEY=your-api-key-here
```

2. **Use New Methods** (when needed):
```typescript
// Query your deployed tokens
const myTokens = await clanker.getTokensByAdmin(myAddress);

// Check uncollected fees
const fees = await clanker.getUncollectedFees(tokenAddress, recipientAddress);

// Index a token
await clanker.indexToken(tokenAddress, chainId, metadata);
```

## API Requirements

### Authentication

All new API methods require an API key:

```typescript
const clanker = new Clanker({
  api: {
    apiKey: process.env.CLANKER_API_KEY,
    baseUrl: 'https://www.clanker.world/api', // Optional
    timeout: 30000, // Optional
    retries: 3, // Optional
  },
});
```

### Rate Limits

- Standard rate limits apply to all API endpoints
- Batch operations are recommended for multiple tokens
- Use pagination for large result sets

## Error Handling

All new methods return a consistent error format:

```typescript
const result = await clanker.getTokensByAdmin('0x...');

if (!result.success) {
  console.error('Error:', result.error);
  // Handle error appropriately
} else {
  // Use result.data
  console.log('Tokens:', result.data.data);
}
```

## Type Safety

All new features are fully typed:

```typescript
import type { 
  TokenInfo,
  PaginatedTokenResponse,
  UncollectedFeesResponse,
  IndexTokenResponse 
} from 'clanker-sdk/clanker-api/types';

// TypeScript will provide full autocomplete and type checking
const result: {
  success: boolean;
  data?: PaginatedTokenResponse;
  error?: string;
} = await clanker.getTokensByAdmin('0x...');
```

## Examples

### Complete Example: Token Management Dashboard

```typescript
import { Clanker } from 'clanker-sdk/v4';

const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
  api: { apiKey: process.env.CLANKER_API_KEY },
  operationMethod: 'auto',
});

async function getMyTokensDashboard(adminAddress: string) {
  // Get all tokens I admin
  const tokensResult = await clanker.getTokensByAdmin(adminAddress);
  
  if (!tokensResult.success) {
    console.error('Failed to fetch tokens:', tokensResult.error);
    return;
  }
  
  console.log(`\nManaging ${tokensResult.data.total} tokens:\n`);
  
  // For each token, get detailed info and fees
  for (const token of tokensResult.data.data) {
    console.log(`\n${token.name} (${token.symbol})`);
    console.log(`  Address: ${token.contract_address}`);
    console.log(`  Chain: ${token.chain_id}`);
    
    // Get uncollected fees
    const feesResult = await clanker.getUncollectedFees(
      token.contract_address as `0x${string}`,
      adminAddress as `0x${string}`
    );
    
    if (feesResult.success) {
      console.log(`  Uncollected Fees:`);
      console.log(`    ${feesResult.data.token0.symbol}: ${feesResult.data.token0UncollectedRewards}`);
      console.log(`    ${feesResult.data.token1.symbol}: ${feesResult.data.token1UncollectedRewards}`);
    }
  }
}

// Run dashboard
getMyTokensDashboard('0x...');
```

### Complete Example: Token Discovery

```typescript
async function discoverTokens(chainId: number, limit: number = 50) {
  let cursor: string | undefined;
  let allTokens: any[] = [];
  
  do {
    const result = await clanker.getTokens(cursor, limit, chainId);
    
    if (!result.success) {
      console.error('Failed to fetch tokens:', result.error);
      break;
    }
    
    allTokens.push(...result.data.data);
    cursor = result.data.cursor;
    
    console.log(`Fetched ${allTokens.length} of ${result.data.total} tokens...`);
    
  } while (cursor);
  
  console.log(`\nDiscovered ${allTokens.length} tokens on chain ${chainId}`);
  return allTokens;
}

// Discover all Base tokens
const baseTokens = await discoverTokens(8453);
```

## Testing

All new features include comprehensive tests:

```bash
# Run API integration tests
npm test -- tests/clanker-api/

# Run specific v4 feature tests
npm test -- tests/clanker-api/v4-features.test.ts
```

## Support

For issues or questions:

1. Check the [GitHub Issues](https://github.com/clanker-sdk/issues)
2. Review the [API Documentation](https://clanker.gitbook.io/clanker-documentation)
3. Join the [Discord Community](https://discord.gg/clanker)

## Changelog

### v4.25.1 - Clanker API v4 Support

- ✅ Added auto-generated request keys (optional)
- ✅ Added `getTokensByAdmin()` method with pagination
- ✅ Enhanced `getUncollectedFees()` for v4 multi-recipient support
- ✅ Added `indexToken()` method for token visibility
- ✅ Added `getTokenInfo()` method for detailed token data
- ✅ Added `getTokens()` method for paginated token discovery
- ✅ Added request key utility functions
- ✅ Maintained 100% backward compatibility
- ✅ Added comprehensive documentation and examples
