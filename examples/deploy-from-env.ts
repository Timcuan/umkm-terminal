/**
 * Deploy from Environment Configuration
 * Demonstrates how to use the .env configuration for all deployment modes
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { 
  MultiWalletBatchManager,
  BatchDeployConfigBuilder,
  createDeployer,
  quickDeploy
} from '../src/index.js';
import { 
  loadEnvConfig, 
  getConfigSummary, 
  checkRequiredVariables 
} from '../src/config/env-validator.js';

// ============================================================================
// MAIN DEPLOYMENT FUNCTION
// ============================================================================

async function main() {
  try {
    // Load and validate environment configuration
    console.log('🔧 Loading environment configuration...\n');
    const config = loadEnvConfig();
    
    // Display configuration summary
    console.log('📋 Configuration Summary:');
    console.log(getConfigSummary(config));
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Check required variables
    const missing = checkRequiredVariables(config);
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(v => console.error(`   - ${v}`));
      console.error('\nPlease update your .env file and try again.');
      process.exit(1);
    }
    
    // Deploy based on mode
    switch (config.deployMode) {
      case 'single':
        await deploySingle(config);
        break;
      case 'multi-chain':
        await deployMultiChain(config);
        break;
      case 'batch':
        await deployBatch(config);
        break;
      case 'multi-wallet-batch':
        await deployMultiWalletBatch(config);
        break;
    }
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ============================================================================
// SINGLE TOKEN DEPLOYMENT
// ============================================================================

async function deploySingle(config: any) {
  console.log('🚀 Deploying Single Token\n');
  
  if (!config.privateKey) {
    throw new Error('Private key is required for single deployment');
  }
  
  const deployer = createDeployer(config.chainId || 8453, config.privateKey);
  
  const result = await deployer.deploy({
    name: config.tokenName || 'My Token',
    symbol: config.tokenSymbol || 'MTK',
    image: config.tokenImage,
    description: config.tokenDescription,
    tokenAdmin: config.tokenAdmin,
    rewardRecipients: config.rewardRecipient ? [{
      address: config.rewardRecipient,
      allocation: 100,
      rewardToken: config.rewardToken
    }] : undefined,
    fees: {
      type: config.feeType,
      clankerFee: config.clankerFee,
      pairedFee: config.pairedFee,
    },
    mev: config.mevBlockDelay,
    socials: {
      website: config.tokenWebsite,
      twitter: config.tokenTwitter,
      telegram: config.tokenTelegram,
      discord: config.tokenDiscord,
    },
    salt: config.vanitySuffix,
  });
  
  console.log(`✅ Token deployed at: ${result.tokenAddress}`);
}

// ============================================================================
// MULTI-CHAIN DEPLOYMENT
// ============================================================================

async function deployMultiChain(config: any) {
  console.log('🌐 Deploying to Multiple Chains\n');
  
  if (!config.privateKey || !config.chains) {
    throw new Error('Private key and chains are required for multi-chain deployment');
  }
  
  // Deploy to each chain sequentially
  const results = [];
  let successful = 0;
  
  for (const chainId of config.chains) {
    try {
      const deployer = createDeployer(chainId, config.privateKey);
      
      const result = await deployer.deploy({
        name: config.tokenName || 'Universal Token',
        symbol: config.tokenSymbol || 'UNI',
        image: config.tokenImage,
        description: config.tokenDescription,
        socials: {
          website: config.tokenWebsite,
          twitter: config.tokenTwitter,
          telegram: config.tokenTelegram,
          discord: config.tokenDiscord,
        },
      });
      
      results.push({ chain: chainId, success: true, tokenAddress: result.tokenAddress });
      successful++;
    } catch (error) {
      results.push({ chain: chainId, success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  console.log(`\n✅ Deployed to ${successful}/${config.chains.length} chains`);
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const addr = r.tokenAddress || r.error || 'Unknown';
    console.log(`  ${status} ${r.chain}: ${addr}`);
  });
}

// ============================================================================
// BATCH DEPLOYMENT
// ============================================================================

async function deployBatch(config: any) {
  console.log(`📦 Deploying Batch of ${config.batchCount} Tokens\n`);
  
  if (!config.privateKey) {
    throw new Error('Private key is required for batch deployment');
  }
  
  const deployer = createDeployer(config.chainId || 8453, config.privateKey);
  
  // Generate token configurations
  const tokenConfigs = Array.from({ length: config.batchCount || 5 }, (_, i) => ({
    name: `${config.tokenName || 'Token'} ${i + 1}`,
    symbol: `${config.tokenSymbol || 'TK'}${i + 1}`,
    description: config.tokenDescription,
    tokenAdmin: config.tokenAdmin,
    rewardRecipients: config.rewardRecipient ? [{
      address: config.rewardRecipient,
      allocation: 100,
      rewardToken: config.rewardToken
    }] : undefined,
    fees: {
      type: config.feeType,
      clankerFee: config.clankerFee,
      pairedFee: config.pairedFee,
    },
    mev: config.mevBlockDelay,
    socials: {
      website: config.tokenWebsite,
      twitter: config.tokenTwitter,
      telegram: config.tokenTelegram,
      discord: config.tokenDiscord,
    },
    salt: config.vanitySuffix,
  }));
  
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < tokenConfigs.length; i++) {
    const tokenConfig = tokenConfigs[i];
    
    try {
      console.log(`Deploying ${tokenConfig.name}...`);
      
      await deployer.deploy(tokenConfig);
      
      successful++;
      console.log(`✅ ${tokenConfig.name} deployed successfully`);
      
      // Add delay between deployments
      if (config.batchDelay && i < tokenConfigs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, config.batchDelay * 1000));
      }
    } catch (error) {
      failed++;
      console.error(`❌ Failed to deploy ${tokenConfig.name}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  console.log(`\n✅ Batch deployment completed`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
}

// ============================================================================
// MULTI-WALLET BATCH DEPLOYMENT
// ============================================================================

async function deployMultiWalletBatch(config: any) {
  console.log('👥 Deploying Multi-Wallet Batch\n');
  
  if (!config.deployerPrivateKeys || !config.farcasterInput) {
    throw new Error('Deployer private keys and farcaster input are required');
  }
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;
  
  const batchManager = new MultiWalletBatchManager(publicClient, base);
  
  // Create configuration from environment
  const batchConfig = {
    farcasterInput: config.farcasterInput,
    tokenConfigs: Array.from({ length: 10 }, (_, i) => ({
      name: `Batch Token ${i + 1}`,
      symbol: `BT${i + 1}`,
    })),
    deployerPrivateKeys: config.deployerPrivateKeys,
    maxAddressesPerDeployer: config.maxAddressesPerDeployer || 3,
    deployOptions: {
      maxConcurrentPerWallet: config.maxConcurrentPerWallet || 1,
      deployDelay: config.deployDelay || 1000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      gasMultiplier: config.gasMultiplier || 1.1,
      maxGasPrice: config.maxGasPrice,
      dryRun: config.dryRun || false,
    },
  };
  
  // Execute deployment with setup
  const { plan, isReady, walletStats } = await batchManager.setupBatchDeployer(batchConfig);
  
  if (!isReady) {
    console.error('❌ Setup failed');
    return;
  }
  
  console.log(`\n📊 Deployment Plan:`);
  console.log(`  Total tokens: ${plan.totalTokens}`);
  console.log(`  Deployer wallets: ${plan.deployerWallets.length}`);
  console.log(`  Tokens per wallet: ${plan.tokensPerWallet}`);
  console.log(`  Estimated cost: ${plan.estimatedCost.toFixed(4)} ETH`);
  console.log(`  Estimated time: ${plan.estimatedTime}s`);
  
  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No actual deployment');
    return;
  }
  
  const result = await batchManager.executeBatchDeployment(batchConfig, (progress) => {
    console.log(`Deploying ${progress.currentToken} with wallet ${progress.currentWallet}...`);
  });
  
  console.log(`\n✅ Multi-wallet batch deployment completed`);
  console.log(`Success rate: ${(result.successRate * 100).toFixed(2)}%`);
  console.log(`Total deployed: ${result.results.successful}`);
}

// ============================================================================
// RUN DEPLOYMENT
// ============================================================================

if (require.main === module) {
  main().catch(console.error);
}

export { main as deployFromEnv };
