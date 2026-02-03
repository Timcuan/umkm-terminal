#!/usr/bin/env node
/**
 * Validate .env Configuration Script
 * Checks if .env file has all the latest optimizations and spoofing settings
 */

import fs from 'fs';
import chalk from 'chalk';

console.log('🔍 Validating .env Configuration...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log(chalk.red('❌ .env file not found!'));
  console.log(chalk.yellow('💡 Copy .env.example to .env: cp .env.example .env\n'));
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');

// Define required configurations
const requiredConfigs = [
  {
    name: 'CLI Optimization Settings',
    checks: [
      { key: 'UX_MODE', description: 'User experience mode (normal/fast/ultra/expert)' },
      { key: 'QUICK_DEPLOY_ENABLED', description: 'Enable 30-second Quick Deploy' },
      { key: 'AUTO_SYMBOL_GENERATION', description: 'Auto-generate symbols from names' },
      { key: 'SMART_DEFAULTS', description: 'Use intelligent defaults' },
    ]
  },
  {
    name: 'Spoofing Configuration',
    checks: [
      { key: 'SPOOFING_ADMIN_REWARD', description: 'Admin reward percentage (should be 99.9)' },
      { key: 'SPOOFING_RECIPIENT_REWARD', description: 'Recipient reward percentage (should be 0.1)' },
      { key: 'SPOOFING_STEALTH_MODE', description: 'Enable stealth mode' },
      { key: 'SPOOFING_AUTO_CLAIM', description: 'Automatic reward claiming' },
      { key: 'SPOOFING_RANDOMIZE_TIMING', description: 'Randomize deployment timing' },
    ]
  },
  {
    name: 'Core Settings',
    checks: [
      { key: 'PRIVATE_KEY', description: 'Wallet private key (required)' },
      { key: 'CHAIN_ID', description: 'Default chain ID' },
      { key: 'FEE_TYPE', description: 'Fee type (static/dynamic)' },
      { key: 'MEV_BLOCK_DELAY', description: 'MEV protection delay' },
    ]
  }
];

let allValid = true;
let totalChecks = 0;
let passedChecks = 0;

// Validate each configuration section
requiredConfigs.forEach(section => {
  console.log(chalk.cyan.bold(`📋 ${section.name}`));
  console.log(chalk.gray('─'.repeat(50)));
  
  section.checks.forEach(check => {
    totalChecks++;
    const regex = new RegExp(`^${check.key}=(.*)$`, 'm');
    const match = envContent.match(regex);
    
    if (match) {
      const value = match[1].trim();
      if (value && value !== 'your-openai-api-key-here' && !value.startsWith('0x0000')) {
        console.log(`✅ ${check.key}: ${chalk.green(value)}`);
        passedChecks++;
      } else {
        console.log(`⚠️  ${check.key}: ${chalk.yellow('Set but needs value')}`);
        console.log(`   ${chalk.gray(check.description)}`);
        if (check.key === 'PRIVATE_KEY') {
          allValid = false;
        }
      }
    } else {
      console.log(`❌ ${check.key}: ${chalk.red('Missing')}`);
      console.log(`   ${chalk.gray(check.description)}`);
      allValid = false;
    }
  });
  
  console.log('');
});

// Check for specific spoofing optimization values
console.log(chalk.red.bold('🎯 Spoofing Optimization Check'));
console.log(chalk.gray('─'.repeat(50)));

const adminRewardMatch = envContent.match(/^SPOOFING_ADMIN_REWARD=(.*)$/m);
const recipientRewardMatch = envContent.match(/^SPOOFING_RECIPIENT_REWARD=(.*)$/m);

if (adminRewardMatch && parseFloat(adminRewardMatch[1]) === 99.9) {
  console.log(`✅ Admin Reward: ${chalk.green('99.9% (Optimized)')}`);
} else {
  console.log(`⚠️  Admin Reward: ${chalk.yellow('Not optimized for spoofing')}`);
  console.log(`   ${chalk.gray('Recommended: SPOOFING_ADMIN_REWARD=99.9')}`);
}

if (recipientRewardMatch && parseFloat(recipientRewardMatch[1]) === 0.1) {
  console.log(`✅ Recipient Reward: ${chalk.green('0.1% (Optimized)')}`);
} else {
  console.log(`⚠️  Recipient Reward: ${chalk.yellow('Not optimized for spoofing')}`);
  console.log(`   ${chalk.gray('Recommended: SPOOFING_RECIPIENT_REWARD=0.1')}`);
}

console.log('');

// Check UX mode
const uxModeMatch = envContent.match(/^UX_MODE=(.*)$/m);
if (uxModeMatch) {
  const uxMode = uxModeMatch[1].trim();
  if (['fast', 'ultra', 'expert'].includes(uxMode)) {
    console.log(`✅ UX Mode: ${chalk.green(uxMode + ' (Optimized)')}`);
  } else {
    console.log(`⚠️  UX Mode: ${chalk.yellow(uxMode + ' (Consider fast/expert for better performance)')}`);
  }
} else {
  console.log(`❌ UX Mode: ${chalk.red('Missing')}`);
}

console.log('');

// Summary
console.log(chalk.white.bold('📊 VALIDATION SUMMARY'));
console.log(chalk.gray('═'.repeat(50)));
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${chalk.green(passedChecks)}`);
console.log(`Failed: ${chalk.red(totalChecks - passedChecks)}`);
console.log(`Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

console.log('');

if (allValid && passedChecks === totalChecks) {
  console.log(chalk.green.bold('🎉 CONFIGURATION VALID!'));
  console.log(chalk.green('✅ All optimizations are properly configured'));
  console.log(chalk.green('✅ Spoofing settings are optimized'));
  console.log(chalk.green('✅ Ready for deployment'));
  console.log('');
  console.log(chalk.cyan('🚀 Quick Start Commands:'));
  console.log(chalk.gray('  umkm                    # Start interactive CLI'));
  console.log(chalk.gray('  export EXPERT_MODE=true && umkm  # Expert mode'));
} else {
  console.log(chalk.yellow.bold('⚠️  CONFIGURATION NEEDS ATTENTION'));
  console.log('');
  console.log(chalk.cyan('🔧 Recommended Actions:'));
  
  if (!envContent.includes('PRIVATE_KEY=0x') || envContent.includes('PRIVATE_KEY=0x0000')) {
    console.log(chalk.yellow('1. Set your PRIVATE_KEY in .env file'));
  }
  
  if (!adminRewardMatch || parseFloat(adminRewardMatch[1]) !== 99.9) {
    console.log(chalk.yellow('2. Set SPOOFING_ADMIN_REWARD=99.9 for maximum rewards'));
  }
  
  if (!uxModeMatch || !['fast', 'expert'].includes(uxModeMatch[1])) {
    console.log(chalk.yellow('3. Set UX_MODE=fast or UX_MODE=expert for better performance'));
  }
  
  console.log(chalk.yellow('4. Review missing configurations above'));
}

console.log('');
console.log(chalk.gray('💡 For help: Check docs/cli-optimization-latest-changes.md'));
console.log(chalk.gray('📋 Template: Use .env.example as reference'));

process.exit(allValid ? 0 : 1);