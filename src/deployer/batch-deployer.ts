/**
 * Batch Deployer
 * Deploy multiple tokens (1-100) on a single chain
 */

import { loadEnvConfig } from '../config/index.js';
import { createDeployer } from './simple-deployer.js';
import type { SimpleDeployConfig } from './deployer.js';
import type { ChainName } from './multi-chain-deployer.js';

// ============================================================================
// Types
// ============================================================================

/** Chain name to ID mapping */
const CHAIN_NAME_TO_ID: Record<ChainName, number> = {
  base: 8453,
  ethereum: 1,
  arbitrum: 42161,
  unichain: 130,
  monad: 10143,
};

/** Single token config for batch deploy */
export interface BatchTokenConfig {
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token image URL (optional) */
  image?: string;
  /** Token description (optional) */
  description?: string;
  /** Custom ID for tracking (optional) */
  id?: string;
  /** Token admin address (optional, defaults to deployer) */
  tokenAdmin?: `0x${string}`;
  /** Reward recipient address (optional, defaults to tokenAdmin or deployer) */
  rewardRecipient?: `0x${string}`;
  /** Reward allocation percentage (optional, defaults to 100) */
  rewardAllocation?: number;
}

/** Batch deploy options */
export interface BatchDeployOptions {
  /** Chain to deploy on (default: 'base') */
  chain?: ChainName;
  /** MEV protection blocks (default: 8) */
  mev?: number;
  /** Fee percentage (default: 5%) */
  feePercent?: number;
  /** Delay between deploys in ms (default: 3000) */
  delayMs?: number;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
  /** Number of retries for failed deploys (default: 2) */
  retries?: number;
  /** Delay before retry in ms (default: 5000) */
  retryDelayMs?: number;
  /** Start from index (for resume, default: 0) */
  startIndex?: number;
  /** Default token admin for all tokens (optional, defaults to deployer) */
  defaultTokenAdmin?: `0x${string}`;
  /** Default reward recipient for all tokens (optional, defaults to tokenAdmin) */
  defaultRewardRecipient?: `0x${string}`;
  /** Callback for each deployment */
  onProgress?: (index: number, total: number, result: BatchDeployResult) => void;
  /** Callback on error */
  onError?: (index: number, error: Error, token: BatchTokenConfig) => void;
  /** Callback on retry */
  onRetry?: (index: number, attempt: number, token: BatchTokenConfig) => void;
}

/** Result for each token in batch */
export interface BatchDeployResult {
  index: number;
  id?: string;
  name: string;
  symbol: string;
  success: boolean;
  tokenAddress?: `0x${string}`;
  txHash?: `0x${string}`;
  explorerUrl?: string;
  error?: string;
  attempts: number;
  timestamp: number;
  tokenAdmin?: `0x${string}`;
  rewardRecipient?: `0x${string}`;
}

/** Summary of batch deployment */
export interface BatchDeploySummary {
  chain: ChainName;
  chainId: number;
  results: BatchDeployResult[];
  successful: number;
  failed: number;
  total: number;
  tokens: Array<{ name: string; symbol: string; address?: `0x${string}` }>;
  startTime: number;
  endTime: number;
  durationMs: number;
}

// ============================================================================
// Batch Deployer Class
// ============================================================================

/**
 * Batch Deployer
 * Deploy multiple tokens (1-100) on a single chain
 *
 * @example
 * ```typescript
 * const batch = new BatchDeployer();
 *
 * // Deploy multiple tokens
 * const results = await batch.deploy([
 *   { name: 'Token A', symbol: 'TKNA' },
 *   { name: 'Token B', symbol: 'TKNB' },
 *   { name: 'Token C', symbol: 'TKNC' },
 * ]);
 *
 * // With options
 * const results = await batch.deploy(tokens, {
 *   chain: 'base',
 *   feePercent: 3,
 *   delayMs: 3000,
 *   onProgress: (i, total, result) => {
 *     console.log(`${i + 1}/${total}: ${result.success ? '✅' : '❌'}`);
 *   },
 * });
 * ```
 */
export class BatchDeployer {
  private privateKey: `0x${string}`;

  constructor(privateKey?: `0x${string}`) {
    this.privateKey = privateKey || loadEnvConfig().privateKey;
  }

  /**
   * Get wallet address
   */
  get address(): `0x${string}` {
    return createDeployer(8453, this.privateKey).address;
  }

