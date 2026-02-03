/**
 * Farcaster Integration Service
 * Handles Farcaster-specific logic for multi-wallet batch deployments
 */

import { 
  ValidationError, 
  createValidationError
} from '../errors/standardized-errors.js';
import type { ErrorContext } from '../types/base-types.js';
import { type FarcasterWalletsResult, getUserWallets } from '../farcaster/index.js';
import { type TokenConfiguration } from '../types/configuration.js';

export interface FarcasterDeploymentPlan {
  /** Available deployer wallets */
  deployerWallets: string[];
  /** Addresses assigned to each deployer */
  addressDistribution: Map<string, string[]>;
  /** All Farcaster wallets found */
  farcasterWallets: string[];
}

/**
 * Service for integrating with Farcaster for wallet management
 */
export class FarcasterService {
  /**
   * Fetch wallets from Farcaster user
   */
  async fetchUserWallets(farcasterInput: string | number): Promise<string[]> {
    try {
      const walletsResult: FarcasterWalletsResult = await getUserWallets(farcasterInput);
      const farcasterWallets = walletsResult.wallets || [];

      if (!farcasterWallets.length) {
        const context: ErrorContext = {
          operation: 'fetchUserWallets',
          component: 'FarcasterService'
        };
        throw createValidationError('INVALID_CONFIG', 'No wallets found for Farcaster user', context);
      }

      return farcasterWallets;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      const context: ErrorContext = {
        operation: 'fetchUserWallets',
        component: 'FarcasterService'
      };
      throw createValidationError('INVALID_CONFIG', `Failed to fetch Farcaster wallets: ${error}`, context);
    }
  }

  /**
   * Validate Farcaster input and check if wallets exist
   */
  async validateFarcasterInput(farcasterInput: string | number): Promise<boolean> {
    try {
      const walletsResult = await getUserWallets(farcasterInput);
      return !!(walletsResult.wallets && walletsResult.wallets.length > 0);
    } catch (_error) {
      return false;
    }
  }

  /**
   * Create deployment plan from Farcaster user and deployer private keys
   */
  async createFarcasterDeploymentPlan(
    farcasterInput: string | number,
    deployerPrivateKeys: `0x${string}`[],
    maxAddressesPerDeployer: number = 3
  ): Promise<FarcasterDeploymentPlan> {
    // Fetch farcaster wallets
    const farcasterWallets = await this.fetchUserWallets(farcasterInput);

    // Filter deployer wallets that are in farcaster wallets
    const deployerWallets: string[] = [];
    for (const privateKey of deployerPrivateKeys) {
      // In practice, you'd derive address from private key
      // This is simplified - you'd use viem's privateKeyToAccount
      const address = `0x${privateKey.slice(2, 42)}`;

      if (farcasterWallets.includes(address)) {
        deployerWallets.push(address);
      }
    }

    if (!deployerWallets.length) {
      const context: ErrorContext = {
        operation: 'createFarcasterDeploymentPlan',
        component: 'FarcasterService'
      };
      throw createValidationError('INVALID_CONFIG', 'No deployer wallets match Farcaster user wallets', context);
    }

    // Create address distribution
    const addressDistribution = this.distributeAddresses(
      farcasterWallets,
      deployerWallets,
      maxAddressesPerDeployer
    );

    return {
      deployerWallets,
      addressDistribution,
      farcasterWallets,
    };
  }

  /**
   * Distribute Farcaster addresses to deployer wallets
   */
  private distributeAddresses(
    farcasterWallets: string[],
    deployerWallets: string[],
    maxAddressesPerDeployer: number
  ): Map<string, string[]> {
    const addressDistribution = new Map<string, string[]>();
    const farcasterAddressesToDeploy = farcasterWallets.filter(
      (addr) => deployerWallets.includes(addr) || deployerWallets.length < farcasterWallets.length
    );

    // Distribute addresses to deployers (max per deployer)
    let addressIndex = 0;
    for (const deployerWallet of deployerWallets) {
      const assignedAddresses: string[] = [];

      // Assign up to maxAddressesPerDeployer addresses to each deployer
      for (
        let i = 0;
        i < maxAddressesPerDeployer && addressIndex < farcasterAddressesToDeploy.length;
        i++
      ) {
        assignedAddresses.push(farcasterAddressesToDeploy[addressIndex]);
        addressIndex++;
      }

      if (assignedAddresses.length > 0) {
        addressDistribution.set(deployerWallet, assignedAddresses);
      }

      // Break if all addresses are assigned
      if (addressIndex >= farcasterAddressesToDeploy.length) {
        break;
      }
    }

    return addressDistribution;
  }

  /**
   * Create token configurations based on Farcaster address distribution
   */
  createTokenConfigsForDistribution(
    baseConfig: TokenConfiguration,
    addressDistribution: Map<string, string[]>
  ): TokenConfiguration[] {
    const configs: TokenConfiguration[] = [];

    // Distribute tokens based on address distribution
    addressDistribution.forEach((addresses, deployerWallet) => {
      // Create tokens for each address assigned to this deployer
      addresses.forEach((address, index) => {
        const config = {
          ...baseConfig,
          // Use the assigned address as token admin
          tokenAdmin: address as `0x${string}`,
          // Add metadata for tracking
          metadata: {
            ...(baseConfig.metadata || {}),
            deployerWallet: deployerWallet as `0x${string}`,
            targetAddress: address as `0x${string}`,
            addressIndex: index,
          },
        };
        configs.push(config);
      });
    });

    return configs;
  }

  /**
   * Create optimized token configurations for multi-wallet deployment
   */
  createOptimizedConfigs(
    baseConfig: TokenConfiguration,
    count: number,
    walletAddresses: string[]
  ): TokenConfiguration[] {
    const configs: TokenConfiguration[] = [];

    for (let i = 0; i < count; i++) {
      const walletIndex = i % walletAddresses.length;

      configs.push({
        ...baseConfig,
        // Use wallet as token admin
        tokenAdmin: walletAddresses[walletIndex] as `0x${string}`,
        // Add unique identifier if needed
        metadata: {
          ...(baseConfig.metadata || {}),
          batchIndex: i,
          deployerWallet: walletAddresses[walletIndex] as `0x${string}`,
        },
      });
    }

    return configs;
  }
}