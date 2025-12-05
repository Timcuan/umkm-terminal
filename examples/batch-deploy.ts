/**
 * Batch Deploy Example (Simple Template-Based)
 * 
 * Two simple steps:
 * 1. Generate template → Edit manually
 * 2. Deploy from template
 */

import 'dotenv/config';
import {
  generateTemplate,
  saveTemplate,
  loadTemplate,
  deployTemplate,
  deployFromFile,
  saveResults,
  formatDuration,
} from '../src/index.js';

// ============================================================================
// Step 1: Generate Template
// ============================================================================

async function step1_generateTemplate() {
  console.log('📝 Step 1: Generate Template\n');

  // Generate template for 5 tokens
  const template = generateTemplate(5, {
    namePrefix: 'My Token',
    symbolPrefix: 'MTK',
    chain: 'base',
    fee: 5,
    // Optional: Set default admin for all tokens
    // tokenAdmin: '0x...',
    // rewardRecipient: '0x...',
  });

  // Save to file
  saveTemplate(template, './templates/my-batch.json');
  console.log('✅ Template saved to ./templates/my-batch.json');
  console.log('📝 Edit the file to customize tokens, then run step 2\n');

  // Show preview
  console.log('Template preview:');
  console.log(JSON.stringify(template, null, 2));
}

// ============================================================================
// Step 2: Deploy from Template
// ============================================================================

async function step2_deployFromTemplate() {
  console.log('🚀 Step 2: Deploy from Template\n');

  // Load template
  const template = loadTemplate('./templates/batch-template.json');
  console.log(`Loaded: ${template.name}`);
  console.log(`Chain: ${template.chain}`);
  console.log(`Tokens: ${template.tokens.length}\n`);

  // Deploy
  const summary = await deployTemplate(template, {
    delay: 3, // 3 seconds between deploys
    retries: 2, // Retry 2 times on failure
    onProgress: (current, total, result) => {
      const status = result.success ? '✅' : '❌';
      console.log(`[${current}/${total}] ${status} ${result.symbol}`);
      if (result.address) {
        console.log(`    ${result.address}`);
      }
    },
  });

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log(`Total:    ${summary.total}`);
  console.log(`Success:  ${summary.success}`);
  console.log(`Failed:   ${summary.failed}`);
  console.log(`Duration: ${formatDuration(summary.duration)}`);
  console.log('═══════════════════════════════════════\n');

  // Save results
  saveResults(summary, './batch-results.json');
  console.log('✅ Results saved to ./batch-results.json');
}

// ============================================================================
// Quick Deploy (One-liner)
// ============================================================================

async function quickDeploy() {
  console.log('⚡ Quick Deploy\n');

  // Deploy directly from file
  const summary = await deployFromFile('./templates/batch-template.json', {
    onProgress: (current, total, result) => {
      console.log(`[${current}/${total}] ${result.success ? '✅' : '❌'} ${result.symbol}`);
    },
  });

  console.log(`\n✅ Deployed ${summary.success}/${summary.total} tokens`);
}

// ============================================================================
// Run
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                 BATCH DEPLOY (SIMPLE)                          ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Uncomment the step you want to run:
  await step1_generateTemplate();
  // await step2_deployFromTemplate();
  // await quickDeploy();
}

main().catch(console.error);
