/**
 * Advanced API Integration Example
 * 
 * This example demonstrates advanced features like method selection,
 * multi-chain deployment, batch operations, and error handling.
 */

import { 
  Clanker,
  EnhancedClanker,
  UnifiedExecutor,
  createEnhancedClanker,
  createUnifiedExecutor,
} from '../src/index.js';
import type { ClankerTokenV4, OperationMethod } from '../src/types/index.js';

// Advanced token configurations for different chains
const multiChainTokens: ClankerTokenV4[] = [
  {
    name: 'Base Network Token',
    symbol: 'BASE',
    image: 'https://example.com/base-token.png',
    tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
    chainId: 8453, // Base
    metadata: {
      description: 'Token optimized for Base network',
      socials: {
        twitter: '@basetoken',
        website: 'https://base-token.example.com',
      },
    },
  },
  {
    name: 'Arbitrum Token',
    symbol: 'ARB',
    image: 'https://example.com/arb-token.png',
    tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
    chainId: 42161, // Arbitrum
    metadata: {
      description: 'Token for Arbitrum ecosystem',
      socials: {
        telegram: '@arbtoken',
        website: 'https://arb-token.example.com',
      },
    },
  },
  {
    name: 'Ethereum Mainnet Token',
    symbol: 'ETH',
    image: 'https://example.com/eth-token.png',
    tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
    chainId: 1, // Ethereum
    metadata: {
      description: 'Premium token for Ethereum mainnet',
      socials: {
        discord: 'https://discord.gg/ethtoken',
        website: 'https://eth-token.example.com',
      },
    },
  },
];

