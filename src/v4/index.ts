/**
 * Clanker SDK v4.25
 * Multi-chain token deployment
 */

import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { base } from 'viem/chains';

import { FeeLockerAbi, LockerAbi, TokenAbi, VaultAbi } from '../contracts/abis/index.js';
import { type ChainDeployment, getDeployment } from '../contracts/addresses.js';
import { deployToken } from '../core/deploy.js';
import type { ClankerError, ClankerTokenV4, DeployResult } from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface ClankerConfig {
  /** Wallet client for signing transactions */
  wallet?: WalletClient<Transport, Chain, Account>;
  /** Public client for reading blockchain state */
  publicClient?: PublicClient;
  /** Default chain (defaults to Base) */
  chain?: Chain;
}

type TxResult =
  | { txHash: `0x${string}`; error: undefined }
  | { txHash: undefined; error: ClankerError };

// ============================================================================
// Clanker V4 Class
// ============================================================================

/**
 * Main Clanker V4 SDK class
 *
 * @example
 * ```typescript
 * import { Clanker } from 'clanker-sdk/v4';
 *
 * const clanker = new Clanker({
 *   wallet: walletClient,
 *   publicClient: publicClient,
 * });
 *
 * const result = await clanker.deploy({
 *   name: 'My Token',
 *   symbol: 'TKN',
 *   image: 'ipfs://...',
 *   tokenAdmin: '0x...',
 *   chainId: 8453,
 * });
 * ```
 */
export class Clanker {
  private readonly wallet?: WalletClient<Transport, Chain, Account>;
  private readonly publicClient?: PublicClient;
  private readonly defaultChain: Chain;

