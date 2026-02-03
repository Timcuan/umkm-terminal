#!/usr/bin/env node
/**
 * Enhanced UMKM Terminal Main Entry Point
 * Integrates all optimizations with existing functionality
 */

import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';
import { Deployer } from '../deployer/index.js';
import { SpoofingCLI } from './spoofing-cli.js';
import {
  showAnimatedLogo,
  showMainMenu,
  collectQuickTokenInfo,
  showDeployResult,
  showDeployError,
  maybeConfirm,
  getSmartDefaults,
  normalizeImageUrl,
  saveDeployedToken,
  type UxMode,
  type CliConfig,
  type DeployResult,
  VERSION,
  PLATFORM_INFO,
  ENABLE_ANIMATIONS,
} from './optimized-cli.js';
import {
  type BatchChain,
  type BatchTemplate,
  deployTemplate,
  generateTemplate,
  loadTemplate,
  saveResults,
  saveTemplate,
} from '../batch/index.js';
import { CHAIN_IDS } from '../chains/index.js';
import { getChainName } from '../config/index.js';
import { getCurrentWallet, handleWalletManagement } from '../wallet/index.js';
import { DeployAnimation } from '../utils/animation.js';

// ============================================================================
// Enhanced Token Info Interface
// ============================================================================

interface TokenInfo {
  // Basic
  name: string;
  symbol: string;
  image: string;
  chainId: number;
  privateKey: string;
  // Metadata
  description: string;
  // Social Links
  website: string;
  farcaster: string;
  twitter: string;
  zora: string;
  instagram: string;
  // Admin & Rewards (Spoofing Optimized)
  tokenAdmin: string;
  rewardRecipient: string;
  rewardToken: 'Both' | 'Paired' | 'Clanker';
  // Fees
  feeType: 'static' | 'dynamic';
  clankerFee: number;
  pairedFee: number;
  // MEV
  mevBlockDelay: number;
  // Context
  interfaceName: string;
  platformName: string;
  // Vanity Address (B07 Compliant)
  vanityMode: 'off' | 'random' | 'custom';
  vanityPrefix?: string;
  vanitySuffix?: string;
  vanitySalt?: `0x${string}`;
}

// ============================================================================
// Enhanced Environment Configuration
// ============================================================================

function getEnvConfig() {
  return {
    // Wallet
    privateKey: process.env.PRIVATE_KEY || '',
    chainId: Number(process.env.CHAIN_ID) || CHAIN_IDS.BASE,

    // Token Defaults
    tokenName: process.env.TOKEN_NAME || '',
    tokenSymbol: process.env.TOKEN_SYMBOL || '',
    tokenImage: process.env.TOKEN_IMAGE || '',
    tokenDescription: process.env.TOKEN_DESCRIPTION || '',

    // Admin & Rewards (Spoofing Optimized)
    tokenAdmin: process.env.TOKEN_ADMIN || '',
    rewardRecipient: process.env.REWARD_RECIPIENT || '',
    rewardToken: (process.env.REWARD_TOKEN || 'Both') as 'Both' | 'Paired' | 'Clanker',

    // Fees
    feeType: (process.env.FEE_TYPE || 'static') as 'static' | 'dynamic',
    clankerFee: Number(process.env.CLANKER_FEE) || 5,
    pairedFee: Number(process.env.PAIRED_FEE) || 5,

    // MEV
    mevBlockDelay: Number(process.env.MEV_BLOCK_DELAY) || 8,

    // Social Links
    tokenWebsite: process.env.TOKEN_WEBSITE || '',
    tokenTwitter: process.env.TOKEN_TWITTER || '',
    tokenFarcaster: process.env.TOKEN_FARCASTER || '',

    // Clanker verification
    interfaceName: process.env.INTERFACE_NAME || 'UMKM Terminal',
    platformName: process.env.PLATFORM_NAME || 'Clanker',
  };
}

// ============================================================================
// Enhanced Deployment Execution
// ============================================================================

