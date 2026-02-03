/**
 * Type-safe wrappers for deployment arguments
 * Replaces unsafe "as unknown as" patterns with proper typed interfaces
 * Requirements: 9.1 - Eliminate unsafe type casting
 */

import type { Address } from 'viem';
import type { VaultConfiguration, FeeConfiguration, RewardRecipientConfiguration } from './configuration.js';

// ============================================================================
// Contract Deployment Arguments
// ============================================================================

/**
 * Deployment job result for multi-wallet operations
 * Replaces: Record<string, unknown> for deployment results
 */
export interface DeploymentJobResult {
  /** Transaction hash */
  readonly txHash: `0x${string}`;
  /** Deployed token address */
  readonly tokenAddress?: Address;
  /** Chain ID where deployment occurred */
  readonly chainId: number;
  /** Gas used for deployment */
  readonly gasUsed?: bigint;
  /** Gas price used */
  readonly gasPrice?: bigint;
  /** Total cost in wei */
  readonly totalCost?: bigint;
  /** Deployment timestamp */
  readonly deployedAt: number;
  /** Token configuration used */
  readonly tokenConfig: {
    readonly name: string;
    readonly symbol: string;
    readonly chainId: number;
  };
}

/**
 * Type-safe wrapper for contract deployment arguments
 * Replaces: args: [config.args] as unknown as readonly [never]
 */
export interface DeploymentArgs {
  readonly tokenName: string;
  readonly tokenSymbol: string;
  readonly tokenImage: string;
  readonly tokenDescription: string;
  readonly tokenAdmin: Address;
  readonly mevProtection: number;
  readonly feeConfig: FeeConfiguration;
  readonly rewardRecipients: readonly RewardRecipient[];
  readonly socialLinks?: SocialLinks;
  readonly vaultConfig?: VaultConfiguration;
}

export interface RewardRecipient {
  readonly address: Address;
  readonly allocation: number;
  readonly rewardToken: 'Both' | 'Paired' | 'Clanker';
}

export interface SocialLinks {
  readonly website?: string;
  readonly twitter?: string;
  readonly telegram?: string;
  readonly discord?: string;
}

/**
 * Type-safe function to convert deployment arguments to contract args
 */
export function toContractArgs(args: DeploymentArgs): readonly [DeploymentArgs] {
  return [args] as const;
}

/**
 * Type guard to validate deployment arguments
 */
export function isValidDeploymentArgs(args: unknown): args is DeploymentArgs {
  if (!args || typeof args !== 'object') return false;
  
  const obj = args as Record<string, unknown>;
  
  return (
    typeof obj.tokenName === 'string' &&
    typeof obj.tokenSymbol === 'string' &&
    typeof obj.tokenImage === 'string' &&
    typeof obj.tokenDescription === 'string' &&
    typeof obj.tokenAdmin === 'string' &&
    typeof obj.mevProtection === 'number' &&
    !!obj.feeConfig && typeof obj.feeConfig === 'object' &&
    Array.isArray(obj.rewardRecipients)
  );
}

// ============================================================================
// Wallet Migration Types
// ============================================================================

/**
 * Legacy wallet format for migration
 * Replaces: wallet as unknown as { encrypted: string }
 */
export interface LegacyWallet {
  readonly address: Address;
  readonly name: string;
  readonly encrypted: string;
  readonly createdAt: number;
}

/**
 * Modern wallet format
 */
export interface ModernWallet {
  readonly address: Address;
  readonly name: string;
  readonly encryptedKey: string;
  readonly createdAt: number;
}

/**
 * Union type for wallet migration
 */
export type MigratableWallet = LegacyWallet | ModernWallet;

/**
 * Type guard to check if wallet is legacy format
 */
export function isLegacyWallet(wallet: unknown): wallet is LegacyWallet {
  if (!wallet || typeof wallet !== 'object') return false;
  
  const obj = wallet as Record<string, unknown>;
  
  return (
    typeof obj.address === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.encrypted === 'string' &&
    typeof obj.createdAt === 'number' &&
    !('encryptedKey' in obj)
  );
}

/**
 * Type guard to check if wallet is modern format
 */
export function isModernWallet(wallet: unknown): wallet is ModernWallet {
  if (!wallet || typeof wallet !== 'object') return false;
  
  const obj = wallet as Record<string, unknown>;
  
  return (
    typeof obj.address === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.encryptedKey === 'string' &&
    typeof obj.createdAt === 'number'
  );
}

/**
 * Type-safe wallet migration function
 */
export function migrateWallet(wallet: MigratableWallet): ModernWallet {
  if (isModernWallet(wallet)) {
    return wallet;
  }
  
  if (isLegacyWallet(wallet)) {
    return {
      address: wallet.address,
      name: wallet.name,
      encryptedKey: wallet.encrypted,
      createdAt: wallet.createdAt,
    };
  }
  
  throw new Error('Invalid wallet format for migration');
}

// ============================================================================
// Token Configuration Types
// ============================================================================

/**
 * Type-safe token configuration for validation
 * Replaces: task.config as unknown as Record<string, unknown>
 */
export interface ValidatableTokenConfig {
  readonly name: string;
  readonly symbol: string;
  readonly image?: string;
  readonly description?: string;
  readonly tokenAdmin?: Address;
  readonly mev?: number | boolean;
  readonly fees?: FeeConfiguration;
  readonly rewardRecipients?: readonly RewardRecipient[];
  readonly socials?: SocialLinks;
  readonly vault?: VaultConfiguration;
  readonly chainId?: number;
}

/**
 * Type guard for token configuration
 */
export function isValidTokenConfig(config: unknown): config is ValidatableTokenConfig {
  if (!config || typeof config !== 'object') return false;
  
  const obj = config as Record<string, unknown>;
  
  return (
    typeof obj.name === 'string' &&
    obj.name.trim().length > 0 &&
    typeof obj.symbol === 'string' &&
    obj.symbol.trim().length > 0
  );
}

/**
 * Type-safe configuration validation wrapper
 */
export function validateTokenConfigSafe(config: unknown): ValidatableTokenConfig {
  if (!isValidTokenConfig(config)) {
    throw new Error('Invalid token configuration format');
  }
  return config;
}

// ============================================================================
// QR Code Generation Types
// ============================================================================

/**
 * QR Code generation options
 * Replaces: { small: true, errorCorrectLevel: 'M' } as unknown as object
 */
export interface QRCodeOptions {
  readonly small?: boolean;
  readonly errorCorrectLevel?: 'L' | 'M' | 'Q' | 'H';
  readonly width?: number;
  readonly height?: number;
  readonly margin?: number;
  readonly color?: {
    readonly dark?: string;
    readonly light?: string;
  };
}

/**
 * Default QR code options
 */
export const DEFAULT_QR_OPTIONS: QRCodeOptions = {
  small: true,
  errorCorrectLevel: 'M',
} as const;

/**
 * Type-safe QR code options builder
 */
export function buildQROptions(options?: Partial<QRCodeOptions>): QRCodeOptions {
  return {
    ...DEFAULT_QR_OPTIONS,
    ...options,
  };
}