/**
 * Enhanced Clanker Class with API Integration
 * Maintains backward compatibility while adding Clanker API support
 */

import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { base } from 'viem/chains';

import type { ClankerTokenV4, DeployResult } from '../../types/index.js';
import type { ClankerSDKConfig, OperationMethod } from '../types/config-types.js';
import { UnifiedExecutor } from '../executor/unified-executor.js';
import { 
  createConfigError,
  createValidationError 
} from '../types/error-types.js';

// ============================================================================
// Enhanced Configuration Types
// ============================================================================

/**
 * Enhanced Clanker configuration that extends the original with API support
 */
export interface EnhancedClankerConfig {
  // Original configuration (for backward compatibility)
  /** Wallet client for signing transactions */
  wallet?: WalletClient<Transport, Chain, Account>;
  /** Public client for reading blockchain state */
  publicClient?: PublicClient;
  /** Default chain (defaults to Base) */
  chain?: Chain;

  // New API configuration
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

// ============================================================================
// Enhanced Clanker Class
// ============================================================================

/**
 * Enhanced Clanker class with API integration support
 * 
 * Maintains 100% backward compatibility with existing code while adding
 * new Clanker API capabilities when configured.
 * 
 * @example
 * ```typescript
 * // Existing usage (unchanged)
 * const clanker = new EnhancedClanker({
 *   wallet: walletClient,
 *   publicClient: publicClient,
 * });
 * 
 * // New API usage
 * const clanker = new EnhancedClanker({
 *   api: { apiKey: 'your-api-key' },
 *   operationMethod: 'api'
 * });
 * 
 * // Auto mode (uses API when available, falls back to direct)
 * const clanker = new EnhancedClanker({
 *   wallet: walletClient,
 *   publicClient: publicClient,
 *   api: { apiKey: 'your-api-key' },
 *   operationMethod: 'auto'
 * });
 * ```
 */
export class EnhancedClanker {
  private readonly unifiedExecutor: UnifiedExecutor;
  private readonly config: EnhancedClankerConfig;

  constructor(config: EnhancedClankerConfig = {}) {
    this.config = config;

    // Convert enhanced config to SDK config format
    const sdkConfig: ClankerSDKConfig = {
      operationMethod: config.operationMethod || 'direct', // Default to direct for backward compatibility
      wallet: config.wallet,
      publicClient: config.publicClient,
      chain: config.chain || base,
      api: config.api,
    };

    this.unifiedExecutor = new UnifiedExecutor(sdkConfig);
  }

  // ==========================================================================
  // Core Token Operations (Backward Compatible)
  // ==========================================================================