  constructor(config?: ClankerConfig) {
    this.wallet = config?.wallet;
    this.publicClient = config?.publicClient;
    this.defaultChain = config?.chain ?? base;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private getChainDeployment(chainId?: number): ChainDeployment {
    const id = chainId ?? this.publicClient?.chain?.id ?? this.defaultChain.id;
    const deployment = getDeployment(id);
    if (!deployment) {
      throw new Error(`Clanker is not available on chain ${id}`);
    }
    return deployment;
  }

  private requireWallet(): WalletClient<Transport, Chain, Account> {
    if (!this.wallet) {
      throw new Error('Wallet client is required for this operation');
    }
    return this.wallet;
  }

  private requirePublicClient(): PublicClient {
    if (!this.publicClient) {
      throw new Error('Public client is required for this operation');
    }
    return this.publicClient;
  }

  // ==========================================================================
  // Token Deployment
  // ==========================================================================

  /**
   * Deploy a new token
   *
   * @example
   * ```typescript
   * const result = await clanker.deploy({
   *   name: 'My Token',
   *   symbol: 'TKN',
   *   image: 'ipfs://...',
   *   tokenAdmin: '0x...',
   *   chainId: 8453, // Base
   * });
   *
   * const { address } = await result.waitForTransaction();
   * ```
   */
  async deploy(token: ClankerTokenV4): Promise<DeployResult> {
    const wallet = this.requireWallet();
    const publicClient = this.requirePublicClient();

    return deployToken(token, wallet, publicClient);
  }

  // ==========================================================================
  // Fee Claims
  // ==========================================================================

  /**
   * Get available fees for a token
   */
  async getAvailableFees(token: `0x${string}`, recipient: `0x${string}`): Promise<bigint> {
    const publicClient = this.requirePublicClient();
    const deployment = this.getChainDeployment();

    return publicClient.readContract({
      address: deployment.contracts.feeLocker,
      abi: FeeLockerAbi,
      functionName: 'availableFees',
      args: [recipient, token],
    });
  }

  /**
   * Claim fees for a token
   */
  async claimFees(token: `0x${string}`, recipient: `0x${string}`): Promise<TxResult> {
    const wallet = this.requireWallet();
    const publicClient = this.requirePublicClient();
    const deployment = this.getChainDeployment();

    try {
      const { request } = await publicClient.simulateContract({
        address: deployment.contracts.feeLocker,
        abi: FeeLockerAbi,
        functionName: 'claim',
        args: [recipient, token],
        account: wallet.account,
      });

      const txHash = await wallet.writeContract(request);
      return { txHash, error: undefined };
    } catch (err) {
      return {
        txHash: undefined,
        error: {
          code: 'CLAIM_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // Reward Management
  // ==========================================================================

  /**
   * Get rewards configuration for a token
   */
  async getRewards(token: `0x${string}`): Promise<
    Array<{
      recipient: `0x${string}`;
      admin: `0x${string}`;
      bps: number;
      token: number;
    }>
  > {
    const publicClient = this.requirePublicClient();
    const deployment = this.getChainDeployment();

    try {
      const rewards = await publicClient.readContract({
        address: deployment.contracts.locker,
        abi: LockerAbi,
        functionName: 'getRewards',
        args: [token],
      });

      return rewards as Array<{
        recipient: `0x${string}`;
        admin: `0x${string}`;
        bps: number;
        token: number;
      }>;
    } catch {
      // Token may not be registered in locker yet
      return [];
    }
  }

  /**
   * Update reward recipient for a token
   */
  async updateRewardRecipient(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newRecipient: `0x${string}`;
  }): Promise<TxResult> {
    const wallet = this.requireWallet();
    const publicClient = this.requirePublicClient();
    const deployment = this.getChainDeployment();

    try {
      const { request } = await publicClient.simulateContract({
        address: deployment.contracts.locker,
        abi: LockerAbi,
        functionName: 'updateRewardRecipient',
        args: [params.token, params.rewardIndex, params.newRecipient],
        account: wallet.account,
      });

      const txHash = await wallet.writeContract(request);
      return { txHash, error: undefined };
    } catch (err) {
      return {
        txHash: undefined,
        error: {
          code: 'UPDATE_RECIPIENT_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err,
        },
      };
    }
  }

  /**
   * Update reward admin for a token
   */
  async updateRewardAdmin(params: {
    token: `0x${string}`;
    rewardIndex: bigint;
    newAdmin: `0x${string}`;
  }): Promise<TxResult> {
    const wallet = this.requireWallet();
    const publicClient = this.requirePublicClient();
    const deployment = this.getChainDeployment();

    try {
      const { request } = await publicClient.simulateContract({
        address: deployment.contracts.locker,
        abi: LockerAbi,
        functionName: 'updateRewardAdmin',
        args: [params.token, params.rewardIndex, params.newAdmin],
        account: wallet.account,
      });

      const txHash = await wallet.writeContract(request);
      return { txHash, error: undefined };
    } catch (err) {
      return {
        txHash: undefined,
        error: {
          code: 'UPDATE_ADMIN_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // Vault Operations
  // ==========================================================================

  /**
   * Get claimable vault amount for a token
   */
  async getVaultClaimableAmount(token: `0x${string}`): Promise<bigint> {
    const publicClient = this.requirePublicClient();
    const deployment = this.getChainDeployment();

    try {
      return await publicClient.readContract({
        address: deployment.contracts.vault,
        abi: VaultAbi,
        functionName: 'amountAvailableToClaim',
        args: [token],
      });
    } catch {
      return 0n;
    }
  }

  /**
   * Claim vaulted tokens
   */
  async claimVaultedTokens(token: `0x${string}`): Promise<TxResult> {
    const wallet = this.requireWallet();
    const publicClient = this.requirePublicClient();
    const deployment = this.getChainDeployment();

    try {
      const { request } = await publicClient.simulateContract({
        address: deployment.contracts.vault,
        abi: VaultAbi,
        functionName: 'claim',
        args: [token],
        account: wallet.account,
      });

      const txHash = await wallet.writeContract(request);
      return { txHash, error: undefined };
    } catch (err) {
      return {
        txHash: undefined,
        error: {
          code: 'VAULT_CLAIM_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // Token Metadata
  // ==========================================================================

  /**
   * Update token image
   */
  async updateImage(token: `0x${string}`, newImage: string): Promise<TxResult> {
    const wallet = this.requireWallet();
    const publicClient = this.requirePublicClient();

    try {
      const { request } = await publicClient.simulateContract({
        address: token,
        abi: TokenAbi,
        functionName: 'updateImage',
        args: [newImage],
        account: wallet.account,
      });

      const txHash = await wallet.writeContract(request);
      return { txHash, error: undefined };
    } catch (err) {
      return {
        txHash: undefined,
        error: {
          code: 'UPDATE_IMAGE_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err,
        },
      };
    }
  }

  /**
   * Update token metadata
   */
  async updateMetadata(token: `0x${string}`, metadata: string): Promise<TxResult> {
    const wallet = this.requireWallet();
    const publicClient = this.requirePublicClient();

    try {
      const { request } = await publicClient.simulateContract({
        address: token,
        abi: TokenAbi,
        functionName: 'updateMetadata',
        args: [metadata],
        account: wallet.account,
      });

      const txHash = await wallet.writeContract(request);
      return { txHash, error: undefined };
    } catch (err) {
      return {
        txHash: undefined,
        error: {
          code: 'UPDATE_METADATA_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          details: err,
        },
      };
    }
  }
}

// Re-export types
export type { ClankerError, ClankerTokenV4, DeployResult } from '../types/index.js';
