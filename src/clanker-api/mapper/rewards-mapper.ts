/**
 * Rewards Mapper
 * Specialized mapping for reward recipient configurations
 */

import type { RewardsConfig, RewardRecipient } from '../../types/index.js';
import type { ClankerAPITokenRequest } from '../types/api-types.js';
import type { RewardsMappingConfig } from '../types/mapper-types.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_REWARDS_MAPPING_CONFIG: RewardsMappingConfig = {
  convertBpsToPercentage: true,
  validateTotalAllocation: true,
  defaultFeePreference: 'Both',
};

// ============================================================================
// Rewards Mapper Class
// ============================================================================

export class RewardsMapper {
  private config: RewardsMappingConfig;

  constructor(config: Partial<RewardsMappingConfig> = {}) {
    this.config = { ...DEFAULT_REWARDS_MAPPING_CONFIG, ...config };
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Convert SDK rewards format to API format
   */
  mapToAPI(
    rewards: RewardsConfig | undefined,
    tokenAdmin: string
  ): {
    data: ClankerAPITokenRequest['rewards'];
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Handle undefined or empty rewards
    if (!rewards?.recipients || rewards.recipients.length === 0) {
      // Create default reward configuration (100% to token admin)
      return {
        data: [{
          admin: tokenAdmin,
          recipient: tokenAdmin,
          allocation: 100,
          rewardsToken: this.config.defaultFeePreference,
        }],
        errors,
        warnings: ['No rewards configuration provided - defaulting to 100% to token admin'],
      };
    }

    // Validate total allocation
    if (this.config.validateTotalAllocation) {
      const totalBps = rewards.recipients.reduce((sum, r) => sum + r.bps, 0);
      if (totalBps !== 10000) {
        errors.push(`Total rewards allocation must be 10000 bps (100%), got ${totalBps} bps`);
      }
    }

    // Convert each recipient
    const apiRewards: ClankerAPITokenRequest['rewards'] = rewards.recipients.map((recipient, index) => {
      const apiRecipient = this.mapRecipientToAPI(recipient, index, errors, warnings);
      return apiRecipient;
    });

    return { data: apiRewards, errors, warnings };
  }

  /**
   * Convert API rewards format back to SDK format
   */
  mapFromAPI(
    apiRewards: ClankerAPITokenRequest['rewards']
  ): {
    data: RewardsConfig;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!apiRewards || apiRewards.length === 0) {
      errors.push('API rewards configuration is empty');
      return {
        data: { recipients: [] },
        errors,
        warnings,
      };
    }

    // Convert each API recipient back to SDK format
    const recipients: RewardRecipient[] = apiRewards.map((apiRecipient, index) => {
      return this.mapRecipientFromAPI(apiRecipient, index, errors, warnings);
    });

    return {
      data: { recipients },
      errors,
      warnings,
    };
  }