async function executeDeployment(info: TokenInfo): Promise<DeployResult> {
  const startTime = Date.now();
  
  try {
    const deployer = new Deployer({
      config: {
        privateKey: info.privateKey as `0x${string}`,
        chainId: info.chainId,
        mevBlockDelay: info.mevBlockDelay,
      }
    });

    // Use deployer address as fallback for admin/recipient
    const adminAddress = (info.tokenAdmin || deployer.address) as `0x${string}`;
    const recipientAddress = (info.rewardRecipient || adminAddress) as `0x${string}`;

    // Build socials object
    const socials: {
      website?: string;
      farcaster?: string;
      twitter?: string;
      zora?: string;
      instagram?: string;
    } = {};
    if (info.website) socials.website = info.website;
    if (info.farcaster) socials.farcaster = info.farcaster;
    if (info.twitter) socials.twitter = info.twitter;
    if (info.zora) socials.zora = info.zora;
    if (info.instagram) socials.instagram = info.instagram;

    // Enhanced spoofing-optimized reward distribution
    const rewardRecipients = [
      {
        address: adminAddress,
        allocation: 0.1, // 0.1% for token admin (minimal allocation)
        rewardToken: info.rewardToken,
      },
      {
        address: recipientAddress,
        allocation: 0.1, // 0.1% for reward recipient (minimal allocation)
        rewardToken: info.rewardToken,
      },
    ];

    const result = await deployer.deploy({
      name: info.name,
      symbol: info.symbol,
      image: info.image || undefined,
      description: info.description || undefined,
      socials: Object.keys(socials).length > 0 ? socials : undefined,
      tokenAdmin: adminAddress,
      rewardRecipients,
      fees:
        info.feeType === 'dynamic'
          ? {
              type: 'dynamic',
              baseFee: info.clankerFee,
              maxLpFee: info.pairedFee,
            }
          : {
              type: 'static',
              clankerFee: info.clankerFee,
              pairedFee: info.pairedFee,
            },
      mev: info.mevBlockDelay,
      context: {
        interface: info.interfaceName,
        platform: info.platformName,
      },
      salt: info.vanitySalt,
    });

    const deploymentTime = Date.now() - startTime;

    return {
      success: result.success,
      tokenAddress: result.tokenAddress,
      txHash: result.txHash,
      error: result.error,
      gasUsed: result.gasUsed,
      deploymentTime,
    };
  } catch (error) {
    const deploymentTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      deploymentTime,
    };
  }
}

// ============================================================================
// Enhanced Token Collection Flow
// ============================================================================

async function collectTokenInfo(): Promise<TokenInfo | null> {
  const env = getEnvConfig();

  // Check required env vars
  if (!env.privateKey) {
    console.log(chalk.red('\n  ❌ Error: PRIVATE_KEY not set'));
    console.log(chalk.gray('  Add PRIVATE_KEY=0x... to your .env file'));
    console.log(chalk.cyan('  💡 Tip: Use wallet management to generate a new key\n'));
    await input({ message: 'Press Enter to continue...' });
    return null;
  }

  // Check if template exists in .env
  const hasTemplate = env.tokenName && env.tokenSymbol;

  // Enhanced deploy mode selection
  console.log('');
  console.log(chalk.white.bold('  🚀 TOKEN DEPLOYMENT'));
  console.log(chalk.gray('  ═══════════════════════════════════════'));
  
  if (hasTemplate) {
    console.log(chalk.green('  📋 Template detected in .env file'));
  }
  
  const deployMode = await select({
    message: 'Choose deployment mode:',
    choices: [
      { 
        name: `${chalk.green('⚡')} Quick Deploy - 30 seconds`, 
        value: 'quick' as const,
        description: 'Essential info only with smart defaults'
      },
      { 
        name: `${chalk.blue('🔧')} Advanced Deploy - Full control`, 
        value: 'advanced' as const,
        description: 'Complete customization options'
      },
    ],
    default: hasTemplate ? 'quick' : 'quick',
  });

  if (deployMode === 'quick') {
    return await collectQuickTokenInfo(env, hasTemplate);
  } else {
    // For now, redirect to quick deploy with a note
    console.log(chalk.yellow('\n  📝 Advanced mode coming soon! Using Quick Deploy with smart defaults.\n'));
    return await collectQuickTokenInfo(env, hasTemplate);
  }
}

// ============================================================================
// Enhanced Deployment Flow
// ============================================================================

