/**
 * Test Chain Configuration Loading
 * Verifies that all supported chains are properly configured
 */

import { 
  CHAIN_IDS, 
  getChain, 
  isChainSupported,
  getSupportedChainIds,
  getChainName,
  getRpcUrl,
  getExplorerUrl,
  getChainFeatures,
  hasMevProtection,
  hasDynamicFees
} from '../src/index.js';
import { 
  getDeployment,
  getContracts,
  isChainDeployed
} from '../src/contracts/addresses.js';
import { loadEnvConfig } from '../src/config/index.js';

// ============================================================================
// CHAIN CONFIGURATION TESTS
// ============================================================================

function testChainConfigurations() {
  console.log('🔍 Testing Chain Configurations\n');
  
  const supportedChains = getSupportedChainIds();
  console.log(`✅ Supported chains: ${supportedChains.join(', ')}`);
  
  // Test each supported chain
  for (const chainId of supportedChains) {
    const chainName = getChainName(chainId);
    const chain = getChain(chainId);
    const explorerUrl = getExplorerUrl(chainId);
    const rpcUrl = getRpcUrl(chainId);
    const deployment = getDeployment(chainId);
    const contracts = getContracts(chainId);
    const isSupported = isChainSupported(chainId);
    const isDeployed = isChainDeployed(chainId);
    
    console.log(`\n📊 ${chainName} (Chain ID: ${chainId})`);
    console.log(`   Chain object: ${chain ? '✅' : '❌'}`);
    console.log(`   Explorer URL: ${explorerUrl || '❌'}`);
    console.log(`   RPC URL: ${rpcUrl || '❌'}`);
    console.log(`   Is supported: ${isSupported ? '✅' : '❌'}`);
    console.log(`   Is deployed: ${isDeployed ? '✅' : '❌'}`);
    
    if (deployment) {
      console.log(`   Contract addresses:`);
      console.log(`     Factory: ${deployment.contracts.factory}`);
      console.log(`     Locker: ${deployment.contracts.locker}`);
      console.log(`     Vault: ${deployment.contracts.vault}`);
      console.log(`     MEV Module: ${deployment.contracts.mevModule}`);
      console.log(`     Fee Dynamic Hook: ${deployment.contracts.feeDynamicHook}`);
    }
  }
}

// ============================================================================
// ENVIRONMENT CONFIGURATION TESTS
// ============================================================================

function testEnvironmentConfiguration() {
  console.log('\n\n🔧 Testing Environment Configuration\n');
  
  try {
    // Test loading config from environment
    const config = loadEnvConfig();
    console.log(`✅ Environment config loaded`);
    console.log(`   Chain ID: ${config.chainId}`);
    console.log(`   Chain name: ${getChainName(config.chainId)}`);
    console.log(`   RPC URL: ${getRpcUrl(config.chainId, config.rpcUrl)}`);
    console.log(`   Explorer URL: ${getExplorerUrl(config.chainId)}`);
    
    // Check if chain is deployed
    if (isChainDeployed(config.chainId)) {
      console.log(`   Chain deployment: ✅`);
      const contracts = getContracts(config.chainId);
      if (contracts) {
        console.log(`   Factory address: ${contracts.factory}`);
      }
    } else {
      console.log(`   Chain deployment: ❌`);
    }
  } catch (error) {
    console.error(`❌ Environment config failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// MULTI-CHAIN CONFIGURATION TESTS
// ============================================================================

function testMultiChainConfiguration() {
  console.log('\n\n🌐 Testing Multi-Chain Configuration\n');
  
  // Test all chain IDs
  console.log('Chain ID constants:');
  console.log(`  CHAIN_IDS.BASE: ${CHAIN_IDS.BASE}`);
  console.log(`  CHAIN_IDS.ETHEREUM: ${CHAIN_IDS.ETHEREUM}`);
  console.log(`  CHAIN_IDS.ARBITRUM: ${CHAIN_IDS.ARBITRUM}`);
  console.log(`  CHAIN_IDS.UNICHAIN: ${CHAIN_IDS.UNICHAIN}`);
  console.log(`  CHAIN_IDS.MONAD: ${CHAIN_IDS.MONAD}`);
  
  // Test chain validation
  const testChains = [1, 8453, 42161, 130, 10143, 999];
  console.log('\nChain validation:');
  for (const chainId of testChains) {
    const supported = isChainSupported(chainId);
    const deployed = isChainDeployed(chainId);
    console.log(`  Chain ${chainId}: ${supported ? '✅ Supported' : '❌ Not supported'}, ${deployed ? '✅ Deployed' : '❌ Not deployed'}`);
  }
}

// ============================================================================
// RPC URL FALLBACK TESTS
// ============================================================================

function testRpcUrlFallbacks() {
  console.log('\n\n🔗 Testing RPC URL Fallbacks\n');
  
  // Test each chain's RPC URL
  const chains = [
    { id: CHAIN_IDS.BASE, name: 'Base' },
    { id: CHAIN_IDS.ETHEREUM, name: 'Ethereum' },
    { id: CHAIN_IDS.ARBITRUM, name: 'Arbitrum' },
    { id: CHAIN_IDS.UNICHAIN, name: 'Unichain' },
    { id: CHAIN_IDS.MONAD, name: 'Monad' }
  ];
  
  for (const chain of chains) {
    const publicRpc = getRpcUrl(chain.id);
    console.log(`${chain.name}: ${publicRpc}`);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log('🚀 Chain Configuration Test Suite\n');
  console.log('=' .repeat(50));
  
  testChainConfigurations();
  testEnvironmentConfiguration();
  testMultiChainConfiguration();
  testRpcUrlFallbacks();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as testChainConfig };