async function advancedAPIExample() {
  console.log('🚀 Advanced API Integration Example\n');

  // Example 1: Enhanced Clanker with detailed configuration
  console.log('1️⃣ Enhanced Clanker Configuration');
  const enhanced = createEnhancedClanker({
    operationMethod: 'auto',
    api: {
      apiKey: process.env.CLANKER_API_KEY || 'demo-key-for-testing',
      baseUrl: process.env.CLANKER_API_BASE_URL || 'https://api.clanker.world',
      timeout: 30000,
      retries: 3,
    },
  });

  // Get detailed configuration information
  const config = enhanced.getConfig();
  console.log('Configuration:', {
    operationMethod: config.operationMethod,
    hasApiKey: config.hasApiKey,
    availableMethods: config.availableMethods,
  });

  // Example 2: Chain Support Analysis
  console.log('\n2️⃣ Multi-Chain Support Analysis');
  const chains = enhanced.getSupportedChains();
  console.log('Chain support breakdown:');
  console.log(`  API-only chains: ${chains.api.length}`);
  console.log(`  Direct-only chains: ${chains.direct.length}`);
  console.log(`  Both methods: ${chains.both.length}`);

  // Analyze specific chains
  const chainAnalysis = [8453, 42161, 1].map(chainId => {
    const info = enhanced.getChainInfo ? enhanced.getChainInfo(chainId) : null;
    return {
      chainId,
      name: chainId === 8453 ? 'Base' : chainId === 42161 ? 'Arbitrum' : 'Ethereum',
      supported: info?.supported || false,
      recommendedMethod: info?.recommendedMethod || 'direct',
      methods: info?.methods || ['direct'],
    };
  });

  console.log('\nChain-specific analysis:');
  chainAnalysis.forEach(chain => {
    console.log(`  ${chain.name} (${chain.chainId}):`);
    console.log(`    Supported: ${chain.supported}`);
    console.log(`    Recommended: ${chain.recommendedMethod}`);
    console.log(`    Available: [${chain.methods.join(', ')}]`);
  });

  // Example 3: Method Selection Testing
  console.log('\n3️⃣ Method Selection Testing');
  const methods: OperationMethod[] = ['direct', 'api', 'auto'];
  
  for (const method of methods) {
    try {
      const connection = await enhanced.testConnection(method);
      console.log(`${method.toUpperCase()} method:`, {
        connected: connection.connected,
        authenticated: connection.authenticated,
        latency: connection.latency ? `${connection.latency}ms` : 'N/A',
      });
    } catch (error) {
      console.log(`${method.toUpperCase()} method: Not available`);
    }
  }

  // Example 4: Batch Deployment with Error Handling
  console.log('\n4️⃣ Batch Deployment Simulation');
  try {
    // Validate all tokens first
    console.log('Validating tokens...');
    const validations = await Promise.all(
      multiChainTokens.map(async (token, index) => {
        const validation = await enhanced.validateTokenConfig(token);
        console.log(`  Token ${index + 1} (${token.symbol}): ${validation.valid ? '✓' : '❌'}`);
        if (!validation.valid) {
          validation.errors.forEach(error => console.log(`    Error: ${error}`));
        }
        return { token, validation };
      })
    );

    const validTokens = validations
      .filter(v => v.validation.valid)
      .map(v => v.token);

    if (validTokens.length === 0) {
      console.log('❌ No valid tokens for deployment');
      return;
    }

    console.log(`\nProceeding with ${validTokens.length} valid tokens...`);
    console.log('(Batch deployment skipped in demo)');

    /*
    // Actual batch deployment would be:
    const batchResult = await enhanced.batchDeploy(validTokens, 'auto');
    
    console.log('Batch deployment results:');
    console.log(`  Method used: ${batchResult.method}`);
    console.log(`  Total tokens: ${batchResult.results.length}`);
    console.log(`  Successful: ${batchResult.results.filter(r => r.success).length}`);
    console.log(`  Failed: ${batchResult.results.filter(r => !r.success).length}`);

    // Chain-specific results
    Object.entries(batchResult.chainSummary).forEach(([chainId, summary]) => {
      const chainName = chainId === '8453' ? 'Base' : 
                       chainId === '42161' ? 'Arbitrum' : 
                       chainId === '1' ? 'Ethereum' : `Chain ${chainId}`;
      console.log(`  ${chainName}: ${summary.successful}/${summary.total} successful`);
    });
    */

  } catch (error) {
    console.error('Batch deployment error:', error instanceof Error ? error.message : error);
  }

  // Example 5: Unified Executor Advanced Features
  console.log('\n5️⃣ Unified Executor Advanced Features');
  const executor = createUnifiedExecutor({
    operationMethod: 'auto',
    api: {
      apiKey: process.env.CLANKER_API_KEY || 'demo-key-for-testing',
    },
  });

  // Method selection context for debugging
  const context = executor.getMethodSelectionContext('deploy');
  console.log('Method selection context:', {
    operationType: context.operationType,
    hasApiKey: context.hasApiKey,
    hasWallet: context.hasWallet,
    chainSupported: context.chainSupported,
    userPreference: context.userPreference,
  });

  // Example 6: Configuration Updates
  console.log('\n6️⃣ Runtime Configuration Updates');
  const clanker = new Clanker({
    operationMethod: 'direct',
  });

  console.log('Initial methods:', clanker.getAvailableMethods());
  console.log('Initial API integration:', clanker.isAPIIntegrationEnabled());

  // Update configuration to add API support
  clanker.updateConfig({
    api: {
      apiKey: process.env.CLANKER_API_KEY || 'demo-key-for-testing',
    },
    operationMethod: 'auto',
  });

  console.log('Updated methods:', clanker.getAvailableMethods());
  console.log('Updated API integration:', clanker.isAPIIntegrationEnabled());

  // Example 7: Error Handling Patterns
  console.log('\n7️⃣ Error Handling Patterns');
  
  const testToken: ClankerTokenV4 = {
    name: '', // Invalid: empty name
    symbol: 'TEST',
    image: 'invalid-url', // Invalid URL
    tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
    chainId: 999999, // Unsupported chain
  };

  try {
    await enhanced.validateTokenConfig(testToken);
  } catch (error) {
    console.log('Expected validation error caught:');
    if (error && typeof error === 'object' && 'code' in error) {
      console.log(`  Code: ${error.code}`);
      console.log(`  Message: ${error.message}`);
    }
  }

  console.log('\n✅ Advanced API integration example completed!');
  console.log('\nKey features demonstrated:');
  console.log('• Enhanced configuration and debugging');
  console.log('• Multi-chain support analysis');
  console.log('• Method selection testing');
  console.log('• Batch deployment validation');
  console.log('• Runtime configuration updates');
  console.log('• Comprehensive error handling');
}

// Export for use in other examples
export { advancedAPIExample, multiChainTokens };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  advancedAPIExample();
}