/**
 * Basic API Integration Example
 * 
 * This example shows the simplest way to add API integration to existing code.
 */

import { Clanker } from '../src/v4/index.js';
import type { ClankerTokenV4 } from '../src/types/index.js';

// Example token configuration
const tokenConfig: ClankerTokenV4 = {
  name: 'Basic API Token',
  symbol: 'BASIC',
  image: 'https://example.com/basic-token.png',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453, // Base
  metadata: {
    description: 'A simple token deployed via API integration',
    socials: {
      website: 'https://basic-token.example.com',
    },
  },
};

async function basicAPIExample() {
  console.log('🚀 Basic API Integration Example\n');

  // Step 1: Create Clanker instance with API support
  const clanker = new Clanker({
    // Add API configuration to existing setup
    api: {
      apiKey: process.env.CLANKER_API_KEY || 'demo-key-for-testing',
      timeout: 30000,
      retries: 3,
    },
    operationMethod: 'auto', // Use API when available, fallback to direct
  });

  try {
    // Step 2: Check what methods are available
    const availableMethods = clanker.getAvailableMethods();
    console.log('Available methods:', availableMethods);
    console.log('API integration enabled:', clanker.isAPIIntegrationEnabled());

    // Step 3: Test connectivity
    console.log('\n📡 Testing connectivity...');
    const connection = await clanker.testConnection();
    console.log(`${connection.method} method:`, {
      connected: connection.connected,
      authenticated: connection.authenticated,
      latency: connection.latency ? `${connection.latency}ms` : 'N/A',
    });

    // Step 4: Validate token configuration
    console.log('\n✅ Validating token configuration...');
    const validation = await clanker.validateTokenConfig(tokenConfig);
    
    if (validation.valid) {
      console.log('✓ Token configuration is valid');
      if (validation.estimatedGas) {
        console.log(`  Estimated gas: ${validation.estimatedGas}`);
      }
      if (validation.estimatedCost) {
        console.log(`  Estimated cost: ${validation.estimatedCost} ETH`);
      }
    } else {
      console.log('❌ Token configuration has errors:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Step 5: Deploy token (commented out for demo)
    console.log('\n🚀 Deploying token...');
    console.log('(Deployment skipped in demo - would deploy with auto method selection)');
    
    /*
    const result = await clanker.deploy(tokenConfig);
    console.log('✓ Token deployed successfully!');
    console.log(`  Transaction hash: ${result.txHash}`);
    console.log(`  Chain ID: ${result.chainId}`);
    
    const receipt = await result.waitForTransaction();
    console.log(`  Token address: ${receipt.address}`);
    */

    console.log('\n✅ Basic API integration example completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    
    // Show how to handle specific error types
    if (error && typeof error === 'object' && 'code' in error) {
      console.log(`Error code: ${error.code}`);
      
      switch (error.code) {
        case 'API_AUTHENTICATION_FAILED':
          console.log('💡 Tip: Check your API key configuration');
          break;
        case 'NETWORK_ERROR':
          console.log('💡 Tip: Check your internet connection');
          break;
        case 'VALIDATION_ERROR':
          console.log('💡 Tip: Review your token configuration');
          break;
        default:
          console.log('💡 Tip: Check the error details above');
      }
    }
  }
}

// Export for use in other examples
export { basicAPIExample, tokenConfig };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicAPIExample();
}