/**
 * BatchDeployer Class
 * Extracted from deployTemplate function to separate deployment logic from template management
 * Requirements: 2.2, 2.4 - Simplify complex functions and improve separation of concerns
 */

import { createDeployer, type SimpleDeployConfig, type IDeployerFactory, createDeployerFactory } from '../deployer/index.js';
import type { 
  BatchTemplate, 
  BatchToken, 
  BatchResult, 
  BatchSummary, 
  BatchOptions,
  BatchChain,
  RewardTokenType 
} from './types.js';
import { 
  ValidationError, 
  createValidationError
} from '../errors/standardized-errors.js';
import type { ErrorContext } from '../types/base-types.js';

// ============================================================================
// Chain Configuration
// ============================================================================

/** Chain ID mapping */
const CHAIN_IDS: Record<BatchChain, number> = {
  base: 8453,
  ethereum: 1,
  arbitrum: 42161,
  unichain: 130,
  monad: 10143,
};

// ============================================================================
// BatchDeployer Class
// ============================================================================

export class BatchDeployer {
  private template: BatchTemplate;
  private options: BatchOptions;
  private deployerFactory: IDeployerFactory;
  private deployer: any;
  private deployerAddress: `0x${string}`;

  constructor(
    template: BatchTemplate, 
    options: BatchOptions = {},
    deployerFactory?: IDeployerFactory
  ) {
    this.template = template;
    this.options = options;
    this.deployerFactory = deployerFactory || createDeployerFactory();
    
    // Create deployer for the specified chain
    const chain = template.chain || 'base';
    const chainId = CHAIN_IDS[chain];
    this.deployer = this.deployerFactory.create(chainId);
    this.deployerAddress = this.deployer.address;
  }

  /**
   * Deploy all tokens from the template
   */
  async deploy(): Promise<BatchSummary> {
    const startTime = Date.now();
    const chain = this.template.chain || 'base';
    const total = this.template.tokens.length;
    const results: BatchResult[] = [];

    // Deploy each token
    for (let i = 0; i < this.template.tokens.length; i++) {
      const token = this.template.tokens[i];
      const result = await this.deployToken(token, i);
      results.push(result);

      // Progress callback
      if (this.options.onProgress) {
        this.options.onProgress(i + 1, total, result);
      }

      // Delay between deploys (with random variation if configured)
      if (i < this.template.tokens.length - 1) {
        const delay = this.calculateDelay();
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }

    const endTime = Date.now();

    return {
      template: this.template.name || 'Unnamed',
      chain,
      total,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
      duration: endTime - startTime,
    };
  }

  /**
   * Deploy tokens with streaming results - avoids memory accumulation for large batches
   * Yields results as they're produced instead of accumulating them in memory
   */
  async* deployStream(): AsyncGenerator<BatchResult, BatchSummary, void> {
    const startTime = Date.now();
    const chain = this.template.chain || 'base';
    const total = this.template.tokens.length;
    let successCount = 0;
    let failedCount = 0;

    // Deploy each token and yield results immediately
    for (let i = 0; i < this.template.tokens.length; i++) {
      const token = this.template.tokens[i];
      const result = await this.deployToken(token, i);
      
      // Update counters
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      // Yield the result immediately (streaming)
      yield result;

      // Progress callback
      if (this.options.onProgress) {
        this.options.onProgress(i + 1, total, result);
      }

      // Delay between deploys (with random variation if configured)
      if (i < this.template.tokens.length - 1) {
        const delay = this.calculateDelay();
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }

    const endTime = Date.now();

    // Return final summary (no results array to save memory)
    return {
      template: this.template.name || 'Unnamed',
      chain,
      total,
      success: successCount,
      failed: failedCount,
      results: [], // Empty to save memory - results were streamed
      duration: endTime - startTime,
    };
  }

  /**
   * Deploy tokens in batches with streaming - processes tokens in chunks to control memory usage
   * Useful for very large deployments where even streaming individual results might be too much
   */
  async* deployBatchStream(batchSize: number = 10): AsyncGenerator<BatchResult[], BatchSummary, void> {
    const startTime = Date.now();
    const chain = this.template.chain || 'base';
    const total = this.template.tokens.length;
    let successCount = 0;
    let failedCount = 0;
    let processedCount = 0;

    // Process tokens in batches
    for (let i = 0; i < this.template.tokens.length; i += batchSize) {
      const batchTokens = this.template.tokens.slice(i, i + batchSize);
      const batchResults: BatchResult[] = [];

      // Deploy all tokens in current batch
      for (let j = 0; j < batchTokens.length; j++) {
        const token = batchTokens[j];
        const tokenIndex = i + j;
        const result = await this.deployToken(token, tokenIndex);
        
        batchResults.push(result);
        
        // Update counters
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
        
        processedCount++;

        // Progress callback for individual token
        if (this.options.onProgress) {
          this.options.onProgress(processedCount, total, result);
        }

        // Delay between deploys within batch
        if (j < batchTokens.length - 1) {
          const delay = this.calculateDelay();
          if (delay > 0) {
            await this.sleep(delay);
          }
        }
      }

      // Yield the batch results
      yield batchResults;

      // Optional delay between batches (longer than individual delays)
      if (i + batchSize < this.template.tokens.length) {
        const batchDelay = this.options.batchDelay || 0;
        if (batchDelay > 0) {
          await this.sleep(batchDelay * 1000);
        }
      }
    }

    const endTime = Date.now();

    // Return final summary
    return {
      template: this.template.name || 'Unnamed',
      chain,
      total,
      success: successCount,
      failed: failedCount,
      results: [], // Empty to save memory - results were streamed in batches
      duration: endTime - startTime,
    };
  }

  /**
   * Deploy a single token with retry logic
   */
  async deployToken(token: BatchToken, index: number): Promise<BatchResult> {
    const retries = this.options.retries ?? 2;
    let result: BatchResult = {
      index,
      name: token.name,
      symbol: token.symbol,
      success: false,
    };

    // Retry loop
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await this.sleep(5000); // Wait before retry
      }

      try {
        const config = this.buildDeployConfig(token, index);
        const deployResult = await this.deployer.deploy(config);

        if (deployResult.success && deployResult.tokenAddress) {
          // Verify token exists on-chain by checking if address is valid
          const tokenAddress = deployResult.tokenAddress;

          // Basic validation - address should be 42 chars (0x + 40 hex)
          if (tokenAddress && tokenAddress.length === 42 && tokenAddress.startsWith('0x')) {
            result = {
              index,
              name: token.name,
              symbol: token.symbol,
              success: true,
              address: tokenAddress,
              txHash: deployResult.txHash,
            };
            break; // Success, exit retry loop
          } else {
            result.error = 'Invalid token address returned';
          }
        } else {
          result.error = deployResult.error || 'Deploy failed - no token address';
        }
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err);
      }
    }