  /**
   * Validate rewards configuration
   */
  validateRewards(rewards: RewardsConfig | undefined): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rewards?.recipients) {
      warnings.push('No rewards configuration provided');
      return { valid: true, errors, warnings };
    }

    // Validate each recipient
    rewards.recipients.forEach((recipient, index) => {
      this.validateRecipient(recipient, index, errors, warnings);
    });

    // Validate total allocation
    if (this.config.validateTotalAllocation) {
      const totalBps = rewards.recipients.reduce((sum, r) => sum + r.bps, 0);
      if (totalBps !== 10000) {
        errors.push(`Total allocation must be 10000 bps, got ${totalBps} bps`);
      }
    }

    // Check for duplicate recipients
    const recipientAddresses = rewards.recipients.map(r => r.recipient.toLowerCase());
    const uniqueAddresses = new Set(recipientAddresses);
    if (uniqueAddresses.size !== recipientAddresses.length) {
      warnings.push('Duplicate recipient addresses found');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private mapRecipientToAPI(
    recipient: RewardRecipient,
    index: number,
    errors: string[],
    warnings: string[]
  ): ClankerAPITokenRequest['rewards'][0] {
    // Validate recipient
    this.validateRecipient(recipient, index, errors, warnings);

    // Convert basis points to percentage
    const allocation = this.config.convertBpsToPercentage 
      ? recipient.bps / 100 
      : recipient.bps;

    // Map fee preference
    const rewardsToken = this.mapFeePreference(recipient.feePreference);

    return {
      admin: recipient.admin,
      recipient: recipient.recipient,
      allocation,
      rewardsToken,
    };
  }

  private mapRecipientFromAPI(
    apiRecipient: ClankerAPITokenRequest['rewards'][0],
    index: number,
    errors: string[],
    warnings: string[]
  ): RewardRecipient {
    // Validate API recipient
    if (!this.isValidAddress(apiRecipient.recipient)) {
      errors.push(`Invalid recipient address at index ${index}: ${apiRecipient.recipient}`);
    }

    if (!this.isValidAddress(apiRecipient.admin)) {
      errors.push(`Invalid admin address at index ${index}: ${apiRecipient.admin}`);
    }

    if (apiRecipient.allocation < 0 || apiRecipient.allocation > 100) {
      errors.push(`Invalid allocation at index ${index}: ${apiRecipient.allocation}% (must be 0-100)`);
    }

    // Convert percentage back to basis points
    const bps = this.config.convertBpsToPercentage 
      ? Math.round(apiRecipient.allocation * 100)
      : apiRecipient.allocation;

    // Map rewards token back to fee preference
    const feePreference = this.mapRewardsTokenToFeePreference(apiRecipient.rewardsToken);

    return {
      admin: apiRecipient.admin as `0x${string}`,
      recipient: apiRecipient.recipient as `0x${string}`,
      bps,
      feePreference,
    };
  }

  private validateRecipient(
    recipient: RewardRecipient,
    index: number,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate addresses
    if (!this.isValidAddress(recipient.recipient)) {
      errors.push(`Invalid recipient address at index ${index}: ${recipient.recipient}`);
    }

    if (!this.isValidAddress(recipient.admin)) {
      errors.push(`Invalid admin address at index ${index}: ${recipient.admin}`);
    }

    // Validate allocation
    if (recipient.bps < 0 || recipient.bps > 10000) {
      errors.push(`Invalid allocation at index ${index}: ${recipient.bps} bps (must be 0-10000)`);
    }

    if (recipient.bps === 0) {
      warnings.push(`Zero allocation for recipient at index ${index}`);
    }

    // Validate fee preference
    if (recipient.feePreference && 
        !['Both', 'Paired', 'Clanker'].includes(recipient.feePreference)) {
      errors.push(`Invalid fee preference at index ${index}: ${recipient.feePreference}`);
    }
  }

  private mapFeePreference(
    feePreference: RewardRecipient['feePreference']
  ): 'Both' | 'Clanker' | 'Paired' {
    switch (feePreference) {
      case 'Both':
        return 'Both';
      case 'Paired':
        return 'Paired';
      case 'Clanker':
        return 'Clanker';
      default:
        return this.config.defaultFeePreference;
    }
  }

  private mapRewardsTokenToFeePreference(
    rewardsToken: 'Both' | 'Clanker' | 'Paired' | undefined
  ): RewardRecipient['feePreference'] {
    switch (rewardsToken) {
      case 'Both':
        return 'Both';
      case 'Paired':
        return 'Paired';
      case 'Clanker':
        return 'Clanker';
      default:
        return this.config.defaultFeePreference;
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create rewards mapper with default configuration
 */
export function createRewardsMapper(config?: Partial<RewardsMappingConfig>): RewardsMapper {
  return new RewardsMapper(config);
}

/**
 * Quick rewards mapping to API format
 */
export function mapRewardsToAPI(
  rewards: RewardsConfig | undefined,
  tokenAdmin: string,
  config?: Partial<RewardsMappingConfig>
): {
  data: ClankerAPITokenRequest['rewards'];
  errors: string[];
  warnings: string[];
} {
  const mapper = createRewardsMapper(config);
  return mapper.mapToAPI(rewards, tokenAdmin);
}

/**
 * Quick rewards mapping from API format
 */
export function mapRewardsFromAPI(
  apiRewards: ClankerAPITokenRequest['rewards'],
  config?: Partial<RewardsMappingConfig>
): {
  data: RewardsConfig;
  errors: string[];
  warnings: string[];
} {
  const mapper = createRewardsMapper(config);
  return mapper.mapFromAPI(apiRewards);
}