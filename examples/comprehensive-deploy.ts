/**
 * Comprehensive Deployment Example
 * Demonstrates all deployment modes and features of the Clanker SDK v4.25
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { base, arbitrum, mainnet, unichain } from 'viem/chains';
import { 
  Clanker,
  MultiWalletBatchManager,
  createDeployer,
  quickDeploy,
  createBaseDeployer,
  createArbDeployer,
  createEthDeployer,
  createUnichainDeployer,
  CHAIN_IDS,
  getChainFeatures,
  hasMevProtection,
  hasDynamicFees,
} from '../src/index.js';
import { 
  loadEnvConfig as loadEnvConfigV2,
  getConfigSummary,
  checkRequiredVariables 
} from '../src/config/env-validator.js';

// ============================================================================
// SINGLE TOKEN DEPLOYMENT
// ============================================================================

async function deploySingleToken() {
  console.log('\n🚀 ===== SINGLE TOKEN DEPLOYMENT =====\n');
  
  try {
    // Quick deploy using environment variables
    const result = await quickDeploy({
      name: 'Example Token',
      symbol: 'EXMPL',
      description: 'An example token deployed with Clanker SDK',
      socials: {
        website: 'https://example.com',
        twitter: 'https://twitter.com/example',
        telegram: 'https://t.me/example',
      },
      fees: {
        type: 'static',
        clankerFee: 5,
        pairedFee: 5,
      },
      mev: 8, // MEV protection
    });
    
    console.log(`✅ Token deployed successfully!`);
    console.log(`   Address: ${result.tokenAddress}`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Explorer: ${result.explorerUrl}`);
    
    return result;
  } catch (error) {
    console.error('❌ Deployment failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ============================================================================
// SINGLE TOKEN DEPLOYMENT ON SPECIFIC CHAIN
// ============================================================================

async function deployOnChain(chainId: number, tokenName: string) {
  console.log(`\n📍 ===== DEPLOY ON CHAIN ${chainId} =====\n`);
  
  try {
    const deployer = createDeployer(chainId);
    const chainFeatures = getChainFeatures(chainId);
    
    console.log(`Chain Features:`);
    console.log(`   MEV Protection: ${chainFeatures.mevProtection ? '✅' : '❌'}`);
    console.log(`   Dynamic Fees: ${chainFeatures.dynamicFees ? '✅' : '❌'}`);
    
    const deployConfig: any = {
      name: tokenName,
      symbol: tokenName.substring(0, 3).toUpperCase(),
      description: `${tokenName} deployed on chain ${chainId}`,
    };
    
    // Only add MEV if supported
    if (chainFeatures.mevProtection) {
      deployConfig.mev = 8;
      console.log(`   Using MEV protection: 8 blocks`);
    }
    
    // Use dynamic fees if available
    if (chainFeatures.dynamicFees) {
      deployConfig.fees = {
        type: 'dynamic',
        baseFee: 1,
        maxLpFee: 5,
      };
      console.log(`   Using dynamic fees`);
    } else {
      deployConfig.fees = {
        type: 'static',
        clankerFee: 5,
        pairedFee: 5,
      };
      console.log(`   Using static fees`);
    }
    
    const result = await deployer.deploy(deployConfig);
    
    console.log(`\n✅ Token deployed on chain ${chainId}!`);
    console.log(`   Address: ${result.tokenAddress}`);
    console.log(`   TX Hash: ${result.txHash}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Deployment failed on chain ${chainId}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ============================================================================
// MULTI-CHAIN DEPLOYMENT
// ============================================================================

async function deployMultiChain() {
  console.log('\n🌐 ===== MULTI-CHAIN DEPLOYMENT =====\n');
  
  const chains = [
    { id: CHAIN_IDS.BASE, name: 'Base' },
    { id: CHAIN_IDS.ARBITRUM, name: 'Arbitrum' },
    { id: CHAIN_IDS.UNICHAIN, name: 'Unichain' },
  ];
  
  const results: Array<{
    chain: string;
    success: boolean;
    tokenAddress?: string;
    txHash?: string;
    error?: string;
  }> = [];
  
  for (const chain of chains) {
    try {
      console.log(`\n📍 Deploying to ${chain.name}...`);
      const result = await deployOnChain(chain.id, `MultiChain Token`);
      results.push({ 
        chain: chain.name, 
        tokenAddress: result.tokenAddress,
        txHash: result.txHash,
        success: true 
      });
    } catch (error) {
      results.push({ 
        chain: chain.name, 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  console.log('\n📊 Multi-Chain Deployment Summary:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const addr = r.success && r.tokenAddress ? r.tokenAddress : r.error || 'Unknown';
    console.log(`   ${status} ${r.chain}: ${addr}`);
  });
  
  return results;
}

// ============================================================================
// BATCH DEPLOYMENT
// ============================================================================

async function deployBatch() {
  console.log('\n📦 ===== BATCH DEPLOYMENT =====\n');
  
  const deployer = createBaseDeployer();
  
  // Generate 5 tokens with different configurations
  const tokens = [
    {
      name: 'Batch Token Alpha',
      symbol: 'BTA',
      description: 'First token in the batch',
      fees: { type: 'static' as const, clankerFee: 5, pairedFee: 5 },
    },
    {
      name: 'Batch Token Beta',
      symbol: 'BTB',
      description: 'Second token in the batch',
      fees: { type: 'static' as const, clankerFee: 3, pairedFee: 3 },
    },
    {
      name: 'Batch Token Gamma',
      symbol: 'BTG',
      description: 'Third token in the batch',
      fees: { type: 'dynamic' as const, baseFee: 1, maxLpFee: 5 },
    },
    {
      name: 'Batch Token Delta',
      symbol: 'BTD',
      description: 'Fourth token in the batch',
      fees: { type: 'static' as const, clankerFee: 7, pairedFee: 7 },
    },
    {
      name: 'Batch Token Epsilon',
      symbol: 'BTE',
      description: 'Fifth token in the batch',
      fees: { type: 'static' as const, clankerFee: 5, pairedFee: 5 },
    },
  ];
  
  const results = [];
  let successful = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    try {
      console.log(`\n📍 Deploying ${token.name}... (${i + 1}/${tokens.length})`);
      
      const result = await deployer.deploy({
        ...token,
        socials: {
          website: `https://${token.symbol.toLowerCase()}.com`,
          twitter: `https://twitter.com/${token.symbol.toLowerCase()}`,
        },
        mev: hasMevProtection(CHAIN_IDS.BASE) ? 8 : 0,
      });
      
      results.push({ token: token.name, ...result, success: true });
      successful++;
      
      console.log(`   ✅ ${token.name} deployed at ${result.tokenAddress}`);
      
      // Add delay between deployments
      if (i < tokens.length - 1) {
        console.log(`   ⏳ Waiting 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`   ❌ Failed to deploy ${token.name}:`, error instanceof Error ? error.message : String(error));
      results.push({ 
        token: token.name, 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  console.log(`\n📊 Batch Deployment Summary:`);
  console.log(`   Successful: ${successful}/${tokens.length}`);
  console.log(`   Failed: ${tokens.length - successful}/${tokens.length}`);
  
  return results;
}

// ============================================================================
// MULTI-WALLET BATCH DEPLOYMENT
// ============================================================================

async function deployMultiWalletBatch() {
  console.log('\n👥 ===== MULTI-WALLET BATCH DEPLOYMENT =====\n');
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;
  
  const batchManager = new MultiWalletBatchManager(publicClient, base);
  
  // Configuration for multi-wallet batch
  const batchConfig = {
    farcasterInput: 'vitalik', // Example Farcaster user
    tokenConfigs: Array.from({ length: 10 }, (_, i) => ({
      name: `Wallet Batch ${i + 1}`,
      symbol: `WB${i + 1}`,
      description: `Token ${i + 1} from wallet batch deployment`,
    })),
    deployerPrivateKeys: [
      // Add actual private keys here
      // '0x...',
    ],
    maxAddressesPerDeployer: 3,
    deployOptions: {
      maxConcurrentPerWallet: 1,
      deployDelay: 1000,
      maxRetries: 3,
      retryDelay: 1000,
      gasMultiplier: 1.1,
      dryRun: true, // Set to false for actual deployment
    },
  };
  
  try {
    console.log('🔍 Setting up batch deployment...');
    
    const { plan, isReady, walletStats } = await batchManager.setupBatchDeployer(batchConfig);
    
    if (!isReady) {
      console.error('❌ Setup failed');
      return null;
    }
    
    console.log('\n📊 Deployment Plan:');
    console.log(`   Total tokens: ${plan.totalTokens}`);
    console.log(`   Deployer wallets: ${plan.deployerWallets.length}`);
    console.log(`   Tokens per wallet: ${plan.tokensPerWallet}`);
    console.log(`   Estimated cost: ${plan.estimatedCost.toFixed(4)} ETH`);
    console.log(`   Estimated time: ${plan.estimatedTime}s`);
    
    if (batchConfig.deployOptions?.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No actual deployment');
      return { plan, dryRun: true };
    }
    
    console.log('\n🚀 Executing batch deployment...');
    
    const result = await batchManager.executeBatchDeployment(batchConfig, (progress) => {
      console.log(`   Deploying ${progress.currentToken} with wallet ${progress.currentWallet}...`);
    });
    
    console.log('\n✅ Multi-wallet batch deployment completed!');
    console.log(`   Success rate: ${(result.successRate * 100).toFixed(2)}%`);
    console.log(`   Total deployed: ${result.results.successful}`);
    
    return result;
  } catch (error) {
    console.error('❌ Multi-wallet batch deployment failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ============================================================================
// DEPLOYMENT WITH ENVIRONMENT CONFIGURATION
// ============================================================================

async function deployFromEnvironment() {
  console.log('\n⚙️ ===== DEPLOY FROM ENVIRONMENT =====\n');
  
  try {
    // Load configuration from .env
    const config = loadEnvConfigV2();
    
    // Display configuration summary
    console.log('📋 Configuration Summary:');
    console.log(getConfigSummary(config));
    
    // Check required variables
    const missing = checkRequiredVariables(config);
    if (missing.length > 0) {
      console.error('\n❌ Missing required environment variables:');
      missing.forEach(v => console.error(`   - ${v}`));
      return null;
    }
    
    // Deploy based on mode
    switch (config.deployMode) {
      case 'single':
        console.log('\n🚀 Deploying single token from environment...');
        return await deploySingleToken();
        
      case 'multi-chain':
        console.log('\n🌐 Deploying to multiple chains from environment...');
        return await deployMultiChain();
        
      case 'batch':
        console.log('\n📦 Deploying batch from environment...');
        return await deployBatch();
        
      case 'multi-wallet-batch':
        console.log('\n👥 Deploying multi-wallet batch from environment...');
        return await deployMultiWalletBatch();
        
      default:
        throw new Error(`Unknown deployment mode: ${config.deployMode}`);
    }
  } catch (error) {
    console.error('❌ Environment deployment failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ============================================================================
// MAIN DEMO FUNCTION
// ============================================================================

async function main() {
  console.log('🎯 ===== CLANKER SDK v4.25 COMPREHENSIVE DEMO =====\n');
  
  console.log('This demo showcases all deployment modes and features:');
  console.log('1. Single token deployment');
  console.log('2. Chain-specific deployment with feature detection');
  console.log('3. Multi-chain deployment');
  console.log('4. Batch deployment');
  console.log('5. Multi-wallet batch deployment');
  console.log('6. Environment-based deployment\n');
  
  // Run all demos
  const results = {
    single: null as any,
    chainSpecific: null as any,
    multiChain: null as any,
    batch: null as any,
    multiWallet: null as any,
    environment: null as any,
  };
  
  try {
    // 1. Single token deployment
    results.single = await deploySingleToken();
    
    // 2. Chain-specific deployment
    results.chainSpecific = await deployOnChain(CHAIN_IDS.BASE, 'Chain Specific Token');
    
    // 3. Multi-chain deployment
    results.multiChain = await deployMultiChain();
    
    // 4. Batch deployment
    results.batch = await deployBatch();
    
    // 5. Multi-wallet batch (dry run)
    results.multiWallet = await deployMultiWalletBatch();
    
    // 6. Environment-based deployment
    // Uncomment to test with your .env configuration
    // results.environment = await deployFromEnvironment();
    
    console.log('\n✅ ===== ALL DEMOS COMPLETED SUCCESSFULLY! =====\n');
    
    // Display summary
    console.log('📊 Demo Summary:');
    console.log(`   Single Token: ${results.single ? '✅' : '❌'}`);
    console.log(`   Chain Specific: ${results.chainSpecific ? '✅' : '❌'}`);
    console.log(`   Multi-Chain: ${results.multiChain ? '✅' : '❌'}`);
    console.log(`   Batch: ${results.batch ? '✅' : '❌'}`);
    console.log(`   Multi-Wallet: ${results.multiWallet ? '✅' : '❌'}`);
    console.log(`   Environment: ${results.environment ? '✅' : '⏭️ (Skipped)'}`);
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Display chain features for all supported chains
 */