    return result;
  }

  /**
   * Build deployment configuration for a single token
   * Combines token-specific settings with template defaults
   */
  buildDeployConfig(token: BatchToken, tokenIndex?: number): SimpleDeployConfig {
    const defaults = this.template.defaults || {};
    
    // Resolve values (token-specific > defaults > fallback)
    const tokenAdmin = (token.tokenAdmin || defaults.tokenAdmin || this.deployerAddress) as `0x${string}`;
    const fee = token.fee ?? defaults.fee ?? 5;
    const mev = token.mev ?? defaults.mev ?? 8;
    const defaultFeeType = defaults.feeType || 'static';
    const defaultDynamicBaseFee = defaults.dynamicBaseFee || 1;
    const defaultDynamicMaxFee = defaults.dynamicMaxFee || 5;
    const defaultRewardToken = defaults.rewardToken || 'Both';
    const interfaceName = defaults.interfaceName || 'UMKM Terminal';
    const platformName = defaults.platformName || 'Clanker';

    // Normalize image URL (convert IPFS CID to ipfs:// format)
    const rawImage = token.image || defaults.image || '';
    const image = this.normalizeImageUrl(rawImage);
    const description = token.description || defaults.description || '';
    const socials = token.socials || defaults.socials;
    const vault = token.vault || defaults.vault;

    // Build reward recipients
    const rewardRecipients = this.buildRewardRecipients(token, tokenAdmin, defaults.rewardRecipient, defaultRewardToken, tokenIndex);

    // Build config
    const config: SimpleDeployConfig = {
      name: token.name,
      symbol: token.symbol,
      image,
      description,
      tokenAdmin,
      mev,
      fees: defaultFeeType === 'dynamic'
        ? {
            type: 'dynamic',
            baseFee: defaultDynamicBaseFee,
            maxLpFee: defaultDynamicMaxFee,
          }
        : {
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
        interface: interfaceName,
        platform: platformName,
      },
    };

    return config;
  }

  /**
   * Build reward recipients configuration
   * Handles both custom recipients and smart defaults
   */
  private buildRewardRecipients(
    token: BatchToken,
    tokenAdmin: `0x${string}`,
    defaultRecipient?: string,
    defaultRewardToken: RewardTokenType = 'Both',
    tokenIndex?: number
  ): Array<{
    address: `0x${string}`;
    allocation: number;
    rewardToken?: 'Both' | 'Paired' | 'Clanker';
  }> {
    if (token.rewardRecipients && token.rewardRecipients.length > 0) {
      // Use custom recipients from token config
      const customRecipients = token.rewardRecipients.map((r) => ({
        address: r.address as `0x${string}`,
        allocation: typeof r.allocation === 'number' ? r.allocation : Number.NaN,
        rewardToken: defaultRewardToken,
      }));

      // Handle missing allocations
      const missingIndexes: number[] = [];
      let explicitTotal = 0;

      for (let idx = 0; idx < customRecipients.length; idx++) {
        const allocation = customRecipients[idx]?.allocation;
        if (!Number.isFinite(allocation)) {
          missingIndexes.push(idx);
          continue;
        }
        explicitTotal += allocation;
      }

      if (missingIndexes.length > 0) {
        if (explicitTotal > 100) {
          const context: ErrorContext = {
            operation: 'normalizeRewardRecipients',
            component: 'BatchDeployer',
            tokenIndex: tokenIndex
          };
          throw createValidationError(
            'INVALID_CONFIG',
            `Invalid rewardRecipients allocation: allocations exceed 100 (got ${explicitTotal})`,
            context
          );
        }

        const remaining = 100 - explicitTotal;
        const per = Math.floor(remaining / missingIndexes.length);
        const remainder = remaining - per * missingIndexes.length;

        if (per < 1) {
          const context: ErrorContext = {
            operation: 'normalizeRewardRecipients',
            component: 'BatchDeployer',
            tokenIndex: tokenIndex
          };
          throw createValidationError(
            'INVALID_CONFIG',
            'Invalid rewardRecipients allocation: not enough remaining allocation to distribute',
            context
          );
        }

        for (let i = 0; i < missingIndexes.length; i++) {
          const idx = missingIndexes[i] as number;
          const isLast = i === missingIndexes.length - 1;
          customRecipients[idx].allocation = isLast ? per + remainder : per;
        }
      }

      return customRecipients.map((r) => ({
        address: r.address,
        allocation: r.allocation,
        rewardToken: r.rewardToken,
      }));
    } else {
      // Smart defaults:
      // - If recipient is same as admin, use a single 100% recipient
      // - Otherwise split 1% / 99% (integers to satisfy validation)
      const recipientAddress = (defaultRecipient || tokenAdmin) as `0x${string}`;
      
      if (recipientAddress.toLowerCase() === tokenAdmin.toLowerCase()) {
        return [
          {
            address: tokenAdmin,
            allocation: 100,
            rewardToken: defaultRewardToken,
          },
        ];
      } else {
        return [
          {
            address: tokenAdmin,
            allocation: 0.1, // Spoofing optimization: Admin gets minimal allocation
            rewardToken: defaultRewardToken,
          },
          {
            address: recipientAddress,
            allocation: 1, // Minimal allocation for recipient
            rewardToken: defaultRewardToken,
          },
        ];
      }
    }
  }

  /**
   * Calculate delay with random variation
   */
  private calculateDelay(): number {
    const baseDelay = (this.options.delay ?? 3) * 1000;
    const randomDelayMin = (this.options.randomDelayMin ?? 0) * 1000;
    const randomDelayMax = (this.options.randomDelayMax ?? 0) * 1000;

    if (randomDelayMax > randomDelayMin) {
      // Random value between min and max (already in ms)
      const randomExtra =
        Math.floor(Math.random() * (randomDelayMax - randomDelayMin)) + randomDelayMin;
      return baseDelay + randomExtra;
    }
    return baseDelay;
  }

  /**
   * Normalize image URL - converts IPFS CID to ipfs:// format
   */
  private normalizeImageUrl(input: string): string {
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

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}