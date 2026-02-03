#!/usr/bin/env node
/**
 * UMKM Terminal - Optimized CLI with Latest Changes
 * Enhanced with spoofing operations, streamlined flows, and improved UX
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';
import { buildQROptions } from '../types/deployment-args.js';
import {
  type BatchChain,
  type BatchTemplate,
  formatDuration as batchFormatDuration,
  deployTemplate,
  generateTemplate,
  loadTemplate,
  saveResults,
  saveTemplate,
} from '../batch/index.js';
import { CHAIN_IDS } from '../chains/index.js';
import { getChainName, getExplorerUrl } from '../config/index.js';
import { Deployer } from '../deployer/index.js';
import { getUserWallets, resolveUser } from '../farcaster/index.js';
import { DeployAnimation, MiningAnimation } from '../utils/animation.js';
import { getCurrentWallet, handleWalletManagement } from '../wallet/index.js';
import { SpoofingCLI } from './spoofing-cli.js';
import {
  estimateVanityDifficulty,
  formatDuration,
  getRandomVanityPattern,
  MAX_MINING_TIME_MS,
  mineVanitySalt,
  type VanityMode,
  validateVanityPattern,
} from './vanity.js';

// ============================================================================
// Enhanced Constants & Configuration
// ============================================================================

const VERSION = '4.26.0'; // Updated version with optimizations

// Enhanced terminal detection with better cross-platform support
const IS_TTY = process.stdout.isTTY ?? false;
const ENABLE_ANIMATIONS = IS_TTY && !process.env.CI && !process.env.NO_ANIMATIONS;
const ENABLE_COLORS = chalk.level > 0;

// Platform-specific optimizations
const PLATFORM_INFO = {
  os: process.platform,
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isTermux: process.env.TERMUX_VERSION !== undefined,
  isWSL: process.env.WSL_DISTRO_NAME !== undefined,
  isTTY: IS_TTY,
  colorLevel: chalk.level,
  supportsUnicode: process.env.TERM !== 'dumb' && !process.env.NO_UNICODE,
};

// Optimized logo with conditional Unicode support
const LOGO = PLATFORM_INFO.supportsUnicode ? `
${chalk.cyan('    ██╗   ██╗ ███╗   ███╗ ██╗  ██╗ ███╗   ███╗')}
${chalk.cyan('    ██║   ██║ ████╗ ████║ ██║ ██╔╝ ████╗ ████║')}
${chalk.cyan('    ██║   ██║ ██╔████╔██║ █████╔╝  ██╔████╔██║')}
${chalk.cyan('    ██║   ██║ ██║╚██╔╝██║ ██╔═██╗  ██║╚██╔╝██║')}
${chalk.cyan('    ╚██████╔╝ ██║ ╚═╝ ██║ ██║  ██╗ ██║ ╚═╝ ██║')}
${chalk.cyan('     ╚═════╝  ╚═╝     ╚═╝ ╚═╝  ╚═╝ ╚═╝     ╚═╝')}
${chalk.gray('    ─────────────────────────────────────────────')}
${chalk.white('          Token Deployment Terminal')}
${chalk.gray(`                   v${VERSION}`)}
` : `
${chalk.cyan('    UMKM TERMINAL')}
${chalk.white('    Token Deployment Terminal')}
${chalk.gray(`    v${VERSION}`)}
`;

// Enhanced chain options with better descriptions and performance indicators
const CHAIN_OPTIONS = [
  { 
    name: `${chalk.green('⚡')} Base (8453) - Recommended`, 
    value: 8453,
    description: 'Low fees, fast transactions'
  },
  { 
    name: `${chalk.blue('🔷')} Ethereum (1) - Premium`, 
    value: 1,
    description: 'High fees, maximum security'
  },
  { 
    name: `${chalk.cyan('🔵')} Arbitrum (42161) - Fast`, 
    value: 42161,
    description: 'Low fees, L2 scaling'
  },
  { 
    name: `${chalk.purple('🟣')} Unichain (130) - New`, 
    value: 130,
    description: 'Uniswap native chain'
  },
  { 
    name: `${chalk.yellow('🟡')} Monad (10143) - Beta`, 
    value: 10143,
    description: 'High performance testnet'
  },
];

// Enhanced menu with better organization and visual indicators
const MENU_OPTIONS = [
  { 
    name: `${chalk.green('⚡ [1]')} Quick Deploy - 30 seconds`, 
    value: 'deploy',
    description: 'Deploy token with essential info only'
  },
  { 
    name: `${chalk.blue('📦 [2]')} Batch Deploy (1-100 tokens)`, 
    value: 'batch_deploy',
    description: 'Deploy multiple tokens efficiently'
  },
  { 
    name: `${chalk.red('🎯 [3]')} Spoofing Operations`, 
    value: 'spoofing',
    description: 'Advanced reward optimization'
  },
  { 
    name: `${chalk.cyan('⚙️  [4]')} Manage Tokens`, 
    value: 'manage',
    description: 'Update existing tokens'
  },
  { 
    name: `${chalk.yellow('💰 [5]')} Claim Rewards`, 
    value: 'claim',
    description: 'Collect trading fees'
  },
  { 
    name: `${chalk.magenta('👛 [6]')} Wallet Info`, 
    value: 'wallet',
    description: 'Check balances and gas'
  },
  { name: chalk.gray('───────────────────────'), value: 'separator', disabled: true },
  { 
    name: `${chalk.gray('⚙️  [7]')} Settings`, 
    value: 'settings',
    description: 'Configure CLI preferences'
  },
  { 
    name: `${chalk.gray('❓ [8]')} Help`, 
    value: 'help',
    description: 'Documentation and guides'
  },
  { 
    name: `${chalk.gray('🚪 [0]')} Exit`, 
    value: 'exit',
    description: 'Close terminal'
  },
];

// ============================================================================
// Enhanced UX Configuration
// ============================================================================

type UxMode = 'normal' | 'fast' | 'ultra' | 'expert';
type CliConfig = { 
  uxMode: UxMode;
  lastUsed?: string;
  deployCount?: number;
  favoriteChain?: number;
  skipAnimations?: boolean;
};

const CLI_CONFIG_PATH = path.join(os.homedir(), '.umkm-terminal.json');

function readCliConfig(): CliConfig {
  try {
    if (!fs.existsSync(CLI_CONFIG_PATH)) {
      return { uxMode: 'normal' };
    }
    const raw = fs.readFileSync(CLI_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CliConfig>;
    
    // Validate and set defaults
    const uxMode = ['normal', 'fast', 'ultra', 'expert'].includes(parsed.uxMode || '') 
      ? parsed.uxMode as UxMode 
      : 'normal';
    
    return {
      uxMode,
      lastUsed: parsed.lastUsed,
      deployCount: parsed.deployCount || 0,
      favoriteChain: parsed.favoriteChain,
      skipAnimations: parsed.skipAnimations || false,
    };
  } catch {
    return { uxMode: 'normal' };
  }
}

function writeCliConfig(config: CliConfig): void {
  try {
    const existing = readCliConfig();
    const updated = { ...existing, ...config, lastUsed: new Date().toISOString() };
    fs.writeFileSync(CLI_CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf8');
  } catch (error) {
    console.warn(chalk.yellow('Warning: Could not save CLI config'));
  }
}

// Enhanced environment detection
const ENV_FAST_MODE = process.env.FAST_MODE === 'true' || process.env.FAST_MODE === '1';
const ENV_AUTO_CONFIRM_TRANSACTIONS = 
  process.env.AUTO_CONFIRM_TRANSACTIONS === 'true' || process.env.AUTO_CONFIRM_TRANSACTIONS === '1';
const ENV_EXPERT_MODE = process.env.EXPERT_MODE === 'true' || process.env.EXPERT_MODE === '1';

// Log deprecation warnings for old UX mode parameters
if (ENV_FAST_MODE && !process.env.UX_MODE) {
  console.warn('[DEPRECATED] FAST_MODE is deprecated. Use UX_MODE=fast instead.');
}
if (ENV_AUTO_CONFIRM_TRANSACTIONS && !process.env.UX_MODE) {
  console.warn('[DEPRECATED] AUTO_CONFIRM_TRANSACTIONS is deprecated. Use UX_MODE=ultra instead.');
}
if (ENV_EXPERT_MODE && !process.env.UX_MODE) {
  console.warn('[DEPRECATED] EXPERT_MODE is deprecated. Use UX_MODE=expert instead.');
}

const cliConfig = readCliConfig();
let sessionUxMode: UxMode = (() => {
  // Priority: UX_MODE > AUTO_CONFIRM_TRANSACTIONS > EXPERT_MODE > FAST_MODE > config
  if (process.env.UX_MODE) {
    return process.env.UX_MODE as UxMode;
  }
  if (ENV_AUTO_CONFIRM_TRANSACTIONS) return 'ultra';
  if (ENV_EXPERT_MODE) return 'expert';
  if (ENV_FAST_MODE) return 'fast';
  return cliConfig.uxMode;
})();

// Enhanced confirmation logic with expert mode
function isFastMode(): boolean {
  return ['fast', 'ultra', 'expert'].includes(sessionUxMode) || ENV_FAST_MODE || ENV_AUTO_CONFIRM_TRANSACTIONS;
}

function isAutoConfirmTransactions(): boolean {
  return sessionUxMode === 'ultra' || ENV_AUTO_CONFIRM_TRANSACTIONS;
}

function isExpertMode(): boolean {
  return sessionUxMode === 'expert' || ENV_EXPERT_MODE;
}

type ConfirmKind = 'transaction' | 'optional' | 'safety' | 'expert';

async function maybeConfirm(
  options: Parameters<typeof confirm>[0],
  kind: ConfirmKind
): Promise<boolean> {
  // Expert mode skips all confirmations except safety
  if (kind !== 'safety' && isExpertMode()) {
    return options.default ?? true;
  }
  
  // Ultra mode auto-confirms transactions
  if (kind === 'transaction' && isAutoConfirmTransactions()) {
    return true;
  }
  
  // Fast mode skips optional confirmations
  if (kind === 'optional' && isFastMode()) {
    return options.default ?? true;
  }

  return confirm(options);
}

// ============================================================================
// Enhanced Animation System
// ============================================================================

async function showAnimatedLogo(): Promise<void> {
  if (!ENABLE_ANIMATIONS || cliConfig.skipAnimations) {
    console.clear();
    console.log(LOGO);
    return;
  }

  console.clear();

  if (PLATFORM_INFO.supportsUnicode) {
    const colors = [chalk.cyan, chalk.blue, chalk.magenta, chalk.cyan];
    const lines = [
      '    ██╗   ██╗ ███╗   ███╗ ██╗  ██╗ ███╗   ███╗',
      '    ██║   ██║ ████╗ ████║ ██║ ██╔╝ ████╗ ████║',
      '    ██║   ██║ ██╔████╔██║ █████╔╝  ██╔████╔██║',
      '    ██║   ██║ ██║╚██╔╝██║ ██╔═██╗  ██║╚██╔╝██║',
      '    ╚██████╔╝ ██║ ╚═╝ ██║ ██║  ██╗ ██║ ╚═╝ ██║',
      '     ╚═════╝  ╚═╝     ╚═╝ ╚═╝  ╚═╝ ╚═╝     ╚═╝',
    ];

    console.log('');
    for (let i = 0; i < lines.length; i++) {
      const color = colors[i % colors.length];
      console.log(color(lines[i]));
      await sleep(30); // Faster animation
    }

    console.log(chalk.gray('    ─────────────────────────────────────────────'));
    await sleep(50);
    console.log(chalk.white.bold('          Token Deployment Terminal'));
    console.log(chalk.gray(`                   v${VERSION}`));
  } else {
    console.log(LOGO);
  }
  
  console.log('');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Enhanced Token Symbol Validation
// ============================================================================

function validateTokenSymbolInput(value: string): true | string {
  const trimmed = value.trim();
  if (!trimmed) return 'Symbol is required';
  
  // Enhanced validation with helpful suggestions
  if (trimmed.length > 50) {
    return 'Symbol too long (max 50 characters). Consider shortening it.';
  }
  
  // Allow all characters but provide warnings for potentially problematic ones
  const hasSpaces = /\s/.test(trimmed);
  if (hasSpaces && !isExpertMode()) {
    return 'Spaces in symbols may cause issues. Use expert mode to override.';
  }
  
  return true;
}

// ============================================================================
// Enhanced Token Name Validation
// ============================================================================

function validateTokenNameInput(value: string): true | string {
  const trimmed = value.trim();
  if (!trimmed) return 'Name is required';
  
  if (trimmed.length > 200) {
    return 'Name too long (max 200 characters)';
  }
  
  if (trimmed.length < 2) {
    return 'Name too short (min 2 characters)';
  }
  
  return true;
}

// ============================================================================
// Smart Defaults System
// ============================================================================

interface SmartDefaults {
  chainId: number;
  feeType: 'static' | 'dynamic';
  clankerFee: number;
  pairedFee: number;
  mevBlockDelay: number;
  rewardToken: 'Both' | 'Paired' | 'Clanker';
}

function getSmartDefaults(): SmartDefaults {
  const env = getEnvConfig();
  
  // Use user's favorite chain or Base as default
  const favoriteChain = cliConfig.favoriteChain || CHAIN_IDS.BASE;
  
  return {
    chainId: env.chainId || favoriteChain,
    feeType: env.feeType || 'static',
    clankerFee: env.clankerFee || 5,
    pairedFee: env.pairedFee || 5,
    mevBlockDelay: env.mevBlockDelay || 8,
    rewardToken: env.rewardToken || 'Both',
  };
}

// ============================================================================
// Enhanced Quick Deploy with Smart Suggestions
// ============================================================================

async function collectQuickTokenInfo(env: any, hasTemplate: boolean): Promise<TokenInfo> {
  console.log('');
  console.log(chalk.green.bold('  ⚡ QUICK DEPLOY MODE'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.gray('  Essential info only - smart defaults applied'));
  console.log('');

  const defaults = getSmartDefaults();
  
  // Show smart chain selection
  const chainId = defaults.chainId;
  const chainName = getChainName(chainId);
  console.log(chalk.gray(`  🌐 Network: ${chainName} ${chainId === CHAIN_IDS.BASE ? '(recommended)' : ''}`));

  // Template detection with better messaging
  if (hasTemplate) {
    console.log(chalk.green('  📋 Using template from .env file'));
  }

  // Enhanced name input with suggestions
  const name = await input({
    message: '📝 Token Name:',
    default: env.tokenName || undefined,
    validate: validateTokenNameInput,
  });

  // Enhanced symbol input with auto-suggestions
  let symbolSuggestion = '';
  if (!env.tokenSymbol && name) {
    // Generate smart symbol suggestion
    const words = name.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 1) {
      symbolSuggestion = words[0].substring(0, 6).toUpperCase();
    } else if (words.length > 1) {
      symbolSuggestion = words.map(w => w[0]).join('').substring(0, 6).toUpperCase();
    }
  }

  const symbol = await input({
    message: '🏷️  Token Symbol:',
    default: env.tokenSymbol || symbolSuggestion || undefined,
    validate: validateTokenSymbolInput,
  });

  // Smart image handling with better UX
  let image = '';
  if (env.tokenImage) {
    console.log(chalk.gray(`  🖼️  Image: ${env.tokenImage.substring(0, 50)}... (from .env)`));
    image = env.tokenImage;
  } else {
    const addImage = await maybeConfirm({
      message: '🖼️  Add image URL? (recommended for better visibility)',
      default: false,
    }, 'optional');

    if (addImage) {
      image = await input({
        message: '   📸 Image URL or IPFS CID:',
        default: '',
        validate: (v) => {
          if (!v.trim()) return true;
          const trimmed = v.trim();
          
          // Enhanced validation
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return true;
          }
          if (trimmed.startsWith('ipfs://') || trimmed.startsWith('Qm') || trimmed.startsWith('bafy')) {
            return true;
          }
          
          return 'Use HTTP/HTTPS URL or IPFS CID (Qm.../bafy...)';
        },
      });
    }
  }

  image = normalizeImageUrl(image);

  // Smart description generation
  const description = env.tokenDescription || 
    `${name} (${symbol}) - Deployed on ${chainName} via Clanker Terminal`;

  // Enhanced summary with performance indicators
  console.log('');
  console.log(chalk.white.bold('  📋 DEPLOYMENT SUMMARY'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.white('Name:')}        ${chalk.green(name)}`);
  console.log(`  ${chalk.white('Symbol:')}      ${chalk.green(symbol)}`);
  console.log(`  ${chalk.white('Network:')}     ${chalk.green(chainName)} ${getChainPerformanceIndicator(chainId)}`);
  console.log(`  ${chalk.white('Image:')}       ${image ? chalk.green('✓ Set') : chalk.gray('○ None')}`);
  console.log('');
  console.log(chalk.cyan('  🚀 OPTIMIZED SETTINGS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.gray('  • Fee: 5% static (industry standard)'));
  console.log(chalk.gray('  • MEV Protection: 8 blocks (recommended)'));
  console.log(chalk.gray('  • Vanity: Off (Clanker B07 compliant)'));
  console.log(chalk.gray('  • Rewards: Both Token + WETH (maximum flexibility)'));
  console.log(chalk.gray('  • Spoofing: 0.1% admin / 99.9% recipient (optimized)'));

  // Update user stats
  const updatedConfig = { ...cliConfig };
  updatedConfig.deployCount = (updatedConfig.deployCount || 0) + 1;
  updatedConfig.favoriteChain = chainId;
  writeCliConfig(updatedConfig);

  return {
    name,
    symbol,
    image,
    chainId,
    privateKey: env.privateKey,
    description,
    // Smart defaults optimized for spoofing
    website: '',
    farcaster: '',
    twitter: '',
    zora: '',
    instagram: '',
    tokenAdmin: undefined, // Will use deployer
    rewardRecipient: undefined, // Will use admin
    rewardToken: defaults.rewardToken,
    feeType: defaults.feeType,
    clankerFee: defaults.clankerFee,
    pairedFee: defaults.pairedFee,
    mevBlockDelay: defaults.mevBlockDelay,
    interfaceName: env.interfaceName || 'UMKM Terminal',
    platformName: env.platformName || 'Clanker',
    vanityMode: 'off' as const, // B07 compliant
    vanityPrefix: undefined,
    vanitySuffix: undefined,
  };
}

// ============================================================================
// Enhanced Chain Performance Indicators
// ============================================================================

function getChainPerformanceIndicator(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.BASE:
      return chalk.green('⚡ Fast & Cheap');
    case 1: // Ethereum
      return chalk.red('💰 Expensive');
    case 42161: // Arbitrum
      return chalk.blue('🚀 L2 Fast');
    case 130: // Unichain
      return chalk.purple('🆕 New');
    case 10143: // Monad
      return chalk.yellow('🧪 Beta');
    default:
      return '';
  }
}

// ============================================================================
// Enhanced Main Menu with Context
// ============================================================================

async function showMainMenu(): Promise<string> {
  console.log('');
  console.log(chalk.white.bold('  🚀 MAIN MENU'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  
  // Show user context if available
  if (cliConfig.deployCount && cliConfig.deployCount > 0) {
    console.log(chalk.gray(`  📊 Deployed: ${cliConfig.deployCount} tokens`));
  }
  
  if (cliConfig.favoriteChain) {
    const chainName = getChainName(cliConfig.favoriteChain);
    console.log(chalk.gray(`  ⭐ Favorite: ${chainName}`));
  }
  
  console.log('');
  
  return await select({
    message: 'Select operation:',
    choices: MENU_OPTIONS.filter((o) => o.value !== 'separator'),
  });
}

// ============================================================================
// Enhanced Error Handling and Recovery
// ============================================================================

interface DeployResult {
  success: boolean;
  tokenAddress?: string;
  txHash?: string;
  error?: string;
  gasUsed?: bigint;
  deploymentTime?: number;
}

function showDeployError(error: string, context?: { 
  chainId?: number; 
  retryable?: boolean; 
  suggestions?: string[] 
}): void {
  console.log('');
  console.log(chalk.red.bold('  ❌ DEPLOYMENT FAILED'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.red('Error:')} ${error}`);
  
  if (context?.suggestions && context.suggestions.length > 0) {
    console.log('');
    console.log(chalk.yellow('  💡 SUGGESTIONS:'));
    context.suggestions.forEach((suggestion, i) => {
      console.log(`  ${chalk.gray(`${i + 1}.`)} ${suggestion}`);
    });
  }
  
  if (context?.chainId) {
    const chainName = getChainName(context.chainId);
    console.log('');
    console.log(chalk.gray(`  🌐 Network: ${chainName}`));
    console.log(chalk.gray(`  🔗 Explorer: ${getExplorerUrl(context.chainId)}`));
  }
  
  console.log('');
}

// ============================================================================
// Enhanced Success Display with Analytics
// ============================================================================

async function showDeployResult(info: TokenInfo, result: DeployResult): Promise<void> {
  const chainName = getChainName(info.chainId);
  const timestamp = new Date().toISOString();
  const deployTime = result.deploymentTime ? `${result.deploymentTime}ms` : 'N/A';

  console.log('');
  console.log(chalk.green.bold('  ✅ TOKEN DEPLOYED SUCCESSFULLY'));
  console.log(chalk.gray('  ═══════════════════════════════════════'));
  console.log('');

  // Save deployment record
  if (result.tokenAddress) {
    saveDeployedToken({
      address: result.tokenAddress,
      name: info.name,
      symbol: info.symbol,
      chainId: info.chainId,
      deployedAt: timestamp,
      txHash: result.txHash,
      gasUsed: result.gasUsed?.toString(),
      deploymentTime: result.deploymentTime,
    });
  }

  // Enhanced token info display
  console.log(`  ${chalk.white.bold(info.name)} ${chalk.gray(`(${info.symbol})`)} on ${chalk.yellow(chainName)}`);
  console.log(`  ${chalk.green(result.tokenAddress)}`);
  console.log('');

  // Performance metrics
  console.log(chalk.cyan('  📊 DEPLOYMENT METRICS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('Deploy Time:')}    ${deployTime}`);
  if (result.gasUsed) {
    console.log(`  ${chalk.gray('Gas Used:')}       ${result.gasUsed.toLocaleString()}`);
  }
  console.log(`  ${chalk.gray('Network:')}        ${chainName}`);
  console.log('');

  // Enhanced links with better organization
  const deployerAddress = privateKeyToAccount(info.privateKey as `0x${string}`).address;
  const definedUrl = `https://www.defined.fi/tokens/discover?creatorAddress=${deployerAddress}`;
  const dexChainSlug = DEXSCREENER_CHAIN_SLUG_BY_CHAIN_ID[info.chainId] || 'base';
  
  console.log(chalk.cyan('  🔗 QUICK LINKS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('Portfolio:')}      ${chalk.cyan(definedUrl)}`);
  console.log(`  ${chalk.gray('Trading:')}        ${chalk.cyan(`https://dexscreener.com/${dexChainSlug}/${result.tokenAddress}`)}`);
  console.log(`  ${chalk.gray('Clanker:')}        ${chalk.cyan(`https://clanker.world/clanker/${result.tokenAddress}`)}`);
  console.log(`  ${chalk.gray('Explorer:')}       ${chalk.cyan(`${getExplorerUrl(info.chainId)}/address/${result.tokenAddress}`)}`);
  console.log('');

  // QR Code with better error handling
  if (ENABLE_ANIMATIONS && !cliConfig.skipAnimations) {
    console.log(chalk.white.bold('  📱 SCAN TO VIEW'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    try {
      await printQRCode(definedUrl);
    } catch (err) {
      console.log(chalk.yellow('  📱 QR code unavailable'));
      console.log(chalk.cyan(`  ${definedUrl}`));
    }
    console.log('');
  }

  // Spoofing optimization reminder
  console.log(chalk.red.bold('  🎯 SPOOFING OPTIMIZATION ACTIVE'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.red('  • 99.9% of trading fees go to admin address'));
  console.log(chalk.yellow('  • 0.1% minimal allocation to appear legitimate'));
  console.log(chalk.green('  • Automatic reward claiming enabled'));
  console.log('');
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

    // Fees (Spoofing Optimized)
    feeType: (process.env.FEE_TYPE || 'static') as 'static' | 'dynamic',
    clankerFee: Number(process.env.CLANKER_FEE) || 5,
    pairedFee: Number(process.env.PAIRED_FEE) || 5,

    // MEV Protection
    mevBlockDelay: Number(process.env.MEV_BLOCK_DELAY) || 8,

    // Social Links
    tokenWebsite: process.env.TOKEN_WEBSITE || '',
    tokenTwitter: process.env.TOKEN_TWITTER || '',
    tokenTelegram: process.env.TOKEN_TELEGRAM || '',
    tokenDiscord: process.env.TOKEN_DISCORD || '',
    tokenFarcaster: process.env.TOKEN_FARCASTER || '',

    // Vanity (B07 Compliant)
    vanitySuffix: process.env.VANITY_SUFFIX || '',

    // Batch Deploy
    batchCount: Number(process.env.BATCH_COUNT) || 5,
    batchDelay: Number(process.env.BATCH_DELAY) || 3,
    batchRetries: Number(process.env.BATCH_RETRIES) || 2,

    // Vault
    vaultEnabled: process.env.VAULT_ENABLED === 'true',
    vaultPercentage: Number(process.env.VAULT_PERCENTAGE) || 10,
    vaultLockupDays: Number(process.env.VAULT_LOCKUP_DAYS) || 30,
    vaultVestingDays: Number(process.env.VAULT_VESTING_DAYS) || 0,

    // Clanker verification
    interfaceName: process.env.INTERFACE_NAME || 'UMKM Terminal',
    platformName: process.env.PLATFORM_NAME || 'Clanker',

    // Spoofing Configuration
    spoofingAdminReward: Number(process.env.SPOOFING_ADMIN_REWARD) || 0.1,
    spoofingRecipientReward: Number(process.env.SPOOFING_RECIPIENT_REWARD) || 99.9,
    spoofingStealthMode: process.env.SPOOFING_STEALTH_MODE === 'true',
    spoofingAutoClaim: process.env.SPOOFING_AUTO_CLAIM === 'true',
  };
}

// ============================================================================
// Enhanced Utility Functions
// ============================================================================

function normalizeImageUrl(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Already a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Already ipfs:// format
  if (trimmed.startsWith('ipfs://')) {
    return trimmed;
  }

  // Raw IPFS CID (Qm... or bafy... or bafk...)
  if (trimmed.startsWith('Qm') || trimmed.startsWith('bafy') || trimmed.startsWith('bafk')) {
    return `ipfs://${trimmed}`;
  }

  return trimmed;
}

async function printQRCode(url: string): Promise<void> {
  if (!ENABLE_ANIMATIONS || cliConfig.skipAnimations) {
    console.log(chalk.cyan(`  ${url}`));
    return;
  }

  try {
    const qrcode = await import('qrcode-terminal');
    const generate = qrcode.default?.generate || qrcode.generate;

    if (typeof generate !== 'function') {
      console.log(chalk.cyan(`  ${url}`));
      return;
    }

    await new Promise<void>((resolve, reject) => {
      try {
        generate(
          url,
          buildQROptions({ small: true, errorCorrectLevel: 'M' }),
          (code: string) => {
            const lines = code.split('\n');
            for (const line of lines) {
              console.log(`  ${line}`);
            }
            resolve();
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.log(chalk.cyan(`  ${url}`));
  }
}

// ============================================================================
// Enhanced Deployment Record Keeping
// ============================================================================

interface DeploymentRecord {
  address: string;
  name: string;
  symbol: string;
  chainId: number;
  deployedAt: string;
  txHash?: string;
  gasUsed?: string;
  deploymentTime?: number;
}

function saveDeployedToken(record: DeploymentRecord): void {
  try {
    const filePath = '.deployed-tokens.json';
    let records: DeploymentRecord[] = [];
    
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, 'utf8');
      records = JSON.parse(existing);
    }
    
    records.push(record);
    
    // Keep only last 100 records
    if (records.length > 100) {
      records = records.slice(-100);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
  } catch (error) {
    console.warn(chalk.yellow('Warning: Could not save deployment record'));
  }
}

// ============================================================================
// Export Enhanced Functions
// ============================================================================

export {
  showAnimatedLogo,
  showMainMenu,
  collectQuickTokenInfo,
  showDeployResult,
  showDeployError,
  maybeConfirm,
  validateTokenSymbolInput,
  validateTokenNameInput,
  getSmartDefaults,
  getChainPerformanceIndicator,
  normalizeImageUrl,
  saveDeployedToken,
  type UxMode,
  type CliConfig,
  type DeployResult,
  type DeploymentRecord,
  VERSION,
  PLATFORM_INFO,
  ENABLE_ANIMATIONS,
  ENABLE_COLORS,
};