function displayAllChainFeatures() {
  console.log('\n🔍 ===== CHAIN FEATURES OVERVIEW =====\n');
  
  const chains = [
    { id: CHAIN_IDS.ETHEREUM, name: 'Ethereum' },
    { id: CHAIN_IDS.BASE, name: 'Base' },
    { id: CHAIN_IDS.ARBITRUM, name: 'Arbitrum' },
    { id: CHAIN_IDS.UNICHAIN, name: 'Unichain' },
    { id: CHAIN_IDS.MONAD, name: 'Monad' },
  ];
  
  console.log('Chain Features:');
  console.log('┌─────────────┬──────────────┬──────────────┐');
  console.log('│ Chain       │ MEV Protect  │ Dynamic Fees │');
  console.log('├─────────────┼──────────────┼──────────────┤');
  
  chains.forEach(chain => {
    const mev = hasMevProtection(chain.id) ? '✅ Yes' : '❌ No ';
    const dynamic = hasDynamicFees(chain.id) ? '✅ Yes' : '❌ No ';
    console.log(`│ ${chain.name.padEnd(11)} │ ${mev.padEnd(12)} │ ${dynamic.padEnd(12)} │`);
  });
  
  console.log('└─────────────┴──────────────┴──────────────┘');
}

// Run demo if this file is executed directly
if (require.main === module) {
  displayAllChainFeatures();
  main().catch(console.error);
}

export { 
  main as comprehensiveDeploy,
  deploySingleToken,
  deployOnChain,
  deployMultiChain,
  deployBatch,
  deployMultiWalletBatch,
  deployFromEnvironment,
  displayAllChainFeatures,
};
