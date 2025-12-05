/**
 * Quick Deploy Example
 * Uses .env configuration for easy deployment
 *
 * Setup:
 * 1. Copy .env.example to .env
 * 2. Set PRIVATE_KEY in .env
 * 3. Run: npx ts-node examples/quick-deploy.ts
 */

import 'dotenv/config';
import { quickDeploy } from '../src/index.js';

async function main() {
  console.log('🚀 Quick Deploy Example\n');

  const result = await quickDeploy({
    name: 'My Token',
    symbol: 'TKN',
    image: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  });

  if (result.success) {
    console.log('✅ Token deployed!');
    console.log(`   Address: ${result.tokenAddress}`);
    console.log(`   Chain: ${result.chainName}`);
    console.log(`   Explorer: ${result.explorerUrl}`);
  } else {
    console.log('❌ Deployment failed:', result.error);
  }
}

main().catch(console.error);