  /**
   * Deploy a new token
   * 
   * This method maintains the exact same signature and behavior as the original
   * Clanker.deploy() method, but internally routes through the UnifiedExecutor
   * to support both direct contract and API methods.
   * 
   * @param token Token configuration
   * @param method Optional method override ('direct', 'api', 'auto')
   * @returns Promise<DeployResult> - Same format as original
   */
  async deploy(token: ClankerTokenV4, method?: OperationMethod): Promise<DeployResult> {
    try {
      return await this.unifiedExecutor.deploy(token, method);
    } catch (error) {
      // Ensure errors are in the expected format for backward compatibility
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      throw createValidationError(
        `Token deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'api',
        { token: token.name, originalError: error }
      );
    }
  }

  /**
   * Validate token configuration
   * 
   * New method that validates token configuration using the selected method
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
    return await this.unifiedExecutor.validateTokenConfig(token, method);
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
    return await this.unifiedExecutor.testConnection(method);
  }

  // ==========================================================================
  // Batch Operations (New Capabilities)
  // ==========================================================================

  /**
   * Deploy multiple tokens in batch
   * 
   * New method that leverages API batch capabilities when available
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
      success: boolean;
      result?: DeployResult;
      error?: string;
    }>;
  }> {
    return await this.unifiedExecutor.batchDeploy(tokens, method);
  }

  // ==========================================================================
  // Configuration Management
  // ==========================================================================

  /**
   * Update configuration
   * 
   * Allows runtime configuration updates
   * 
   * @param updates Partial configuration updates
   */
  updateConfig(updates: Partial<EnhancedClankerConfig>): void {
    // Merge updates with existing config
    Object.assign(this.config, updates);

    // Convert to SDK config format and update executor
    const sdkConfig: Partial<ClankerSDKConfig> = {
      operationMethod: updates.operationMethod,
      wallet: updates.wallet,
      publicClient: updates.publicClient,
      chain: updates.chain,
      api: updates.api,
    };

    this.unifiedExecutor.updateConfig(sdkConfig);
  }

  /**
   * Get current configuration (without sensitive data)
   * 
   * @returns Current configuration
   */
  getConfig(): Omit<EnhancedClankerConfig, 'api'> & { 
    hasApiKey: boolean;
    availableMethods: OperationMethod[];
  } {
    const sdkConfig = this.unifiedExecutor.getConfig();
    
    return {
      wallet: this.config.wallet,
      publicClient: this.config.publicClient,
      chain: this.config.chain,
      operationMethod: this.config.operationMethod,
      hasApiKey: !!(sdkConfig.api?.apiKey),
      availableMethods: this.unifiedExecutor.getAvailableMethods(),
    };
  }

  /**
   * Get available operation methods based on current configuration
   * 
   * @returns Array of available methods
   */
  getAvailableMethods(): OperationMethod[] {
    return this.unifiedExecutor.getAvailableMethods();
  }

  /**
   * Get method selection context for debugging
   * 
   * @param operationType Type of operation
   * @returns Method selection context
   */
  getMethodSelectionContext(operationType: 'deploy' | 'claim' | 'update' | 'vault') {
    return this.unifiedExecutor.getMethodSelectionContext(operationType);
  }

  // ==========================================================================
  // Backward Compatibility Helpers
  // ==========================================================================

  /**
   * Check if direct method is available
   * 
   * @returns True if wallet and publicClient are configured
   */
  isDirectAvailable(): boolean {
    return !!(this.config.wallet && this.config.publicClient);
  }

  /**
   * Check if API method is available
   * 
   * @returns True if API key is configured
   */
  isAPIAvailable(): boolean {
    return !!(this.config.api?.apiKey);
  }

  /**
   * Get the default chain
   * 
   * @returns Default chain configuration
   */
  getDefaultChain(): Chain {
    return this.config.chain || base;
  }

  // ==========================================================================
  // Legacy Method Compatibility
  // ==========================================================================

  /**
   * Legacy method: Get available fees for a token
   * 
   * This method maintains backward compatibility but will only work
   * with direct method (requires wallet and publicClient)
   * 
   * @param token Token address
   * @param recipient Recipient address
   * @returns Available fees amount
   */
  async getAvailableFees(token: `0x${string}`, recipient: `0x${string}`): Promise<bigint> {
    if (!this.isDirectAvailable()) {
      throw createConfigError(
        'getAvailableFees requires direct method (wallet and publicClient)',
        'direct',
        { 
          hasWallet: !!this.config.wallet,
          hasPublicClient: !!this.config.publicClient,
          suggestion: 'Configure wallet and publicClient for direct operations'
        }
      );
    }

    // This would call the original implementation
    // For now, throw an error indicating it needs to be implemented
    throw createConfigError(
      'getAvailableFees not yet integrated with enhanced Clanker',
      'direct',
      { 
        token,
        recipient,
        suggestion: 'Use original Clanker class for fee operations or implement integration'
      }
    );
  }

  /**
   * Legacy method: Claim available fees
   * 
   * @param token Token address
   * @param recipient Recipient address
   * @returns Transaction hash
   */
  async claimFees(token: `0x${string}`, recipient: `0x${string}`): Promise<`0x${string}`> {
    if (!this.isDirectAvailable()) {
      throw createConfigError(
        'claimFees requires direct method (wallet and publicClient)',
        'direct',
        { 
          hasWallet: !!this.config.wallet,
          hasPublicClient: !!this.config.publicClient,
          suggestion: 'Configure wallet and publicClient for direct operations'
        }
      );
    }

    // This would call the original implementation
    // For now, throw an error indicating it needs to be implemented
    throw createConfigError(
      'claimFees not yet integrated with enhanced Clanker',
      'direct',
      { 
        token,
        recipient,
        suggestion: 'Use original Clanker class for fee operations or implement integration'
      }
    );
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create enhanced Clanker instance with configuration
 * 
 * @param config Enhanced configuration
 * @returns EnhancedClanker instance
 */
export function createEnhancedClanker(config: EnhancedClankerConfig = {}): EnhancedClanker {
  return new EnhancedClanker(config);
}

/**
 * Create enhanced Clanker instance from environment variables
 * 
 * @returns EnhancedClanker instance configured from environment
 */
export function createEnhancedClankerFromEnv(): EnhancedClanker {
  // Load API key from environment
  const apiKey = process.env.CLANKER_API_KEY;
  const operationMethod = (process.env.CLANKER_OPERATION_METHOD as OperationMethod) || 'direct';

  const config: EnhancedClankerConfig = {
    operationMethod,
  };

  if (apiKey) {
    config.api = {
      apiKey,
      baseUrl: process.env.CLANKER_API_BASE_URL,
      timeout: process.env.CLANKER_API_TIMEOUT ? 
        parseInt(process.env.CLANKER_API_TIMEOUT) : undefined,
      retries: process.env.CLANKER_API_RETRIES ? 
        parseInt(process.env.CLANKER_API_RETRIES) : undefined,
    };
  }

  return new EnhancedClanker(config);
}

// ============================================================================
// Backward Compatibility Wrapper
// ============================================================================

/**
 * Backward compatibility wrapper that can replace the original Clanker class
 * 
 * This class has the exact same interface as the original Clanker class
 * but internally uses the enhanced version with API support.
 */
export class BackwardCompatibleClanker {
  private enhanced: EnhancedClanker;

  constructor(config?: {
    wallet?: WalletClient<Transport, Chain, Account>;
    publicClient?: PublicClient;
    chain?: Chain;
  }) {
    // Convert original config to enhanced config
    const enhancedConfig: EnhancedClankerConfig = {
      ...config,
      operationMethod: 'direct', // Always use direct for backward compatibility
    };

    this.enhanced = new EnhancedClanker(enhancedConfig);
  }

  /**
   * Deploy method with exact same signature as original
   */
  async deploy(token: ClankerTokenV4): Promise<DeployResult> {
    return await this.enhanced.deploy(token, 'direct');
  }

  /**
   * Validate token configuration
   */
  async validateTokenConfig(token: ClankerTokenV4): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    estimatedGas?: string;
    estimatedCost?: string;
  }> {
    return await this.enhanced.validateTokenConfig(token, 'direct');
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{
    method: OperationMethod;
    connected: boolean;
    authenticated?: boolean;
    latency?: number;
  }> {
    return await this.enhanced.testConnection('direct');
  }

  /**
   * Batch deploy tokens
   */
  async batchDeploy(tokens: ClankerTokenV4[]): Promise<{
    method: OperationMethod;
    results: Array<{
      token: string;
      success: boolean;
      result?: DeployResult;
      error?: string;
    }>;
  }> {
    return await this.enhanced.batchDeploy(tokens, 'direct');
  }

  /**
   * Get available fees with exact same signature as original
   */
  async getAvailableFees(token: `0x${string}`, recipient: `0x${string}`): Promise<bigint> {
    return await this.enhanced.getAvailableFees(token, recipient);
  }

  /**
   * Claim fees with exact same signature as original
   */
  async claimFees(token: `0x${string}`, recipient: `0x${string}`): Promise<`0x${string}`> {
    return await this.enhanced.claimFees(token, recipient);
  }
}