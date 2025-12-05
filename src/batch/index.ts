/**
 * Batch Deploy Module
 * Full-featured batch deployment for multiple tokens
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createDeployer, type SimpleDeployConfig } from '../deployer/index.js';

// ============================================================================
// Types
// ============================================================================

/** Supported chains */
export type BatchChain = 'base' | 'ethereum' | 'arbitrum' | 'unichain' | 'monad';

/** Chain ID mapping */
const CHAIN_IDS: Record<BatchChain, number> = {
  base: 8453,
  ethereum: 1,
  arbitrum: 42161,
  unichain: 130,
  monad: 10143,
};

/** Social links for token */
export interface TokenSocials {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  farcaster?: string;
}

/** Reward recipient configuration */
export interface RewardRecipient {
  address: string;
  allocation: number; // 1-100
}

/** Full token configuration in template */
export interface BatchToken {
  // Required
  name: string;
  symbol: string;

  // Metadata
  image?: string;
  description?: string;

  // Social links
  socials?: TokenSocials;

  // Admin & Rewards
  tokenAdmin?: string;
  rewardRecipients?: RewardRecipient[];

  // Fees (override defaults)
  fee?: number;
  mev?: number;

  // Vault settings
  vault?: {
    enabled?: boolean;
    percentage?: number; // 1-90
    lockupDays?: number; // min 7
    vestingDays?: number;
  };
}

/** Template defaults */
export interface BatchDefaults {
  // Fees
  fee?: number; // 1-80%
  mev?: number; // 0-20 blocks

  // Admin & Rewards
  tokenAdmin?: string;
  rewardRecipient?: string;

  // Vault
  vault?: {
    enabled?: boolean;
    percentage?: number; // 1-90
    lockupDays?: number; // min 7
    vestingDays?: number;
  };

  // Metadata
  image?: string;
  description?: string;
  socials?: TokenSocials;
}

/** Batch template structure */
export interface BatchTemplate {
  name?: string;
  description?: string;
  chain?: BatchChain;
  defaults?: BatchDefaults;
  tokens: BatchToken[];
}

/** Deploy result per token */
export interface BatchResult {
  index: number;
  name: string;
  symbol: string;
  success: boolean;
  address?: string;
  txHash?: string;
  error?: string;
}

/** Batch deploy summary */
export interface BatchSummary {
  template: string;
  chain: BatchChain;
  total: number;
  success: number;
  failed: number;
  results: BatchResult[];
  duration: number;
}

/** Deploy options */
export interface BatchOptions {
  /** Delay between deploys in seconds (default: 3) */
  delay?: number;
  /** Number of retries (default: 2) */
  retries?: number;
  /** Progress callback */
  onProgress?: (current: number, total: number, result: BatchResult) => void;
}

// ============================================================================
// Template Functions
// ============================================================================

/** Generate options */
export interface GenerateOptions {
  // Token naming
  name: string;
  symbol: string;

  // Chain
  chain?: BatchChain;

  // Defaults
  fee?: number;
  mev?: number;
  tokenAdmin?: string;
  rewardRecipient?: string;

  // Metadata (applied to all tokens)
  image?: string;
  description?: string;
  socials?: TokenSocials;

  // Vault
  vault?: {
    enabled?: boolean;
    percentage?: number;
    lockupDays?: number;
    vestingDays?: number;
  };
}

/**
 * Generate a new batch template
 * All tokens will have the SAME name and symbol (for batch minting same token)
 */
export function generateTemplate(count: number, options: GenerateOptions): BatchTemplate {
  const tokens: BatchToken[] = [];

  for (let i = 0; i < count; i++) {
    tokens.push({
      // Same name and symbol for all
      name: options.name,
      symbol: options.symbol,

      // Metadata (can be edited per token later)
      image: options.image || '',
      description: options.description || '',
      socials: options.socials ? { ...options.socials } : undefined,

      // Per-token overrides (empty = use defaults)
      tokenAdmin: '',
      rewardRecipients: [],
      fee: undefined,
      mev: undefined,
      vault: undefined,
    });
  }

  return {
    name: `Batch ${count}x ${options.symbol}`,
    description: `Deploy ${count} ${options.name} tokens`,
    chain: options.chain || 'base',
    defaults: {
      fee: options.fee || 5,
      mev: options.mev ?? 8,
      tokenAdmin: options.tokenAdmin || '',
      rewardRecipient: options.rewardRecipient || '',
      image: options.image || '',
      description: options.description || '',
      socials: options.socials,
      vault: options.vault,
    },
    tokens,
  };
}

/**
 * Generate template with different names (numbered)
 */
