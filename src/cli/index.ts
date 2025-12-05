#!/usr/bin/env node
/**
 * UMKM Terminal - Interactive Token Deployment CLI
 * With animated logo, arrow key navigation, and vanity address support
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAIN_IDS } from '../chains/index.js';
import { getChainName, getExplorerUrl } from '../config/index.js';
import { Deployer } from '../deployer/index.js';
import { 
  estimateVanityDifficulty, 
  formatDuration, 
  validateVanityPattern, 
  mineVanitySalt,
  getRandomVanityPattern,
  MAX_MINING_TIME_MS,
  type VanityMode,
} from './vanity.js';

// ============================================================================
// Constants & Environment Detection
// ============================================================================

const VERSION = '4.25.0';

// Detect terminal capabilities for cross-platform compatibility
const IS_TTY = process.stdout.isTTY ?? false;
const ENABLE_ANIMATIONS = IS_TTY;

// Platform info (for debugging)
const PLATFORM_INFO = {
  os: process.platform,
  isWindows: process.platform === 'win32',
  isTermux: process.env.TERMUX_VERSION !== undefined,
  isTTY: IS_TTY,
  colorLevel: chalk.level,
};

// Big UMKM ASCII Logo
const LOGO = `
${chalk.cyan('    ██╗   ██╗ ███╗   ███╗ ██╗  ██╗ ███╗   ███╗')}
${chalk.cyan('    ██║   ██║ ████╗ ████║ ██║ ██╔╝ ████╗ ████║')}
${chalk.cyan('    ██║   ██║ ██╔████╔██║ █████╔╝  ██╔████╔██║')}
${chalk.cyan('    ██║   ██║ ██║╚██╔╝██║ ██╔═██╗  ██║╚██╔╝██║')}
${chalk.cyan('    ╚██████╔╝ ██║ ╚═╝ ██║ ██║  ██╗ ██║ ╚═╝ ██║')}
${chalk.cyan('     ╚═════╝  ╚═╝     ╚═╝ ╚═╝  ╚═╝ ╚═╝     ╚═╝')}
${chalk.gray('    ─────────────────────────────────────────────')}
${chalk.white('          Token Deployment Terminal')}
${chalk.gray(`                   v${VERSION}`)}
`;

// Chain options for interactive select
const CHAIN_OPTIONS = [
  { name: 'Base (8453)', value: 8453 },
  { name: 'Ethereum (1)', value: 1 },
  { name: 'Arbitrum (42161)', value: 42161 },
  { name: 'Unichain (130)', value: 130 },
  { name: 'Monad (10143)', value: 10143 },
];

// ASCII spinner frames (no emoji)
const SPINNER_FRAMES = ['|', '/', '-', '\\'];

// Progress bar helper
function createProgressBar(progress: number, width: number = 20): string {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  const filledBar = chalk.cyan('#'.repeat(filled));
  const emptyBar = chalk.gray('-'.repeat(empty));
  return `[${filledBar}${emptyBar}]`;
}

// Animated mining display with proper ASCII art
class MiningAnimation {
  private frameIndex = 0;
  private startTime = Date.now();
  private interval: NodeJS.Timeout | null = null;
  private currentAttempts = 0;
  private pattern = '';
  private maxTime: number;

  constructor(pattern: string, maxTimeMs: number = 30000) {
    this.pattern = pattern;
    this.maxTime = maxTimeMs;
  }

  start(): void {
    this.startTime = Date.now();
    console.log('');
    console.log(chalk.cyan('  +------------------------------------------+'));
    console.log(chalk.cyan('  |') + chalk.white.bold('         VANITY MINING IN PROGRESS        ') + chalk.cyan('|'));
    console.log(chalk.cyan('  +------------------------------------------+'));
    console.log('');
    
    // Only animate in TTY mode
    if (ENABLE_ANIMATIONS) {
      this.interval = setInterval(() => this.render(), 100);
    }
  }

  update(attempts: number): void {
    this.currentAttempts = attempts;
  }

  private render(): void {
    this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
    const spinner = SPINNER_FRAMES[this.frameIndex];
    const elapsed = (Date.now() - this.startTime) / 1000;
    const progress = Math.min(elapsed / (this.maxTime / 1000), 1);
    const progressBar = createProgressBar(progress);
    const timeLeft = Math.max(0, Math.ceil((this.maxTime / 1000) - elapsed));
    const attemptsK = (this.currentAttempts / 1000).toFixed(0);
    
    process.stdout.write(`\r${' '.repeat(70)}\r`);
    process.stdout.write(
      `  ${chalk.cyan(spinner)} ${chalk.yellow(this.pattern)} ${progressBar} ` +
      `${chalk.white(`${timeLeft}s`)} ${chalk.cyan(`${attemptsK}k`)} tries`
    );
  }

  stop(success: boolean, message: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write(`\r${' '.repeat(70)}\r`);
    if (success) {
      console.log(chalk.green(`  [OK] ${message}`));
    } else {
      console.log(chalk.yellow(`  [!] ${message}`));
    }
    console.log('');
  }
}

// Animated deploy display with proper ASCII art
class DeployAnimation {
  private frameIndex = 0;
  private interval: NodeJS.Timeout | null = null;
  private dotCount = 0;
  private step = 0;
  private steps = [
    'Preparing transaction',
    'Signing with wallet',
    'Broadcasting to network',
    'Waiting for confirmation',
    'Finalizing deployment',
  ];

  start(): void {
    console.log('');
    console.log(chalk.cyan('  +------------------------------------------+'));
    console.log(chalk.cyan('  |') + chalk.white.bold('            DEPLOYING TOKEN               ') + chalk.cyan('|'));
    console.log(chalk.cyan('  +------------------------------------------+'));
    console.log('');
    
    // Only animate in TTY mode
    if (ENABLE_ANIMATIONS) {
      this.interval = setInterval(() => this.render(), 200);
    }
  }

  private render(): void {
    this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
    const spinner = SPINNER_FRAMES[this.frameIndex];
    const stepText = this.steps[this.step % this.steps.length];
    
    // Animate dots
    this.dotCount = (this.dotCount + 1) % 4;
    const dots = '.'.repeat(this.dotCount);
    
    // Cycle through steps every 8 frames
    if (this.frameIndex === 0) {
      this.step = (this.step + 1) % this.steps.length;
    }
    
    process.stdout.write(`\r${' '.repeat(60)}\r`);
    process.stdout.write(`  ${chalk.cyan(spinner)} ${chalk.white(stepText)}${dots}`);
  }

  stop(success: boolean, message: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write(`\r${' '.repeat(60)}\r`);
    if (success) {
      console.log(chalk.green(`  [OK] ${message}`));
    } else {
      console.log(chalk.red(`  [FAIL] ${message}`));
    }
    console.log('');
  }
}

// Main menu options - organized by category
const MENU_OPTIONS = [
  { name: `${chalk.cyan('[1]')} Deploy New Token`, value: 'deploy' },
  { name: `${chalk.cyan('[2]')} Manage Tokens`, value: 'manage' },
  { name: `${chalk.cyan('[3]')} Claim Rewards`, value: 'claim' },
  { name: `${chalk.cyan('[4]')} Wallet Info`, value: 'wallet' },
  { name: chalk.gray('---'), value: 'separator', disabled: true },
  { name: `${chalk.cyan('[5]')} Settings`, value: 'settings' },
  { name: `${chalk.cyan('[6]')} Help`, value: 'help' },
  { name: `${chalk.cyan('[0]')} Exit`, value: 'exit' },
];

// Manage submenu
const MANAGE_OPTIONS = [
  { name: `${chalk.cyan('[1]')} Update Token Image`, value: 'update_image' },
  { name: `${chalk.cyan('[2]')} Update Token Metadata`, value: 'update_metadata' },
  { name: `${chalk.cyan('[3]')} Update Reward Recipient`, value: 'update_recipient' },
  { name: `${chalk.cyan('[4]')} Update Reward Admin`, value: 'update_admin' },
  { name: chalk.gray('---'), value: 'separator', disabled: true },
  { name: `${chalk.yellow('[<]')} Back to Main Menu`, value: 'back' },
];

// Claim submenu
const CLAIM_OPTIONS = [
  { name: `${chalk.cyan('[1]')} Claim Trading Fees`, value: 'claim_fees' },
  { name: `${chalk.cyan('[2]')} Claim Vaulted Tokens`, value: 'claim_vault' },
  { name: `${chalk.cyan('[3]')} Check Available Rewards`, value: 'check_rewards' },
  { name: chalk.gray('---'), value: 'separator', disabled: true },
  { name: `${chalk.yellow('[<]')} Back to Main Menu`, value: 'back' },
];

// ============================================================================
// Animated Logo
// ============================================================================

async function showAnimatedLogo(): Promise<void> {
  console.clear();
  
  const colors = [chalk.cyan, chalk.blue, chalk.magenta, chalk.cyan];
  const lines = [
    '    ██╗   ██╗ ███╗   ███╗ ██╗  ██╗ ███╗   ███╗',
    '    ██║   ██║ ████╗ ████║ ██║ ██╔╝ ████╗ ████║',
    '    ██║   ██║ ██╔████╔██║ █████╔╝  ██╔████╔██║',
    '    ██║   ██║ ██║╚██╔╝██║ ██╔═██╗  ██║╚██╔╝██║',
    '    ╚██████╔╝ ██║ ╚═╝ ██║ ██║  ██╗ ██║ ╚═╝ ██║',
    '     ╚═════╝  ╚═╝     ╚═╝ ╚═╝  ╚═╝ ╚═╝     ╚═╝',
  ];

  // Animate each line appearing
  console.log('');
  for (let i = 0; i < lines.length; i++) {
    const color = colors[i % colors.length];
    console.log(color(lines[i]));
    await sleep(50);
  }
  
  console.log(chalk.gray('    ─────────────────────────────────────────────'));
  await sleep(100);
  console.log(chalk.white.bold('          Token Deployment Terminal'));
  console.log(chalk.gray(`                   v${VERSION}`));
  console.log('');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  if (!address) return false;
  const trimmed = address.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
}

/**
 * Prompt for token address with validation and example
 */
