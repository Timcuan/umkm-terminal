# Clanker SDK v4.25

Multi-chain token deployment SDK for Clanker protocol.

## Supported Chains (Mainnet Only)

| Chain | Chain ID |
|-------|----------|
| Base | 8453 |
| Ethereum | 1 |
| Arbitrum | 42161 |
| Unichain | 130 |
| Monad | 10143 |

---

## 🚀 Quick Installation

### macOS (Terminal)
```bash
# Option 1: One-line install
curl -fsSL https://raw.githubusercontent.com/Timcuan/clanker-sdk/main/install.sh | bash

# Option 2: Manual install
brew install node
npm install -g clanker-sdk
umkm
```

### Android (Termux)
```bash
# 1. Install Termux from F-Droid (recommended, NOT Play Store)
# 2. Run these commands:
pkg update && pkg upgrade -y
pkg install nodejs-lts
npm install -g clanker-sdk
umkm
```

### Requirements
- **Node.js** v18 or higher
- **macOS** 10.15+ or **Termux** (Android 7+)

---

## 📱 Interactive Terminal (Recommended)

```bash
# Start the interactive terminal
umkm

# Or use npx (no install needed)
npx clanker-sdk
```

The interactive terminal provides:
- 🎨 Beautiful ASCII UI
- ⌨️ Arrow key navigation
- 💰 Wallet info & balance
- 🚀 Easy token deployment
- ⚙️ Settings management

---

## ⚡ CLI Commands

```bash
# Simple deploy on Base
npx clanker deploy -n "My Token" -s "TKN" -k 0xYOUR_PRIVATE_KEY

# With vault (30% locked for 30 days)
npx clanker deploy -n "My Token" -s "TKN" --vault 30 -k 0x...

# On Arbitrum with MEV protection
npx clanker deploy -n "My Token" -s "TKN" -c 42161 --mev 8 -k 0x...

# See all options
npx clanker --help
```

---

## 🔧 Configuration (.env file)

Create a `.env` file in your project directory:

```env
# Required
PRIVATE_KEY=0x...your_private_key_here

# Optional - Chain (default: 8453 = Base)
CHAIN_ID=8453

# Optional - Token defaults
TOKEN_NAME=My Token
TOKEN_SYMBOL=TKN
TOKEN_IMAGE=ipfs://...
TOKEN_DESCRIPTION=My awesome token

# Optional - Admin & Rewards
TOKEN_ADMIN=0x...
REWARD_RECIPIENT=0x...
REWARD_TOKEN=Both

# Optional - Fees (default: 5%)
FEE_TYPE=static
CLANKER_FEE=5
PAIRED_FEE=5

# Optional - MEV Protection (default: 8 blocks)
MEV_BLOCK_DELAY=8
```

---

## 📦 SDK Installation

```bash
npm install clanker-sdk
```

## Easy Deploy (Recommended)

```typescript
import 'dotenv/config';
import { quickDeploy } from 'clanker-sdk';

// Just set PRIVATE_KEY in .env and deploy!
const result = await quickDeploy({
  name: 'My Token',
  symbol: 'TKN',
  image: 'ipfs://...',
});

console.log(result.tokenAddress);
```

## Quick Start (SDK)

```typescript
import { Clanker, CHAIN_IDS } from 'clanker-sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Setup clients
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: base, transport: http() });
const wallet = createWalletClient({ account, chain: base, transport: http() });

// Initialize Clanker
const clanker = new Clanker({ wallet, publicClient });

// Deploy on Base
const result = await clanker.deploy({
  name: 'My Token',
  symbol: 'TKN',
  image: 'ipfs://...',
  tokenAdmin: account.address,
  chainId: CHAIN_IDS.BASE,
});

console.log('Transaction:', result.txHash);
const { address } = await result.waitForTransaction();
console.log('Token deployed at:', address);
```

## Features

- **Multi-chain Mainnet**: Deploy on Base, Ethereum, Arbitrum, Unichain, Monad
- **Easy Deployment**: Simple API for token deployment
- **Fee Management**: Claim trading fees from your tokens
- **Vault Operations**: Manage vested tokens with lockup
- **MEV Protection**: Built-in block delay protection
- **Metadata Updates**: Update token image and metadata

## Advanced Deployment

```typescript
// Deploy with vault (30% locked for 30 days)
const result = await clanker.deploy({
  name: 'My Token',
  symbol: 'TKN',
  image: 'ipfs://...',
  tokenAdmin: account.address,
  chainId: CHAIN_IDS.BASE,
  vault: {
    percentage: 30,
    lockupDuration: 30 * 24 * 60 * 60, // 30 days
  },
  mev: {
    type: 'blockDelay',
    blockDelay: 8,
  },
});
```

## API Reference

### Clanker Class

#### Constructor

```typescript
const clanker = new Clanker({
  wallet: WalletClient,      // Required for write operations
  publicClient: PublicClient, // Required for read operations
  chain?: Chain,              // Default chain (defaults to Base)
});
```

#### Methods

##### Token Deployment

```typescript
// Deploy a new token
await clanker.deploy(tokenConfig);
```

##### Fee Management

```typescript
// Get available fees
const fees = await clanker.getAvailableFees(tokenAddress, recipientAddress);

// Claim fees
await clanker.claimFees(tokenAddress, recipientAddress);
```

##### Reward Management

```typescript
// Update reward recipient
await clanker.updateRewardRecipient({
  token: tokenAddress,
  rewardIndex: 0n,
  newRecipient: newAddress,
});

// Update reward admin
await clanker.updateRewardAdmin({
  token: tokenAddress,
  rewardIndex: 0n,
  newAdmin: newAddress,
});
```

##### Vault Operations

```typescript
// Get claimable amount
const amount = await clanker.getVaultClaimableAmount(tokenAddress);

// Claim vaulted tokens
await clanker.claimVaultedTokens(tokenAddress);
```

##### Metadata Updates

```typescript
// Update token image
await clanker.updateImage(tokenAddress, 'ipfs://new-image');

// Update token metadata
await clanker.updateMetadata(tokenAddress, JSON.stringify({ description: 'New description' }));
```

## Configuration Options

### Pool Positions

```typescript
import { PoolPositionPreset, POOL_POSITIONS } from 'clanker-sdk';

// Use preset positions
const positions = POOL_POSITIONS[PoolPositionPreset.Standard];

// Or define custom positions
const customPositions = [
  { tickLower: -230400, tickUpper: -120000, bps: 10000 },
];
```

### Fee Configurations

```typescript
import { FeeConfigPreset, FEE_CONFIGS } from 'clanker-sdk';

// Use preset fee config
const fees = FEE_CONFIGS[FeeConfigPreset.DynamicBasic];

// Or define custom fees
const customFees = {
  type: 'static',
  clankerFee: 100, // 1%
  pairedFee: 100,  // 1%
};
```

## Utilities

```typescript
import {
  getTickFromMarketCap,
  getMarketCapFromTick,
  formatTokenAmount,
  parseTokenAmount,
} from 'clanker-sdk';

// Calculate tick from market cap
const tick = getTickFromMarketCap(0.1); // 0.1 ETH market cap

// Format token amount
const formatted = formatTokenAmount(1000000000000000000n); // "1"

// Parse token amount
const parsed = parseTokenAmount("1.5"); // 1500000000000000000n
```

## License

MIT
