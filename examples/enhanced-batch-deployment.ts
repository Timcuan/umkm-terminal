/**
 * Enhanced Batch Deployment Example
 * Demonstrates advanced batch coordination with partial failure recovery
 */

import { 
  createUnifiedExecutorFromEnv,
  BatchCoordinator,
  createBatchCoordinator,
  type ClankerTokenV4,
  type BatchProgress
} from '../src/index.js';

async function enhancedBatchDeploymentExample() {
  console.log('🚀 Enhanced Batch Deployment Example');
  console.log('=====================================\n');

  try {
    // Create unified executor from environment
    const executor = createUnifiedExecutorFromEnv();

    // Sample tokens for batch deployment
    const tokens: ClankerTokenV4[] = [
      {
        name: 'Batch Token Alpha',
        symbol: 'ALPHA',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453, // Base
        description: 'First token in batch',
      },
      {
        name: 'Batch Token Beta',
        symbol: 'BETA',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453, // Base
        description: 'Second token in batch',
      },
      {
        name: 'Batch Token Gamma',
        symbol: 'GAMMA',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 42161, // Arbitrum
        description: 'Third token in batch (different chain)',
      },
      {
        name: 'Batch Token Delta',
        symbol: 'DELTA',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453, // Base
        description: 'Fourth token in batch',
      },
    ];

    console.log(`📦 Preparing to deploy ${tokens.length} tokens across multiple chains`);
    console.log('Tokens:');
    tokens.forEach((token, i) => {
      console.log(`  ${i + 1}. ${token.name} (${token.symbol}) on chain ${token.chainId}`);
    });
    console.log();

    // Progress tracking
    let lastProgress: BatchProgress | null = null;
    const progressCallback = (progress: BatchProgress) => {
      if (!lastProgress || progress.completed !== lastProgress.completed) {
        console.log(`📊 Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%) - ✅ ${progress.successful} successful, ❌ ${progress.failed} failed`);
        lastProgress = progress;
      }
    };

    // Deploy with enhanced batch coordination
    console.log('🔄 Starting enhanced batch deployment...\n');
    const startTime = Date.now();

    const result = await executor.batchDeploy(tokens, 'api');

    const duration = Date.now() - startTime;
    console.log(`\n✨ Batch deployment completed in ${duration}ms\n`);

    // Display results
    console.log('📋 Deployment Results:');
    console.log('======================');
    
    result.results.forEach((deployResult, i) => {
      const status = deployResult.success ? '✅' : '❌';
      console.log(`${status} ${deployResult.token} (Chain ${deployResult.chainId})`);
      
      if (deployResult.success && deployResult.result) {
        console.log(`   📍 Transaction: ${deployResult.result.txHash}`);
        console.log(`   🔗 Method: ${deployResult.methodUsed}`);
      } else if (deployResult.error) {
        console.log(`   ⚠️  Error: ${deployResult.error}`);
        console.log(`   🔗 Method: ${deployResult.methodUsed}`);
      }
      console.log();
    });

    // Display chain summary
    console.log('🌐 Chain Summary:');
    console.log('=================');
    Object.entries(result.chainSummary).forEach(([chainId, summary]) => {
      const successRate = ((summary.successful / summary.total) * 100).toFixed(1);
      console.log(`Chain ${chainId}:`);
      console.log(`  📊 ${summary.successful}/${summary.total} successful (${successRate}%)`);
      console.log(`  🔧 Method: ${summary.methodUsed}`);
      console.log();
    });

    // Overall statistics
    const totalSuccessful = result.results.filter(r => r.success).length;
    const totalFailed = result.results.filter(r => !r.success).length;
    const overallSuccessRate = ((totalSuccessful / tokens.length) * 100).toFixed(1);

    console.log('📈 Overall Statistics:');
    console.log('=====================');
    console.log(`✅ Successful: ${totalSuccessful}/${tokens.length} (${overallSuccessRate}%)`);
    console.log(`❌ Failed: ${totalFailed}/${tokens.length}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🔧 Primary Method: ${result.method}`);

  } catch (error) {
    console.error('❌ Batch deployment failed:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Error Code:', error.code);
      console.error('Error Details:', error.details);
    }
  }
}

async function customBatchCoordinatorExample() {
  console.log('\n🛠️  Custom Batch Coordinator Example');
  console.log('====================================\n');

  try {
    // Create custom batch coordinator with specific settings
    const coordinator = createBatchCoordinator();
    
    // This would be used with an API method instance
    console.log('Custom batch coordinator created with enhanced features:');
    console.log('- Concurrency control');
    console.log('- Automatic retry with exponential backoff');
    console.log('- Partial failure recovery');
    console.log('- Progress tracking');
    console.log('- Chain-specific optimization');
    
  } catch (error) {
    console.error('❌ Custom coordinator example failed:', error);
  }
}

// Run examples
async function main() {
  await enhancedBatchDeploymentExample();
  await customBatchCoordinatorExample();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  enhancedBatchDeploymentExample,
  customBatchCoordinatorExample,
};