async function promptTokenAddress(): Promise<`0x${string}` | null> {
  console.log('');
  console.log(chalk.gray('  Format: 0x... (42 characters)'));
  console.log(chalk.gray('  Example: 0x1234...abcd'));
  console.log('');
  
  const address = await input({
    message: 'Token address:',
    validate: (v) => {
      if (!v.trim()) return 'Address is required';
      if (!isValidAddress(v)) return 'Invalid format. Must be 0x followed by 40 hex characters';
      return true;
    },
  });
  
  return address.trim() as `0x${string}`;
}

// ============================================================================
// Image URL Helper
// ============================================================================

// IPFS Gateway options
/**
 * Interactive image input with auto IPFS detection and preview
 */
async function collectImageUrl(): Promise<string> {
  console.log('');
  console.log(chalk.gray('  Enter image URL or IPFS CID'));
  console.log(chalk.gray('  Supports: http://, https://, ipfs://, Qm..., bafy...'));
  console.log('');
  
  const imageInput = await input({
    message: 'Image:',
    default: '',
    validate: (v) => {
      if (!v) return true; // Allow empty (skip)
      const trimmed = v.trim();
      
      // Check if it's a valid URL
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return true;
      }
      
      // Check if it's IPFS format
      if (trimmed.startsWith('ipfs://') || trimmed.startsWith('Qm') || trimmed.startsWith('bafy')) {
        return true;
      }
      
      return 'Invalid format. Use URL (http/https) or IPFS CID (Qm.../bafy...)';
    },
  });
  
  if (!imageInput) {
    console.log(chalk.gray('  [i] No image - skipped'));
    return '';
  }
  
  const trimmed = imageInput.trim();
  let finalUrl = trimmed;
  
  // Auto-convert IPFS CID to gateway URL
  if (trimmed.startsWith('Qm') || trimmed.startsWith('bafy')) {
    finalUrl = `ipfs://${trimmed}`;
    console.log(chalk.green(`  ✓ Auto IPFS: ${finalUrl}`));
  } else if (trimmed.startsWith('ipfs://')) {
    finalUrl = trimmed;
    console.log(chalk.green(`  ✓ IPFS URL: ${finalUrl}`));
  } else {
    console.log(chalk.green(`  ✓ URL: ${finalUrl}`));
  }
  
  // Show preview link
  const previewUrl = getImagePreviewUrl(finalUrl);
  if (previewUrl) {
    console.log(chalk.gray(`  Preview: ${previewUrl}`));
  }
  
  return finalUrl;
}

/**
 * Get preview URL for an image (converts IPFS to gateway URL)
 */
function getImagePreviewUrl(url: string): string {
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return url;
}

// ============================================================================
// Interactive Prompts
// ============================================================================

