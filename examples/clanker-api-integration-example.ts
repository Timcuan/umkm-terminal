/**
 * Clanker API Integration Example
 * 
 * This example demonstrates how to use the enhanced Clanker SDK with API integration
 * while maintaining backward compatibility with existing code.
 */

import { Clanker, type ClankerTokenV4, type OperationMethod } from '../src/v4/index.js';
import { 
  EnhancedClanker, 
  UnifiedExecutor,
  createEnhancedClanker,
  createUnifiedExecutor,
} from '../src/clanker-api/index.js';

// ============================================================================
// Example Token Configuration
// ============================================================================

const exampleToken: ClankerTokenV4 = {
  name: 'API Integration Test Token',
  symbol: 'AITT',
  image: 'https://example.com/token.png',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453, // Base
  metadata: {
    description: 'A test token for demonstrating API integration',
    socials: {
      twitter: '@testtoken',
      website: 'https://testtoken.example.com',
    },
  },
};

// ============================================================================
// Example 1: Backward Compatible Usage (No Changes Required)
// ============================================================================

async function backwardCompatibleExample() {
  console.log('=== Backward Compatible Example ===');
  
  // This code works exactly as before - no changes needed
  const clanker = new Clanker({
    // wallet: walletClient,      // Would be provided in real usage
    // publicClient: publicClient, // Would be provided in real usage
  });

  try {
    // Validate token configuration
    const validation = await clanker.validateTokenConfig(exampleToken);
    console.log('Token validation:', validation);

    // Test connection
    const connection = await clanker.testConnection();
    console.log('Connection test:', connection);

    // Get available methods
    const methods = clanker.getAvailableMethods();
    console.log('Available methods:', methods);

    // Get supported chains
    const chains = clanker.getSupportedChains();
    console.log('Supported chains:', chains);

    console.log('✓ Backward compatible example completed successfully');
  } catch (error) {
    console.log('Expected error (no wallet configured):', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 2: API Integration Usage
// ============================================================================

async function apiIntegrationExample() {
  console.log('\n=== API Integration Example ===');
  
  // Enhanced Clanker with API support
  const clanker = new Clanker({
    // Traditional configuration still works
    // wallet: walletClient,
    // publicClient: publicClient,
    
    // New API configuration
    api: {
      apiKey: 'demo-api-key-for-testing-purposes-only',
      baseUrl: 'https://api.clanker.example.com',
      timeout: 30000,
      retries: 3,
    },
    operationMethod: 'auto', // Uses API when available, falls back to direct
  });

  try {
    // Same methods as before, but now with API support
    const validation = await clanker.validateTokenConfig(exampleToken);
    console.log('Token validation with API:', validation);

    // Test connection (will test API connectivity)
    const connection = await clanker.testConnection();
    console.log('API connection test:', connection);

    // Get available methods (should include 'api' and 'auto')
    const methods = clanker.getAvailableMethods();
    console.log('Available methods with API:', methods);

    // Check if API integration is enabled
    console.log('API integration enabled:', clanker.isAPIIntegrationEnabled());

    console.log('✓ API integration example completed successfully');
  } catch (error) {
    console.log('Expected error (demo API key):', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 3: Enhanced Clanker Usage
// ============================================================================

async function enhancedClankerExample() {
  console.log('\n=== Enhanced Clanker Example ===');
  
  const enhancedClanker = createEnhancedClanker({
    operationMethod: 'auto',
    api: {
      apiKey: 'demo-api-key-for-testing-purposes-only',
    },
  });

  try {
    // Enhanced features
    const config = enhancedClanker.getConfig();
    console.log('Enhanced config:', {
      operationMethod: config.operationMethod,
      hasApiKey: config.hasApiKey,
      availableMethods: config.availableMethods,
    });

    // Method selection context
    const context = enhancedClanker.getMethodSelectionContext('deploy');
    console.log('Method selection context:', context);

    // Validate token with specific method
    const validation = await enhancedClanker.validateTokenConfig(exampleToken, 'api');
    console.log('Enhanced validation:', validation);

    console.log('✓ Enhanced Clanker example completed successfully');
  } catch (error) {
    console.log('Expected error (demo API key):', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 4: Unified Executor Usage
// ============================================================================

async function unifiedExecutorExample() {
  console.log('\n=== Unified Executor Example ===');
  
  const executor = createUnifiedExecutor({
    operationMethod: 'auto',
    api: {
      apiKey: 'demo-api-key-for-testing-purposes-only',
    },
  });

  try {
    // Get method selection context
    const context = executor.getMethodSelectionContext('deploy');
    console.log('Executor context:', context);

    // Get supported chains with method breakdown
    const chains = executor.getSupportedChains();
    console.log('Chain support breakdown:', {
      apiOnly: chains.api.length,
      directOnly: chains.direct.length,
      both: chains.both.length,
    });

    // Get chain-specific information
    const baseInfo = executor.getChainInfo(8453); // Base
    console.log('Base chain info:', baseInfo);

    // Validate token configuration
    const validation = await executor.validateTokenConfig(exampleToken);
    console.log('Executor validation:', validation);

    console.log('✓ Unified Executor example completed successfully');
  } catch (error) {
    console.log('Expected error (demo API key):', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 5: Batch Deployment
// ============================================================================

async function batchDeploymentExample() {
  console.log('\n=== Batch Deployment Example ===');
  
  const clanker = new Clanker({
    operationMethod: 'auto',
    api: {
      apiKey: 'demo-api-key-for-testing-purposes-only',
    },
  });

  const tokens: ClankerTokenV4[] = [
    {
      ...exampleToken,
      name: 'Batch Token 1',
      symbol: 'BATCH1',
    },
    {
      ...exampleToken,
      name: 'Batch Token 2',
      symbol: 'BATCH2',
      chainId: 1, // Ethereum
    },
    {
      ...exampleToken,
      name: 'Batch Token 3',
      symbol: 'BATCH3',
      chainId: 42161, // Arbitrum
    },
  ];

  try {
    // Batch deployment with automatic method selection
    const batchResult = await clanker.batchDeploy(tokens);
    console.log('Batch deployment result:', {
      method: batchResult.method,
      totalTokens: batchResult.results.length,
      successful: batchResult.results.filter(r => r.success).length,
      failed: batchResult.results.filter(r => !r.success).length,
      chainSummary: batchResult.chainSummary,
    });

    console.log('✓ Batch deployment example completed successfully');
  } catch (error) {
    console.log('Expected error (demo tokens):', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 6: Method Override
// ============================================================================

async function methodOverrideExample() {
  console.log('\n=== Method Override Example ===');
  
  const clanker = new Clanker({
    operationMethod: 'auto', // Default to auto
    api: {
      apiKey: 'demo-api-key-for-testing-purposes-only',
    },
  });

  try {
    // Force direct method
    const directValidation = await clanker.validateTokenConfig(exampleToken, 'direct');
    console.log('Direct method validation:', directValidation);

    // Force API method
    const apiValidation = await clanker.validateTokenConfig(exampleToken, 'api');
    console.log('API method validation:', apiValidation);

    // Use auto method (default behavior)
    const autoValidation = await clanker.validateTokenConfig(exampleToken, 'auto');
    console.log('Auto method validation:', autoValidation);

    console.log('✓ Method override example completed successfully');
  } catch (error) {
    console.log('Expected error (method override):', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 7: Configuration Updates
// ============================================================================

async function configurationUpdateExample() {
  console.log('\n=== Configuration Update Example ===');
  
  const clanker = new Clanker({
    operationMethod: 'direct',
  });

  try {
    console.log('Initial methods:', clanker.getAvailableMethods());
    console.log('Initial API integration:', clanker.isAPIIntegrationEnabled());

    // Update configuration to add API support
    clanker.updateConfig({
      api: {
        apiKey: 'demo-api-key-for-testing-purposes-only',
      },
      operationMethod: 'auto',
    });

    console.log('Updated methods:', clanker.getAvailableMethods());
    console.log('Updated API integration:', clanker.isAPIIntegrationEnabled());

    console.log('✓ Configuration update example completed successfully');
  } catch (error) {
    console.log('Expected error (config update):', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('🚀 Clanker API Integration Examples\n');
  
  try {
    await backwardCompatibleExample();
    await apiIntegrationExample();
    await enhancedClankerExample();
    await unifiedExecutorExample();
    await batchDeploymentExample();
    await methodOverrideExample();
    await configurationUpdateExample();
    
    console.log('\n✅ All examples completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('• Backward compatibility with existing code');
    console.log('• API integration with automatic fallback');
    console.log('• Method selection (direct, api, auto)');
    console.log('• Enhanced validation and error handling');
    console.log('• Batch deployment capabilities');
    console.log('• Multi-chain support');
    console.log('• Runtime configuration updates');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  backwardCompatibleExample,
  apiIntegrationExample,
  enhancedClankerExample,
  unifiedExecutorExample,
  batchDeploymentExample,
  methodOverrideExample,
  configurationUpdateExample,
  runAllExamples,
};