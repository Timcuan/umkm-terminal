/**
 * Batch Deploy Module
 * Full-featured batch deployment for multiple tokens
 * Now with multi-wallet support and Farcaster integration
 */

import * as fs from 'node:fs';
import { BatchDeployer } from './batch-deployer.js';
import { TemplateService } from './template-service.js';
import { FarcasterService } from './farcaster-integration.js';
import type { IDeployerFactory } from '../deployer/index.js';
import type { 
  BatchTemplate, 
  BatchToken, 
  BatchDefaults, 
  BatchResult, 
  BatchSummary, 
  BatchOptions,
  BatchChain,
  RewardTokenType,
  TokenSocials,
  RewardRecipient,
  GenerateOptions
} from './types.js';

// Re-export from deployer for convenience
export {
  type BatchDeployResult as MultiWalletBatchDeployResult,
  type DeployerWallet,
  type DeploymentJob,
  MultiWalletDeployer,
  type MultiWalletDeployOptions,
} from '../deployer/multi-wallet-deployer.js';

// Export multi-wallet batch functionality
export {
  type BatchDeploymentPlan,
  type BatchDeploymentResult,
  type MultiWalletBatchConfig,
  MultiWalletBatchManager,
} from './multi-wallet-batch.js';

// Export services
export { TemplateService } from './template-service.js';
export { FarcasterService } from './farcaster-integration.js';

// Export types
export type {
  BatchTemplate,
  BatchToken,
  BatchDefaults,
  BatchResult,
  BatchSummary,
  BatchOptions,
  BatchChain,
  RewardTokenType,
  TokenSocials,
  RewardRecipient,
  GenerateOptions
};

// Export BatchDeployer class
export { BatchDeployer };

// ============================================================================
// Template Functions (using TemplateService)
// ============================================================================

// Create a default template service instance
const templateService = new TemplateService();

/**
 * Generate a new batch template
 * All tokens will have the SAME name and symbol (for batch minting same token)
 */
export function generateTemplate(count: number, options: GenerateOptions): BatchTemplate {
  return templateService.generateTemplate(count, options);
}

/**
 * Generate template with different names (numbered)
 */
export function generateNumberedTemplate(
  count: number,
  options: GenerateOptions & { startIndex?: number }
): BatchTemplate {
  return templateService.generateNumberedTemplate(count, options);
}

/**
 * Save template to file
 */
export function saveTemplate(template: BatchTemplate, filePath: string): void {
  templateService.saveTemplate(template, filePath);
}

/**
 * Load template from file
 */
export function loadTemplate(filePath: string): BatchTemplate {
  return templateService.loadTemplate(filePath);
}

/**
 * Validate template structure
 */
export function validateTemplate(template: BatchTemplate): BatchTemplate {
  return templateService.validateTemplate(template);
}

// ============================================================================
// Deploy Functions (using TemplateService)
// ============================================================================

/**
 * Deploy tokens from template using the new BatchDeployer class
 */
export async function deployTemplate(
  template: BatchTemplate,
  options: BatchOptions = {},
  deployerFactory?: IDeployerFactory
): Promise<BatchSummary> {
  // Validate first using TemplateService
  templateService.validateTemplate(template);

  // Create BatchDeployer and deploy
  const batchDeployer = new BatchDeployer(template, options, deployerFactory);
  return batchDeployer.deploy();
}

/**
 * Deploy tokens from template with streaming results - avoids memory accumulation
 * Yields individual results as they're produced
 * 
 * @example
 * ```typescript
 * // Process results as they're produced (constant memory usage)
 * for await (const result of deployTemplateStream(template)) {
 *   if ('index' in result) {
 *     // This is a BatchResult
 *     console.log(`Deployed: ${result.name} ${result.success ? '✅' : '❌'}`);
 *     // Process result immediately (e.g., save to database, send notification)
 *   } else {
 *     // This is the final BatchSummary
 *     console.log(`Completed: ${result.success}/${result.total} successful`);
 *   }
 * }
 * ```
 */
export async function* deployTemplateStream(
  template: BatchTemplate,
  options: BatchOptions = {},
  deployerFactory?: IDeployerFactory
): AsyncGenerator<BatchResult, BatchSummary, void> {
  // Validate first using TemplateService
  templateService.validateTemplate(template);

  // Create BatchDeployer and deploy with streaming
  const batchDeployer = new BatchDeployer(template, options, deployerFactory);
  return yield* batchDeployer.deployStream();
}

/**
 * Deploy tokens from template with batch streaming - processes in chunks
 * Yields arrays of results in batches to control memory usage
 * 
 * @example
 * ```typescript
 * // Process results in batches (controlled memory usage)
 * for await (const batchOrSummary of deployTemplateBatchStream(template, 50)) {
 *   if (Array.isArray(batchOrSummary)) {
 *     // This is a batch of results
 *     console.log(`Processed batch: ${batchOrSummary.length} tokens`);
 *     // Process batch (e.g., bulk insert to database)
 *     await saveBatchToDatabase(batchOrSummary);
 *   } else {
 *     // This is the final BatchSummary
 *     console.log(`Completed: ${batchOrSummary.success}/${batchOrSummary.total} successful`);
 *   }
 * }
 * ```
 */
export async function* deployTemplateBatchStream(
  template: BatchTemplate,
  batchSize: number = 10,
  options: BatchOptions = {},
  deployerFactory?: IDeployerFactory
): AsyncGenerator<BatchResult[], BatchSummary, void> {
  // Validate first using TemplateService
  templateService.validateTemplate(template);

  // Create BatchDeployer and deploy with batch streaming
  const batchDeployer = new BatchDeployer(template, options, deployerFactory);
  return yield* batchDeployer.deployBatchStream(batchSize);
}

/**
 * Deploy from template file
 */
export async function deployFromFile(
  filePath: string,
  options?: BatchOptions,
  deployerFactory?: IDeployerFactory
): Promise<BatchSummary> {
  const template = templateService.loadTemplate(filePath);
  return deployTemplate(template, options, deployerFactory);
}

/**
 * Deploy from template file with streaming results
 */
export async function* deployFromFileStream(
  filePath: string,
  options?: BatchOptions,
  deployerFactory?: IDeployerFactory
): AsyncGenerator<BatchResult, BatchSummary, void> {
  const template = templateService.loadTemplate(filePath);
  return yield* deployTemplateStream(template, options, deployerFactory);
}

/**
 * Deploy from template file with batch streaming
 */
export async function* deployFromFileBatchStream(
  filePath: string,
  batchSize: number = 10,
  options?: BatchOptions,
  deployerFactory?: IDeployerFactory
): AsyncGenerator<BatchResult[], BatchSummary, void> {
  const template = templateService.loadTemplate(filePath);
  return yield* deployTemplateBatchStream(template, batchSize, options, deployerFactory);
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

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
}
