/**
 * Reward Recipient Service
 * Centralized logic for processing reward recipient configurations
 * Eliminates duplication between deployer and batch modules
 */

import { ValidationService, type ServiceValidationResult } from './validation-service.js';

// ============================================================================
// Types
// ============================================================================

export interface RewardRecipientConfig {
  address: string;
  allocation?: number;
  percentage?: number;
}

export interface NormalizedRewardRecipient {
  address: string;
  allocation: number;
}

// ============================================================================
// Reward Recipient Service
// ============================================================================

/**
 * Service for processing reward recipient configurations
 * Provides consistent logic for both batch and deployer modules
 */
export class RewardRecipientService {
  private validationService: ValidationService;

  constructor(validationService?: ValidationService) {
    this.validationService = validationService || new ValidationService();
  }

  /**
   * Normalize reward recipient configurations
   * Handles missing allocations and percentage distribution
   */
  normalize(
    recipients: RewardRecipientConfig[],
    defaultRecipient?: string
  ): NormalizedRewardRecipient[] {
    if (!recipients || recipients.length === 0) {
      if (defaultRecipient) {
        return [{ address: defaultRecipient, allocation: 100 }];
      }
      return [];
    }

    // Convert percentages to allocations and handle missing values
    const normalized: NormalizedRewardRecipient[] = [];
    let totalAllocated = 0;
    let recipientsWithoutAllocation = 0;

    // First pass: process recipients with explicit allocations
    for (const recipient of recipients) {
      if (recipient.allocation !== undefined) {
        normalized.push({
          address: recipient.address,
          allocation: recipient.allocation
        });
        totalAllocated += recipient.allocation;
      } else if (recipient.percentage !== undefined) {
        normalized.push({
          address: recipient.address,
          allocation: recipient.percentage
        });
        totalAllocated += recipient.percentage;
      } else {
        recipientsWithoutAllocation++;
      }
    }

    // Second pass: distribute remaining allocation to recipients without explicit values
    if (recipientsWithoutAllocation > 0) {
      const remainingAllocation = Math.max(0, 100 - totalAllocated);
      const allocationPerRecipient = Math.floor(remainingAllocation / recipientsWithoutAllocation);
      let remainder = remainingAllocation % recipientsWithoutAllocation;

      for (const recipient of recipients) {
        if (recipient.allocation === undefined && recipient.percentage === undefined) {
          const allocation = allocationPerRecipient + (remainder > 0 ? 1 : 0);
          normalized.push({
            address: recipient.address,
            allocation
          });
          if (remainder > 0) remainder--;
        }
      }
    }

    // If total doesn't equal 100% and we have a default recipient, adjust
    const currentTotal = normalized.reduce((sum, r) => sum + r.allocation, 0);
    if (currentTotal < 100 && defaultRecipient) {
      const existing = normalized.find(r => r.address.toLowerCase() === defaultRecipient.toLowerCase());
      if (existing) {
        existing.allocation += (100 - currentTotal);
      } else {
        normalized.push({
          address: defaultRecipient,
          allocation: 100 - currentTotal
        });
      }
    }

    return normalized;
  }

  /**
   * Validate reward recipient configurations
   */
  validate(recipients: NormalizedRewardRecipient[]): ServiceValidationResult<void> {
    const errors: string[] = [];

    if (!recipients || recipients.length === 0) {
      return { success: true, data: undefined };
    }

    let totalAllocation = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const prefix = `recipients[${i}]`;

      // Validate address
      const addressResult = this.validationService.validateAddress(recipient.address);
      if (!addressResult.success) {
        errors.push(`${prefix}.address: ${addressResult.error}`);
      }

      // Validate allocation
      if (typeof recipient.allocation !== 'number') {
        errors.push(`${prefix}.allocation must be a number`);
      } else if (recipient.allocation < 0 || recipient.allocation > 100) {
        errors.push(`${prefix}.allocation must be between 0 and 100`);
      } else {
        totalAllocation += recipient.allocation;
      }
    }

    // Validate total allocation
    if (Math.abs(totalAllocation - 100) > 0.01) { // Allow small floating point errors
      errors.push(`Total allocation must equal 100%, got ${totalAllocation}%`);
    }

    // Check for duplicate addresses
    const addresses = recipients.map(r => r.address.toLowerCase());
    const uniqueAddresses = new Set(addresses);
    if (addresses.length !== uniqueAddresses.size) {
      errors.push('Duplicate recipient addresses are not allowed');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join(', ')
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Convert normalized recipients to deployer format
   */
  toDeployerFormat(recipients: NormalizedRewardRecipient[]): Array<{
    recipient: string;
    allocation: number;
  }> {
    return recipients.map(r => ({
      recipient: r.address,
      allocation: r.allocation
    }));
  }

  /**
   * Convert normalized recipients to batch format
   */
  toBatchFormat(recipients: NormalizedRewardRecipient[]): Array<{
    address: string;
    percentage: number;
  }> {
    return recipients.map(r => ({
      address: r.address,
      percentage: r.allocation
    }));
  }

  /**
   * Merge multiple recipient configurations
   * Useful for combining template defaults with token-specific overrides
   */
  merge(
    defaultRecipients: RewardRecipientConfig[],
    overrideRecipients: RewardRecipientConfig[]
  ): RewardRecipientConfig[] {
    if (!overrideRecipients || overrideRecipients.length === 0) {
      return defaultRecipients || [];
    }

    if (!defaultRecipients || defaultRecipients.length === 0) {
      return overrideRecipients;
    }

    // Override recipients take precedence
    const merged = [...overrideRecipients];
    
    // Add default recipients that don't conflict
    for (const defaultRecipient of defaultRecipients) {
      const exists = overrideRecipients.some(
        r => r.address.toLowerCase() === defaultRecipient.address.toLowerCase()
      );
      if (!exists) {
        merged.push(defaultRecipient);
      }
    }

    return merged;
  }

  /**
   * Calculate total value for recipients based on token supply
   */
  calculateTotalValue(
    recipients: NormalizedRewardRecipient[],
    tokenSupply: bigint,
    tokenDecimals: number = 18
  ): Array<{
    address: string;
    allocation: number;
    tokenAmount: bigint;
  }> {
    return recipients.map(recipient => {
      const tokenAmount = (tokenSupply * BigInt(recipient.allocation)) / BigInt(100);
      return {
        address: recipient.address,
        allocation: recipient.allocation,
        tokenAmount
      };
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create default reward recipient service instance
 */
export function createRewardRecipientService(): RewardRecipientService {
  return new RewardRecipientService();
}

/**
 * Quick validation helper for reward recipients
 */
export function validateRewardRecipientsOrThrow(
  recipients: RewardRecipientConfig[],
  defaultRecipient?: string
): NormalizedRewardRecipient[] {
  const service = new RewardRecipientService();
  const normalized = service.normalize(recipients, defaultRecipient);
  const validation = service.validate(normalized);
  
  if (!validation.success) {
    const error = new Error(validation.error);
    error.name = 'ValidationError';
    (error as any).code = 'INVALID_REWARD_RECIPIENTS';
    throw error;
  }
  
  return normalized;
}