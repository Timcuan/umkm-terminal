/**
 * Batch Deploy Example
 * Deploy multiple tokens (1-100) on a single chain
 *
 * Features:
 * - Deploy 1-100 tokens in one batch
 * - Auto-retry on failure (configurable)
 * - Resume from specific index
 * - Progress tracking with callbacks
 * - Export results to JSON
 * - Statistics (success rate, duration, etc.)
 */

import 'dotenv/config';
import {
  BatchDeployer,
  type BatchTokenConfig,
  batchDeploy,
  batchDeployGenerated,
} from '../src/index.js';

// ============================================================================
// Method 1: Quick Function with Token Array
// ============================================================================

async function deployTokenArray() {
  console.log('📦 Deploy Token Array\n');

  const tokens: BatchTokenConfig[] = [
    { name: 'Alpha Token', symbol: 'ALPHA', description: 'First token', id: 'alpha-1' },
    { name: 'Beta Token', symbol: 'BETA', description: 'Second token', id: 'beta-1' },
    { name: 'Gamma Token', symbol: 'GAMMA', description: 'Third token', id: 'gamma-1' },
  ];

  const results = await batchDeploy(tokens, {
    chain: 'base',
    feePercent: 5,
    delayMs: 3000,
    retries: 2, // Retry 2 times on failure
    retryDelayMs: 5000, // Wait 5s before retry
    onProgress: (index, total, result) => {
      const status = result.success ? '✅' : '❌';
      console.log(
        `  [${index + 1}/${total}] ${status} ${result.symbol} (${result.attempts} attempts)`
      );
    },
    onRetry: (_index, attempt, token) => {
      console.log(`  ⟳ Retrying ${token.symbol} (attempt ${attempt + 1})...`);
    },
  });

  console.log(`\n✅ Deployed ${results.successful}/${results.total} tokens\n`);

  for (const token of results.tokens) {
    console.log(`  ${token.symbol}: ${token.address || 'Failed'}`);
  }
}

// ============================================================================
// Method 2: Generate Numbered Tokens
// ============================================================================

async function deployNumberedTokens() {
  console.log('\n🔢 Deploy Numbered Tokens\n');

  // Deploy 5 tokens: "My Token 1" to "My Token 5"
  const results = await batchDeployGenerated(
    5, // count
    {
      namePrefix: 'My Token',
      symbolPrefix: 'MTK',
      description: 'Part of My Token series',
    },
    {
      chain: 'base',
      feePercent: 3,
      onProgress: (i, total, r) => {
        console.log(`  [${i + 1}/${total}] ${r.success ? '✅' : '❌'} ${r.name}`);
      },
    }
  );

  console.log(`\n✅ ${results.successful}/${results.total} tokens deployed\n`);
}

// ============================================================================
// Method 3: Using BatchDeployer Class
// ============================================================================

async function usingBatchDeployerClass() {
  console.log('\n🔧 Using BatchDeployer Class\n');

  const batch = new BatchDeployer();
  console.log(`Wallet: ${batch.address}\n`);

  // Generate tokens
  const tokens = batch.generateTokens(3, {
    namePrefix: 'Series',
    symbolPrefix: 'SER',
    startIndex: 100, // Start from 100
  });

  console.log('Generated tokens:');
  for (const t of tokens) {
    console.log(`  - ${t.name} (${t.symbol})`);
  }

  // Deploy
  console.log('\nDeploying...');
  const results = await batch.deploy(tokens, {
    chain: 'base',
    delayMs: 1500,
    onProgress: (i, total, r) => {
      console.log(`  [${i + 1}/${total}] ${r.success ? '✅' : '❌'} ${r.symbol}`);
    },
  });

  console.log(`\n✅ ${results.successful}/${results.total} deployed`);
}

// ============================================================================
// Method 4: Large Batch (10-100 tokens)
// ============================================================================

async function deployLargeBatch() {
  console.log('\n🚀 Deploy Large Batch (10 tokens)\n');

  const results = await batchDeployGenerated(
    10, // Deploy 10 tokens
    {
      namePrefix: 'Batch Token',
      symbolPrefix: 'BAT',
    },
    {
      chain: 'base',
      delayMs: 2000, // 2 second delay between each
      continueOnError: true, // Continue even if one fails
      onProgress: (i, total, r) => {
        const pct = Math.round(((i + 1) / total) * 100);
        const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
        console.log(`  [${bar}] ${pct}% - ${r.symbol}: ${r.success ? '✅' : '❌'}`);
      },
    }
  );

  console.log('\n═══════════════════════════════════════');
  console.log(`  Total: ${results.total}`);
  console.log(`  Success: ${results.successful}`);
  console.log(`  Failed: ${results.failed}`);
  console.log('═══════════════════════════════════════\n');

  // List all deployed tokens
  console.log('Deployed Tokens:');
  for (const token of results.tokens.filter((t) => t.address)) {
    console.log(`  ${token.symbol}: ${token.address}`);
  }
}

