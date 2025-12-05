# Clanker Deploy Flow

## 🚀 Quick Deploy (CLI)

```bash
# Simple deploy
npx clanker deploy -n "My Token" -s "TKN" -k 0xYOUR_PRIVATE_KEY

# With vault (30% locked 30 days)
npx clanker deploy -n "My Token" -s "TKN" --vault 30 --lockup 30 -k 0x...

# On different chain
npx clanker deploy -n "My Token" -s "TKN" -c 42161 -k 0x...  # Arbitrum
```

## 📊 Deploy Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INPUT                                   │
├─────────────────────────────────────────────────────────────────┤
│  name, symbol, image, chainId, tokenAdmin                       │
│  [optional] vault, mev, fees, poolPositions                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BUILD CONFIG                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Generate random salt (CREATE2)                              │
│  2. Encode token metadata (JSON)                                │
│  3. Encode fee config (static/dynamic)                          │
│  4. Encode MEV config (block delay)                             │
│  5. Encode vault extension (if enabled)                         │
│  6. Build locker config with reward recipients                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CONTRACT CALL                                  │
├─────────────────────────────────────────────────────────────────┤
│  ClankerFactory.deployToken(deploymentConfig)                   │
│                                                                  │
│  deploymentConfig = {                                           │
│    tokenConfig     → name, symbol, image, admin, salt           │
│    poolConfig      → hook, pairedToken, ticks                   │
│    lockerConfig    → locker, rewards, positions                 │
│    mevModuleConfig → mevModule, blockDelay                      │
│    extensionConfigs → [vault, airdrop, devbuy]                  │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ON-CHAIN                                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Deploy ERC20 token contract                                 │
│  2. Create Uniswap V4 pool                                      │
│  3. Add initial liquidity                                       │
│  4. Setup locker for LP tokens                                  │
│  5. Setup vault (if enabled)                                    │
│  6. Setup MEV protection (if enabled)                           │
│  7. Emit TokenCreated event                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RESULT                                         │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    txHash: "0x...",                                             │
│    chainId: 8453,                                               │
│    waitForTransaction() → { address: "0x..." }                  │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 SDK Usage

### Minimal Deploy

```typescript
import { Clanker, CHAIN_IDS } from 'clanker-sdk';

const clanker = new Clanker({ wallet, publicClient });

const result = await clanker.deploy({
  name: 'My Token',
  symbol: 'TKN',
  image: 'ipfs://...',
  tokenAdmin: '0x...',
  chainId: CHAIN_IDS.BASE,
});

const { address } = await result.waitForTransaction();
```

### Full Config

```typescript
const result = await clanker.deploy({
  // Required
  name: 'My Token',
  symbol: 'TKN',
  image: 'ipfs://...',
  tokenAdmin: '0x...',
  chainId: CHAIN_IDS.BASE,

  // Vault (optional)
  vault: {
    percentage: 30,           // 30% of supply
    lockupDuration: 2592000,  // 30 days in seconds
    vestingDuration: 0,       // No vesting
    recipient: '0x...',       // Defaults to tokenAdmin
  },

  // MEV Protection (optional)
  mev: {
    type: 'blockDelay',
    blockDelay: 8,            // 8 blocks delay
  },

  // Fees (optional, defaults to 1% static)
  fees: {
    type: 'static',
    clankerFee: 100,          // 1%
    pairedFee: 100,           // 1%
  },

  // Pool Positions (optional, defaults to Standard)
  poolPositions: [
    { tickLower: -230400, tickUpper: -120000, bps: 10000 },
  ],

  // Rewards (optional, defaults to 100% to tokenAdmin)
  rewards: {
    recipients: [
      {
        admin: '0x...',
        recipient: '0x...',
        bps: 10000,
        feePreference: 'Both',
      },
    ],
  },

  // Metadata (optional)
  metadata: {
    description: 'My awesome token',
    socials: {
      twitter: 'https://twitter.com/...',
      website: 'https://...',
    },
  },
});
```

## 📋 Supported Chains

| Chain    | ID    | RPC                          |
|----------|-------|------------------------------|
| Base     | 8453  | https://mainnet.base.org     |
| Ethereum | 1     | https://eth.llamarpc.com     |
| Arbitrum | 42161 | https://arb1.arbitrum.io/rpc |
| Unichain | 130   | https://mainnet.unichain.org |
| Monad    | 10143 | https://rpc.monad.xyz        |

## ⚙️ Config Defaults

| Option         | Default Value                    |
|----------------|----------------------------------|
| chainId        | 8453 (Base)                      |
| pairedToken    | WETH                             |
| fees           | Static 1%/1%                     |
| poolPositions  | Standard (-230400 to -120000)    |
| mev            | None                             |
| vault          | None                             |
| rewards        | 100% to tokenAdmin               |
