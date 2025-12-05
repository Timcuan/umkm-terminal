/**
 * Quick Deploy Example
 * Uses .env configuration for easy deployment
 *
 * Environment Variables:
 * - PRIVATE_KEY (required) - Your wallet private key
 * - CHAIN_ID (optional) - Default: 8453 (Base)
 *   Supported: 8453 (Base), 1 (Ethereum), 42161 (Arbitrum), 130 (Unichain), 10143 (Monad)
 *
 * Setup:
 * 1. Copy .env.example to .env
 * 2. Set PRIVATE_KEY in .env
 * 3. Run: npx ts-node examples/quick-deploy.ts
 */

import 'dotenv/config';
import { quickDeploy, CHAIN_IDS } from '../src/index.js';

async function main() {
  console.log('🚀 Quick Deploy Example\n');

  // Deploy on default chain (from CHAIN_ID env or Base)
  const result = await quickDeploy({
    name: 'My Token',
    symbol: 'TKN',
    image: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    description: 'My awesome token',
    mev: 8, // MEV protection (8 blocks delay)
  });

  if (result.success) {
    console.log('✅ Token deployed!');
    console.log(`   Address: ${result.tokenAddress}`);
    console.log(`   Chain: ${result.chainName} (${result.chainId})`);
    console.log(`   TX: ${result.txHash}`);
    console.log(`   Explorer: ${result.explorerUrl}`);
  } else {
    console.log('❌ Deployment failed:', result.error);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on specific chain (override env)
  // ─────────────────────────────────────────────────────────────────────────
  // const arbitrumResult = await quickDeploy({
  //   name: 'My Token',
  //   symbol: 'TKN',
  //   chainId: CHAIN_IDS.ARBITRUM, // 42161
  // });
}

main().catch(console.error);
