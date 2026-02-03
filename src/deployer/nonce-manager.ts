/**
 * Nonce Manager for Multi-Wallet Deployments
 * Tracks and manages nonces for multiple deployer wallets
 */

import type { PublicClient } from 'viem';
import { errorLogger, wrapError } from '../errors/index.js';

// ============================================================================
// Types
// ============================================================================

export interface NonceManagerOptions {
  /** Initial nonce fetch timeout (default: 5000ms) */
  fetchTimeout?: number;
  /** Auto-increment nonce after successful transaction (default: true) */
  autoIncrement?: boolean;
}

export interface WalletNonceState {
  /** Current nonce for the wallet */
  current: number;
  /** Last known network nonce */
  networkNonce: number;
  /** Last updated timestamp */
  lastUpdated: number;
  /** Is this wallet active for deployment */
  active: boolean;
}

// ============================================================================
// Nonce Manager Class
// ============================================================================

export class NonceManager {
  private nonceMap = new Map<string, WalletNonceState>();
  private options: Required<NonceManagerOptions>;

  constructor(
    private publicClient: PublicClient,
    options: NonceManagerOptions = {}
  ) {
    this.options = {
      fetchTimeout: options.fetchTimeout || 5000,
      autoIncrement: options.autoIncrement !== false,
    };
  }

  /**
   * Initialize nonce for a wallet
   */
  async initializeWallet(walletAddress: string, forceRefresh: boolean = false): Promise<number> {
    try {
      // Check if already initialized and not forcing refresh
      if (!forceRefresh) {
        const state = this.nonceMap.get(walletAddress);
        // Refresh if stale (older than 30 seconds)
        if (state && Date.now() - state.lastUpdated < 30000) {
          return state.current;
        }
      }

      // Fetch current nonce from network
      const networkNonce = await this.fetchNetworkNonce(walletAddress);

      // Update state
      const state: WalletNonceState = {
        current: networkNonce,
        networkNonce,
        lastUpdated: Date.now(),
        active: true,
      };

      this.nonceMap.set(walletAddress, state);
      return networkNonce;
    } catch (error) {
      errorLogger.log(wrapError(error, `Failed to initialize nonce for wallet ${walletAddress}`));
      throw error;
    }
  }

  /**
   * Get current nonce for a wallet
   */
  getCurrentNonce(walletAddress: string): number {
    const state = this.nonceMap.get(walletAddress);
    if (!state) {
      throw new Error(`Nonce not initialized for wallet ${walletAddress}`);
    }
    return state.current;
  }

  /**
   * Get next nonce for deployment
   */
  getNextNonce(walletAddress: string): number {
    const state = this.nonceMap.get(walletAddress);
    if (!state) {
      throw new Error(`Nonce not initialized for wallet ${walletAddress}`);
    }
    return state.current;
  }

  /**
   * Increment nonce after successful transaction
   */
  incrementNonce(walletAddress: string): void {
    const state = this.nonceMap.get(walletAddress);
    if (!state) {
      throw new Error(`Nonce not initialized for wallet ${walletAddress}`);
    }
    state.current++;
  }

  /**
   * Sync nonce with network (useful after failed transactions)
   */
  async syncNonce(walletAddress: string): Promise<number> {
    try {
      const networkNonce = await this.fetchNetworkNonce(walletAddress);
      const state = this.nonceMap.get(walletAddress);

      if (state) {
        state.networkNonce = networkNonce;
        state.current = Math.max(state.current, networkNonce);
        state.lastUpdated = Date.now();
      } else {
        this.nonceMap.set(walletAddress, {
          current: networkNonce,
          networkNonce,
          lastUpdated: Date.now(),
          active: true,
        });
      }

      return networkNonce;
    } catch (error) {
      errorLogger.log(wrapError(error, `Failed to sync nonce for wallet ${walletAddress}`));
      throw error;
    }
  }

