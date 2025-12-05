/**
 * Batch Deploy Module
 * Simple batch deployment for multiple tokens
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

/** Token in template */
export interface BatchToken {
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  tokenAdmin?: string;
  rewardRecipient?: string;
}

/** Template defaults */
export interface BatchDefaults {
  fee?: number;
  mev?: number;
  tokenAdmin?: string;
  rewardRecipient?: string;
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

/**
 * Generate a new batch template
 */
export function generateTemplate(
  count: number,
  options: {
    namePrefix?: string;
    symbolPrefix?: string;
    chain?: BatchChain;
    fee?: number;
    mev?: number;
    tokenAdmin?: string;
    rewardRecipient?: string;
  } = {}
): BatchTemplate {
  const namePrefix = options.namePrefix || 'Token';
  const symbolPrefix = options.symbolPrefix || 'TKN';

  const tokens: BatchToken[] = [];
  for (let i = 1; i <= count; i++) {
    tokens.push({
      name: `${namePrefix} ${i}`,
      symbol: `${symbolPrefix}${i}`,
      image: '',
      description: '',
    });
  }

  return {
    name: `Batch ${count} Tokens`,
    description: `Generated template for ${count} tokens`,
    chain: options.chain || 'base',
    defaults: {
      fee: options.fee || 5,
      mev: options.mev ?? 8,
      tokenAdmin: options.tokenAdmin || '',
      rewardRecipient: options.rewardRecipient || '',
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

  // Validate
  if (!template.tokens || !Array.isArray(template.tokens)) {
    throw new Error('Invalid template: missing tokens array');
  }
  if (template.tokens.length === 0) {
    throw new Error('Invalid template: tokens array is empty');
  }
  if (template.tokens.length > 100) {
    throw new Error('Invalid template: max 100 tokens allowed');
  }

  return template;
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
        // Build config
        const tokenAdmin = (token.tokenAdmin || defaultAdmin || deployerAddress) as `0x${string}`;
        const rewardRecipient = (token.rewardRecipient ||
          defaultRecipient ||
          tokenAdmin) as `0x${string}`;

        const config: SimpleDeployConfig = {
          name: token.name,
          symbol: token.symbol,
          image: token.image,
          description: token.description,
          tokenAdmin,
          mev: defaultMev,
          fees: {
            type: 'static',
            clankerFee: defaultFee,
            pairedFee: defaultFee,
          },
          rewardRecipients: [{ address: rewardRecipient, allocation: 100 }],
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
