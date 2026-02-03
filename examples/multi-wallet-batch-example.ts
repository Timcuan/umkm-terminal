/**
 * Multi-Wallet Batch Deployment Example
 * Demonstrates how to use the multi-wallet batch deployer with Farcaster integration
 */

import { createPublicClient, http, PublicClient } from 'viem';
import { base } from 'viem/chains';
import { MultiWalletBatchManager } from '../src/batch/multi-wallet-batch.js';

// Example usage
async function main() {
  // 1. Create public client
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;

  // 2. Create batch manager
  const batchManager = new MultiWalletBatchManager(publicClient, base);

  // 3. Prepare configuration
  const config = {
    farcasterInput: 'vitalik', // or FID number
    tokenConfigs: [
      { name: 'Token A', symbol: 'TKA' },
      { name: 'Token B', symbol: 'TKB' },
      { name: 'Token C', symbol: 'TKC' },
      { name: 'Token D', symbol: 'TKD' },
      { name: 'Token E', symbol: 'TKE' },
    ],
    deployerPrivateKeys: [
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000000000000000000000000000002',
    ] as `0x${string}`[],
    maxAddressesPerDeployer: 3, // Each deployer handles max 3 addresses
  };

  try {
    // 4. Setup and prepare deployer
    console.log('=== Multi-Wallet Batch Deploy Setup ===\n');
    const { plan, isReady, walletStats } = await batchManager.setupBatchDeployer(config);

    if (!isReady) {
      console.error('Setup failed. Please check the errors above.');
      return;
    }

    // 5. Execute deployment
    console.log('\n=== Starting Batch Deployment ===\n');
    const result = await batchManager.executeBatchDeployment(config, (progress) => {
      console.log(`Progress: ${progress.completed}/${progress.total}`);
      console.log(`Current: ${progress.currentToken} on ${progress.currentWallet}`);
    });

    // 6. Display results
    console.log('\n=== Deployment Results ===');
    console.log(`Total: ${result.results.total}`);
    console.log(`Successful: ${result.results.successful}`);
    console.log(`Failed: ${result.results.failed}`);
    console.log(`Success Rate: ${result.successRate.toFixed(2)}%`);
    console.log(`Duration: ${result.results.duration}ms`);
    console.log(`Total Gas Used: ${result.results.totalGasUsed.toString()}`);

    // 7. Display wallet performance
    console.log('\n=== Wallet Performance ===');
    result.walletStats.forEach(stat => {
      console.log(`\nWallet: ${stat.address}`);
      console.log(`  Deployed: ${stat.deployed}`);
      console.log(`  Successful: ${stat.successful}`);
      console.log(`  Failed: ${stat.failed}`);
      console.log(`  Gas Used: ${stat.totalGasUsed.toString()}`);
    });

  } catch (error) {
    console.error('Batch deployment failed:', error);
  }
}

// Alternative: Quick deployment with automatic setup
async function quickDeploy() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;

  const batchManager = new MultiWalletBatchManager(publicClient, base);

  const config = {
    farcasterInput: 'vitalik.eth',
    tokenConfigs: Array.from({ length: 10 }, (_, i) => ({
      name: `Batch Token ${i + 1}`,
      symbol: `BT${i + 1}`,
    })),
    deployerPrivateKeys: [
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000000000000000000000000000002',
      '0x0000000000000000000000000000000000000000000000000000000000000003',
    ] as `0x${string}`[],
    maxAddressesPerDeployer: 3,
  };

  try {
    // One-liner deployment with setup
    const result = await batchManager.executeBatchDeploymentWithSetup(config, (progress) => {
      console.log(`Deploying ${progress.currentToken}...`);
    });

    console.log(`Deployment completed with ${result.successRate.toFixed(2)}% success rate`);
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

// Run examples
if (require.main === module) {
  main().catch(console.error);
}

export { main, quickDeploy };
