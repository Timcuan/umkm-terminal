/**
 * Services Module
 * Centralized services for dependency injection and code reuse
 */

import { type TokenConfiguration } from '../types/configuration.js';

// Validation Service
export {
  type IValidationService,
  type ServiceValidationResult,
  type PrivateKeyInfo,
  type MnemonicInfo,
  type AddressInfo,
  type TokenConfigInfo,
  ValidationService,
  validatePrivateKeyOrThrow,
  validateAddressOrThrow,
  createValidationService,
} from './validation-service.js';

// Re-export ValidationResult from wallet types for convenience
export type { ValidationResult } from '../wallet/types.js';

// Reward Recipient Service
export {
  type RewardRecipientConfig,
  type NormalizedRewardRecipient,
  RewardRecipientService,
  createRewardRecipientService,
  validateRewardRecipientsOrThrow,
} from './reward-recipient-service.js';

// Re-export existing service interfaces for convenience
export {
  type IDeploymentService,
  type DeployResult,
  type RewardsInfo,
  ClankerDeploymentService,
} from '../deployer/deployment-service.js';

export {
  type IEncryptionService,
  EncryptionService,
  isLegacyEncryption,
  decryptLegacy,
} from '../wallet/encryption-service.js';

export {
  type IDeployerFactory,
  DeployerFactory,
  createDeployerFactory,
  createConfiguredDeployerFactory,
} from '../deployer/factory.js';

// Import types and classes for default instances
import { ValidationService } from './validation-service.js';
import { RewardRecipientService, type RewardRecipientConfig, type NormalizedRewardRecipient, validateRewardRecipientsOrThrow } from './reward-recipient-service.js';

// Default service instances for backward compatibility
export const defaultValidationService = new ValidationService();
export const defaultRewardRecipientService = new RewardRecipientService();

// Additional exports expected by main index
export type IRewardRecipientService = RewardRecipientService;
export type { RewardRecipientOptions } from '../types/configuration.js';
export type RewardRecipientResult = NormalizedRewardRecipient[];

// Helper function aliases
export const validateTokenConfigOrThrow = (config: TokenConfiguration) => {
  const result = defaultValidationService.validateTokenConfig(config);
  if (!result.success) {
    const error = new Error(result.error);
    error.name = 'ValidationError';
    throw error;
  }
  return result.data;
};

export const normalizeRewardRecipientsOrThrow = (
  recipients: RewardRecipientConfig[],
  defaultRecipient?: string
): NormalizedRewardRecipient[] => {
  return validateRewardRecipientsOrThrow(recipients, defaultRecipient);
};