export function generateNumberedTemplate(
  count: number,
  options: GenerateOptions & { startIndex?: number }
): BatchTemplate {
  const startIndex = options.startIndex ?? 1;
  const tokens: BatchToken[] = [];

  for (let i = 0; i < count; i++) {
    const num = startIndex + i;
    tokens.push({
      name: `${options.name} ${num}`,
      symbol: `${options.symbol}${num}`,
      image: options.image || '',
      description: options.description || '',
      socials: options.socials ? { ...options.socials } : undefined,
      tokenAdmin: '',
      rewardRecipients: [],
      fee: undefined,
      mev: undefined,
      vault: undefined,
    });
  }

  return {
    name: `Batch ${count} Numbered Tokens`,
    description: `Deploy ${count} numbered tokens: ${options.name} 1-${count}`,
    chain: options.chain || 'base',
    defaults: {
      fee: options.fee || 5,
      mev: options.mev ?? 8,
      tokenAdmin: options.tokenAdmin || '',
      rewardRecipient: options.rewardRecipient || '',
      image: options.image || '',
      description: options.description || '',
      socials: options.socials,
      vault: options.vault,
    },
    tokens,
  };
}

/**
 * Save template to file
 */
export function saveTemplate(template: BatchTemplate, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
}

/**
 * Load template from file
 */
export function loadTemplate(filePath: string): BatchTemplate {
  const content = fs.readFileSync(filePath, 'utf-8');
  const template = JSON.parse(content) as BatchTemplate;
  return validateTemplate(template);
}

/**
 * Validate template structure
 */