  /**
   * Batch initialize nonces for multiple wallets
   * Optimizes network calls by fetching all nonces in parallel
   */
  async initializeWallets(walletAddresses: string[], forceRefresh: boolean = false): Promise<Map<string, number>> {
    try {
      const now = Date.now();
      const walletsToFetch: string[] = [];
      const results = new Map<string, number>();

      // Check which wallets need fetching
      for (const address of walletAddresses) {
        if (!forceRefresh) {
          const state = this.nonceMap.get(address);
          // Use cached if fresh (less than 30 seconds old)
          if (state && now - state.lastUpdated < 30000) {
            results.set(address, state.current);
            continue;
          }
        }
        walletsToFetch.push(address);
      }

      // Batch fetch nonces for wallets that need updating
      if (walletsToFetch.length > 0) {
        const batchResults = await this.batchFetchNonces(walletsToFetch);
        
        // Update states and results
        for (const [address, nonce] of Array.from(batchResults)) {
          const state: WalletNonceState = {
            current: nonce,
            networkNonce: nonce,
            lastUpdated: now,
            active: true,
          };
          this.nonceMap.set(address, state);
          results.set(address, nonce);
        }
      }

      return results;
    } catch (error) {
      errorLogger.log(wrapError(error, `Failed to batch initialize wallets: ${walletAddresses.join(', ')}`));
      throw error;
    }
  }

  /**
   * Batch sync nonces for multiple wallets
   * More efficient than individual sync calls for multiple wallets
   */
  async syncNonces(walletAddresses: string[]): Promise<Map<string, number>> {
    try {
      const batchResults = await this.batchFetchNonces(walletAddresses);
      const now = Date.now();

      // Update all wallet states
      for (const [address, networkNonce] of Array.from(batchResults)) {
        const state = this.nonceMap.get(address);
        
        if (state) {
          state.networkNonce = networkNonce;
          state.current = Math.max(state.current, networkNonce);
          state.lastUpdated = now;
        } else {
          this.nonceMap.set(address, {
            current: networkNonce,
            networkNonce,
            lastUpdated: now,
            active: true,
          });
        }
      }

      return batchResults;
    } catch (error) {
      errorLogger.log(wrapError(error, `Failed to batch sync nonces for wallets: ${walletAddresses.join(', ')}`));
      throw error;
    }
  }

  /**
   * Mark wallet as inactive (e.g., out of funds)
   */
  deactivateWallet(walletAddress: string): void {
    const state = this.nonceMap.get(walletAddress);
    if (state) {
      state.active = false;
    }
  }

  /**
   * Check if wallet is active
   */
  isWalletActive(walletAddress: string): boolean {
    const state = this.nonceMap.get(walletAddress);
    return state?.active ?? false;
  }

  /**
   * Get all active wallets
   */
  getActiveWallets(): string[] {
    return Array.from(this.nonceMap.entries())
      .filter(([, state]) => state.active)
      .map(([address]) => address);
  }

  /**
   * Get nonce state for all wallets
   */
  getAllStates(): Map<string, WalletNonceState> {
    return new Map(this.nonceMap);
  }

  /**
   * Fetch nonce from network with timeout
   */
  private async fetchNetworkNonce(walletAddress: string): Promise<number> {
    return Promise.race([
      this.publicClient.getTransactionCount({
        address: walletAddress as `0x${string}`,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Nonce fetch timeout for wallet ${walletAddress}`));
        }, this.options.fetchTimeout);
      }),
    ]);
  }

  /**
   * Batch fetch nonces for multiple wallets in parallel
   * Significantly reduces latency compared to sequential fetching
   */
  private async batchFetchNonces(walletAddresses: string[]): Promise<Map<string, number>> {
    const fetchPromises = walletAddresses.map(async (address) => {
      try {
        const nonce = await Promise.race([
          this.publicClient.getTransactionCount({
            address: address as `0x${string}`,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Batch nonce fetch timeout for wallet ${address}`));
            }, this.options.fetchTimeout);
          }),
        ]);
        return { address, nonce, success: true };
      } catch (error) {
        errorLogger.log(wrapError(error, `Failed to fetch nonce for wallet ${address} in batch`));
        return { address, nonce: 0, success: false, error };
      }
    });

    const results = await Promise.all(fetchPromises);
    const successfulResults = new Map<string, number>();
    const errors: string[] = [];

    for (const result of results) {
      if (result.success) {
        successfulResults.set(result.address, result.nonce);
      } else {
        errors.push(`${result.address}: ${(result.error as Error)?.message || 'Unknown error'}`);
      }
    }

    // If some fetches failed, log but don't throw (partial success is acceptable)
    if (errors.length > 0) {
      errorLogger.log(wrapError(new Error(`Some nonce fetches failed: ${errors.join(', ')}`), 'Batch nonce fetch partial failure'));
    }

    // Throw only if all fetches failed
    if (successfulResults.size === 0 && walletAddresses.length > 0) {
      throw new Error(`All batch nonce fetches failed: ${errors.join(', ')}`);
    }

    return successfulResults;
  }

  /**
   * Reset all nonce states
   */
  reset(): void {
    this.nonceMap.clear();
  }
}
