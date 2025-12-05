/**
 * Multi-Chain Deploy Example
 * Deploy same token on multiple chains
 * 
 * Supported Chains & Features:
 * ┌─────────────┬──────────┬─────────────────┬──────────────┐
 * │ Chain       │ Chain ID │ MEV Protection  │ Dynamic Fees │
 * ├─────────────┼──────────┼─────────────────┼──────────────┤
 * │ Base        │ 8453     │ ✅ Yes          │ ✅ Yes       │
 * │ Ethereum    │ 1        │ ✅ Yes          │ ❌ No        │
 * │ Arbitrum    │ 42161    │ ✅ Yes          │ ✅ Yes       │
 * │ Unichain    │ 130      │ ✅ Yes          │ ✅ Yes       │
 * │ Monad       │ 10143    │ ❌ No           │ ❌ No        │
 * └─────────────┴──────────┴─────────────────┴──────────────┘
 * 
 * Note: If a feature is not available, the SDK will automatically
 * fall back to the available option (e.g., static fees instead of dynamic)
 */

import 'dotenv/config';
import { 
  createBaseDeployer, 
  createEthDeployer,
  createArbDeployer, 
  createUnichainDeployer,
  createMonadDeployer,
  type SimpleDeployConfig,
} from '../src/index.js';

async function main() {
  console.log('🌐 Multi-Chain Deploy Example\n');

  // Token config (same for all chains)
  // MEV protection will be auto-disabled on chains that don't support it
  const tokenConfig: SimpleDeployConfig = {
    name: 'Multi Chain Token',
    symbol: 'MCT',
    image: 'ipfs://...',
    description: 'A token deployed across multiple chains',
    mev: 8, // MEV protection (auto-disabled on Monad)
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Base (Primary Chain)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Base...');
  const baseDeployer = createBaseDeployer();
  const baseResult = await baseDeployer.deploy(tokenConfig);
  console.log(`   ${baseResult.success ? `✅ ${baseResult.tokenAddress}` : `❌ ${baseResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Ethereum
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Ethereum...');
  const ethDeployer = createEthDeployer();
  const ethResult = await ethDeployer.deploy(tokenConfig);
  console.log(`   ${ethResult.success ? `✅ ${ethResult.tokenAddress}` : `❌ ${ethResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Arbitrum
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Arbitrum...');
  const arbDeployer = createArbDeployer();
  const arbResult = await arbDeployer.deploy(tokenConfig);
  console.log(`   ${arbResult.success ? `✅ ${arbResult.tokenAddress}` : `❌ ${arbResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Unichain
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Unichain...');
  const unichainDeployer = createUnichainDeployer();
  const unichainResult = await unichainDeployer.deploy(tokenConfig);
  console.log(`   ${unichainResult.success ? `✅ ${unichainResult.tokenAddress}` : `❌ ${unichainResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Monad (No MEV protection available)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Monad...');
  const monadDeployer = createMonadDeployer();
  
  // Check chain features before deploying
  console.log(`   Features: MEV=${monadDeployer.chainFeatures.mevProtection}, DynamicFees=${monadDeployer.chainFeatures.dynamicFees}`);
  
  const monadResult = await monadDeployer.deploy(tokenConfig);
  console.log(`   ${monadResult.success ? `✅ ${monadResult.tokenAddress}` : `❌ ${monadResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('✅ Multi-chain deployment complete!');
  console.log('\nResults:');
  console.log(`   Base:     ${baseResult.success ? baseResult.tokenAddress : 'Failed'}`);
  console.log(`   Ethereum: ${ethResult.success ? ethResult.tokenAddress : 'Failed'}`);
  console.log(`   Arbitrum: ${arbResult.success ? arbResult.tokenAddress : 'Failed'}`);
  console.log(`   Unichain: ${unichainResult.success ? unichainResult.tokenAddress : 'Failed'}`);
  console.log(`   Monad:    ${monadResult.success ? monadResult.tokenAddress : 'Failed'}`);
}

main().catch(console.error);