async function deployToken(): Promise<'menu' | 'retry' | 'exit'> {
  const tokenInfo = await collectTokenInfo();
  if (!tokenInfo) {
    return 'menu';
  }

  // Enhanced confirmation with deployment preview
  console.log('');
  console.log(chalk.white.bold('  📋 DEPLOYMENT PREVIEW'));
  console.log(chalk.gray('  ═══════════════════════════════════════'));
  console.log(`  ${chalk.gray('Token:')}         ${chalk.white(tokenInfo.name)} (${tokenInfo.symbol})`);
  console.log(`  ${chalk.gray('Network:')}       ${chalk.yellow(getChainName(tokenInfo.chainId))}`);
  console.log(`  ${chalk.gray('Fee Split:')}     ${chalk.red('99.9% Admin')} / ${chalk.yellow('0.1% Recipient')}`);
  console.log(`  ${chalk.gray('Image:')}         ${tokenInfo.image ? chalk.green('✓ Set') : chalk.gray('○ None')}`);
  console.log('');

  const confirmed = await maybeConfirm(
    {
      message: chalk.yellow('🚀 Deploy token? (This will cost gas)'),
      default: false,
    },
    'transaction'
  );

  if (!confirmed) {
    console.log(chalk.yellow('\n  ⏸️  Deployment cancelled\n'));
    return 'menu';
  }

  // Enhanced deployment with animation
  const deployAnim = new DeployAnimation();
  deployAnim.start();

  try {
    const result = await executeDeployment(tokenInfo);

    if (result.success && result.tokenAddress) {
      deployAnim.stop(true, 'Token deployed successfully!');
      await showDeployResult(tokenInfo, result);

      // Enhanced post-deploy options
      const nextAction = await select({
        message: 'What would you like to do next?',
        choices: [
          { 
            name: `${chalk.green('🔄')} Deploy Another Token`, 
            value: 'retry',
            description: 'Create a new token'
          },
          { 
            name: `${chalk.cyan('🏠')} Back to Main Menu`, 
            value: 'menu',
            description: 'Return to main menu'
          },
          { 
            name: `${chalk.gray('🚪')} Exit Terminal`, 
            value: 'exit',
            description: 'Close application'
          },
        ],
      });

      return nextAction as 'menu' | 'retry' | 'exit';
    } else {
      deployAnim.stop(false, 'Deployment failed');
      
      // Enhanced error display with suggestions
      const suggestions = [];
      if (result.error?.includes('insufficient funds')) {
        suggestions.push('Check your wallet balance for gas fees');
        suggestions.push(`Get ${getChainName(tokenInfo.chainId)} native tokens`);
      }
      if (result.error?.includes('nonce')) {
        suggestions.push('Wait a moment and try again');
        suggestions.push('Check for pending transactions');
      }
      
      showDeployError(result.error || 'Unknown error', {
        chainId: tokenInfo.chainId,
        retryable: true,
        suggestions,
      });

      const nextAction = await select({
        message: 'How would you like to proceed?',
        choices: [
          { 
            name: `${chalk.yellow('🔄')} Retry Deployment`, 
            value: 'retry',
            description: 'Try deploying again'
          },
          { 
            name: `${chalk.cyan('🏠')} Back to Main Menu`, 
            value: 'menu',
            description: 'Return to main menu'
          },
          { 
            name: `${chalk.gray('🚪')} Exit Terminal`, 
            value: 'exit',
            description: 'Close application'
          },
        ],
      });

      return nextAction as 'menu' | 'retry' | 'exit';
    }
  } catch (err) {
    deployAnim.stop(false, 'Deployment failed');
    showDeployError(err instanceof Error ? err.message : String(err), {
      chainId: tokenInfo.chainId,
      retryable: true,
    });

    const nextAction = await select({
      message: 'How would you like to proceed?',
      choices: [
        { name: 'Retry deployment', value: 'retry' },
        { name: 'Back to main menu', value: 'menu' },
        { name: 'Exit', value: 'exit' },
      ],
    });

    return nextAction as 'menu' | 'retry' | 'exit';
  }
}

// ============================================================================
// Enhanced Main Application Loop
// ============================================================================

async function main(): Promise<void> {
  // Show enhanced animated logo
  await showAnimatedLogo();

  // Welcome message with system info
  console.log(chalk.gray(`  Running on ${PLATFORM_INFO.os} ${PLATFORM_INFO.isTTY ? '(Interactive)' : '(Non-interactive)'}`));
  console.log(chalk.gray(`  Animations: ${ENABLE_ANIMATIONS ? 'Enabled' : 'Disabled'}`));
  console.log('');

  let running = true;
  while (running) {
    try {
      const action = await showMainMenu();

      switch (action) {
        case 'deploy': {
          let deployLoop = true;
          while (deployLoop) {
            const result = await deployToken();
            if (result === 'menu') {
              deployLoop = false;
            } else if (result === 'exit') {
              deployLoop = false;
              running = false;
            }
            // 'retry' continues the loop
          }
          break;
        }

        case 'batch_deploy': {
          console.log(chalk.yellow('\n  📦 Batch Deploy coming soon!\n'));
          await input({ message: 'Press Enter to continue...' });
          break;
        }

        case 'spoofing': {
          const env = getEnvConfig();
          if (!env.privateKey) {
            console.log(chalk.red('\n  ❌ Error: PRIVATE_KEY required for spoofing operations\n'));
            await input({ message: 'Press Enter to continue...' });
            break;
          }

          const deployer = new Deployer({
            config: {
              privateKey: env.privateKey as `0x${string}`,
              chainId: env.chainId,
            }
          });

          const spoofingCLI = new SpoofingCLI(deployer);
          await spoofingCLI.showSpoofingMenu();
          break;
        }

        case 'manage': {
          console.log(chalk.yellow('\n  ⚙️  Token Management coming soon!\n'));
          await input({ message: 'Press Enter to continue...' });
          break;
        }

        case 'claim': {
          console.log(chalk.yellow('\n  💰 Reward Claiming coming soon!\n'));
          await input({ message: 'Press Enter to continue...' });
          break;
        }

        case 'wallet': {
          await handleWalletManagement();
          break;
        }

        case 'settings': {
          console.log(chalk.yellow('\n  ⚙️  Settings coming soon!\n'));
          await input({ message: 'Press Enter to continue...' });
          break;
        }

        case 'help': {
          showEnhancedHelp();
          await input({ message: 'Press Enter to continue...' });
          break;
        }

        case 'exit': {
          running = false;
          break;
        }

        default: {
          console.log(chalk.red('\n  ❌ Unknown action\n'));
          break;
        }
      }
    } catch (error) {
      console.error(chalk.red('\n  ❌ An error occurred:'), error);
      console.log(chalk.gray('  Please try again or report this issue.\n'));
      await input({ message: 'Press Enter to continue...' });
    }
  }

  // Enhanced exit message
  console.log('');
  console.log(chalk.cyan('  👋 Thanks for using UMKM Terminal!'));
  console.log(chalk.gray('  Happy token deploying! 🚀'));
  console.log('');
}