  /**
   * Deploy multiple tokens on a single chain
   * @param tokens Array of token configs (1-100)
   * @param options Deployment options
   */
  async deploy(
    tokens: BatchTokenConfig[],
    options: BatchDeployOptions = {}
  ): Promise<BatchDeploySummary> {
    const startTime = Date.now();

    // Validate token count
    if (tokens.length === 0) {
      throw new Error('At least 1 token is required');
    }
    if (tokens.length > 100) {
      throw new Error('Maximum 100 tokens per batch');
    }

    // Options with defaults
    const chain = options.chain || 'base';
    const chainId = CHAIN_NAME_TO_ID[chain];
    const mev = options.mev ?? 8;
    const feePercent = options.feePercent ?? 5;
    const delayMs = options.delayMs ?? 3000;
    const continueOnError = options.continueOnError ?? true;
    const retries = options.retries ?? 2;
    const retryDelayMs = options.retryDelayMs ?? 5000;
    const startIndex = options.startIndex ?? 0;
    const defaultTokenAdmin = options.defaultTokenAdmin;
    const defaultRewardRecipient = options.defaultRewardRecipient;
    const onProgress = options.onProgress;
    const onError = options.onError;
    const onRetry = options.onRetry;

    // Create deployer for chain
    const deployer = createDeployer(chainId, this.privateKey);
    const deployerAddress = deployer.address;

    const results: BatchDeployResult[] = [];
    const total = tokens.length;

    // Deploy each token
    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
      let lastError: Error | null = null;
      let attempts = 0;

      // Retry loop
      for (let attempt = 0; attempt <= retries; attempt++) {
        attempts = attempt + 1;

        // Retry callback
        if (attempt > 0 && onRetry) {
          onRetry(i, attempt, token);
        }

        // Retry delay
        if (attempt > 0) {
          await this.sleep(retryDelayMs);
        }

        try {
          // Determine tokenAdmin and rewardRecipient for this token
          // Priority: token-specific > options default > deployer address
          const tokenAdmin = token.tokenAdmin || defaultTokenAdmin || deployerAddress;
          const rewardRecipient = token.rewardRecipient || defaultRewardRecipient || tokenAdmin;

          // Build config
          const deployConfig: SimpleDeployConfig = {
            name: token.name,
            symbol: token.symbol,
            image: token.image,
            description: token.description,
            tokenAdmin,
            mev,
            fees: {
              type: 'static',
              clankerFee: feePercent,
              pairedFee: feePercent,
            },
            // Set reward recipient if different from tokenAdmin
            rewardRecipients: [
              {
                address: rewardRecipient,
                allocation: token.rewardAllocation ?? 100,
              },
            ],
          };

          // Deploy
          const result = await deployer.deploy(deployConfig);

          if (result.success) {
            const batchResult: BatchDeployResult = {
              index: i,
              id: token.id,
              name: token.name,
              symbol: token.symbol,
              success: true,
              tokenAddress: result.tokenAddress,
              txHash: result.txHash,
              explorerUrl: result.explorerUrl,
              attempts,
              timestamp: Date.now(),
              tokenAdmin,
              rewardRecipient,
            };

            results.push(batchResult);

            if (onProgress) {
              onProgress(i, total, batchResult);
            }

            lastError = null;
            break; // Success, exit retry loop
          } else {
            lastError = new Error(result.error || 'Deploy failed');
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          if (onError) {
            onError(i, lastError, token);
          }
        }
      }

      // All retries failed
      if (lastError) {
        const batchResult: BatchDeployResult = {
          index: i,
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          success: false,
          error: lastError.message,
          attempts,
          timestamp: Date.now(),
          tokenAdmin: token.tokenAdmin || defaultTokenAdmin || deployerAddress,
          rewardRecipient:
            token.rewardRecipient ||
            defaultRewardRecipient ||
            token.tokenAdmin ||
            defaultTokenAdmin ||
            deployerAddress,
        };

        results.push(batchResult);

        if (onProgress) {
          onProgress(i, total, batchResult);
        }

        if (!continueOnError) {
          break;
        }
      }

      // Delay between deploys (except last one)
      if (i < tokens.length - 1 && delayMs > 0) {
        await this.sleep(delayMs);
      }
    }

    const endTime = Date.now();

    // Build summary
    const successful = results.filter((r) => r.success).length;
    return {
      chain,
      chainId,
      results,
      successful,
      failed: results.length - successful,
      total: results.length,
      tokens: results.map((r) => ({
        name: r.name,
        symbol: r.symbol,
        address: r.tokenAddress,
      })),
      startTime,
      endTime,
      durationMs: endTime - startTime,
    };
  }

  /**
   * Retry failed tokens from a previous batch
   */
  async retryFailed(
    summary: BatchDeploySummary,
    tokens: BatchTokenConfig[],
    options?: BatchDeployOptions
  ): Promise<BatchDeploySummary> {
    // Get failed indices
    const failedIndices = summary.results.filter((r) => !r.success).map((r) => r.index);

    if (failedIndices.length === 0) {
      return summary; // Nothing to retry
    }

    // Get failed tokens
    const failedTokens = failedIndices.map((i) => tokens[i]);

    // Retry deployment
    return this.deploy(failedTokens, options);
  }

  /**
   * Export results to JSON string
   */
  exportResults(summary: BatchDeploySummary): string {
    return JSON.stringify(summary, null, 2);
  }

