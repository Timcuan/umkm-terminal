/**
 * Clanker SDK v4.25
 * Multi-chain token deployment with optional API integration
 */

import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { base } from 'viem/chains';

import { FeeLockerAbi, LockerAbi, TokenAbi, VaultAbi } from '../contracts/abis/index.js';
import { type ChainDeployment, getDeployment } from '../contracts/addresses.js';
import { deployToken } from '../core/deploy.js';
import type { ClankerError, ClankerTokenV4, DeployResult } from '../types/index.js';
import { 
  DeploymentError, 
  createDeploymentError
} from '../errors/standardized-errors.js';
import type { ErrorContext } from '../types/base-types.js';

// Import Clanker API integration components
import { 
  UnifiedExecutor,
  type ClankerSDKConfig,
  type OperationMethod,
  createUnifiedExecutor
} from '../clanker-api/index.js';

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
  /** Operation method preference: 'direct', 'api', or 'auto' */
  operationMethod?: OperationMethod;
  /** Clanker API configuration */
  api?: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
}

type TxResult =
  | { txHash: `0x${string}`; error: undefined }
  | { txHash: undefined; error: ClankerError };

// ============================================================================
// Clanker V4 Class
// ============================================================================

/**
 * Main Clanker V4 SDK class with optional API integration
 *
 * @example
 * ```typescript
 * import { Clanker } from 'clanker-sdk/v4';
 *
 * // Traditional direct contract usage (unchanged)
 * const clanker = new Clanker({
 *   wallet: walletClient,
 *   publicClient: publicClient,
 * });
 *
 * // With API integration
 * const clanker = new Clanker({
 *   wallet: walletClient,
 *   publicClient: publicClient,
 *   api: { apiKey: 'your-api-key' },
 *   operationMethod: 'auto' // Uses API when available, falls back to direct
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
  private readonly unifiedExecutor?: UnifiedExecutor;
  private readonly useAPIIntegration: boolean;

  constructor(config?: ClankerConfig) {
    this.wallet = config?.wallet;
    this.publicClient = config?.publicClient;
    this.defaultChain = config?.chain ?? base;
    
    // Initialize API integration if configuration is provided
    this.useAPIIntegration = !!(config?.api?.apiKey || config?.operationMethod);
    
    if (this.useAPIIntegration) {
      const sdkConfig: ClankerSDKConfig = {
        operationMethod: config?.operationMethod || 'direct',
        wallet: this.wallet,
        publicClient: this.publicClient,
        chain: this.defaultChain,
        api: config?.api,
      };
      
      this.unifiedExecutor = createUnifiedExecutor(sdkConfig);
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private getChainDeployment(chainId?: number): ChainDeployment {
    const id = chainId ?? this.publicClient?.chain?.id ?? this.defaultChain.id;
    const deployment = getDeployment(id);
    if (!deployment) {
      const context: ErrorContext = {
        operation: 'getChainDeployment',
        component: 'Clanker',
        chainId: id
      };
      throw createDeploymentError('DEPLOYMENT_FAILED', `Clanker is not available on chain ${id}`, context);
    }
    return deployment;
  }

  private requireWallet(): WalletClient<Transport, Chain, Account> {
    if (!this.wallet) {
      const context: ErrorContext = {
        operation: 'requireWallet',
        component: 'Clanker'
      };
      throw createDeploymentError('DEPLOYMENT_FAILED', 'Wallet client is required for this operation', context);
    }
    return this.wallet;
  }

  private requirePublicClient(): PublicClient {
    if (!this.publicClient) {
      const context: ErrorContext = {
        operation: 'requirePublicClient',
        component: 'Clanker'
      };
      throw createDeploymentError('DEPLOYMENT_FAILED', 'Public client is required for this operation', context);
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
  async deploy(token: ClankerTokenV4, method?: OperationMethod): Promise<DeployResult> {
    // Use unified executor if API integration is enabled
    if (this.useAPIIntegration && this.unifiedExecutor) {
      return await this.unifiedExecutor.deploy(token, method);
    }
    
    // Fall back to direct contract deployment
    const wallet = this.requireWallet();
    const publicClient = this.requirePublicClient();

    return deployToken(token, wallet, publicClient);
  }

  /**
   * Validate token configuration
   * 
   * @param token Token configuration to validate
   * @param method Optional method override
   * @returns Validation result with errors, warnings, and estimates
   */
  async validateTokenConfig(
    token: ClankerTokenV4, 
    method?: OperationMethod
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    estimatedGas?: string;
    estimatedCost?: string;
  }> {
    // Use unified executor if API integration is enabled
    if (this.useAPIIntegration && this.unifiedExecutor) {
      return await this.unifiedExecutor.validateTokenConfig(token, method);
    }
    
    // Basic validation for direct method
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!token.name?.trim()) {
      errors.push('Token name is required');
    }

    if (!token.symbol?.trim()) {
      errors.push('Token symbol is required');
    }

    if (!token.tokenAdmin?.trim()) {
      errors.push('Token admin address is required');
    }

    if (token.name && token.name.length > 50) {
      warnings.push('Token name is very long - may be truncated');
    }

    if (token.symbol && token.symbol.length > 10) {
      warnings.push('Token symbol is very long - may cause display issues');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedGas: '500000', // Mock estimate
      estimatedCost: '0.01', // Mock estimate in ETH
    };
  }

  /**
   * Test connectivity for the configured method
   * 
   * @param method Optional method to test
   * @returns Connection test result
   */
  async testConnection(method?: OperationMethod): Promise<{
    method: OperationMethod;
    connected: boolean;
    authenticated?: boolean;
    latency?: number;
  }> {
    // Use unified executor if API integration is enabled
    if (this.useAPIIntegration && this.unifiedExecutor) {
      return await this.unifiedExecutor.testConnection(method);
    }
    
    // Test direct connection
    const startTime = Date.now();
    const connected = !!(this.wallet && this.publicClient);
    
    return {
      method: 'direct',
      connected,
      latency: Date.now() - startTime,
    };
  }

  /**
   * Deploy multiple tokens in batch
   * 
   * @param tokens Array of token configurations
   * @param method Optional method override
   * @returns Batch deployment results
   */
  async batchDeploy(
    tokens: ClankerTokenV4[], 
    method?: OperationMethod
  ): Promise<{
    method: OperationMethod;
    results: Array<{
      token: string;
      chainId: number;
      success: boolean;
      result?: DeployResult;
      error?: string;
      methodUsed: OperationMethod;
    }>;
    chainSummary: Record<number, {
      total: number;
      successful: number;
      failed: number;
      methodUsed: OperationMethod;
    }>;
  }> {
    // Use unified executor if API integration is enabled
    if (this.useAPIIntegration && this.unifiedExecutor) {
      const response = await this.unifiedExecutor.batchDeploy(tokens, method);
      
      // Ensure methodUsed is always defined
      const results = response.results.map(result => ({
        ...result,
        methodUsed: result.methodUsed || response.method,
      }));
      
      return {
        ...response,
        results,
      };
    }
    
    // Sequential deployment for direct method
    const results: Array<{
      token: string;
      chainId: number;
      success: boolean;
      result?: DeployResult;
      error?: string;
      methodUsed: OperationMethod;
    }> = [];
    
    const chainSummary: Record<number, {
      total: number;
      successful: number;
      failed: number;
      methodUsed: OperationMethod;
    }> = {};

    // Group tokens by chain
    const tokensByChain = new Map<number, ClankerTokenV4[]>();
    for (const token of tokens) {
      const chainId = token.chainId || 8453;
      if (!tokensByChain.has(chainId)) {
        tokensByChain.set(chainId, []);
      }
      tokensByChain.get(chainId)!.push(token);
    }

    // Initialize chain summaries
    for (const [chainId, chainTokens] of tokensByChain.entries()) {
      chainSummary[chainId] = {
        total: chainTokens.length,
        successful: 0,
        failed: 0,
        methodUsed: 'direct',
      };
    }

    // Process each token
    for (const token of tokens) {
      const chainId = token.chainId || 8453;
      try {
        const result = await this.deploy(token, 'direct');
        results.push({
          token: token.name,
          chainId,
          success: true,
          result,
          methodUsed: 'direct',
        });
        chainSummary[chainId].successful++;
      } catch (error) {
        results.push({
          token: token.name,
          chainId,
          success: false,
          error: error instanceof Error ? error.message : 'Deployment failed',
          methodUsed: 'direct',
        });
        chainSummary[chainId].failed++;
      }
    }

    return {
      method: 'direct',
      results,
      chainSummary,
    };
  }

  // ==========================================================================
  // Configuration Management (New Methods)
  // ==========================================================================

  /**
   * Update configuration
   * 
   * @param updates Partial configuration updates
   */
  updateConfig(updates: Partial<ClankerConfig>): void {
    if (this.useAPIIntegration && this.unifiedExecutor) {
      const sdkUpdates: Partial<ClankerSDKConfig> = {
        operationMethod: updates.operationMethod,
        wallet: updates.wallet,
        publicClient: updates.publicClient,
        chain: updates.chain,
        api: updates.api,
      };
      
      this.unifiedExecutor.updateConfig(sdkUpdates);
    }
  }

  /**
   * Get available operation methods based on current configuration
   * 
   * @returns Array of available methods
   */
  getAvailableMethods(): OperationMethod[] {
    if (this.useAPIIntegration && this.unifiedExecutor) {
      return this.unifiedExecutor.getAvailableMethods();
    }
    
    // Only direct method available without API integration
    return ['direct'];
  }

  /**
   * Get supported chains for current configuration
   */
  getSupportedChains(): {
    api: Array<{ id: number; name: string; nativeCurrency: string }>;
    direct: Array<{ id: number; name: string; nativeCurrency: string }>;
    both: Array<{ id: number; name: string; nativeCurrency: string }>;
  } {
    if (this.useAPIIntegration && this.unifiedExecutor) {
      return this.unifiedExecutor.getSupportedChains();
    }
    
    // Return basic direct support for common chains
    const directChains = [
      { id: 8453, name: 'Base', nativeCurrency: 'ETH' },
      { id: 1, name: 'Ethereum', nativeCurrency: 'ETH' },
      { id: 42161, name: 'Arbitrum', nativeCurrency: 'ETH' },
    ];
    
    return {
      api: [],
      direct: directChains,
      both: [],
    };
  }

  /**
   * Check if API integration is enabled
   */
  isAPIIntegrationEnabled(): boolean {
    return this.useAPIIntegration;
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

  // ==========================================================================
  // New V4 API Methods
  // ==========================================================================

  /**
   * Get tokens by admin address
   * Retrieves a paginated list of tokens where the specified address is the token admin
   * 
   * @param adminAddress The admin address to query
   * @param cursor Optional cursor for pagination
   * @param limit Optional limit for results per page
   * @returns Paginated list of tokens
   * 
   * @example
   * ```typescript
   * const result = await clanker.getTokensByAdmin('0x...');
   * if (result.success) {
   *   console.log('Tokens:', result.data.data);
   *   console.log('Total:', result.data.total);
   *   
   *   // Get next page
   *   if (result.data.cursor) {
   *     const nextPage = await clanker.getTokensByAdmin('0x...', result.data.cursor);
   *   }
   * }
   * ```
   */
  async getTokensByAdmin(
    adminAddress: `0x${string}`,
    cursor?: string,
    limit?: number
  ): Promise<{
    success: boolean;
    data?: {
      data: Array<{
        id: string;
        contract_address: string;
        name: string;
        symbol: string;
        admin: string;
        chain_id: number;
        deployed_at: string;
        pool_address?: string;
        img_url?: string;
      }>;
      total: number;
      cursor?: string;
    };
    error?: string;
  }> {
    if (!this.useAPIIntegration || !this.unifiedExecutor) {
      return {
        success: false,
        error: 'API integration is not enabled. Please provide an API key in the configuration.',
      };
    }

    try {
      // Access the API client through the unified executor
      const apiClient = (this.unifiedExecutor as any).apiClient;
      if (!apiClient) {
        return {
          success: false,
          error: 'API client is not available',
        };
      }

      const result = await apiClient.getTokensByAdmin(adminAddress, cursor, limit);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      }

      return {
        success: false,
        error: result.error?.message || 'Failed to fetch tokens by admin',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get uncollected fees for a token
   * For v4 tokens, rewardRecipientAddress is required
   * 
   * @param tokenAddress The token contract address
   * @param rewardRecipientAddress The reward recipient address (required for v4 tokens)
   * @returns Uncollected fees information
   * 
   * @example
   * ```typescript
   * const result = await clanker.getUncollectedFees(
   *   '0x...', // token address
   *   '0x...'  // reward recipient address
   * );
   * 
   * if (result.success) {
   *   console.log('Token0 rewards:', result.data.token0UncollectedRewards);
   *   console.log('Token1 rewards:', result.data.token1UncollectedRewards);
   * }
   * ```
   */
  async getUncollectedFees(
    tokenAddress: `0x${string}`,
    rewardRecipientAddress?: `0x${string}`
  ): Promise<{
    success: boolean;
    data?: {
      lockerAddress: string;
      lpNftId: number;
      token0UncollectedRewards: string;
      token1UncollectedRewards: string;
      token0: {
        chainId: number;
        address: string;
        symbol: string;
        decimals: number;
        name: string;
      };
      token1: {
        chainId: number;
        address: string;
        symbol: string;
        decimals: number;
        name: string;
      };
    };
    error?: string;
  }> {
    if (!this.useAPIIntegration || !this.unifiedExecutor) {
      return {
        success: false,
        error: 'API integration is not enabled. Please provide an API key in the configuration.',
      };
    }

    try {
      const apiClient = (this.unifiedExecutor as any).apiClient;
      if (!apiClient) {
        return {
          success: false,
          error: 'API client is not available',
        };
      }

      const result = await apiClient.getUncollectedFees(tokenAddress, rewardRecipientAddress);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      }

      return {
        success: false,
        error: result.error?.message || 'Failed to fetch uncollected fees',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Index a token for visibility on clanker.world
   * Requires partner API key
   * 
   * @param tokenAddress The token contract address
   * @param chainId The chain ID where the token is deployed
   * @param metadata Optional metadata for the token
   * @returns Index result
   * 
   * @example
   * ```typescript
   * const result = await clanker.indexToken('0x...', 8453, {
   *   name: 'My Token',
   *   symbol: 'MTK',
   *   image: 'https://...',
   *   description: 'Token description'
   * });
   * 
   * if (result.success) {
   *   console.log('Token indexed:', result.data.indexed);
   * }
   * ```
   */
  async indexToken(
    tokenAddress: `0x${string}`,
    chainId: number,
    metadata?: {
      name?: string;
      symbol?: string;
      image?: string;
      description?: string;
    }
  ): Promise<{
    success: boolean;
    data?: {
      success: boolean;
      indexed: boolean;
      tokenId?: string;
      message?: string;
    };
    error?: string;
  }> {
    if (!this.useAPIIntegration || !this.unifiedExecutor) {
      return {
        success: false,
        error: 'API integration is not enabled. Please provide an API key in the configuration.',
      };
    }

    try {
      const apiClient = (this.unifiedExecutor as any).apiClient;
      if (!apiClient) {
        return {
          success: false,
          error: 'API client is not available',
        };
      }

      const result = await apiClient.indexToken({
        contractAddress: tokenAddress,
        chainId,
        metadata,
      });
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      }

      return {
        success: false,
        error: result.error?.message || 'Failed to index token',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get token information by contract address
   * 
   * @param tokenAddress The token contract address
   * @returns Token information
   * 
   * @example
   * ```typescript
   * const result = await clanker.getTokenInfo('0x...');
   * if (result.success) {
   *   console.log('Token name:', result.data.name);
   *   console.log('Token symbol:', result.data.symbol);
   *   console.log('Deployed at:', result.data.deployed_at);
   * }
   * ```
   */
  async getTokenInfo(
    tokenAddress: `0x${string}`
  ): Promise<{
    success: boolean;
    data?: {
      id: string;
      contract_address: string;
      name: string;
      symbol: string;
      admin: string;
      chain_id: number;
      deployed_at: string;
      pool_address?: string;
      img_url?: string;
      description?: string;
      metadata?: Record<string, any>;
    };
    error?: string;
  }> {
    if (!this.useAPIIntegration || !this.unifiedExecutor) {
      return {
        success: false,
        error: 'API integration is not enabled. Please provide an API key in the configuration.',
      };
    }

    try {
      const apiClient = (this.unifiedExecutor as any).apiClient;
      if (!apiClient) {
        return {
          success: false,
          error: 'API client is not available',
        };
      }

      const result = await apiClient.getTokenByAddress(tokenAddress);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      }

      return {
        success: false,
        error: result.error?.message || 'Failed to fetch token info',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get paginated list of all deployed tokens
   * 
   * @param cursor Optional cursor for pagination
   * @param limit Optional limit for results per page
   * @param chainId Optional chain ID filter
   * @returns Paginated list of tokens
   * 
   * @example
   * ```typescript
   * const result = await clanker.getTokens(undefined, 20, 8453);
   * if (result.success) {
   *   console.log('Tokens:', result.data.data);
   *   console.log('Total:', result.data.total);
   *   
   *   // Get next page
   *   if (result.data.cursor) {
   *     const nextPage = await clanker.getTokens(result.data.cursor, 20, 8453);
   *   }
   * }
   * ```
   */
  async getTokens(
    cursor?: string,
    limit?: number,
    chainId?: number
  ): Promise<{
    success: boolean;
    data?: {
      data: Array<{
        id: string;
        contract_address: string;
        name: string;
        symbol: string;
        admin: string;
        chain_id: number;
        deployed_at: string;
        pool_address?: string;
        img_url?: string;
      }>;
      total: number;
      cursor?: string;
    };
    error?: string;
  }> {
    if (!this.useAPIIntegration || !this.unifiedExecutor) {
      return {
        success: false,
        error: 'API integration is not enabled. Please provide an API key in the configuration.',
      };
    }

    try {
      const apiClient = (this.unifiedExecutor as any).apiClient;
      if (!apiClient) {
        return {
          success: false,
          error: 'API client is not available',
        };
      }

      const result = await apiClient.getTokens(cursor, limit, chainId);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
        };
      }

      return {
        success: false,
        error: result.error?.message || 'Failed to fetch tokens',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Re-export types
export type { ClankerError, ClankerTokenV4, DeployResult, OperationMethod } from '../types/index.js';
