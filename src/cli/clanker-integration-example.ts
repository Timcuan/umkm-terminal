/**
 * Clanker Integration Example
 * 
 * Demonstrates how the enhanced input handler optimizes empty/skipped inputs
 * for maximum Clanker World verification success.
 */

import chalk from 'chalk';
import { createEnhancedInputHandler, collectOptimizedTokenData } from './enhanced-input-handler.js';
import { optimizeForClanker, validateClankerReadiness } from './clanker-optimization.js';

// ============================================================================
// Example Usage Scenarios
// ============================================================================

/**
 * Scenario 1: User skips most fields (common case)
 */
export async function demonstrateMinimalInput() {
  console.log(chalk.white.bold('\n  📋 SCENARIO 1: MINIMAL INPUT (MOST FIELDS SKIPPED)'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  
  // Simulate user providing only name and symbol
  const minimalInput = {
    name: 'MyToken',
    symbol: 'MTK',
    chainId: 8453, // Base
    // All other fields are empty/skipped
    description: '',
    image: '',
    website: '',
    farcaster: '',
    twitter: '',
    zora: '',
    instagram: '',
  };

  console.log(chalk.yellow('  User Input (minimal):'));
  console.log(`    Name: ${minimalInput.name}`);
  console.log(`    Symbol: ${minimalInput.symbol}`);
  console.log(`    Description: ${chalk.gray('(empty)')}`);
  console.log(`    Image: ${chalk.gray('(empty)')}`);
  console.log(`    Social Links: ${chalk.gray('(all empty)')}`);

  // Optimize for Clanker World
  const optimized = optimizeForClanker(minimalInput);
  const validation = validateClankerReadiness(optimized);

  console.log(chalk.green('\n  ✨ After Clanker Optimization:'));
  console.log(`    Description: "${optimized.description.substring(0, 80)}..."`);
  console.log(`    Image: ${optimized.image ? 'Professional fallback added' : 'None'}`);
  console.log(`    Category: ${optimized.category}`);
  console.log(`    Keywords: ${optimized.keywords.slice(0, 5).join(', ')}...`);
  console.log(`    Clanker Score: ${validation.score}/100`);
  console.log(`    Ready: ${validation.isReady ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);

  return { optimized, validation };
}

/**
 * Scenario 2: User provides partial information
 */
export async function demonstratePartialInput() {
  console.log(chalk.white.bold('\n  📋 SCENARIO 2: PARTIAL INPUT'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  
  // Simulate user providing some fields
  const partialInput = {
    name: 'DeFi Rewards Token',
    symbol: 'DRT',
    chainId: 8453,
    description: 'A token for DeFi rewards', // Short description
    image: '', // Empty
    website: 'https://defirewards.com',
    farcaster: '', // Empty
    twitter: '@defirewards',
    zora: '', // Empty
    instagram: '', // Empty
  };

  console.log(chalk.yellow('  User Input (partial):'));
  console.log(`    Name: ${partialInput.name}`);
  console.log(`    Symbol: ${partialInput.symbol}`);
  console.log(`    Description: "${partialInput.description}"`);
  console.log(`    Website: ${partialInput.website}`);
  console.log(`    Twitter: ${partialInput.twitter}`);
  console.log(`    Other fields: ${chalk.gray('(empty)')}`);

  // Optimize for Clanker World
  const optimized = optimizeForClanker(partialInput);
  const validation = validateClankerReadiness(optimized);

  console.log(chalk.green('\n  ✨ After Clanker Optimization:'));
  console.log(`    Description: "${optimized.description.substring(0, 80)}..."`);
  console.log(`    Image: ${optimized.image ? 'DeFi category image added' : 'None'}`);
  console.log(`    Category: ${optimized.category}`);
  console.log(`    Missing social links: Filled with smart suggestions`);
  console.log(`    Clanker Score: ${validation.score}/100`);
  console.log(`    Ready: ${validation.isReady ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);

  return { optimized, validation };
}

/**
 * Scenario 3: Gaming token with emoji and special characters
 */
export async function demonstrateGamingToken() {
  console.log(chalk.white.bold('\n  📋 SCENARIO 3: GAMING TOKEN WITH SPECIAL CHARACTERS'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  
  const gamingInput = {
    name: '🎮 Epic Quest Token 🗡️',
    symbol: 'QUEST',
    chainId: 8453,
    description: '', // Empty - will be auto-generated
    image: '', // Empty - will use gaming fallback
    website: '',
    farcaster: '',
    twitter: '',
    zora: '',
    instagram: '',
  };

  console.log(chalk.yellow('  User Input:'));
  console.log(`    Name: ${gamingInput.name}`);
  console.log(`    Symbol: ${gamingInput.symbol}`);
  console.log(`    All other fields: ${chalk.gray('(empty)')}`);

  const optimized = optimizeForClanker(gamingInput);
  const validation = validateClankerReadiness(optimized);

  console.log(chalk.green('\n  ✨ After Clanker Optimization:'));
  console.log(`    Category: ${optimized.category} (auto-detected)`);
  console.log(`    Description: "${optimized.description.substring(0, 80)}..."`);
  console.log(`    Image: Gaming category fallback`);
  console.log(`    Keywords: ${optimized.keywords.filter(k => k.includes('gam')).join(', ')}`);
  console.log(`    Clanker Score: ${validation.score}/100`);

  return { optimized, validation };
}

/**
 * Scenario 4: Meme token optimization
 */
export async function demonstrateMemeToken() {
  console.log(chalk.white.bold('\n  📋 SCENARIO 4: MEME TOKEN OPTIMIZATION'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  
  const memeInput = {
    name: 'Moon Rocket Doge',
    symbol: 'MOONDOG',
    chainId: 8453,
    description: 'To the moon! 🚀', // Very short
    image: '', // Empty
    website: '',
    farcaster: '',
    twitter: '',
    zora: '',
    instagram: '',
  };

  console.log(chalk.yellow('  User Input:'));
  console.log(`    Name: ${memeInput.name}`);
  console.log(`    Symbol: ${memeInput.symbol}`);
  console.log(`    Description: "${memeInput.description}"`);
  console.log(`    Other fields: ${chalk.gray('(empty)')}`);

  const optimized = optimizeForClanker(memeInput);
  const validation = validateClankerReadiness(optimized);

  console.log(chalk.green('\n  ✨ After Clanker Optimization:'));
  console.log(`    Category: ${optimized.category} (auto-detected)`);
  console.log(`    Enhanced Description: "${optimized.description.substring(0, 80)}..."`);
  console.log(`    Image: Meme category fallback`);
  console.log(`    Community Focus: ${optimized.tags.includes('Community Driven') ? 'Yes' : 'No'}`);
  console.log(`    Clanker Score: ${validation.score}/100`);

  return { optimized, validation };
}

/**
 * Scenario 5: Professional DeFi token with complete optimization
 */
export async function demonstrateProfessionalToken() {
  console.log(chalk.white.bold('\n  📋 SCENARIO 5: PROFESSIONAL DEFI TOKEN'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  
  const professionalInput = {
    name: 'Yield Farming Protocol',
    symbol: 'YFP',
    chainId: 8453,
    description: '', // Will be professionally generated
    image: '', // Will use DeFi fallback
    website: '',
    farcaster: '',
    twitter: '',
    zora: '',
    instagram: '',
  };

  const optimized = optimizeForClanker(professionalInput);
  const validation = validateClankerReadiness(optimized);

  console.log(chalk.green('  ✨ Professional Optimization Results:'));
  console.log(`    Category: ${optimized.category}`);
  console.log(`    SEO Keywords: ${optimized.keywords.slice(0, 8).join(', ')}`);
  console.log(`    Professional Tags: ${optimized.tags.join(', ')}`);
  console.log(`    Description Length: ${optimized.description.length} chars`);
  console.log(`    Clanker Score: ${validation.score}/100`);
  console.log(`    Verification Ready: ${validation.isReady ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);

  if (validation.suggestions.length > 0) {
    console.log(chalk.yellow('\n    Suggestions for even better score:'));
    validation.suggestions.forEach(suggestion => {
      console.log(`      • ${suggestion}`);
    });
  }

  return { optimized, validation };
}

/**
 * Run all demonstration scenarios
 */
export async function runAllDemonstrations() {
  console.log(chalk.cyan.bold('\n  🎯 CLANKER WORLD OPTIMIZATION DEMONSTRATIONS'));
  console.log(chalk.gray('  ═══════════════════════════════════════════════════════'));
  console.log(chalk.gray('  Showing how empty/skipped inputs are optimized for maximum'));
  console.log(chalk.gray('  Clanker World verification success and professional presentation.'));

  const results = [];

  // Run all scenarios
  results.push(await demonstrateMinimalInput());
  results.push(await demonstratePartialInput());
  results.push(await demonstrateGamingToken());
  results.push(await demonstrateMemeToken());
  results.push(await demonstrateProfessionalToken());

  // Summary
  console.log(chalk.white.bold('\n  📊 OPTIMIZATION SUMMARY'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  
  const averageScore = results.reduce((sum, r) => sum + r.validation.score, 0) / results.length;
  const readyCount = results.filter(r => r.validation.isReady).length;
  
  console.log(`    Average Clanker Score: ${chalk.green(`${averageScore.toFixed(1)}/100`)}`);
  console.log(`    Verification Ready: ${chalk.green(`${readyCount}/${results.length}`)} tokens`);
  console.log(`    Success Rate: ${chalk.green(`${(readyCount/results.length*100).toFixed(1)}%`)}`);

  console.log(chalk.green('\n  ✅ All tokens optimized for Clanker World verification!'));
  console.log(chalk.gray('     Even with minimal input, tokens achieve professional quality.'));

  return results;
}

/**
 * Interactive demonstration
 */
export async function interactiveDemonstration() {
  console.log(chalk.cyan.bold('\n  🎮 INTERACTIVE CLANKER OPTIMIZATION DEMO'));
  console.log(chalk.gray('  ═══════════════════════════════════════════════════════'));
  
  // Create enhanced input handler
  const handler = createEnhancedInputHandler({
    enableSmartDefaults: true,
    enableClankerOptimization: true,
    enableAutoSuggestions: true,
    showOptimizationResults: true,
    requireMinimumQuality: true,
    minimumClankerScore: 75,
  });

  console.log(chalk.white('  This demo will collect token information and show how'));
  console.log(chalk.white('  empty/skipped fields are automatically optimized.'));
  console.log('');
  console.log(chalk.gray('  Try skipping fields (press Enter) to see the magic! ✨'));

  // Collect optimized token data
  const result = await collectOptimizedTokenData();

  console.log(chalk.green.bold('\n  🎉 OPTIMIZATION COMPLETE!'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log(`  Final Clanker Score: ${chalk.green(`${result.validation.score}/100`)}`);
  console.log(`  Verification Status: ${result.validation.isReady ? chalk.green('✓ Ready') : chalk.yellow('⚠ Needs review')}`);

  if (result.validation.isReady) {
    console.log(chalk.green('\n  🚀 Your token is optimized and ready for Clanker World!'));
    console.log(chalk.gray('     Professional presentation guaranteed, even with minimal input.'));
  }

  return result;
}

// ============================================================================
// Export for CLI Integration
// ============================================================================

export {
  createEnhancedInputHandler,
  collectOptimizedTokenData,
  optimizeForClanker,
  validateClankerReadiness
};