  /**
   * Get deployment statistics
   */
  getStats(summary: BatchDeploySummary): {
    successRate: number;
    avgTimePerToken: number;
    totalDuration: string;
  } {
    const successRate =
      summary.total > 0 ? Math.round((summary.successful / summary.total) * 100) : 0;
    const avgTimePerToken = summary.total > 0 ? Math.round(summary.durationMs / summary.total) : 0;
    const totalSeconds = Math.round(summary.durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const totalDuration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    return { successRate, avgTimePerToken, totalDuration };
  }

  /**
   * Generate token configs from template
   * Useful for creating numbered tokens like "Token 1", "Token 2", etc.
   */
  generateTokens(
    count: number,
    template: {
      namePrefix: string;
      symbolPrefix: string;
      image?: string;
      description?: string;
      startIndex?: number;
      /** Token admin for all generated tokens */
      tokenAdmin?: `0x${string}`;
      /** Reward recipient for all generated tokens */
      rewardRecipient?: `0x${string}`;
    }
  ): BatchTokenConfig[] {
    if (count < 1 || count > 100) {
      throw new Error('Count must be 1-100');
    }

    const startIndex = template.startIndex ?? 1;
    const tokens: BatchTokenConfig[] = [];

    for (let i = 0; i < count; i++) {
      const num = startIndex + i;
      tokens.push({
        name: `${template.namePrefix} ${num}`,
        symbol: `${template.symbolPrefix}${num}`,
        image: template.image,
        description: template.description,
        tokenAdmin: template.tokenAdmin,
        rewardRecipient: template.rewardRecipient,
      });
    }

    return tokens;
  }

  /**
   * Generate tokens with custom admin/recipient per token
   * Simple mode for different admins per token
   *
   * @example
   * ```typescript
   * const tokens = batch.generateTokensWithAdmins([
   *   { name: 'Token A', symbol: 'TKNA', admin: '0x123...' },
   *   { name: 'Token B', symbol: 'TKNB', admin: '0x456...' },
   * ]);
   * ```
   */
  generateTokensWithAdmins(
    configs: Array<{
      name: string;
      symbol: string;
      image?: string;
      description?: string;
      /** Token admin address */
      admin?: `0x${string}`;
      /** Reward recipient (defaults to admin) */
      recipient?: `0x${string}`;
    }>
  ): BatchTokenConfig[] {
    return configs.map((c, i) => ({
      id: `token-${i}`,
      name: c.name,
      symbol: c.symbol,
      image: c.image,
      description: c.description,
      tokenAdmin: c.admin,
      rewardRecipient: c.recipient || c.admin,
    }));
  }

  /**
   * Apply admin/recipient to existing tokens
   * Useful for bulk updating tokens with same admin
   */
  applyAdminToTokens(
    tokens: BatchTokenConfig[],
    admin: `0x${string}`,
    recipient?: `0x${string}`
  ): BatchTokenConfig[] {
    return tokens.map((t) => ({
      ...t,
      tokenAdmin: t.tokenAdmin || admin,
      rewardRecipient: t.rewardRecipient || recipient || admin,
    }));
  }

  /**
   * Apply different admins to tokens by index
   *
   * @example
   * ```typescript
   * const tokens = batch.generateTokens(3, { namePrefix: 'Token', symbolPrefix: 'TKN' });
   * const withAdmins = batch.applyAdminsByIndex(tokens, {
   *   0: { admin: '0x111...', recipient: '0xAAA...' },
   *   1: { admin: '0x222...' },
   *   2: { admin: '0x333...', recipient: '0xBBB...' },
   * });
   * ```
   */
  applyAdminsByIndex(
    tokens: BatchTokenConfig[],
    adminMap: Record<number, { admin: `0x${string}`; recipient?: `0x${string}` }>
  ): BatchTokenConfig[] {
    return tokens.map((t, i) => {
      const config = adminMap[i];
      if (config) {
        return {
          ...t,
          tokenAdmin: config.admin,
          rewardRecipient: config.recipient || config.admin,
        };
      }
      return t;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Quick Batch Deploy Functions
// ============================================================================

/**
 * Quick batch deploy function
 *
 * @example
 * ```typescript
 * // Deploy 3 tokens
 * const results = await batchDeploy([
 *   { name: 'Token A', symbol: 'TKNA' },
 *   { name: 'Token B', symbol: 'TKNB' },
 *   { name: 'Token C', symbol: 'TKNC' },
 * ]);
 *
 * // With options
 * const results = await batchDeploy(tokens, {
 *   chain: 'arbitrum',
 *   feePercent: 3,
 * });
 * ```
 */
export async function batchDeploy(
  tokens: BatchTokenConfig[],
  options?: BatchDeployOptions
): Promise<BatchDeploySummary> {
  const deployer = new BatchDeployer();
  return deployer.deploy(tokens, options);
}

/**
 * Generate and deploy numbered tokens
 *
 * @example
 * ```typescript
 * // Deploy 10 tokens: "My Token 1" to "My Token 10"
 * const results = await batchDeployGenerated(10, {
 *   namePrefix: 'My Token',
 *   symbolPrefix: 'MTK',
 * });
 * ```
 */
export async function batchDeployGenerated(
  count: number,
  template: {
    namePrefix: string;
    symbolPrefix: string;
    image?: string;
    description?: string;
    startIndex?: number;
  },
  options?: BatchDeployOptions
): Promise<BatchDeploySummary> {
  const deployer = new BatchDeployer();
  const tokens = deployer.generateTokens(count, template);
  return deployer.deploy(tokens, options);
}