// ============================================================================
// Method 5: Custom Token List from Data
// ============================================================================

async function deployFromData() {
  console.log('\n📋 Deploy from Custom Data\n');

  // Example: Load from JSON, CSV, or database
  const tokenData = [
    { name: 'Community Token', symbol: 'COMM' },
    { name: 'Governance Token', symbol: 'GOV' },
    { name: 'Utility Token', symbol: 'UTIL' },
    { name: 'Reward Token', symbol: 'RWD' },
    { name: 'Staking Token', symbol: 'STK' },
  ];

  const results = await batchDeploy(tokenData, {
    chain: 'base',
    mev: 10, // Higher MEV protection
    feePercent: 2, // Lower fees
    onProgress: (_i, _total, r) => {
      console.log(`  ${r.name}: ${r.success ? r.tokenAddress : r.error}`);
    },
  });

  console.log(`\n✅ Batch complete: ${results.successful}/${results.total}`);
}

// ============================================================================
// Method 6: Advanced Features (Retry, Export, Stats)
// ============================================================================

async function advancedFeatures() {
  console.log('\n🔧 Advanced Features Demo\n');

  const batch = new BatchDeployer();
  const tokens: BatchTokenConfig[] = [
    { name: 'Test Token 1', symbol: 'TEST1', id: 'test-1' },
    { name: 'Test Token 2', symbol: 'TEST2', id: 'test-2' },
    { name: 'Test Token 3', symbol: 'TEST3', id: 'test-3' },
  ];

  // Deploy with all callbacks
  const results = await batch.deploy(tokens, {
    chain: 'base',
    retries: 2,
    onProgress: (i, total, r) => {
      console.log(`  [${i + 1}/${total}] ${r.success ? '✅' : '❌'} ${r.symbol}`);
    },
    onError: (_i, err, token) => {
      console.log(`  ⚠️ Error on ${token.symbol}: ${err.message}`);
    },
    onRetry: (_i, attempt, token) => {
      console.log(`  ⟳ Retry #${attempt} for ${token.symbol}`);
    },
  });

  // Get statistics
  const stats = batch.getStats(results);
  console.log('\n📊 Statistics:');
  console.log(`  Success Rate: ${stats.successRate}%`);
  console.log(`  Avg Time/Token: ${stats.avgTimePerToken}ms`);
  console.log(`  Total Duration: ${stats.totalDuration}`);

  // Export to JSON (for saving/logging)
  const json = batch.exportResults(results);
  console.log('\n📄 Exported JSON (first 200 chars):');
  console.log(`  ${json.substring(0, 200)}...`);

  // Retry failed tokens
  if (results.failed > 0) {
    console.log(`\n🔄 Retrying ${results.failed} failed tokens...`);
    const retryResults = await batch.retryFailed(results, tokens);
    console.log(`  Retry result: ${retryResults.successful}/${retryResults.total} success`);
  }
}

// ============================================================================
// Method 7: Resume from Index (for interrupted batches)
// ============================================================================

async function resumeFromIndex() {
  console.log('\n⏩ Resume from Index Demo\n');

  const batch = new BatchDeployer();
  const tokens = batch.generateTokens(5, {
    namePrefix: 'Resume Token',
    symbolPrefix: 'RSM',
  });

  // Simulate: Deploy was interrupted at index 2
  // Resume from index 2 (skip first 2 tokens)
  console.log('  Resuming from index 2 (skipping first 2 tokens)...\n');

  const results = await batch.deploy(tokens, {
    startIndex: 2, // Resume from here
    onProgress: (i, total, r) => {
      console.log(`  [${i + 1}/${total}] ${r.success ? '✅' : '❌'} ${r.symbol}`);
    },
  });

  console.log(`\n✅ Resumed batch: ${results.successful}/${results.total} success`);
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    BATCH DEPLOY EXAMPLES                       ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Run all examples
  await deployTokenArray();
  await deployNumberedTokens();
  await usingBatchDeployerClass();
  await deployLargeBatch();
  await deployFromData();
  await advancedFeatures();
  await resumeFromIndex();
}

main().catch(console.error);