export function validateTemplate(template: BatchTemplate): BatchTemplate {
  const errors: string[] = [];

  // Required fields
  if (!template.tokens || !Array.isArray(template.tokens)) {
    throw new Error('Invalid template: missing tokens array');
  }
  if (template.tokens.length === 0) {
    throw new Error('Invalid template: tokens array is empty');
  }
  if (template.tokens.length > 100) {
    throw new Error('Invalid template: max 100 tokens allowed');
  }

  // Validate chain
  if (template.chain && !CHAIN_IDS[template.chain]) {
    errors.push(`Invalid chain: ${template.chain}`);
  }

  // Validate defaults
  const defaults = template.defaults || {};
  if (defaults.fee !== undefined && (defaults.fee < 1 || defaults.fee > 80)) {
    errors.push('defaults.fee must be 1-80');
  }
  if (defaults.mev !== undefined && (defaults.mev < 0 || defaults.mev > 20)) {
    errors.push('defaults.mev must be 0-20');
  }
  if (defaults.tokenAdmin && !isValidAddress(defaults.tokenAdmin)) {
    errors.push('defaults.tokenAdmin is not a valid address');
  }
  if (defaults.rewardRecipient && !isValidAddress(defaults.rewardRecipient)) {
    errors.push('defaults.rewardRecipient is not a valid address');
  }

  // Validate each token
  for (let i = 0; i < template.tokens.length; i++) {
    const token = template.tokens[i];
    const prefix = `tokens[${i}]`;

    if (!token.name || token.name.trim() === '') {
      errors.push(`${prefix}.name is required`);
    }
    if (!token.symbol || token.symbol.trim() === '') {
      errors.push(`${prefix}.symbol is required`);
    }
    if (token.symbol && token.symbol.length > 10) {
      errors.push(`${prefix}.symbol max 10 characters`);
    }
    if (token.tokenAdmin && !isValidAddress(token.tokenAdmin)) {
      errors.push(`${prefix}.tokenAdmin is not a valid address`);
    }
    if (token.fee !== undefined && (token.fee < 1 || token.fee > 80)) {
      errors.push(`${prefix}.fee must be 1-80`);
    }
    if (token.mev !== undefined && (token.mev < 0 || token.mev > 20)) {
      errors.push(`${prefix}.mev must be 0-20`);
    }

    // Validate reward recipients
    if (token.rewardRecipients && token.rewardRecipients.length > 0) {
      let totalAllocation = 0;
      for (let j = 0; j < token.rewardRecipients.length; j++) {
        const r = token.rewardRecipients[j];
        if (!isValidAddress(r.address)) {
          errors.push(`${prefix}.rewardRecipients[${j}].address is not valid`);
        }
        if (r.allocation < 1 || r.allocation > 100) {
          errors.push(`${prefix}.rewardRecipients[${j}].allocation must be 1-100`);
        }
        totalAllocation += r.allocation;
      }
      if (totalAllocation !== 100) {
        errors.push(
          `${prefix}.rewardRecipients total allocation must be 100 (got ${totalAllocation})`
        );
      }
    }

    // Validate vault
    if (token.vault) {
      if (
        token.vault.percentage !== undefined &&
        (token.vault.percentage < 1 || token.vault.percentage > 90)
      ) {
        errors.push(`${prefix}.vault.percentage must be 1-90`);
      }
      if (token.vault.lockupDays !== undefined && token.vault.lockupDays < 7) {
        errors.push(`${prefix}.vault.lockupDays must be >= 7`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Template validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  return template;
}

/** Check if string is valid Ethereum address */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ============================================================================
// Deploy Functions
// ============================================================================

/**
 * Deploy tokens from template
 */
export async function deployTemplate(
  template: BatchTemplate,
  options: BatchOptions = {}
): Promise<BatchSummary> {
  // Validate first
  validateTemplate(template);

  const startTime = Date.now();
  const chain = template.chain || 'base';
  const chainId = CHAIN_IDS[chain];
  const delay = (options.delay ?? 3) * 1000;
  const retries = options.retries ?? 2;
  const onProgress = options.onProgress;

  // Get defaults
  const defaults = template.defaults || {};
  const defaultFee = defaults.fee || 5;
  const defaultMev = defaults.mev ?? 8;
  const defaultAdmin = defaults.tokenAdmin || '';
  const defaultRecipient = defaults.rewardRecipient || '';
  const defaultImage = defaults.image || '';
  const defaultDescription = defaults.description || '';
  const defaultSocials = defaults.socials;
  const defaultVault = defaults.vault;

  // Create deployer
  const deployer = createDeployer(chainId);
  const deployerAddress = deployer.address;

  const results: BatchResult[] = [];
  const total = template.tokens.length;

  // Deploy each token
  for (let i = 0; i < template.tokens.length; i++) {
    const token = template.tokens[i];
    let result: BatchResult = {
      index: i,
      name: token.name,
      symbol: token.symbol,
      success: false,
    };

    // Retry loop
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await sleep(5000); // Wait before retry
      }

      try {
        // Resolve values (token-specific > defaults > fallback)
        const tokenAdmin = (token.tokenAdmin || defaultAdmin || deployerAddress) as `0x${string}`;
        const fee = token.fee ?? defaultFee;
        const mev = token.mev ?? defaultMev;
        const image = token.image || defaultImage;
        const description = token.description || defaultDescription;
        const socials = token.socials || defaultSocials;
        const vault = token.vault || defaultVault;

        // Build reward recipients
        let rewardRecipients: Array<{ address: `0x${string}`; allocation: number }>;
        if (token.rewardRecipients && token.rewardRecipients.length > 0) {
          rewardRecipients = token.rewardRecipients.map((r) => ({
            address: r.address as `0x${string}`,
            allocation: r.allocation,
          }));
        } else if (defaultRecipient) {
          rewardRecipients = [{ address: defaultRecipient as `0x${string}`, allocation: 100 }];
        } else {
          rewardRecipients = [{ address: tokenAdmin, allocation: 100 }];
        }

        // Build config
        const config: SimpleDeployConfig = {
          name: token.name,
          symbol: token.symbol,
          image,
          description,
          tokenAdmin,
          mev,
          fees: {
            type: 'static',
            clankerFee: fee,
            pairedFee: fee,
          },
          rewardRecipients,
          // Social links
          socials: socials
            ? {
                website: socials.website,
                twitter: socials.twitter,
                telegram: socials.telegram,
                discord: socials.discord,
              }
            : undefined,
          // Vault
          vault: vault?.enabled
            ? {
                enabled: true,
                percentage: vault.percentage || 10,
                lockupDays: vault.lockupDays || 30,
                vestingDays: vault.vestingDays || 0,
              }
            : undefined,
          // Context for clanker.world verification
          context: {
            interface: 'umkm-terminal',
            platform: 'batch-deploy',
          },
        };

        // Deploy
        const deployResult = await deployer.deploy(config);

        if (deployResult.success) {
          result = {
            index: i,
            name: token.name,
            symbol: token.symbol,
            success: true,
            address: deployResult.tokenAddress,
            txHash: deployResult.txHash,
          };
          break; // Success, exit retry loop
        } else {
          result.error = deployResult.error;
        }
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err);
      }
    }

    results.push(result);

    // Progress callback
    if (onProgress) {
      onProgress(i + 1, total, result);
    }

    // Delay between deploys
    if (i < template.tokens.length - 1 && delay > 0) {
      await sleep(delay);
    }
  }

  const endTime = Date.now();

  return {
    template: template.name || 'Unnamed',
    chain,
    total,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    duration: endTime - startTime,
  };
}

/**
 * Deploy from template file
 */
export async function deployFromFile(
  filePath: string,
  options?: BatchOptions
): Promise<BatchSummary> {
  const template = loadTemplate(filePath);
  return deployTemplate(template, options);
}

/**
 * Save deploy results to file
 */
export function saveResults(summary: BatchSummary, filePath: string): void {
  const output = {
    ...summary,
    timestamp: new Date().toISOString(),
    durationSeconds: Math.round(summary.duration / 1000),
  };
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
}