async function showMainMenu(): Promise<string> {
  console.log('');
  console.log(chalk.white.bold('  MAIN MENU'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  return await select({
    message: 'Select an option:',
    choices: MENU_OPTIONS.filter(o => o.value !== 'separator'),
  });
}

async function showManageMenu(): Promise<string> {
  console.log('');
  console.log(chalk.white.bold('  MANAGE TOKENS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  return await select({
    message: 'Select an option:',
    choices: MANAGE_OPTIONS.filter(o => o.value !== 'separator'),
  });
}

async function showClaimMenu(): Promise<string> {
  console.log('');
  console.log(chalk.white.bold('  CLAIM REWARDS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  return await select({
    message: 'Select an option:',
    choices: CLAIM_OPTIONS.filter(o => o.value !== 'separator'),
  });
}

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
  // Admin & Rewards
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
  // Vanity Address
  vanityMode: VanityMode;
  vanityPrefix?: string;
  vanitySuffix?: string;
  vanitySalt?: `0x${string}`;
}

function getEnvConfig() {
  return {
    // Wallet
    privateKey: process.env.PRIVATE_KEY || '',
    chainId: Number(process.env.CHAIN_ID) || CHAIN_IDS.BASE,
    
    // Admin & Rewards
    tokenAdmin: process.env.TOKEN_ADMIN || '',
    rewardRecipient: process.env.REWARD_RECIPIENT || '',
    rewardToken: (process.env.REWARD_TOKEN || 'Both') as 'Both' | 'Paired' | 'Clanker',
    
    // Fees
    feeType: (process.env.FEE_TYPE || 'static') as 'static' | 'dynamic',
    clankerFee: Number(process.env.CLANKER_FEE) || 5,
    pairedFee: Number(process.env.PAIRED_FEE) || 5,
    
    // MEV
    mevBlockDelay: Number(process.env.MEV_BLOCK_DELAY) || 8,
    
    // Clanker verification
    interfaceName: process.env.INTERFACE_NAME || 'UMKM Terminal',
    platformName: process.env.PLATFORM_NAME || 'Clanker',
    
    // Token template (optional - for quick deploy)
    tokenName: process.env.TOKEN_NAME || '',
    tokenSymbol: process.env.TOKEN_SYMBOL || '',
    tokenImage: process.env.TOKEN_IMAGE || '',
    tokenDescription: process.env.TOKEN_DESCRIPTION || '',
    tokenTwitter: process.env.TOKEN_TWITTER || '',
    tokenTelegram: process.env.TOKEN_TELEGRAM || '',
    tokenWebsite: process.env.TOKEN_WEBSITE || '',
    
    // Vanity
    vanitySuffix: process.env.VANITY_SUFFIX || '',
  };
}

async function collectTokenInfo(): Promise<TokenInfo> {
  const env = getEnvConfig();
  
  // Check required env vars
  if (!env.privateKey) {
    console.log(chalk.red('\n  Error: PRIVATE_KEY not set'));
    console.log(chalk.gray('  Add PRIVATE_KEY=0x... to your .env file\n'));
    process.exit(1);
  }

  // Check if template exists in .env
  const hasTemplate = env.tokenName && env.tokenSymbol;

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: Network Selection
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.white.bold('  STEP 1: SELECT NETWORK'));
  console.log(chalk.gray('  ─────────────────────────────────────'));

  const chainId = await select({
    message: 'Chain:',
    choices: CHAIN_OPTIONS,
    default: env.chainId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Token Details (auto-fill from .env if available)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.white.bold('  STEP 2: TOKEN DETAILS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  
  if (hasTemplate) {
    console.log(chalk.green('  [i] Template loaded from .env'));
  }

  const name = await input({
    message: 'Name:',
    default: env.tokenName || undefined,
    validate: (v) => v.length > 0 || 'Required',
  });

  const symbol = await input({
    message: 'Symbol:',
    default: env.tokenSymbol || undefined,
    validate: (v) => (v.length >= 2 && v.length <= 10) || '2-10 characters',
  });

  // Image with smart input (use template if available, press Enter to use)
  let image = '';
  if (env.tokenImage) {
    image = await input({
      message: 'Image URL:',
      default: env.tokenImage,
    });
  } else {
    image = await collectImageUrl();
  }

  // Auto-generate description if not provided
  const defaultDescription = env.tokenDescription || `${name} ($${symbol}) - A token deployed on ${getChainName(chainId)} via Clanker`;
  
  const description = await input({
    message: 'Description:',
    default: defaultDescription,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 3: Social Links & Base Ecosystem (auto-fill from .env)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.white.bold('  STEP 3: SOCIAL LINKS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.gray('  Press Enter to skip or use default'));
  console.log('');

  // Social links
  const website = await input({
    message: 'Website:',
    default: env.tokenWebsite || '',
  });

  const farcaster = await input({
    message: 'Farcaster:',
    default: process.env.TOKEN_FARCASTER || '',
  });

  const twitter = await input({
    message: 'Twitter/X:',
    default: env.tokenTwitter || '',
  });

  const zora = await input({
    message: 'Zora:',
    default: process.env.TOKEN_ZORA || '',
  });

  const instagram = await input({
    message: 'Instagram:',
    default: process.env.TOKEN_INSTAGRAM || '',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 4: Advanced Settings
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.white.bold('  STEP 4: ADVANCED SETTINGS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  
  const customizeAdvanced = await confirm({
    message: 'Customize advanced settings?',
    default: false,
  });

  let tokenAdmin = env.tokenAdmin;
  let rewardRecipient = env.rewardRecipient;
  let rewardToken = env.rewardToken;
  let feeType = env.feeType;
  let clankerFee = env.clankerFee;
  let pairedFee = env.pairedFee;
  let mevBlockDelay = env.mevBlockDelay;

  if (customizeAdvanced) {
    // Admin & Rewards
    console.log('');
    console.log(chalk.gray('  -- Admin & Rewards --'));
    
    const adminInput = await input({
      message: 'Token Admin (0x...):',
      default: tokenAdmin || '(deployer)',
    });
    if (adminInput && adminInput !== '(deployer)') {
      tokenAdmin = adminInput;
    }

    const recipientInput = await input({
      message: 'Reward Recipient (0x...):',
      default: rewardRecipient || '(deployer)',
    });
    if (recipientInput && recipientInput !== '(deployer)') {
      rewardRecipient = recipientInput;
    }

    rewardToken = await select({
      message: 'Reward Token:',
      choices: [
        { name: 'Both - Receive fees in Token + WETH (recommended)', value: 'Both' as const },
        { name: 'Paired (WETH) - Receive fees in WETH only', value: 'Paired' as const },
        { name: 'Clanker - Receive fees in token only', value: 'Clanker' as const },
      ],
      default: rewardToken,
    });

    // Fee Configuration
    console.log('');
    console.log(chalk.gray('  -- Fee Configuration --'));
    console.log(chalk.gray('  Fees apply to both Token and WETH equally'));
    console.log('');

    const feeMode = await select({
      message: 'Fee Mode:',
      choices: [
        { name: 'Static 5% (recommended)', value: 'static_default' },
        { name: 'Static Custom (1-80%)', value: 'static_custom' },
        { name: 'Dynamic (1-5% based on volatility)', value: 'dynamic' },
      ],
      default: 'static_default',
    });

    if (feeMode === 'static_default') {
      feeType = 'static';
      clankerFee = 5;
      pairedFee = 5;
    } else if (feeMode === 'static_custom') {
      feeType = 'static';
      const customFeeInput = await input({
        message: 'Custom Fee % (1-80):',
        default: '5',
        validate: (v) => {
          const n = Number(v);
          return (n >= 1 && n <= 80) || 'Must be 1-80%';
        },
      });
      const customFee = Number(customFeeInput);
      clankerFee = customFee;
      pairedFee = customFee;
    } else {
      // Dynamic fee
      feeType = 'dynamic';
      console.log(chalk.gray('  Dynamic fee: 1% base, up to 5% during high volatility'));
      clankerFee = 1;
      pairedFee = 5;
    }

    // MEV Protection
    console.log('');
    console.log(chalk.gray('  -- MEV Protection --'));

    const mevInput = await input({
      message: 'MEV Block Delay (0=off, 8=default):',
      default: String(mevBlockDelay),
      validate: (v) => {
        const n = Number(v);
        return (n >= 0 && n <= 50) || 'Must be 0-50';
      },
    });
    mevBlockDelay = Number(mevInput);
  } else {
    // Show current defaults
    console.log('');
    console.log(chalk.gray(`  Using defaults from .env:`));
    console.log(chalk.gray(`  - Fee: ${feeType} (${clankerFee}%/${pairedFee}%)`));
    console.log(chalk.gray(`  - MEV: ${mevBlockDelay} blocks`));
    console.log(chalk.gray(`  - Rewards: ${rewardToken}`));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 5: Vanity Address (Suffix Only - 3 chars max)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.white.bold('  STEP 5: VANITY ADDRESS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.gray('  Customize the last 3 digits of token address'));
  console.log(chalk.gray('  Off = Default Clanker (suffix B07)'));
  console.log('');

  // Vanity address - use .env default or select
  let vanityMode: VanityMode = 'off';
  let vanitySuffix: string | undefined;

  // Default vanity mode selection with .env as default
  const defaultVanityChoice = env.vanitySuffix ? 'custom' : 'off';
  
  vanityMode = await select({
    message: 'Vanity address mode:',
    choices: [
      { name: 'Off (default Clanker - suffix B07)', value: 'off' as const },
      { name: 'Random suffix (e.g., 420, abc, 777)', value: 'random' as const },
      { name: 'Custom suffix (3 chars max)', value: 'custom' as const },
    ],
    default: defaultVanityChoice,
  }) as VanityMode;

  if (vanityMode === 'random') {
    const pattern = getRandomVanityPattern();
    vanitySuffix = pattern.suffix;
    console.log('');
    console.log(chalk.cyan(`  ✓ Selected suffix: ...${vanitySuffix?.toUpperCase()}`));
  } else if (vanityMode === 'custom') {
    // Use .env value as default
    const suffixInput = await input({
      message: 'Enter suffix (3 hex chars):',
      default: env.vanitySuffix || '',
      validate: (v) => {
        if (!v) return 'Please enter a suffix';
        const result = validateVanityPattern(v);
        return result.valid || result.error || 'Invalid pattern';
      },
    });
    vanitySuffix = suffixInput.toLowerCase();
    console.log('');
    console.log(chalk.cyan(`  ✓ Custom suffix: ...${vanitySuffix.toUpperCase()}`));

    const estimate = estimateVanityDifficulty(undefined, vanitySuffix);
    console.log(chalk.gray(`  Estimated: ${formatDuration(estimate.estimatedTimeSeconds)} (~${estimate.estimatedAttempts.toLocaleString()} tries)`));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 6: DOUBLE VERIFICATION (Clanker Requirements)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.white.bold('  ═══════════════════════════════════════'));
  console.log(chalk.white.bold('  DEPLOYMENT VERIFICATION'));
  console.log(chalk.white.bold('  ═══════════════════════════════════════'));
  console.log('');

  // Get deployer address for display
  const deployerAddress = privateKeyToAccount(env.privateKey as `0x${string}`).address;
  const displayAdmin = tokenAdmin || deployerAddress;
  const displayRecipient = rewardRecipient || deployerAddress;

  // Token Info
  console.log(chalk.cyan('  TOKEN INFO'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('Name:')}        ${chalk.white(name)}`);
  console.log(`  ${chalk.gray('Symbol:')}      ${chalk.white(symbol)}`);
  console.log(`  ${chalk.gray('Image:')}       ${image ? chalk.green('✓ Set') : chalk.yellow('○ Empty')}`);
  console.log(`  ${chalk.gray('Description:')} ${description ? chalk.green('✓ Set') : chalk.gray('○ Empty')}`);
  console.log('');

  // Chain & Network
  console.log(chalk.cyan('  NETWORK'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('Chain:')}       ${chalk.white(getChainName(chainId))}`);
  console.log(`  ${chalk.gray('Deployer:')}    ${deployerAddress.slice(0, 10)}...${deployerAddress.slice(-8)}`);
  console.log('');

  // Rewards (Multi-Recipient)
  console.log(chalk.cyan('  REWARDS (Multi-Recipient)'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('[1] Admin (0.1%):')}    ${displayAdmin.slice(0, 10)}...${displayAdmin.slice(-8)}`);
  console.log(`  ${chalk.gray('[2] Recipient (99.9%):')} ${displayRecipient.slice(0, 10)}...${displayRecipient.slice(-8)}`);
  console.log(`  ${chalk.gray('Reward Token:')}        ${chalk.white(rewardToken)}`);
  console.log('');

  // Fees
  console.log(chalk.cyan('  FEES'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('Type:')}        ${chalk.white(feeType)}`);
  console.log(`  ${chalk.gray('Fee %:')}       ${chalk.white(`${clankerFee}%`)} (Token & WETH)`);
  console.log(`  ${chalk.gray('MEV Delay:')}   ${chalk.white(`${mevBlockDelay} blocks`)}`);
  console.log('');

  // Clanker Verification
  console.log(chalk.cyan('  CLANKER.WORLD VERIFICATION'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('Interface:')}   ${chalk.white(env.interfaceName)}`);
  console.log(`  ${chalk.gray('Platform:')}    ${chalk.white(env.platformName)}`);
  if (vanitySuffix) {
    console.log(`  ${chalk.gray('Vanity:')}      ${chalk.white(`...${vanitySuffix.toUpperCase()}`)}`);
  }
  console.log('');

  // Final confirmation
  console.log(chalk.white.bold('  ═══════════════════════════════════════'));
  const confirmDeploy = await confirm({
    message: chalk.yellow('Confirm deployment? (This will cost gas)'),
    default: false,
  });

  if (!confirmDeploy) {
    console.log(chalk.yellow('\n  [!] Deployment cancelled\n'));
    process.exit(0);
  }

  return {
    name,
    symbol,
    image,
    chainId,
    privateKey: env.privateKey,
    description,
    // Social Links
    website,
    farcaster,
    twitter,
    zora,
    instagram,
    // Admin & Rewards
    tokenAdmin,
    rewardRecipient,
    rewardToken,
    feeType,
    clankerFee,
    pairedFee,
    mevBlockDelay,
    interfaceName: env.interfaceName,
    platformName: env.platformName,
    vanityMode,
    vanityPrefix: undefined,
    vanitySuffix,
  };
}

// ============================================================================
// Deploy Flow
// ============================================================================

interface DeployResult {
  success: boolean;
  tokenAddress?: string;
  txHash?: string;
  error?: string;
}

async function executeDeployment(info: TokenInfo): Promise<DeployResult> {
  const deployer = new Deployer({
    privateKey: info.privateKey as `0x${string}`,
    chainId: info.chainId,
    mevBlockDelay: info.mevBlockDelay,
  });

  // Use deployer address as fallback for admin/recipient
  const adminAddress = (info.tokenAdmin || deployer.address) as `0x${string}`;
  const recipientAddress = (info.rewardRecipient || deployer.address) as `0x${string}`;

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

  // Multi-recipient setup:
  // - Recipient 1: Token Admin gets 0.1% (10 bps)
  // - Recipient 2: Reward Recipient gets 99.9% (9990 bps)
  // Both receive fees in the same token type (Both = token + WETH)
  const rewardRecipients = [
    {
      address: adminAddress,
      allocation: 0.1, // 0.1% for token admin
      rewardToken: info.rewardToken,
    },
    {
      address: recipientAddress,
      allocation: 99.9, // 99.9% for reward recipient
      rewardToken: info.rewardToken,
    },
  ];

  const result = await deployer.deploy({
    name: info.name,
    symbol: info.symbol,
    image: info.image,
    description: info.description || undefined,
    socials: Object.keys(socials).length > 0 ? socials : undefined,
    tokenAdmin: adminAddress,
    rewardRecipients,
    fees: {
      type: info.feeType,
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

  return {
    success: result.success,
    tokenAddress: result.tokenAddress,
    txHash: result.txHash,
    error: result.error,
  };
}

async function showDeployResult(info: TokenInfo, result: DeployResult): Promise<void> {
  const chainName = getChainName(info.chainId);
  const timestamp = new Date().toISOString();

  console.log('');
  console.log(chalk.green.bold('  ╔═══════════════════════════════════════╗'));
  console.log(chalk.green.bold('  ║       TOKEN DEPLOYED SUCCESSFULLY     ║'));
  console.log(chalk.green.bold('  ╚═══════════════════════════════════════╝'));
  console.log('');
  
  // Save to local storage for tracking
  if (result.tokenAddress) {
    saveDeployedToken({
      address: result.tokenAddress,
      name: info.name,
      symbol: info.symbol,
      chainId: info.chainId,
      deployedAt: timestamp,
      txHash: result.txHash,
    });
  }
  
  // Get deployer address for Defined.fi link
  const deployer = new Deployer({
    privateKey: info.privateKey as `0x${string}`,
    chainId: info.chainId,
  });
  
  // Token info - compact
  console.log(`  ${chalk.white(info.name)} ${chalk.gray(`($${info.symbol})`)} on ${chalk.yellow(chainName)}`);
  console.log(`  ${chalk.green(result.tokenAddress)}`);
  console.log('');
  
  // Links - compact
  const definedUrl = `https://www.defined.fi/tokens/discover?creatorAddress=${deployer.address}`;
  console.log(`  ${chalk.gray('Defined:')} ${chalk.cyan(definedUrl)}`);
  console.log(`  ${chalk.gray('Dex:')}     ${chalk.cyan(`https://dexscreener.com/base/${result.tokenAddress}`)}`);
  console.log(`  ${chalk.gray('Clanker:')} ${chalk.cyan(`https://clanker.world/clanker/${result.tokenAddress}`)}`);
  console.log('');
  
  // QR Code for Defined.fi
  console.log(chalk.white.bold('  SCAN TO VIEW'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  await printQRCode(definedUrl);
  console.log('');
}

/**
 * Print QR code in terminal (scannable)
 * Falls back to URL display on unsupported terminals
 */
async function printQRCode(url: string): Promise<void> {
  // Skip QR in non-TTY mode
  if (!ENABLE_ANIMATIONS) {
    console.log(chalk.cyan(`  ${url}`));
    return;
  }
  
  try {
    // Dynamic import for ESM compatibility
    const qrcode = await import('qrcode-terminal');
    const generate = qrcode.default?.generate || qrcode.generate;
    
    if (typeof generate !== 'function') {
      console.log(chalk.cyan(`  ${url}`));
      return;
    }
    
    return new Promise((resolve) => {
      generate(url, { small: true }, (code: string) => {
        const lines = code.split('\n');
        for (const line of lines) {
          console.log(`  ${line}`);
        }
        resolve();
      });
    });
  } catch {
    // Fallback: just show URL
    console.log(chalk.cyan(`  ${url}`));
  }
}

function showDeployError(error: string): void {
  console.log('');
  console.log(chalk.red.bold('  ╔═══════════════════════════════════════╗'));
  console.log(chalk.red.bold('  ║          DEPLOYMENT FAILED            ║'));
  console.log(chalk.red.bold('  ╚═══════════════════════════════════════╝'));
  console.log('');
  console.log(`  ${chalk.red('Error:')} ${error}`);
  console.log('');
}

async function deployToken(info: TokenInfo): Promise<'menu' | 'retry' | 'other_chain'> {
  console.log('');
  console.log(chalk.white.bold('  SUMMARY'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('Chain:')}     ${getChainName(info.chainId)}`);
  console.log(`  ${chalk.gray('Token:')}     ${info.name} (${info.symbol})`);
  if (info.image) console.log(`  ${chalk.gray('Image:')}     ${info.image.slice(0, 30)}...`);
  if (info.description) console.log(`  ${chalk.gray('Desc:')}      ${info.description.slice(0, 30)}...`);
  console.log(`  ${chalk.gray('Fee:')}       ${info.feeType} (${info.clankerFee}%/${info.pairedFee}%)`);
  console.log(`  ${chalk.gray('MEV:')}       ${info.mevBlockDelay} blocks`);
  console.log(`  ${chalk.gray('Rewards:')}   ${info.rewardToken}`);
  // Show vanity mode
  if (info.vanityMode === 'off') {
    console.log(`  ${chalk.gray('Vanity:')}    Off (default Clanker B07)`);
  } else if (info.vanityMode === 'random' || info.vanityMode === 'custom') {
    console.log(`  ${chalk.gray('Vanity:')}    Suffix: ${chalk.yellow(`...${(info.vanitySuffix || '').toUpperCase()}`)}`);
  }
  console.log('');

  const confirmed = await confirm({
    message: 'Deploy?',
    default: true,
  });

  if (!confirmed) {
    console.log(chalk.gray('\n  Cancelled.\n'));
    return 'menu';
  }

  // Mine vanity salt if vanity mode is random or custom
  if (info.vanityMode !== 'off' && !info.vanitySalt && info.vanitySuffix) {
    // Need tokenAdmin for proper salt computation
    const tempDeployer = new Deployer({
      privateKey: info.privateKey as `0x${string}`,
      chainId: info.chainId,
    });
    const tokenAdmin = (info.tokenAdmin || tempDeployer.address) as `0x${string}`;

    const patternDisplay = `...${info.vanitySuffix.toUpperCase()}`;
    const miningAnim = new MiningAnimation(patternDisplay, MAX_MINING_TIME_MS);
    miningAnim.start();

    try {
      const result = await mineVanitySalt({
        chainId: info.chainId,
        tokenAdmin,
        prefix: undefined,
        suffix: info.vanitySuffix,
        maxAttempts: 5000000,
        maxTimeMs: MAX_MINING_TIME_MS,
        onProgress: (attempts) => {
          miningAnim.update(attempts);
        },
      });

      if (result) {
        info.vanitySalt = result.salt;
        miningAnim.stop(true, `Found in ${result.attempts.toLocaleString()} attempts (${result.timeMs}ms)`);
      } else {
        miningAnim.stop(false, 'Timeout - using random address');
      }
    } catch {
      miningAnim.stop(false, 'Mining failed - using random address');
    }
  }
  
  // Deploy with cool animation
  const deployAnim = new DeployAnimation();
  deployAnim.start();

  try {
    const result = await executeDeployment(info);

    if (result.success && result.tokenAddress) {
      deployAnim.stop(true, 'Token deployed successfully!');
      await showDeployResult(info, result);
      
      // Post-deploy options
      const nextAction = await select({
        message: 'What next?',
        choices: [
          { name: 'Deploy to another chain (same token)', value: 'other_chain' },
          { name: 'Deploy new token', value: 'retry' },
          { name: 'Back to menu', value: 'menu' },
        ],
      });
      
      return nextAction as 'menu' | 'retry' | 'other_chain';
    } else {
      deployAnim.stop(false, 'Deployment failed');
      showDeployError(result.error || 'Unknown error');
      
      // Retry options
      const nextAction = await select({
        message: 'What next?',
        choices: [
          { name: 'Retry deployment', value: 'retry' },
          { name: 'Try different chain', value: 'other_chain' },
          { name: 'Back to menu', value: 'menu' },
        ],
      });
      
      return nextAction as 'menu' | 'retry' | 'other_chain';
    }
  } catch (err) {
    deployAnim.stop(false, 'Deployment failed');
    showDeployError(err instanceof Error ? err.message : String(err));
    
    // Retry options
    const nextAction = await select({
      message: 'What next?',
      choices: [
        { name: 'Retry deployment', value: 'retry' },
        { name: 'Try different chain', value: 'other_chain' },
        { name: 'Back to menu', value: 'menu' },
      ],
    });
    
    return nextAction as 'menu' | 'retry' | 'other_chain';
  }
}

async function selectNewChain(currentChainId: number): Promise<number> {
  console.log('');
  console.log(chalk.white.bold('  SELECT NEW CHAIN'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  
  const newChainId = await select({
    message: 'Deploy to:',
    choices: CHAIN_OPTIONS.filter(c => c.value !== currentChainId),
  });
  
  return newChainId;
}

// ============================================================================
// Help & Settings
// ============================================================================

function showHelp(): void {
  console.log('');
  console.log(chalk.white.bold('  USAGE'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log('');
  console.log(`  ${chalk.cyan('umkm')}              Interactive mode`);
  console.log(`  ${chalk.cyan('umkm deploy')}       CLI mode`);
  console.log('');
  console.log(chalk.white.bold('  CLI OPTIONS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log('');
  console.log('    -n, --name         Token name');
  console.log('    -s, --symbol       Token symbol');
  console.log('    -i, --image        Image URL');
  console.log('    -d, --desc         Description');
  console.log('    -c, --chain        Chain ID');
  console.log('');
  console.log(`  ${chalk.gray('Vanity (default: off = Clanker B07):')}`);
  console.log('    --vanity-random    Random vanity pattern');
  console.log('    --vanity-prefix    Custom prefix (hex)');
  console.log('    --vanity-suffix    Custom suffix (hex)');
  console.log('');
  console.log(chalk.white.bold('  ENVIRONMENT (.env)'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log('');
  console.log(`  ${chalk.yellow('Required:')}`);
  console.log('    PRIVATE_KEY        Deployer wallet key');
  console.log('');
  console.log(`  ${chalk.gray('Admin & Rewards:')}`);
  console.log('    TOKEN_ADMIN        Token admin address');
  console.log('    REWARD_RECIPIENT   Fee recipient (100%)');
  console.log('    REWARD_TOKEN       Both | Paired | Clanker');
  console.log('');
  console.log(`  ${chalk.gray('Fees:')}`);
  console.log('    FEE_TYPE           static | dynamic');
  console.log('    CLANKER_FEE        Clanker fee % (1-80, default: 5)');
  console.log('    PAIRED_FEE         Paired fee % (1-80, default: 5)');
  console.log('');
  console.log(`  ${chalk.gray('Other:')}`);
  console.log('    CHAIN_ID           Default chain');
  console.log('    MEV_BLOCK_DELAY    MEV delay (default: 8)');
  console.log('');
}

async function showSettings(): Promise<void> {
  const env = getEnvConfig();
  
  console.log('');
  console.log(chalk.white.bold('  CURRENT SETTINGS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log('');
  
  const hasKey = !!env.privateKey;
  const hasAdmin = !!process.env.TOKEN_ADMIN;
  const hasRecipient = !!process.env.REWARD_RECIPIENT;
  
  console.log(`  ${chalk.gray('PRIVATE_KEY:')}       ${hasKey ? chalk.green('Set') : chalk.red('Not set')}`);
  console.log(`  ${chalk.gray('TOKEN_ADMIN:')}       ${hasAdmin ? chalk.green(`${process.env.TOKEN_ADMIN?.slice(0, 10)}...`) : chalk.gray('(deployer)')}`);
  console.log(`  ${chalk.gray('REWARD_RECIPIENT:')}  ${hasRecipient ? chalk.green(`${process.env.REWARD_RECIPIENT?.slice(0, 10)}...`) : chalk.gray('(deployer)')}`);
  console.log(`  ${chalk.gray('REWARD_TOKEN:')}      ${env.rewardToken}`);
  console.log('');
  console.log(`  ${chalk.gray('CHAIN_ID:')}          ${env.chainId}`);
  console.log(`  ${chalk.gray('FEE_TYPE:')}          ${env.feeType}`);
  console.log(`  ${chalk.gray('CLANKER_FEE:')}       ${env.clankerFee}%`);
  console.log(`  ${chalk.gray('PAIRED_FEE:')}        ${env.pairedFee}%`);
  console.log(`  ${chalk.gray('MEV_BLOCK_DELAY:')}   ${env.mevBlockDelay}`);
  console.log('');
  
  // System info
  console.log(chalk.white.bold('  SYSTEM INFO'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(`  ${chalk.gray('Platform:')}          ${PLATFORM_INFO.os}${PLATFORM_INFO.isTermux ? ' (Termux)' : ''}`);
  console.log(`  ${chalk.gray('Node:')}              ${process.version}`);
  console.log(`  ${chalk.gray('Terminal:')}          ${PLATFORM_INFO.isTTY ? 'Interactive' : 'Non-interactive'}`);
  console.log(`  ${chalk.gray('Colors:')}            ${PLATFORM_INFO.colorLevel > 0 ? 'Enabled' : 'Disabled'}`);
  console.log('');
  console.log(chalk.gray('  Edit .env file to change settings'));
  console.log('');
  
  await input({ message: 'Press Enter...' });
}

// ============================================================================
// Wallet Info
// ============================================================================

// Estimated gas cost per deploy (in native token) - varies by chain
const DEPLOY_GAS_ESTIMATES: Record<number, number> = {
  8453: 0.0008,    // Base - very cheap
  1: 0.015,        // Ethereum - expensive
  42161: 0.0003,   // Arbitrum - very cheap
  130: 0.0005,     // Unichain - cheap
  10143: 0.001,    // Monad
};

// Chain info for wallet display
interface ChainInfo {
  name: string;
  symbol: string;
  coingeckoId: string;
  explorer: string;
  explorerApi?: string;
  rpcs: string[];
}

const CHAIN_INFO: Record<number, ChainInfo> = {
  8453: {
    name: 'Base',
    symbol: 'ETH',
    coingeckoId: 'ethereum',
    explorer: 'https://basescan.org',
    explorerApi: 'https://api.basescan.org/api',
    rpcs: [
      'https://base.llamarpc.com',
      'https://1rpc.io/base',
      'https://base.meowrpc.com',
      'https://base.drpc.org',
      'https://base-mainnet.public.blastapi.io',
      'https://mainnet.base.org',
    ],
  },
  1: {
    name: 'Ethereum',
    symbol: 'ETH',
    coingeckoId: 'ethereum',
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io/api',
    rpcs: [
      'https://eth.llamarpc.com',
      'https://1rpc.io/eth',
      'https://eth.meowrpc.com',
      'https://eth.drpc.org',
      'https://ethereum.publicnode.com',
    ],
  },
  42161: {
    name: 'Arbitrum',
    symbol: 'ETH',
    coingeckoId: 'ethereum',
    explorer: 'https://arbiscan.io',
    explorerApi: 'https://api.arbiscan.io/api',
    rpcs: [
      'https://arbitrum.llamarpc.com',
      'https://1rpc.io/arb',
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.drpc.org',
      'https://arbitrum-one.publicnode.com',
    ],
  },
  130: {
    name: 'Unichain',
    symbol: 'ETH',
    coingeckoId: 'ethereum',
    explorer: 'https://unichain.blockscout.com',
    rpcs: [
      'https://mainnet.unichain.org',
    ],
  },
  10143: {
    name: 'Monad',
    symbol: 'MON',
    coingeckoId: 'monad',
    explorer: 'https://explorer.monad.xyz',
    rpcs: [
      'https://rpc.monad.xyz',
    ],
  },
};

// Fetch native token price from CoinGecko API
async function fetchTokenPrice(coingeckoId: string): Promise<number> {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json() as Record<string, { usd?: number }>;
    return data[coingeckoId]?.usd || 0;
  } catch {
    return 0;
  }
}

// Get native token balance with multiple fallback RPCs
async function getNativeBalance(address: `0x${string}`, chainId: number): Promise<bigint> {
  // Try RPC endpoints with fallback
  const { createPublicClient, http } = await import('viem');
  const { base, mainnet, arbitrum, unichain } = await import('viem/chains');
  const { monad } = await import('../chains/index.js');
  
  const chainInfo = CHAIN_INFO[chainId];
  if (!chainInfo) return 0n;
  
  // Get the correct chain config based on chainId
  const getChainConfig = () => {
    switch (chainId) {
      case 8453: return base;
      case 1: return mainnet;
      case 42161: return arbitrum;
      case 130: return unichain;
      case 10143: return monad;
      default: return null;
    }
  };
  
  const chain = getChainConfig();
  if (!chain) return 0n;
  
  for (const rpcUrl of chainInfo.rpcs) {
    try {
      const publicClient = createPublicClient({ 
        chain, 
        transport: http(rpcUrl, { timeout: 8000 }) 
      });
      return await publicClient.getBalance({ address });
    } catch {
      // Try next RPC
    }
  }
  
  throw new Error('All methods failed to fetch balance');
}

// Local deployed tokens storage path
const DEPLOYED_TOKENS_FILE = path.join(process.cwd(), '.deployed-tokens.json');

// Token data interface
interface DeployedToken {
  address: string;
  name: string;
  symbol: string;
  chainId: number;
  deployedAt: string;
  txHash?: string;
}

// Save deployed token to local storage
function saveDeployedToken(token: DeployedToken): void {
  try {
    let tokens: DeployedToken[] = [];
    if (fs.existsSync(DEPLOYED_TOKENS_FILE)) {
      tokens = JSON.parse(fs.readFileSync(DEPLOYED_TOKENS_FILE, 'utf8'));
    }
    // Add new token at the beginning
    tokens.unshift(token);
    // Keep only last 50 tokens
    tokens = tokens.slice(0, 50);
    fs.writeFileSync(DEPLOYED_TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch {
    // Ignore errors
  }
}



async function showWalletInfo(): Promise<void> {
  const env = getEnvConfig();
  
  console.log('');
  console.log(chalk.white.bold('  WALLET INFO'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  
  if (!env.privateKey) {
    console.log('');
    console.log(chalk.red('  No wallet configured. Set PRIVATE_KEY in .env'));
    console.log('');
    await input({ message: 'Press Enter...' });
    return;
  }

  try {
    const deployer = new Deployer({
      privateKey: env.privateKey as `0x${string}`,
      chainId: env.chainId,
    });

    // Get chain info from env
    const chainId = env.chainId;
    const chainInfo = CHAIN_INFO[chainId] || CHAIN_INFO[8453]; // Fallback to Base
    const address = deployer.address;

    console.log('');
    console.log(`  ${chalk.gray('Address:')}  ${chalk.cyan(address)}`);
    console.log(`  ${chalk.gray('Chain:')}    ${chalk.yellow(chainInfo.name)} (${chainId})`);
    console.log('');
    console.log(chalk.gray('  Loading balance...'));

    // Fetch balance with timeout
    let balance = 0n;
    let tokenPrice = 0;
    
    try {
      [tokenPrice, balance] = await Promise.all([
        fetchTokenPrice(chainInfo.coingeckoId),
        getNativeBalance(address, chainId),
      ]);
    } catch {
      // Clear loading and show error inline
      process.stdout.write('\x1B[1A\x1B[2K');
      console.log(chalk.yellow('  ⚠ Could not fetch balance (RPC unavailable)'));
      console.log('');
      console.log(chalk.gray(`  View on ${chainInfo.name} Explorer:`));
      console.log(chalk.blue(`  ${chainInfo.explorer}/address/${address}`));
      console.log('');
      await input({ message: 'Press Enter...' });
      return;
    }

    // Clear loading message
    process.stdout.write('\x1B[1A\x1B[2K');

    // Format balance
    const nativeAmount = Number(balance) / 1e18;
    const usdAmount = nativeAmount * tokenPrice;
    const gasPerDeploy = DEPLOY_GAS_ESTIMATES[chainId] || 0.001;
    const estimatedDeploys = gasPerDeploy > 0 ? Math.floor(nativeAmount / gasPerDeploy) : 0;

    // Display balance
    console.log(chalk.cyan(`  ${chainInfo.name.toUpperCase()} BALANCE`));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.white(nativeAmount.toFixed(6))} ${chainInfo.symbol}  ${chalk.gray('≈')} ${chalk.green(`$${usdAmount.toFixed(2)}`)}`);
    console.log('');
    
    // Deploy estimation with color
    let deployColor = chalk.green;
    if (estimatedDeploys === 0) deployColor = chalk.red;
    else if (estimatedDeploys < 5) deployColor = chalk.yellow;
    
    console.log(`  ${chalk.gray('Est. Deploys:')} ${deployColor(String(estimatedDeploys))} ${chalk.gray(`(~${gasPerDeploy} ${chainInfo.symbol} each)`)}`);
    console.log('');

    // Quick link
    console.log(chalk.gray(`  View on ${chainInfo.name} Explorer:`));
    console.log(chalk.blue(`  ${chainInfo.explorer}/address/${address}`));
    console.log('');
  } catch (err) {
    console.log('');
    console.log(chalk.red(`  Error: ${err instanceof Error ? err.message : 'Failed to load wallet info'}`));
    console.log('');
  }
  
  await input({ message: 'Press Enter...' });
}

// ============================================================================
// Manage Token Handlers
// ============================================================================

async function handleManageAction(action: string): Promise<void> {
  const env = getEnvConfig();
  
  if (!env.privateKey) {
    console.log(chalk.red('\n  No wallet configured. Set PRIVATE_KEY in .env\n'));
    await input({ message: 'Press Enter...' });
    return;
  }

  // Get token address
  const tokenAddress = await promptTokenAddress();
  if (!tokenAddress) return;

  // Select chain
  const chainId = await select({
    message: 'Select chain:',
    choices: CHAIN_OPTIONS,
    default: env.chainId,
  });

  // Create deployer for transactions
  const deployer = new Deployer({
    privateKey: env.privateKey as `0x${string}`,
    chainId,
  });

  console.log('');

  switch (action) {
    case 'update_image': {
      const newImage = await collectImageUrl();
      if (!newImage) {
        console.log(chalk.yellow('\n  [!] Cancelled - no image provided\n'));
        break;
      }

      // Confirm
      console.log('');
      console.log(chalk.white.bold('  CONFIRM UPDATE'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      console.log(`  ${chalk.gray('Token:')}     ${tokenAddress}`);
      console.log(`  ${chalk.gray('Chain:')}     ${getChainName(chainId)}`);
      console.log(`  ${chalk.gray('New Image:')} ${newImage}`);
      console.log('');

      const confirmUpdate = await confirm({
        message: 'Proceed with update?',
        default: false,
      });

      if (confirmUpdate) {
        try {
          const result = await deployer.updateImage(tokenAddress, newImage);
          if (result.txHash) {
            console.log(chalk.green(`\n  [OK] Image updated!`));
            console.log(chalk.gray(`  Tx: ${getExplorerUrl(chainId)}/tx/${result.txHash}\n`));
          } else {
            console.log(chalk.red(`\n  [FAIL] ${result.error?.message || 'Unknown error'}\n`));
          }
        } catch (err) {
          console.log(chalk.red(`\n  [FAIL] ${err instanceof Error ? err.message : 'Transaction failed'}\n`));
        }
      } else {
        console.log(chalk.yellow('\n  [!] Cancelled\n'));
      }
      break;
    }

    case 'update_metadata': {
      console.log('');
      console.log(chalk.gray('  Enter metadata as JSON string'));
      console.log(chalk.gray('  Example: {"description":"My token","website":"https://..."}'));
      console.log('');

      const newMetadata = await input({
        message: 'Metadata JSON:',
        validate: (v) => {
          if (!v.trim()) return 'Required';
          try {
            JSON.parse(v);
            return true;
          } catch {
            return 'Invalid JSON format';
          }
        },
      });

      // Confirm
      console.log('');
      console.log(chalk.white.bold('  CONFIRM UPDATE'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      console.log(`  ${chalk.gray('Token:')}    ${tokenAddress}`);
      console.log(`  ${chalk.gray('Chain:')}    ${getChainName(chainId)}`);
      console.log(`  ${chalk.gray('Metadata:')} ${newMetadata.slice(0, 50)}...`);
      console.log('');

      const confirmMeta = await confirm({
        message: 'Proceed with update?',
        default: false,
      });

      if (confirmMeta) {
        try {
          const result = await deployer.updateMetadata(tokenAddress, newMetadata);
          if (result.txHash) {
            console.log(chalk.green(`\n  [OK] Metadata updated!`));
            console.log(chalk.gray(`  Tx: ${getExplorerUrl(chainId)}/tx/${result.txHash}\n`));
          } else {
            console.log(chalk.red(`\n  [FAIL] ${result.error?.message || 'Unknown error'}\n`));
          }
        } catch (err) {
          console.log(chalk.red(`\n  [FAIL] ${err instanceof Error ? err.message : 'Transaction failed'}\n`));
        }
      } else {
        console.log(chalk.yellow('\n  [!] Cancelled\n'));
      }
      break;
    }

    case 'update_recipient': {
      // Fetch current rewards first
      console.log(chalk.gray('  Loading reward configuration...'));
      
      try {
        const rewards = await deployer.getRewards(tokenAddress);
        
        if (rewards.length === 0) {
          console.log(chalk.yellow('\n  [!] No rewards configured for this token\n'));
          break;
        }

        // Display current rewards
        console.log('');
        console.log(chalk.white.bold('  CURRENT REWARDS'));
        console.log(chalk.gray('  ─────────────────────────────────────'));
        
        const rewardChoices = rewards.map((r, i) => {
          const tokenType = r.token === 0 ? 'Both' : r.token === 1 ? 'Paired' : 'Clanker';
          const bpsPercent = (r.bps / 100).toFixed(2);
          return {
            name: `[${i}] ${r.recipient.slice(0, 10)}...${r.recipient.slice(-8)} (${bpsPercent}% ${tokenType})`,
            value: i,
          };
        });

        const selectedIndex = await select({
          message: 'Select reward to update:',
          choices: rewardChoices,
        });

        const currentReward = rewards[selectedIndex];
        console.log('');
        console.log(chalk.gray(`  Current recipient: ${currentReward.recipient}`));
        console.log(chalk.gray(`  Current admin:     ${currentReward.admin}`));
        console.log('');

        const newRecipient = await input({
          message: 'New recipient (0x...):',
          validate: (v) => isValidAddress(v) || 'Invalid address format',
        });

        // Confirm
        console.log('');
        console.log(chalk.white.bold('  CONFIRM UPDATE'));
        console.log(chalk.gray('  ─────────────────────────────────────'));
        console.log(`  ${chalk.gray('Token:')}         ${tokenAddress}`);
        console.log(`  ${chalk.gray('Chain:')}         ${getChainName(chainId)}`);
        console.log(`  ${chalk.gray('Reward Index:')}  ${selectedIndex}`);
        console.log(`  ${chalk.gray('Old Recipient:')} ${currentReward.recipient}`);
        console.log(`  ${chalk.gray('New Recipient:')} ${newRecipient}`);
        console.log('');

        const confirmRecipient = await confirm({
          message: 'Proceed with update?',
          default: false,
        });

        if (confirmRecipient) {
          const result = await deployer.updateRewardRecipient({
            token: tokenAddress,
            rewardIndex: BigInt(selectedIndex),
            newRecipient: newRecipient.trim() as `0x${string}`,
          });
          if (result.txHash) {
            console.log(chalk.green(`\n  [OK] Recipient updated!`));
            console.log(chalk.gray(`  Tx: ${getExplorerUrl(chainId)}/tx/${result.txHash}\n`));
          } else {
            console.log(chalk.red(`\n  [FAIL] ${result.error?.message || 'Unknown error'}\n`));
          }
        } else {
          console.log(chalk.yellow('\n  [!] Cancelled\n'));
        }
      } catch (err) {
        console.log(chalk.red(`\n  [FAIL] ${err instanceof Error ? err.message : 'Failed to load rewards'}\n`));
      }
      break;
    }

    case 'update_admin': {
      // Fetch current rewards first
      console.log(chalk.gray('  Loading reward configuration...'));
      
      try {
        const rewards = await deployer.getRewards(tokenAddress);
        
        if (rewards.length === 0) {
          console.log(chalk.yellow('\n  [!] No rewards configured for this token\n'));
          break;
        }

        // Display current rewards
        console.log('');
        console.log(chalk.white.bold('  CURRENT REWARDS'));
        console.log(chalk.gray('  ─────────────────────────────────────'));
        
        const rewardChoices = rewards.map((r, i) => {
          const tokenType = r.token === 0 ? 'Both' : r.token === 1 ? 'Paired' : 'Clanker';
          const bpsPercent = (r.bps / 100).toFixed(2);
          return {
            name: `[${i}] Admin: ${r.admin.slice(0, 10)}...${r.admin.slice(-8)} (${bpsPercent}% ${tokenType})`,
            value: i,
          };
        });

        const selectedIndex = await select({
          message: 'Select reward to update:',
          choices: rewardChoices,
        });

        const currentReward = rewards[selectedIndex];
        console.log('');
        console.log(chalk.gray(`  Current admin:     ${currentReward.admin}`));
        console.log(chalk.gray(`  Current recipient: ${currentReward.recipient}`));
        console.log('');

        const newAdmin = await input({
          message: 'New admin (0x...):',
          validate: (v) => isValidAddress(v) || 'Invalid address format',
        });

        // Confirm
        console.log('');
        console.log(chalk.white.bold('  CONFIRM UPDATE'));
        console.log(chalk.gray('  ─────────────────────────────────────'));
        console.log(`  ${chalk.gray('Token:')}        ${tokenAddress}`);
        console.log(`  ${chalk.gray('Chain:')}        ${getChainName(chainId)}`);
        console.log(`  ${chalk.gray('Reward Index:')} ${selectedIndex}`);
        console.log(`  ${chalk.gray('Old Admin:')}    ${currentReward.admin}`);
        console.log(`  ${chalk.gray('New Admin:')}    ${newAdmin}`);
        console.log('');

        const confirmAdmin = await confirm({
          message: 'Proceed with update?',
          default: false,
        });

        if (confirmAdmin) {
          const result = await deployer.updateRewardAdmin({
            token: tokenAddress,
            rewardIndex: BigInt(selectedIndex),
            newAdmin: newAdmin.trim() as `0x${string}`,
          });
          if (result.txHash) {
            console.log(chalk.green(`\n  [OK] Admin updated!`));
            console.log(chalk.gray(`  Tx: ${getExplorerUrl(chainId)}/tx/${result.txHash}\n`));
          } else {
            console.log(chalk.red(`\n  [FAIL] ${result.error?.message || 'Unknown error'}\n`));
          }
        } else {
          console.log(chalk.yellow('\n  [!] Cancelled\n'));
        }
      } catch (err) {
        console.log(chalk.red(`\n  [FAIL] ${err instanceof Error ? err.message : 'Failed to load rewards'}\n`));
      }
      break;
    }
  }

  await input({ message: 'Press Enter...' });
}

// ============================================================================
// Claim Handlers
// ============================================================================

async function handleClaimAction(action: string): Promise<void> {
  const env = getEnvConfig();
  
  if (!env.privateKey) {
    console.log(chalk.red('\n  No wallet configured. Set PRIVATE_KEY in .env\n'));
    await input({ message: 'Press Enter...' });
    return;
  }

  // Get token address
  const tokenAddress = await promptTokenAddress();
  if (!tokenAddress) return;

  // Select chain
  const chainId = await select({
    message: 'Select chain:',
    choices: CHAIN_OPTIONS,
    default: env.chainId,
  });

  // Create deployer
  const deployer = new Deployer({
    privateKey: env.privateKey as `0x${string}`,
    chainId,
  });

  console.log('');

  switch (action) {
    case 'claim_fees': {
      // Check available fees first
      console.log(chalk.gray('  Checking available fees...'));
      
      try {
        const available = await deployer.getAvailableFees(tokenAddress, deployer.address);
        const availableEth = Number(available) / 1e18;
        
        if (available === 0n) {
          console.log(chalk.yellow('\n  [!] No fees available to claim\n'));
          break;
        }

        console.log('');
        console.log(chalk.white.bold('  AVAILABLE FEES'));
        console.log(chalk.gray('  ─────────────────────────────────────'));
        console.log(`  ${chalk.gray('Token:')}     ${tokenAddress}`);
        console.log(`  ${chalk.gray('Chain:')}     ${getChainName(chainId)}`);
        console.log(`  ${chalk.gray('Available:')} ${chalk.green(`${availableEth.toFixed(6)} ETH`)}`);
        console.log('');

        const confirmClaim = await confirm({
          message: 'Claim fees now?',
          default: false,
        });

        if (confirmClaim) {
          const result = await deployer.claimFees(tokenAddress, deployer.address);
          if (result.txHash) {
            console.log(chalk.green(`\n  [OK] Fees claimed!`));
            console.log(chalk.gray(`  Tx: ${getExplorerUrl(chainId)}/tx/${result.txHash}\n`));
          } else {
            console.log(chalk.red(`\n  [FAIL] ${result.error?.message || 'Unknown error'}\n`));
          }
        } else {
          console.log(chalk.yellow('\n  [!] Cancelled\n'));
        }
      } catch (err) {
        console.log(chalk.red(`\n  [FAIL] ${err instanceof Error ? err.message : 'Failed to check fees'}\n`));
      }
      break;
    }

    case 'claim_vault': {
      // Check claimable amount first
      console.log(chalk.gray('  Checking vaulted tokens...'));
      
      try {
        const claimable = await deployer.getVaultClaimableAmount(tokenAddress);
        
        if (claimable === 0n) {
          console.log(chalk.yellow('\n  [!] No vaulted tokens available to claim\n'));
          break;
        }

        const claimableFormatted = Number(claimable) / 1e18;

        console.log('');
        console.log(chalk.white.bold('  VAULTED TOKENS'));
        console.log(chalk.gray('  ─────────────────────────────────────'));
        console.log(`  ${chalk.gray('Token:')}     ${tokenAddress}`);
        console.log(`  ${chalk.gray('Chain:')}     ${getChainName(chainId)}`);
        console.log(`  ${chalk.gray('Claimable:')} ${chalk.green(`${claimableFormatted.toLocaleString()} tokens`)}`);
        console.log('');

        const confirmVault = await confirm({
          message: 'Claim vaulted tokens now?',
          default: false,
        });

        if (confirmVault) {
          const result = await deployer.claimVaultedTokens(tokenAddress);
          if (result.txHash) {
            console.log(chalk.green(`\n  [OK] Vaulted tokens claimed!`));
            console.log(chalk.gray(`  Tx: ${getExplorerUrl(chainId)}/tx/${result.txHash}\n`));
          } else {
            console.log(chalk.red(`\n  [FAIL] ${result.error?.message || 'Unknown error'}\n`));
          }
        } else {
          console.log(chalk.yellow('\n  [!] Cancelled\n'));
        }
      } catch (err) {
        console.log(chalk.red(`\n  [FAIL] ${err instanceof Error ? err.message : 'Failed to check vault'}\n`));
      }
      break;
    }

    case 'check_rewards': {
      console.log(chalk.gray('  Checking rewards...'));
      
      try {
        const [fees, vaultAmount, rewards] = await Promise.all([
          deployer.getAvailableFees(tokenAddress, deployer.address),
          deployer.getVaultClaimableAmount(tokenAddress),
          deployer.getRewards(tokenAddress),
        ]);

        const feesEth = Number(fees) / 1e18;
        const vaultTokens = Number(vaultAmount) / 1e18;

        console.log('');
        console.log(chalk.white.bold('  REWARDS SUMMARY'));
        console.log(chalk.gray('  ─────────────────────────────────────'));
        console.log(`  ${chalk.gray('Token:')}          ${tokenAddress}`);
        console.log(`  ${chalk.gray('Chain:')}          ${getChainName(chainId)}`);
        console.log(`  ${chalk.gray('Trading Fees:')}   ${fees > 0n ? chalk.green(`${feesEth.toFixed(6)} ETH`) : chalk.gray('0 ETH')}`);
        console.log(`  ${chalk.gray('Vaulted Tokens:')} ${vaultAmount > 0n ? chalk.green(vaultTokens.toLocaleString()) : chalk.gray('0')}`);
        console.log('');

        // Show reward configuration
        if (rewards.length > 0) {
          console.log(chalk.white.bold('  REWARD CONFIGURATION'));
          console.log(chalk.gray('  ─────────────────────────────────────'));
          
          for (let i = 0; i < rewards.length; i++) {
            const r = rewards[i];
            const tokenType = r.token === 0 ? 'Both' : r.token === 1 ? 'Paired' : 'Clanker';
            const bpsPercent = (r.bps / 100).toFixed(2);
            console.log(`  ${chalk.gray(`[${i}]`)} ${chalk.white(`${bpsPercent}%`)} ${chalk.gray(tokenType)}`);
            console.log(`      ${chalk.gray('Recipient:')} ${r.recipient}`);
            console.log(`      ${chalk.gray('Admin:')}     ${r.admin}`);
          }
          console.log('');
        }
      } catch (err) {
        console.log(chalk.red(`\n  [FAIL] ${err instanceof Error ? err.message : 'Failed to check rewards'}\n`));
      }
      break;
    }
  }

  await input({ message: 'Press Enter...' });
}

// ============================================================================
// CLI Mode (non-interactive)
// ============================================================================

function parseArgs(): TokenInfo {
  const args = process.argv.slice(3); // skip 'deploy'
  const env = getEnvConfig();
  
  let name = '';
  let symbol = '';
  let image = '';
  let description = '';
  let chainId = env.chainId;
  let vanityPrefix: string | undefined;
  let vanitySuffix: string | undefined;
  let vanityMode: VanityMode = 'off'; // Default = off (standard Clanker behavior)

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '-n': case '--name': name = next || ''; i++; break;
      case '-s': case '--symbol': symbol = next || ''; i++; break;
      case '-i': case '--image': image = next || ''; i++; break;
      case '-d': case '--desc': description = next || ''; i++; break;
      case '-c': case '--chain': chainId = Number(next) || 8453; i++; break;
      case '--vanity-prefix': vanityPrefix = next || ''; vanityMode = 'custom'; i++; break;
      case '--vanity-suffix': vanitySuffix = next || ''; vanityMode = 'custom'; i++; break;
      case '--vanity-random': vanityMode = 'random'; break;
    }
  }

  // If custom mode but no pattern, fall back to off (default Clanker)
  if (vanityMode === 'custom' && !vanityPrefix && !vanitySuffix) {
    vanityMode = 'off';
  }

  // If random mode, get a random pattern
  if (vanityMode === 'random') {
    const pattern = getRandomVanityPattern();
    vanityPrefix = pattern.prefix;
    vanitySuffix = pattern.suffix;
  }

  return {
    name,
    symbol,
    image,
    chainId,
    privateKey: env.privateKey,
    description: description || `${name} ($${symbol}) - A token deployed on ${getChainName(chainId)} via Clanker`,
    // Social Links
    website: env.tokenWebsite,
    farcaster: process.env.TOKEN_FARCASTER || '',
    twitter: env.tokenTwitter,
    zora: process.env.TOKEN_ZORA || '',
    instagram: process.env.TOKEN_INSTAGRAM || '',
    // Admin & Rewards
    tokenAdmin: env.tokenAdmin,
    rewardRecipient: env.rewardRecipient,
    rewardToken: env.rewardToken,
    feeType: env.feeType,
    clankerFee: env.clankerFee,
    pairedFee: env.pairedFee,
    mevBlockDelay: env.mevBlockDelay,
    interfaceName: env.interfaceName,
    platformName: env.platformName,
    vanityMode,
    vanityPrefix,
    vanitySuffix,
  };
}

async function cliDeploy(config: TokenInfo): Promise<void> {
  if (!config.name || !config.symbol) {
    console.log(chalk.red('\n  Error: --name and --symbol required\n'));
    process.exit(1);
  }
  if (!config.privateKey?.startsWith('0x')) {
    console.log(chalk.red('\n  Error: PRIVATE_KEY not set in .env\n'));
    process.exit(1);
  }

  await deployToken(config);
}

// ============================================================================
// Main Entry
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  // Version
  if (command === '-v' || command === '--version') {
    console.log(`umkm/${VERSION}`);
    return;
  }

  // Help
  if (command === '-h' || command === '--help') {
    console.log(LOGO);
    showHelp();
    return;
  }

  // CLI deploy mode
  if (command === 'deploy') {
    console.log(LOGO);
    await cliDeploy(parseArgs());
    return;
  }

  // Interactive mode (default)
  await showAnimatedLogo();

  let running = true;
  while (running) {
    try {
      const action = await showMainMenu();

      switch (action) {
        case 'deploy': {
          let tokenInfo = await collectTokenInfo();
          let deployAction: 'menu' | 'retry' | 'other_chain' = 'retry';
          
          while (deployAction !== 'menu') {
            if (deployAction === 'other_chain') {
              const newChainId = await selectNewChain(tokenInfo.chainId);
              tokenInfo = { ...tokenInfo, chainId: newChainId };
            }
            
            deployAction = await deployToken(tokenInfo);
            
            if (deployAction === 'retry') {
              tokenInfo = await collectTokenInfo();
            }
          }
          break;
        }

        case 'manage': {
          let manageRunning = true;
          while (manageRunning) {
            const manageAction = await showManageMenu();
            if (manageAction === 'back') {
              manageRunning = false;
            } else {
              await handleManageAction(manageAction);
            }
          }
          break;
        }

        case 'claim': {
          let claimRunning = true;
          while (claimRunning) {
            const claimAction = await showClaimMenu();
            if (claimAction === 'back') {
              claimRunning = false;
            } else {
              await handleClaimAction(claimAction);
            }
          }
          break;
        }

        case 'wallet':
          await showWalletInfo();
          break;

        case 'settings':
          await showSettings();
          break;

        case 'help':
          showHelp();
          await input({ message: 'Press Enter...' });
          break;

        case 'exit':
          running = false;
          console.log(chalk.gray('\n  Goodbye!\n'));
          break;
      }
    } catch (err) {
      // User cancelled (Ctrl+C)
      if ((err as Error).message?.includes('User force closed')) {
        running = false;
        console.log(chalk.gray('\n  Goodbye!\n'));
      } else {
        console.log(chalk.red(`\n  Error: ${err}\n`));
      }
    }
  }
}

main().catch((err) => {
  console.error(chalk.red(`Error: ${err.message || err}`));
  process.exit(1);
});

// Export for programmatic use
export { deployToken, type TokenInfo };
