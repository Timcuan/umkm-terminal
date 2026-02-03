/**
 * Multi-Wallet Batch Deployment with Environment Configuration
 * Demonstrates easy configuration using environment variables
 */

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { MultiWalletBatchManager } from '../src/batch/multi-wallet-batch.js';
import { loadBatchDeployConfig, BatchDeployConfigBuilder } from '../src/config/batch.js';

// Example 1: Load from environment variables
async function deployFromEnv() {
  console.log('=== Deploying from Environment Configuration ===\n');
  
  // Load configuration from environment
  const config = loadBatchDeployConfig();
  
  // Create public client
  const publicClient = createPublicClient({
    chain: base, // or mainnet based on your config
    transport: http(),
  });

  // Create batch manager
  const batchManager = new MultiWalletBatchManager(publicClient, base);

  try {
    // Setup and deploy
    const { plan, isReady } = await batchManager.setupBatchDeployer({
      farcasterInput: config.farcasterInput,
      tokenConfigs: [
        { name: 'Token A', symbol: 'TKA' },
        { name: 'Token B', symbol: 'TKB' },
        { name: 'Token C', symbol: 'TKC' },
      ],
      deployerPrivateKeys: config.deployerPrivateKeys,
      maxAddressesPerDeployer: config.maxAddressesPerDeployer,
      deployOptions: {
        maxConcurrentPerWallet: config.maxConcurrentPerWallet,
        deployDelay: config.deployDelay,
        maxRetries: config.maxRetries,
        gasMultiplier: config.gasMultiplier,
      },
    });

    if (!isReady) {
      console.error('Setup failed');
      return;
    }

    if (config.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual deployments will be made');
      console.log(`Plan: Deploy ${plan.totalTokens} tokens using ${plan.deployerWallets.length} wallets`);
      return;
    }

    // Execute deployment
    const result = await batchManager.executeBatchDeployment({
      farcasterInput: config.farcasterInput,
      tokenConfigs: [
        { name: 'Token A', symbol: 'TKA' },
        { name: 'Token B', symbol: 'TKB' },
        { name: 'Token C', symbol: 'TKC' },
      ],
      deployerPrivateKeys: config.deployerPrivateKeys,
      maxAddressesPerDeployer: config.maxAddressesPerDeployer,
      deployOptions: {
        maxConcurrentPerWallet: config.maxConcurrentPerWallet,
        deployDelay: config.deployDelay,
        maxRetries: config.maxRetries,
        gasMultiplier: config.gasMultiplier,
      },
    }, (progress) => {
      console.log(`Progress: ${progress.completed}/${progress.total}`);
    });

    console.log(`✅ Deployment completed with ${result.successRate.toFixed(2)}% success rate`);
  } catch (error) {
    console.error('Deployment failed:', error instanceof Error ? error.message : String(error));
  }
}

// Example 2: Use configuration builder with strategy preset
async function deployWithStrategy() {
  console.log('\n=== Deploying with Strategy Preset ===\n');
  
  // Build configuration with aggressive strategy
  const config = new BatchDeployConfigBuilder()
    .farcasterInput('vitalik')
    .deployerPrivateKeys(
      '0x0000000000000000000000000000000000000000000000000000000000000001,' +
      '0x0000000000000000000000000000000000000000000000000000000000000002,' +
      '0x0000000000000000000000000000000000000000000000000000000000000003'
    )
    .strategy('aggressive') // Use aggressive preset
    .maxGasPrice('50') // Override max gas price
    .dryRun(true) // Enable dry run for testing
    .build();

  console.log('Configuration:');
  console.log(`  Strategy: Aggressive`);
  console.log(`  Max addresses per deployer: ${config.maxAddressesPerDeployer}`);
  console.log(`  Max concurrent per wallet: ${config.maxConcurrentPerWallet}`);
  console.log(`  Deploy delay: ${config.deployDelay}ms`);
  console.log(`  Rate limit: ${config.rateLimitPerWallet} req/s`);
  console.log(`  Max retries: ${config.maxRetries}`);
  console.log(`  Gas multiplier: ${config.gasMultiplier}`);
  console.log(`  Max gas price: ${config.maxGasPrice?.toString()} gwei`);
  console.log(`  Dry run: ${config.dryRun}`);
}

// Example 3: Custom configuration
async function deployCustom() {
  console.log('\n=== Deploying with Custom Configuration ===\n');
  
  // Custom configuration for specific needs
  const config = new BatchDeployConfigBuilder()
    .farcasterInput('dwr')
    .deployerPrivateKeys(
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    )
    .maxAddressesPerDeployer(2) // Conservative: only 2 addresses per wallet
    .maxConcurrentPerWallet(1)  // Sequential deployment per wallet
    .deployDelay(3000)          // 3 seconds between deployments
    .rateLimitPerWallet(0.5)    // 1 deployment every 2 seconds
    .maxRetries(5)              // More retries for reliability
    .gasMultiplier(1.3)         // Higher gas for faster inclusion
    .build();

  console.log('Custom configuration loaded for conservative deployment');
}

// Example 4: Configuration validation
async function validateConfigExample() {
  console.log('\n=== Configuration Validation Example ===\n');
  
  try {
    // This will throw an error due to invalid configuration
    const config = new BatchDeployConfigBuilder()
      .farcasterInput('test')
      .deployerPrivateKeys('invalid-key')
      .maxAddressesPerDeployer(20) // Invalid: too high
      .build();
  } catch (error) {
    console.log('✅ Configuration validation caught error:', error instanceof Error ? error.message : String(error));
  }
}

// Run examples
async function main() {
  await deployWithStrategy();
  await deployCustom();
  await validateConfigExample();
  
  // Note: deployFromEnv() requires actual environment variables
  console.log('\n=== To use environment configuration ===');
  console.log('1. Copy .env.example to .env');
  console.log('2. Fill in your values');
  console.log('3. Run: deployFromEnv()');
}

if (require.main === module) {
  main().catch(console.error);
}

export { 
  deployFromEnv, 
  deployWithStrategy, 
  deployCustom, 
  validateConfigExample 
};