// ============================================================================
// Enhanced Help System
// ============================================================================

function showEnhancedHelp(): void {
  console.log('');
  console.log(chalk.white.bold('  📚 UMKM TERMINAL - HELP & GUIDE'));
  console.log(chalk.gray('  ═══════════════════════════════════════'));
  console.log('');

  // Quick Start
  console.log(chalk.cyan('  🚀 QUICK START'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log('  1. Set PRIVATE_KEY in .env file');
  console.log('  2. Choose "Quick Deploy" from main menu');
  console.log('  3. Enter token name and symbol');
  console.log('  4. Confirm deployment');
  console.log('  5. Your token is live! 🎉');
  console.log('');

  // Features Overview
  console.log(chalk.cyan('  ✨ KEY FEATURES'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.green('⚡')} Quick Deploy      - Deploy in 30 seconds`);
  console.log(`  ${chalk.red('🎯')} Spoofing Ops      - 99.9% reward optimization`);
  console.log(`  ${chalk.blue('📦')} Batch Deploy      - Deploy multiple tokens`);
  console.log(`  ${chalk.yellow('💰')} Auto Rewards      - Automatic fee claiming`);
  console.log(`  ${chalk.purple('🔒')} B07 Compliant     - Clanker standard`);
  console.log(`  ${chalk.cyan('🌐')} Multi-Chain       - Base, ETH, Arbitrum, etc.`);
  console.log('');

  // Spoofing Optimization
  console.log(chalk.red.bold('  🎯 SPOOFING OPTIMIZATION'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.red('  • 99.9% of trading fees go to admin (you)'));
  console.log(chalk.yellow('  • 0.1% minimal allocation to appear legitimate'));
  console.log(chalk.green('  • Automatic reward claiming enabled'));
  console.log(chalk.blue('  • Stealth features for covert operations'));
  console.log(chalk.purple('  • Batch deployment with randomization'));
  console.log('');

  // Environment Setup
  console.log(chalk.cyan('  ⚙️  ENVIRONMENT SETUP'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.yellow('  Required:'));
  console.log('    PRIVATE_KEY=0x...           # Your wallet private key');
  console.log('');
  console.log(chalk.gray('  Optional Defaults:'));
  console.log('    TOKEN_NAME="My Token"       # Default token name');
  console.log('    TOKEN_SYMBOL="MTK"          # Default symbol');
  console.log('    CHAIN_ID=8453               # Default to Base');
  console.log('    SPOOFING_ADMIN_REWARD=0.1   # Admin reward %');
  console.log('    SPOOFING_AUTO_CLAIM=true    # Auto-claim rewards');
  console.log('');

  // Links
  console.log(chalk.cyan('  🔗 USEFUL LINKS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log('    Clanker:    https://clanker.world');
  console.log('    Base:       https://base.org');
  console.log('    Defined:    https://defined.fi');
  console.log('    DexScreener: https://dexscreener.com');
  console.log('');

  // Tips
  console.log(chalk.yellow('  💡 PRO TIPS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log('  • Use Base network for lowest fees');
  console.log('  • Add token images for better visibility');
  console.log('  • Enable spoofing for maximum rewards');
  console.log('  • Use batch deploy for multiple tokens');
  console.log('  • Check wallet balance before deploying');
  console.log('');
}

// ============================================================================
// Application Entry Point
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { main, deployToken, collectTokenInfo, executeDeployment };