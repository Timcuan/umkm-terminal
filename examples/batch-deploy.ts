/**
 * Batch Deploy Example
 *
 * Simple workflow:
 * 1. Generate template → Edit manually → Deploy
 *
 * Features:
 * - Full token customization (name, symbol, image, description, socials)
 * - Per-token admin and reward recipients
 * - Vault settings
 * - Clanker.world verification
 */

import 'dotenv/config';
import {
  type BatchTemplate,
  deployFromFile,
  deployTemplate,
  formatDuration,
  generateNumberedTemplate,
  generateTemplate,
  loadTemplate,
  saveResults,
  saveTemplate,
  validateTemplate,
} from '../src/index.js';

// ============================================================================
// Step 1: Generate Template
// ============================================================================

async function generateBasicTemplate() {
  console.log('📝 Generate Basic Template\n');

  // All tokens will have the SAME name and symbol
  const template = generateTemplate(5, {
    name: 'My Token',
    symbol: 'MTK',
    chain: 'base',
    fee: 5,
    image: 'https://example.com/token.png',
    description: 'My awesome token',
    socials: {
      website: 'https://mytoken.com',
      twitter: 'https://twitter.com/mytoken',
    },
  });

  saveTemplate(template, './templates/my-batch.json');
  console.log('✅ Template saved to ./templates/my-batch.json');
  console.log('📝 Edit the file to customize, then deploy\n');
}

async function generateNumberedTokens() {
  console.log('📝 Generate Numbered Tokens\n');

  // Tokens will be numbered: Token 1, Token 2, etc.
  const template = generateNumberedTemplate(10, {
    name: 'Token',
    symbol: 'TKN',
    chain: 'base',
    fee: 5,
    startIndex: 1,
  });

  saveTemplate(template, './templates/numbered-batch.json');
  console.log('✅ Template saved to ./templates/numbered-batch.json\n');
}

// ============================================================================
// Step 2: Deploy from Template
// ============================================================================

async function deployFromTemplate() {
  console.log('🚀 Deploy from Template\n');

  // Load and validate
  const template = loadTemplate('./templates/batch-template.json');
  console.log(`Template: ${template.name}`);
  console.log(`Chain: ${template.chain}`);
  console.log(`Tokens: ${template.tokens.length}\n`);

  // Deploy with progress
  const summary = await deployTemplate(template, {
    delay: 3,
    retries: 2,
    onProgress: (current, total, result) => {
      const status = result.success ? '✅' : '❌';
      console.log(`[${current}/${total}] ${status} ${result.symbol}`);
      if (result.address) {
        console.log(`    → ${result.address}`);
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

  const summary = await deployFromFile('./templates/batch-template.json', {
    onProgress: (current, total, result) => {
      console.log(`[${current}/${total}] ${result.success ? '✅' : '❌'} ${result.symbol}`);
    },
  });

  console.log(`\n✅ Deployed ${summary.success}/${summary.total} tokens`);
}

// ============================================================================
// Advanced: Custom Template
// ============================================================================

async function customTemplate() {
  console.log('🔧 Custom Template\n');

  // Build template programmatically
  const template: BatchTemplate = {
    name: 'Custom Batch',
    chain: 'base',
    defaults: {
      fee: 5,
      mev: 8,
      image: 'https://example.com/default.png',
      description: 'Default description',
    },
    tokens: [
      {
        name: 'Token A',
        symbol: 'TKNA',
        tokenAdmin: '0x1234567890123456789012345678901234567890',
        rewardRecipients: [
          { address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', allocation: 100 },
        ],
      },
      {
        name: 'Token B',
        symbol: 'TKNB',
        fee: 10, // Override default
        rewardRecipients: [
          { address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', allocation: 50 },
          { address: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', allocation: 50 },
        ],
      },
      {
        name: 'Token C',
        symbol: 'TKNC',
        vault: {
          enabled: true,
          percentage: 20,
          lockupDays: 30,
        },
      },
    ],
  };

  // Validate before saving
  validateTemplate(template);
  saveTemplate(template, './templates/custom-batch.json');
  console.log('✅ Custom template saved\n');
}

// ============================================================================
// Run
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    BATCH DEPLOY EXAMPLES                       ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Uncomment the example you want to run:
  await generateBasicTemplate();
  // await generateNumberedTokens();
  // await deployFromTemplate();
  // await quickDeploy();
  // await customTemplate();
}

main().catch(console.error);
