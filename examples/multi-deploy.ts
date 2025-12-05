/**
 * Multi-Chain Deploy Example
 * Deploy the same token to multiple chains with one simple call
 *
 * This is the SIMPLEST way to deploy across chains.
 * Just provide name, symbol, and optionally image/description.
 */

import 'dotenv/config';
import { MultiChainDeployer, multiDeploy } from '../src/index.js';

// ============================================================================
// Method 1: Quick Function (Simplest)
// ============================================================================

async function quickMultiDeploy() {
  console.log('🚀 Quick Multi-Deploy\n');

  // Deploy to ALL chains with minimal config
  const results = await multiDeploy({
    name: 'Universal Token',
    symbol: 'UNI',
    image: 'ipfs://...',
    description: 'A token on every chain',
  });

  console.log(`✅ Deployed to ${results.successful}/${results.totalChains} chains\n`);

  for (const r of results.results) {
    const status = r.success ? '✅' : '❌';
    const addr = r.tokenAddress || r.error || 'Unknown';
    console.log(`  ${status} ${r.chain}: ${addr}`);
  }
}

// ============================================================================
// Method 2: Deploy to Specific Chains
// ============================================================================

async function deployToSpecificChains() {
  console.log('\n🎯 Deploy to Specific Chains\n');

  // Only deploy to Base and Arbitrum
  const results = await multiDeploy(
    {
      name: 'Dual Chain Token',
      symbol: 'DCT',
      feePercent: 3, // 3% fee
      mev: 10, // 10 blocks MEV protection
    },
    ['base', 'arbitrum'] // Only these chains
  );

  console.log(`✅ Deployed to ${results.successful}/${results.totalChains} chains\n`);

  for (const r of results.results) {
    console.log(`  ${r.chain}: ${r.success ? r.tokenAddress : r.error}`);
  }
}

// ============================================================================
// Method 3: Using MultiChainDeployer Class
// ============================================================================

async function usingDeployerClass() {
  console.log('\n🔧 Using MultiChainDeployer Class\n');

  const deployer = new MultiChainDeployer();

  console.log(`Wallet: ${deployer.address}\n`);

  // Deploy to all chains
  const allResults = await deployer.deployToAll({
    name: 'Class Token',
    symbol: 'CLS',
  });

  // Or deploy in parallel (faster)
  // const parallelResults = await deployer.deployToParallel(
  //   ['base', 'arbitrum', 'unichain'],
  //   { name: 'Parallel Token', symbol: 'PAR' }
  // );

  console.log(`✅ ${allResults.successful}/${allResults.totalChains} successful\n`);
}

// ============================================================================
// Method 4: Deploy One Chain at a Time (with custom logic)
// ============================================================================

async function deployOneByOne() {
  console.log('\n🔄 Deploy One by One\n');

  const deployer = new MultiChainDeployer();
  const chains = ['base', 'arbitrum'] as const;

  for (const chain of chains) {
    console.log(`Deploying to ${chain}...`);

    const result = await deployer.deployToChain(chain, {
      name: 'Sequential Token',
      symbol: 'SEQ',
    });

    if (result.success) {
      console.log(`  ✅ ${result.tokenAddress}`);
      console.log(`  📎 ${result.explorerUrl}\n`);
    } else {
      console.log(`  ❌ ${result.error}\n`);
    }
  }
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    MULTI-CHAIN DEPLOY EXAMPLES                 ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Run all examples
  await quickMultiDeploy();
  await deployToSpecificChains();
  await usingDeployerClass();
  await deployOneByOne();
}

main().catch(console.error);
