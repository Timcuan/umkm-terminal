/**
 * Deployment Service Interface
 * Interface for deployment operations to enable dependency injection
 */

import type { ClankerTokenV4 } from '../types/index.js';

// ============================================================================
// Deployment Service Interface
// ============================================================================

/**
 * Interface for deployment operations
 * Enables dependency injection and testing with mock implementations
 */
export interface IDeploymentService {
  /**
   * Deploy a token with the given configuration
   */
  deploy(config: ClankerTokenV4): Promise<DeployResult>;

  /**
   * Get available fees for a token and recipient
   */
  getAvailableFees(tokenAddress: `0x${string}`, recipient: `0x${string}`): Promise<bigint>;

  /**
   * Claim fees for a token and recipient
   */
  claimFees(tokenAddress: `0x${string}`, recipient: `0x${string}`): Promise<string>;

  /**
   * Update token image (requires token admin)
   */
  updateImage(tokenAddress: `0x${string}`, newImage: string): Promise<string>;

  /**
   * Update token metadata (requires token admin)
   */
  updateMetadata(tokenAddress: `0x${string}`, metadata: string): Promise<string>;

  /**
   * Get rewards configuration for a token
   */
  getRewards(tokenAddress: `0x${string}`): Promise<RewardsInfo>;

  /**
   * Update reward recipient (requires reward admin)
   */
  updateRewardRecipient(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newRecipient: `0x${string}`;
  }): Promise<string>;

  /**
   * Update reward admin (requires current admin)
   */
  updateRewardAdmin(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newAdmin: `0x${string}`;
  }): Promise<string>;

  /**
   * Get claimable vault amount
   */
  getVaultClaimableAmount(tokenAddress: `0x${string}`): Promise<bigint>;

  /**
   * Claim vaulted tokens
   */
  claimVaultedTokens(tokenAddress: `0x${string}`): Promise<string>;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface DeployResult {
  /** Transaction hash */
  txHash: string;
  /** Wait for transaction confirmation */
  waitForTransaction(): Promise<{ address: `0x${string}` }>;
}

export interface RewardsInfo {
  recipients: Array<{
    admin: `0x${string}`;
    recipient: `0x${string}`;
    bps: number;
    feePreference: string;
  }>;
}

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default deployment service implementation using Clanker SDK
 */
export class ClankerDeploymentService implements IDeploymentService {
  constructor(private clanker: any) {} // Using any to avoid circular dependency

  async deploy(config: ClankerTokenV4): Promise<DeployResult> {
    return this.clanker.deploy(config);
  }

  async getAvailableFees(tokenAddress: `0x${string}`, recipient: `0x${string}`): Promise<bigint> {
    return this.clanker.getAvailableFees(tokenAddress, recipient);
  }

  async claimFees(tokenAddress: `0x${string}`, recipient: `0x${string}`): Promise<string> {
    return this.clanker.claimFees(tokenAddress, recipient);
  }

  async updateImage(tokenAddress: `0x${string}`, newImage: string): Promise<string> {
    return this.clanker.updateImage(tokenAddress, newImage);
  }

  async updateMetadata(tokenAddress: `0x${string}`, metadata: string): Promise<string> {
    return this.clanker.updateMetadata(tokenAddress, metadata);
  }

  async getRewards(tokenAddress: `0x${string}`): Promise<RewardsInfo> {
    const rewards = await this.clanker.getRewards(tokenAddress);
    return {
      recipients: rewards.map((r: { recipient: `0x${string}`; admin: `0x${string}`; bps: number; token: number }) => ({
        admin: r.admin,
        recipient: r.recipient,
        bps: r.bps,
        feePreference: r.token === 0 ? 'Both' : r.token === 1 ? 'Paired' : 'Clanker'
      }))
    };
  }

  async updateRewardRecipient(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newRecipient: `0x${string}`;
  }): Promise<string> {
    return this.clanker.updateRewardRecipient(params);
  }

  async updateRewardAdmin(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newAdmin: `0x${string}`;
  }): Promise<string> {
    return this.clanker.updateRewardAdmin(params);
  }

  async getVaultClaimableAmount(tokenAddress: `0x${string}`): Promise<bigint> {
    return this.clanker.getVaultClaimableAmount(tokenAddress);
  }

  async claimVaultedTokens(tokenAddress: `0x${string}`): Promise<string> {
    return this.clanker.claimVaultedTokens(tokenAddress);
  }
}