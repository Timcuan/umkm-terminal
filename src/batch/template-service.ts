/**
 * Template Service
 * Handles batch deployment template management (load, save, validate, generate)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { 
  BatchTemplate, 
  BatchToken, 
  BatchChain,
  GenerateOptions,
  RewardRecipient
} from './types.js';
import { 
  ValidationError, 
  createValidationError
} from '../errors/standardized-errors.js';
import type { ErrorContext } from '../types/base-types.js';

/** Chain ID mapping */
const CHAIN_IDS: Record<BatchChain, number> = {
  base: 8453,
  ethereum: 1,
  arbitrum: 42161,
  unichain: 130,
  monad: 10143,
};

/**
 * Service for managing batch deployment templates
 */
export class TemplateService {
  /**
   * Load template from file
   */
  loadTemplate(filePath: string): BatchTemplate {
    const content = fs.readFileSync(filePath, 'utf-8');
    const template = JSON.parse(content) as BatchTemplate;
    return this.validateTemplate(template);
  }

  /**
   * Save template to file
   */
  saveTemplate(template: BatchTemplate, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
  }

  /**
   * Generate a new batch template
   * All tokens will have the SAME name and symbol (for batch minting same token)
   */
  generateTemplate(count: number, options: GenerateOptions): BatchTemplate {
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
        feeType: options.feeType || 'static',
        dynamicBaseFee: options.dynamicBaseFee,
        dynamicMaxFee: options.dynamicMaxFee,
        tokenAdmin: options.tokenAdmin || '',
        rewardRecipient: options.rewardRecipient || '',
        rewardToken: options.rewardToken || 'Both',
        image: options.image || '',
        description: options.description || '',
        socials: options.socials,
        vault: options.vault,
        interfaceName: options.interfaceName || 'UMKM Terminal',
        platformName: options.platformName || 'Clanker',
      },
      tokens,
    };
  }

  /**
   * Generate template with different names (numbered)
   */
  generateNumberedTemplate(
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
   * Validate template structure
   */
  validateTemplate(template: BatchTemplate): BatchTemplate {
    const errors: string[] = [];

    // Required fields
    if (!template.tokens || !Array.isArray(template.tokens)) {
      const context: ErrorContext = {
        operation: 'validateTemplate',
        component: 'TemplateService'
      };
      throw createValidationError('INVALID_CONFIG', 'Invalid template: missing tokens array', context);
    }
    if (template.tokens.length === 0) {
      const context: ErrorContext = {
        operation: 'validateTemplate',
        component: 'TemplateService'
      };
      throw createValidationError('INVALID_CONFIG', 'Invalid template: tokens array is empty', context);
    }
    if (template.tokens.length > 100) {
      const context: ErrorContext = {
        operation: 'validateTemplate',
        component: 'TemplateService'
      };
      throw createValidationError('INVALID_CONFIG', 'Invalid template: max 100 tokens allowed', context);
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
    if (defaults.mev !== undefined && (defaults.mev < 0 || defaults.mev > 50)) {
      errors.push('defaults.mev must be 0-50');
    }
    if (defaults.feeType === 'dynamic') {
      if (
        defaults.dynamicBaseFee !== undefined &&
        (defaults.dynamicBaseFee < 0.5 || defaults.dynamicBaseFee > 5)
      ) {
        errors.push('defaults.dynamicBaseFee must be 0.5-5');
      }
      if (
        defaults.dynamicMaxFee !== undefined &&
        (defaults.dynamicMaxFee < 0.5 || defaults.dynamicMaxFee > 5)
      ) {
        errors.push('defaults.dynamicMaxFee must be 0.5-5');
      }
    }
    if (defaults.tokenAdmin && !this.isValidAddress(defaults.tokenAdmin)) {
      errors.push('defaults.tokenAdmin is not a valid address');
    }
    if (defaults.rewardRecipient && !this.isValidAddress(defaults.rewardRecipient)) {
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
      if (token.tokenAdmin && !this.isValidAddress(token.tokenAdmin)) {
        errors.push(`${prefix}.tokenAdmin is not a valid address`);
      }
      if (token.fee !== undefined && (token.fee < 1 || token.fee > 80)) {
        errors.push(`${prefix}.fee must be 1-80`);
      }
      if (token.mev !== undefined && (token.mev < 0 || token.mev > 50)) {
        errors.push(`${prefix}.mev must be 0-50`);
      }

      // Validate reward recipients
      if (token.rewardRecipients && token.rewardRecipients.length > 0) {
        let totalAllocation = 0;
        for (let j = 0; j < token.rewardRecipients.length; j++) {
          const r = token.rewardRecipients[j];
          if (!this.isValidAddress(r.address)) {
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
      const context: ErrorContext = {
        operation: 'validateTemplate',
        component: 'TemplateService'
      };
      throw createValidationError(
        'INVALID_CONFIG', 
        `Template validation failed:\n  - ${errors.join('\n  - ')}`, 
        context
      );
    }

    return template;
  }

  /**
   * Check if string is valid Ethereum address
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}