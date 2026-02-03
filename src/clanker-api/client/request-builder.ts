/**
 * Request Builder
 * Helps build and validate API requests before sending
 */

import type { ClankerTokenV4 } from '../../types/index.js';
import type { ClankerAPITokenRequest } from '../types/api-types.js';
import { FieldMapper } from '../mapper/field-mapper.js';
import { createValidationError } from '../types/error-types.js';

// ============================================================================
// Request Builder Class
// ============================================================================

export class RequestBuilder {
  private fieldMapper: FieldMapper;

  constructor() {
    this.fieldMapper = new FieldMapper();
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Build token deployment request
   */
  buildDeployTokenRequest(
    token: ClankerTokenV4,
    options?: {
      validateOnly?: boolean;
      generateRequestKey?: boolean;
    }
  ): {
    success: boolean;
    request?: ClankerAPITokenRequest;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate token configuration first
      const validation = this.fieldMapper.validateMapping(token);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // If validation only, return early
      if (options?.validateOnly) {
        return {
          success: true,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // Map to API format
      const mappingResult = this.fieldMapper.mapToAPIFormat(token);
      if (!mappingResult.success || !mappingResult.data) {
        return {
          success: false,
          errors: mappingResult.errors,
          warnings: mappingResult.warnings,
        };
      }

      // Additional request-level validation
      this.validateAPIRequest(mappingResult.data, errors, warnings);

      return {
        success: errors.length === 0,
        request: mappingResult.data,
        errors: [...mappingResult.errors, ...errors],
        warnings: [...mappingResult.warnings, ...warnings],
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Request building failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Validate request before sending
   */
  validateRequest(request: ClankerAPITokenRequest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validateAPIRequest(request, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Estimate request size
   */
  estimateRequestSize(request: ClankerAPITokenRequest): {
    sizeBytes: number;
    sizeKB: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const jsonString = JSON.stringify(request);
    const sizeBytes = new Blob([jsonString]).size;
    const sizeKB = sizeBytes / 1024;

    if (sizeKB > 100) {
      warnings.push(`Request is large (${sizeKB.toFixed(1)}KB) - may be slow to process`);
    }

    if (sizeKB > 500) {
      warnings.push(`Request is very large (${sizeKB.toFixed(1)}KB) - may be rejected by API`);
    }

    return {
      sizeBytes,
      sizeKB,
      warnings,
    };
  }

  /**
   * Sanitize request for logging (remove sensitive data)
   */
  sanitizeRequestForLogging(request: ClankerAPITokenRequest): any {
    const sanitized = { ...request };

    // Remove or mask sensitive fields
    if (sanitized.token.requestKey) {
      sanitized.token.requestKey = `${sanitized.token.requestKey.substring(0, 8)}...`;
    }

    // Remove potentially sensitive URLs
    if (sanitized.token.auditUrls) {
      sanitized.token.auditUrls = sanitized.token.auditUrls.map(() => '[AUDIT_URL]');
    }

    return sanitized;
  }

  // ==========================================================================
  // Private Validation Methods
  // ==========================================================================

  private validateAPIRequest(
    request: ClankerAPITokenRequest,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate token section
    this.validateTokenSection(request.token, errors, warnings);

    // Validate rewards section
    this.validateRewardsSection(request.rewards, errors, warnings);

    // Validate pool section
    this.validatePoolSection(request.pool, errors, warnings);

    // Validate fees section
    this.validateFeesSection(request.fees, errors, warnings);

    // Validate vault section
    this.validateVaultSection(request.vault, errors, warnings);

    // Validate airdrop section
    this.validateAirdropSection(request.airdrop, errors, warnings);

    // Validate chain ID
    this.validateChainId(request.chainId, errors, warnings);
  }

  private validateTokenSection(
    token: ClankerAPITokenRequest['token'],
    errors: string[],
    warnings: string[]
  ): void {
    // Required fields
    if (!token.name?.trim()) {
      errors.push('Token name is required');
    }

    if (!token.symbol?.trim()) {
      errors.push('Token symbol is required');
    }

    if (!token.tokenAdmin?.trim()) {
      errors.push('Token admin address is required');
    }

    if (!token.requestKey?.trim()) {
      errors.push('Request key is required');
    }

    // Format validation
    if (token.tokenAdmin && !this.isValidAddress(token.tokenAdmin)) {
      errors.push('Token admin must be a valid Ethereum address');
    }

    if (token.requestKey && token.requestKey.length !== 32) {
      warnings.push('Request key should be 32 characters long');
    }

    // Length validation
    if (token.name && token.name.length > 50) {
      warnings.push('Token name is very long (>50 characters)');
    }

    if (token.symbol && (token.symbol.length < 1 || token.symbol.length > 11)) {
      warnings.push('Token symbol should be 1-11 characters');
    }

    if (token.description && token.description.length > 5000) {
      warnings.push('Token description is very long (>5000 characters)');
    }

    // URL validation
    if (token.image && !this.isValidUrl(token.image)) {
      warnings.push('Token image URL may not be valid');
    }

    if (token.socialMediaUrls) {
      token.socialMediaUrls.forEach((social, index) => {
        if (!this.isValidUrl(social.url)) {
          errors.push(`Invalid social media URL at index ${index}`);
        }
      });
    }

    if (token.auditUrls) {
      token.auditUrls.forEach((url, index) => {
        if (!this.isValidUrl(url)) {
          errors.push(`Invalid audit URL at index ${index}`);
        }
      });
    }
  }

  private validateRewardsSection(
    rewards: ClankerAPITokenRequest['rewards'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!rewards || rewards.length === 0) {
      warnings.push('No rewards configuration provided');
      return;
    }

    let totalAllocation = 0;

    rewards.forEach((reward, index) => {
      if (!this.isValidAddress(reward.admin)) {
        errors.push(`Invalid admin address in reward ${index}`);
      }

      if (!this.isValidAddress(reward.recipient)) {
        errors.push(`Invalid recipient address in reward ${index}`);
      }

      if (reward.allocation < 0 || reward.allocation > 100) {
        errors.push(`Invalid allocation in reward ${index}: ${reward.allocation}% (must be 0-100)`);
      }

      if (!['Both', 'Clanker', 'Paired'].includes(reward.rewardsToken || '')) {
        errors.push(`Invalid rewards token in reward ${index}: ${reward.rewardsToken}`);
      }

      totalAllocation += reward.allocation;
    });

    if (Math.abs(totalAllocation - 100) > 0.01) {
      errors.push(`Total rewards allocation must be 100%, got ${totalAllocation}%`);
    }
  }

  private validatePoolSection(
    pool: ClankerAPITokenRequest['pool'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!pool) return;

    if (pool.type && !['standard', 'project'].includes(pool.type)) {
      errors.push(`Invalid pool type: ${pool.type}`);
    }

    if (pool.pairedToken && !this.isValidAddress(pool.pairedToken)) {
      errors.push('Invalid paired token address');
    }

    if (pool.initialMarketCap !== undefined) {
      if (pool.initialMarketCap <= 0) {
        errors.push('Initial market cap must be positive');
      } else if (pool.initialMarketCap < 1) {
        warnings.push('Initial market cap is very low (<1 ETH)');
      } else if (pool.initialMarketCap > 1000) {
        warnings.push('Initial market cap is very high (>1000 ETH)');
      }
    }
  }

  private validateFeesSection(
    fees: ClankerAPITokenRequest['fees'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!fees) return;

    if (!['static', 'dynamic'].includes(fees.type)) {
      errors.push(`Invalid fee type: ${fees.type}`);
    }

    if (fees.type === 'static') {
      if (fees.clankerFee !== undefined && (fees.clankerFee < 0 || fees.clankerFee > 1000)) {
        errors.push('Clanker fee must be between 0 and 1000 basis points');
      }

      if (fees.pairedFee !== undefined && (fees.pairedFee < 0 || fees.pairedFee > 1000)) {
        errors.push('Paired fee must be between 0 and 1000 basis points');
      }
    }

    // Dynamic fee validation would go here
  }

  private validateVaultSection(
    vault: ClankerAPITokenRequest['vault'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!vault) return;

    if (vault.percentage < 0 || vault.percentage > 100) {
      errors.push('Vault percentage must be between 0 and 100');
    }

    if (vault.lockupDuration < 0) {
      errors.push('Vault lockup duration must be non-negative');
    }

    if (vault.vestingDuration !== undefined && vault.vestingDuration < 0) {
      errors.push('Vault vesting duration must be non-negative');
    }

    if (vault.recipient && !this.isValidAddress(vault.recipient)) {
      errors.push('Invalid vault recipient address');
    }
  }

  private validateAirdropSection(
    airdrop: ClankerAPITokenRequest['airdrop'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!airdrop) return;

    if (!airdrop.entries || airdrop.entries.length === 0) {
      warnings.push('Airdrop configured but no entries provided');
      return;
    }

    airdrop.entries.forEach((entry, index) => {
      if (!this.isValidAddress(entry.account)) {
        errors.push(`Invalid airdrop account address at index ${index}`);
      }

      if (entry.amount <= 0) {
        errors.push(`Invalid airdrop amount at index ${index}: must be positive`);
      }
    });

    if (airdrop.lockupDuration < 0) {
      errors.push('Airdrop lockup duration must be non-negative');
    }

    if (airdrop.vestingDuration < 0) {
      errors.push('Airdrop vesting duration must be non-negative');
    }
  }

  private validateChainId(
    chainId: number,
    errors: string[],
    warnings: string[]
  ): void {
    if (!Number.isInteger(chainId) || chainId <= 0) {
      errors.push('Chain ID must be a positive integer');
    }

    // Known chain IDs
    const knownChains = [1, 8453, 42161, 1301, 34443]; // Ethereum, Base, Arbitrum, Unichain, Monad
    if (!knownChains.includes(chainId)) {
      warnings.push(`Unknown chain ID: ${chainId} - may not be supported`);
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'ipfs:';
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create request builder
 */
export function createRequestBuilder(): RequestBuilder {
  return new RequestBuilder();
}

/**
 * Quick request building
 */
export function buildDeployRequest(token: ClankerTokenV4): {
  success: boolean;
  request?: ClankerAPITokenRequest;
  errors: string[];
  warnings: string[];
} {
  const builder = createRequestBuilder();
  return builder.buildDeployTokenRequest(token);
}