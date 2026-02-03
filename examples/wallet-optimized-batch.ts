/**
 * Optimized Multi-Wallet Batch Deployment with Enhanced Wallet Management
 * Demonstrates secure wallet handling and optimization features
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { MultiWalletBatchManager } from '../src/batch/multi-wallet-batch.js';
import { BatchDeployConfigBuilder } from '../src/config/batch.js';
import { 
  getAllWallets,
  decryptWallet,
  mnemonicToPrivateKey,
  generateMnemonicPhrase,
  validateMnemonicPhrase
} from '../src/wallet/index.js';

// Example 1: Load wallets from encrypted store
async function deployFromWalletStore() {
  console.log('=== Deploying from Encrypted Wallet Store ===\n');
  
  try {
    // Get wallet password from user (in production, use secure input)
    const walletPassword = process.env.WALLET_PASSWORD || 'your-secure-password';
    
    // Load configuration from wallet store
    const config = await MultiWalletBatchManager.createFromWalletStore(
      [
        { name: 'Token A', symbol: 'TKA' },
        { name: 'Token B', symbol: 'TKB' },
        { name: 'Token C', symbol: 'TKC' },
        { name: 'Token D', symbol: 'TKD' },
        { name: 'Token E', symbol: 'TKE' },
      ],
      walletPassword,
      5 // Use first 5 wallets from store
    );
    
    // Create batch manager
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    }) as PublicClient;
    
    const batchManager = new MultiWalletBatchManager(publicClient, base);
    
    // Setup and deploy
    const { plan, isReady, walletStats } = await batchManager.setupBatchDeployer(config);
    
    if (!isReady) {
      console.error('Setup failed');
      return;
    }
    
    console.log(`\n✅ Ready to deploy ${plan.totalTokens} tokens using ${plan.deployerWallets.length} wallets`);
    console.log(`📊 Wallet distribution:`);
    plan.addressDistribution.forEach((addresses, deployer) => {
      console.log(`  ${deployer}: ${addresses.length} addresses`);
    });
    
  } catch (error) {
    console.error('Deployment failed:', error instanceof Error ? error.message : String(error));
  }
}

// Example 2: Generate and use HD wallets from mnemonic
async function deployWithHDWallet() {
  console.log('\n=== Deploying with HD Wallet from Mnemonic ===\n');
  
  try {
    // Generate new mnemonic or use existing
    const mnemonic = process.env.MNEMONIC || generateMnemonicPhrase();
    
    if (!validateMnemonicPhrase(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    
    console.log(`📝 Mnemonic: ${mnemonic}`);
    console.log('⚠️  Save this mnemonic securely!\n');
    
    // Derive multiple wallets from mnemonic
    const deployerPrivateKeys: `0x${string}`[] = [];
    for (let i = 0; i < 5; i++) {
      const privateKey = mnemonicToPrivateKey(mnemonic, i);
      if (privateKey) {
        deployerPrivateKeys.push(privateKey as `0x${string}`);
      }
    }
    
    // Create optimized configuration
    const config = new BatchDeployConfigBuilder()
      .farcasterInput('vitalik')
      .deployerPrivateKeys(deployerPrivateKeys.join(','))
      .strategy('balanced')
      .maxAddressesPerDeployer(3)
      .deployDelay(2000) // 2 seconds between deploys
      .build();
    
    // Display configuration
    console.log('🔧 Configuration:');
    console.log(`  Deployer wallets: ${deployerPrivateKeys.length}`);
    console.log(`  Max addresses per deployer: ${config.maxAddressesPerDeployer}`);
    console.log(`  Deploy delay: ${config.deployDelay}ms`);
    console.log(`  Rate limit: ${config.rateLimitPerWallet} req/s`);
    
    // Create deployment plan
    const publicClient = createPublicClient({ chain: base, transport: http() }) as PublicClient;
    const batchManager = new MultiWalletBatchManager(publicClient, base);
    
    const plan = await batchManager.createDeploymentPlan(
      config.farcasterInput,
      Array.from({ length: 15 }, (_, i) => ({
        name: `HD Token ${i + 1}`,
        symbol: `HDT${i + 1}`,
      })),
      deployerPrivateKeys,
      config.maxAddressesPerDeployer
    );
    
    batchManager.displayDistributionPlan(plan);
    
  } catch (error) {
    console.error('HD wallet deployment failed:', error instanceof Error ? error.message : String(error));
  }
}

// Example 3: Wallet health check and optimization
async function walletHealthCheck() {
  console.log('\n=== Wallet Health Check ===\n');
  
  try {
    // Get all wallets from store
    const wallets = getAllWallets();
    
    if (!wallets.length) {
      console.log('No wallets found in store');
      return;
    }
    
    console.log(`Found ${wallets.length} wallets in store\n`);
    
    // Check each wallet
    const publicClient = createPublicClient({ chain: base, transport: http() }) as PublicClient;
    
    for (const wallet of wallets.slice(0, 5)) { // Check first 5 wallets
      try {
        // Decrypt wallet (simplified)
        if (wallet.address) {
          const balance = await publicClient.getBalance({ 
            address: wallet.address as `0x${string}` 
          });
          const ethBalance = Number(balance) / 1e18;
          
          const nonce = await publicClient.getTransactionCount({ 
            address: wallet.address as `0x${string}` 
          });
          
          console.log(`Wallet: ${wallet.name} (${wallet.address})`);
          console.log(`  Balance: ${ethBalance.toFixed(4)} ETH`);
          console.log(`  Nonce: ${nonce}`);
          console.log(`  Status: ${ethBalance > 0.01 ? '✅ Healthy' : '⚠️  Low balance'}`);
          console.log();
        }
      } catch (error) {
        console.log(`Wallet: ${wallet.name} - ❌ Error checking health`);
      }
    }
    
    // Optimization suggestions
    console.log('💡 Optimization Suggestions:');
    console.log('  1. Top up wallets with < 0.01 ETH');
    console.log('  2. Use HD wallets for better organization');
    console.log('  3. Enable encrypted storage for security');
    console.log('  4. Set appropriate rate limits to avoid RPC throttling');
    
  } catch (error) {
    console.error('Health check failed:', error instanceof Error ? error.message : String(error));
  }
}

// Example 4: Batch deployment with wallet rotation
async function deployWithWalletRotation() {
  console.log('\n=== Deploying with Wallet Rotation ===\n');
  
  try {
    // Configuration for wallet rotation strategy
    const config = new BatchDeployConfigBuilder()
      .farcasterInput('dwr')
      .deployerPrivateKeys(
        '0x0000000000000000000000000000000000000000000000000000000000000001,' +
        '0x0000000000000000000000000000000000000000000000000000000000000002,' +
        '0x0000000000000000000000000000000000000000000000000000000000000003'
      )
      .strategy('aggressive')
      .maxAddressesPerDeployer(2) // Rotate more frequently
      .maxConcurrentPerWallet(2) // Parallel per wallet
      .deployDelay(500) // Fast deployment
      .rateLimitPerWallet(3) // Higher rate limit
      .build();
    
    console.log('🔄 Wallet Rotation Strategy:');
    console.log(`  Addresses per wallet: ${config.maxAddressesPerDeployer}`);
    console.log(`  Concurrent per wallet: ${config.maxConcurrentPerWallet}`);
    console.log(`  Deploy delay: ${config.deployDelay}ms`);
    console.log(`  Rate limit: ${config.rateLimitPerWallet} req/s`);
    
    // Create large batch to demonstrate rotation
    const tokenConfigs = Array.from({ length: 20 }, (_, i) => ({
      name: `Rotate Token ${i + 1}`,
      symbol: `ROT${i + 1}`,
    }));
    
    const publicClient = createPublicClient({ chain: base, transport: http() }) as PublicClient;
    const batchManager = new MultiWalletBatchManager(publicClient, base);
    
    const plan = await batchManager.createDeploymentPlan(
      config.farcasterInput,
      tokenConfigs,
      config.deployerPrivateKeys,
      config.maxAddressesPerDeployer
    );
    
    console.log(`\n📊 Deployment Plan:`);
    console.log(`  Total tokens: ${plan.totalTokens}`);
    console.log(`  Deployer wallets: ${plan.deployerWallets.length}`);
    console.log(`  Tokens per wallet: ${plan.tokensPerWallet}`);
    console.log(`  Estimated cost: ${plan.estimatedCost.toFixed(4)} ETH`);
    console.log(`  Estimated time: ${plan.estimatedTime}s`);
    
  } catch (error) {
    console.error('Wallet rotation failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run examples
async function main() {
  console.log('🚀 Optimized Multi-Wallet Batch Deployment Examples\n');
  
  await walletHealthCheck();
  await deployWithHDWallet();
  await deployWithWalletRotation();
  
  console.log('\n=== To use wallet store deployment ===');
  console.log('1. Add wallets to the wallet store');
  console.log('2. Set WALLET_PASSWORD environment variable');
  console.log('3. Run: deployFromWalletStore()');
}

if (require.main === module) {
  main().catch(console.error);
}

export { 
  deployFromWalletStore,
  deployWithHDWallet,
  walletHealthCheck,
  deployWithWalletRotation
};
