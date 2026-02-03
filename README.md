# UMKM Terminal v4.25

Multi-chain token deployment SDK for Clanker protocol with secure multi-wallet management.

## ✨ What's New in v4.25

- 🚀 **Clanker API Integration** - REST API support with AI-powered optimization
- 🤖 **Intelligent Method Selection** - Auto fallback between API and direct methods
- 🔐 **Secure Multi-Wallet Management** - AES-256-GCM encryption with PBKDF2
- 🔑 **Mnemonic Support** - 12-word recovery phrase compatible with MetaMask, Ledger, etc.
- 📁 **Dedicated Wallet Storage** - Secure `.umkm-wallets/` folder
- 🔄 **Easy Wallet Switching** - Switch between multiple wallets instantly
- 📤 **Backup & Restore** - Encrypted backup files with recovery phrase
- 🌐 **Farcaster Integration** - Fetch user wallets from Farcaster
- ⚡ **Enhanced Batch Deployment** - Optimized multi-chain bulk operations
- 🛡️ **Comprehensive Error Handling** - Intelligent retry logic with circuit breakers

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
curl -fsSL https://raw.githubusercontent.com/Timcuan/umkm-terminal/main/install.sh | bash

# Option 2: Manual install
brew install node
npm install -g umkm-terminal
umkm
```

### Android (Termux)
```bash
# 1. Install Termux from F-Droid (recommended, NOT Play Store)
# 2. Run these commands:
pkg update && pkg upgrade -y
pkg install nodejs-lts
npm install -g umkm-terminal
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
npx umkm-terminal
```

The interactive terminal provides:
- 🎨 Beautiful ASCII UI
- ⌨️ Arrow key navigation
- 💰 Wallet info & balance
- 🔐 Multi-wallet management
- 🚀 Easy token deployment
- 📦 Batch deployment (1-100 tokens)
- ⚙️ Settings management

---

## 🚀 Clanker API Integration (New!)

UMKM Terminal now supports both traditional contract deployment and the new Clanker API with AI-powered optimization:

### Quick Setup
```bash
# Add your API key to environment
export CLANKER_API_KEY=your-api-key-here

# Use auto method for intelligent selection
umkm deploy -n "My Token" -s "TKN" --method auto
```

### Method Options
- `direct` - Traditional contract deployment (default)
- `api` - Use Clanker API with AI optimization
- `auto` - Intelligent selection with fallback (recommended)

### Benefits of API Integration
- 🤖 **AI-Powered Optimization** - Smart routing and gas optimization
- ⚡ **Enhanced Batch Operations** - Efficient bulk deployments
- 🔄 **Automatic Fallback** - Falls back to direct method if API fails
- 🌐 **Multi-Chain Intelligence** - Chain-specific optimizations
- 📊 **Advanced Analytics** - Deployment insights and recommendations

### Configuration
```bash
# Environment variables
CLANKER_API_KEY=your-api-key-here
CLANKER_OPERATION_METHOD=auto
CLANKER_API_TIMEOUT=30000
```

📖 **[Full API Integration Guide](./docs/clanker-api-integration.md)**

---

## ⚡ CLI Commands

```bash
# Simple deploy on Base (now with API support)
umkm deploy -n "My Token" -s "TKN" -k 0xYOUR_PRIVATE_KEY --method auto

# With vault (30% locked for 30 days)
umkm deploy -n "My Token" -s "TKN" --vault 30 -k 0x...

# On Arbitrum with MEV protection
umkm deploy -n "My Token" -s "TKN" -c 42161 --mev 8 -k 0x...

# Batch deploy with API optimization
umkm batch deploy template.json --method api

# See all options
umkm --help
```

---

## 🔐 Wallet Management

UMKM Terminal now supports secure multi-wallet management:

```bash
# Start terminal and go to Wallet Info > Wallet Management
umkm
```

### Features
- **Generate New Wallet** - Creates HD wallet with 12-word recovery phrase
- **Import Wallet** - From recovery phrase, private key, or backup file
- **Switch Wallet** - Easily switch between stored wallets
- **Export/Backup** - Create encrypted backup files
- **Manage Wallets** - Rename or delete wallets

### Security
- 🔒 **AES-256-GCM** encryption with PBKDF2 (100,000 iterations)
- 📁 Wallets stored in `.umkm-wallets/` folder with restricted permissions
- 🔑 Recovery phrases compatible with MetaMask, Ledger, Trezor, etc.
- ⚠️ Never share your recovery phrase or private key!

### Wallet Storage Structure
```
.umkm-wallets/
├── store.json      # Encrypted wallet store
└── backups/        # Encrypted backup files
```

---

## 🔧 Configuration (.env file)

Create a `.env` file in your project directory:

```env
# Required (or use Wallet Management)
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
npm install umkm-terminal
```

## Easy Deploy (Recommended)

```typescript
import 'dotenv/config';
import { quickDeploy } from 'umkm-terminal';

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
import { Deployer } from 'umkm-terminal';
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
- **Secure Wallet Management**: AES-256-GCM encrypted multi-wallet storage
- **Mnemonic Support**: BIP39/BIP44 compatible recovery phrases
- **Easy Deployment**: Simple API for token deployment
- **Batch Deployment**: Deploy 1-100 tokens at once
- **Farcaster Integration**: Generate tokens from Farcaster user wallets
- **Fee Management**: Claim trading fees from your tokens
- **Vault Operations**: Manage vested tokens with lockup
- **MEV Protection**: Built-in block delay protection
- **Vanity Addresses**: Mine custom token addresses

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

## Wallet SDK Functions

```typescript
import {
  // Wallet generation
  generateWallet,
  generateWalletWithMnemonic,
  
  // Validation
  validatePrivateKey,
  validateMnemonicPhrase,
  
  // Mnemonic utilities
  mnemonicToPrivateKey,
  mnemonicToAddress,
  
  // Encryption
  encrypt,
  decrypt,
  
  // Storage
  addWalletToStore,
  addWalletWithMnemonicToStore,
  getAllWallets,
  getActiveWallet,
  setActiveWallet,
  decryptWallet,
  decryptWalletMnemonic,
  
  // Backup
  createBackupFile,
  importFromBackup,
  listBackupFiles,
} from 'umkm-terminal';

// Generate wallet with mnemonic
const wallet = generateWalletWithMnemonic();
console.log('Address:', wallet.address);
console.log('Mnemonic:', wallet.mnemonic); // 12 words
console.log('Private Key:', wallet.privateKey);

// Validate mnemonic
const isValid = validateMnemonicPhrase(wallet.mnemonic);

// Derive key from mnemonic (index 0 = first account)
const derivedKey = mnemonicToPrivateKey(wallet.mnemonic, 0);

// Encrypt/decrypt data
const encrypted = encrypt('sensitive data', 'password123');
const decrypted = decrypt(encrypted, 'password123');
```

## Farcaster Integration

```typescript
import { getUserWallets, resolveUser } from 'umkm-terminal';

// Get user profile
const user = await resolveUser('username');
console.log('FID:', user.fid);
console.log('Display Name:', user.displayName);

// Get all wallets from Farcaster user
const result = await getUserWallets('username');
console.log('Wallets:', result.wallets);
```

## License

MIT
