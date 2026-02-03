/**
 * Unified Executor
 * Main orchestration class that routes operations between direct contract and API methods
 */

import type { ClankerTokenV4, DeployResult } from '../../types/index.js';
import type { 
  ClankerSDKConfig,
  OperationMethod,
  MethodSelectionContext,
  BatchDeploymentResponse,
  BatchDeploymentResult,
  ChainSummary
} from '../types/config-types.js';
import { ClankerAPIMethod, BankrbotAPIMethod } from './api-method.js';
import { ConfigManager, createConfigFromEnv } from '../config/config-manager.js';
import { MethodSelector } from '../config/method-selector.js';
import { ChainMapper, createChainMapper } from '../mapper/chain-mapper.js';
import { BatchCoordinator, createBatchCoordinator } from '../batch/batch-coordinator.js';
import { 
  createConfigError
} from '../types/error-types.js';
import { 
  createValidationError 
} from '../errors/unified-error-hierarchy.js';
import { 
  validateTokenConfig,
  validateSDKConfig,
  assertValidTokenConfig 
} from '../validation/index.js';

// ============================================================================
// Unified Executor Class
// ============================================================================

export class UnifiedExecutor {
  private configManager: ConfigManager;
  private methodSelector: MethodSelector;
  private chainMapper: ChainMapper;
  private batchCoordinator: BatchCoordinator;
  private apiMethod?: ClankerAPIMethod;
  private bankrbotMethod?: BankrbotAPIMethod;

  constructor(config: ClankerSDKConfig = {}) {
    // Use lenient validation for backward compatibility
    const configValidation = validateSDKConfig(config);
    if (!configValidation.valid) {
      // Only throw for critical errors, not warnings
      const criticalErrors = configValidation.errors.filter(error => 
        error.message.includes('required') || 
        error.message.includes('invalid type') ||
        error.message.includes('Invalid operation method') ||
        error.message.includes('must be a valid URL') ||
        error.message.includes('must be a non-negative number') ||
        error.message.includes('must be a number between') ||
        error.message.includes('must be a string with at least') ||
        error.message.includes('must be a non-empty string')
      );
      
      if (criticalErrors.length > 0) {
        throw createConfigError(
          'Invalid SDK configuration',
          'auto',
          { 
            errors: criticalErrors.map(e => e.message),
            warnings: configValidation.warnings.map(w => w.message)
          }
        );
      }
    }

    this.configManager = new ConfigManager(config);
    this.methodSelector = new MethodSelector(config);
    this.chainMapper = createChainMapper();
    this.batchCoordinator = createBatchCoordinator();

    // Initialize API method if configuration is available
    if (this.configManager.isAPIAvailable()) {
      const apiConfig = this.configManager.getAPIConfig();
      if (apiConfig) {
        this.apiMethod = new ClankerAPIMethod(apiConfig);
      }
    }

    // Initialize Bankrbot method if configuration is available
    if (this.configManager.isBankrbotAvailable()) {
      const bankrbotConfig = this.configManager.getBankrbotConfig();
      if (bankrbotConfig) {
        this.bankrbotMethod = new BankrbotAPIMethod(bankrbotConfig);
      }
    }
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Deploy token using the appropriate method (direct, API, or auto-selected)
   */
  async deploy(token: ClankerTokenV4, method?: OperationMethod): Promise<DeployResult> {
    try {
      // Validate token configuration first
      assertValidTokenConfig(token);

      // Validate chain compatibility
      const chainValidation = this.validateChainCompatibility(token, method);
      if (!chainValidation.valid) {
        throw createValidationError(
          `Chain compatibility validation failed: ${chainValidation.errors.join(', ')}`,
          method || 'auto',
          chainValidation.errors,
          chainValidation.warnings
        );
      }

      // Determine which method to use (considering chain compatibility)
      const selectedMethod = this.selectMethodForChain(token, 'deploy', method);
      
      // Validate that the selected method is available
      this.validateMethodAvailability(selectedMethod);

      // Route to appropriate implementation
      switch (selectedMethod) {
        case 'bankrbot':
          return await this.deployViaBankrbot(token);
        
        case 'api':
          return await this.deployViaAPI(token);
        
        case 'direct':
          return await this.deployViaDirect(token);
        
        default:
          throw createConfigError(
            `Unsupported operation method: ${selectedMethod}`,
            selectedMethod,
            { token: token.name, method: selectedMethod, chainId: token.chainId }
          );
      }

    } catch (error) {
      // Re-throw structured errors as-is
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      // Wrap unknown errors
      throw createValidationError(
        `Token deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'api',
        [],
        [],
        { token: token.name, chainId: token.chainId, originalError: error }
      );
    }
  }

  /**
   * Validate token configuration using the appropriate method
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
    try {
      const selectedMethod = this.selectMethod('deploy', method);
      
      // For validation, we don't need to check method availability
      // We can do basic validation even without full configuration
      switch (selectedMethod) {
        case 'api':
          if (!this.apiMethod) {
            // Fall back to basic validation if API method not available
            return this.validateTokenConfigDirect(token);
          }
          return await this.apiMethod.validateTokenConfig(token);
        
        case 'bankrbot':
          if (!this.bankrbotMethod) {
            // Fall back to basic validation if Bankrbot method not available
            return this.validateTokenConfigDirect(token);
          }
          return await this.bankrbotMethod.validateTokenConfig(token);
        
        case 'direct':
          // For direct method, we'll do basic validation
          // In a real implementation, this would validate against contract requirements
          return this.validateTokenConfigDirect(token);
        
        default:
          throw createConfigError(
            `Unsupported validation method: ${selectedMethod}`,
            selectedMethod,
            { token: token.name }
          );
      }

    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      };
    }
  }

  /**
   * Test connectivity for the selected method
   */
  async testConnection(method?: OperationMethod): Promise<{
    method: OperationMethod;
    connected: boolean;
    authenticated?: boolean;
    latency?: number;
  }> {
    const selectedMethod = this.selectMethod('deploy', method);

    try {
      switch (selectedMethod) {
        case 'api':
          if (!this.apiMethod) {
            return {
              method: selectedMethod,
              connected: false,
              authenticated: false,
            };
          }
          
          const apiResult = await this.apiMethod.testConnection();
          return {
            method: selectedMethod,
            connected: apiResult.connected,
            authenticated: apiResult.authenticated,
            latency: apiResult.latency,
          };
        
        case 'direct':
          // For direct method, test wallet and RPC connectivity
          const directResult = await this.testDirectConnection();
          return {
            method: selectedMethod,
            connected: directResult.connected,
            latency: directResult.latency,
          };
        
        default:
          return {
            method: selectedMethod,
            connected: false,
          };
      }

    } catch (error) {
      return {
        method: selectedMethod,
        connected: false,
      };
    }
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Deploy multiple tokens in batch (supports multi-chain)
   */
  async batchDeploy(
    tokens: ClankerTokenV4[], 
    method?: OperationMethod
  ): Promise<BatchDeploymentResponse> {
    // Validate inputs
    if (!tokens || tokens.length === 0) {
      throw createValidationError(
        'No tokens provided for batch deployment',
        method || 'auto',
        ['tokens array is empty']
      );
    }

    // Validate all tokens first
    for (let i = 0; i < tokens.length; i++) {
      try {
        assertValidTokenConfig(tokens[i]);
      } catch (error) {
        throw createValidationError(
          `Token ${i} (${tokens[i].name}) validation failed`,
          method || 'auto',
          [error instanceof Error ? error.message : 'Invalid token configuration']
        );
      }
    }

    // Determine method for batch operation
    const selectedMethod = this.selectMethod('deploy', method);
    this.validateMethodAvailability(selectedMethod);

    // Use enhanced batch coordinator for API method
    if (selectedMethod === 'api') {
      if (!this.apiMethod) {
        throw createConfigError(
          'API method not available for batch deployment',
          'api',
          { tokenCount: tokens.length }
        );
      }

      // Use batch coordinator with enhanced error handling and recovery
      return await this.batchCoordinator.executeBatchDeployment(
        tokens,
        this.apiMethod,
        selectedMethod,
        {
          maxConcurrency: 3, // Conservative concurrency for API
          retryFailedItems: true,
          maxRetries: 2,
          retryDelay: 2000,
          failFast: false, // Continue processing even if some fail
          partialFailureThreshold: 80, // Only stop if 80% fail
        }
      );
    }

    // For direct method, fall back to sequential processing
    if (selectedMethod === 'direct') {
      return await this.batchDeployViaDirect(tokens);
    }

    throw createConfigError(
      `Unsupported batch deployment method: ${selectedMethod}`,
      selectedMethod,
      { tokenCount: tokens.length }
    );
  }

  // ==========================================================================
  // Configuration Management
  // ==========================================================================

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ClankerSDKConfig>): void {
    this.configManager.updateConfig(updates);

    // Reinitialize API method if configuration changed
    if (updates.api && this.configManager.isAPIAvailable()) {
      const apiConfig = this.configManager.getAPIConfig();
      if (apiConfig) {
        this.apiMethod = new ClankerAPIMethod(apiConfig);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ClankerSDKConfig {
    return this.configManager.getConfig();
  }

  /**
   * Get available methods based on current configuration
   */
  getAvailableMethods(): OperationMethod[] {
    const methods: OperationMethod[] = [];

    // Always include direct as it's the default/fallback method
    methods.push('direct');

    if (this.configManager.isAPIAvailable()) {
      methods.push('api');
    }

    if (methods.length > 1) {
      methods.push('auto');
    }

    return methods;
  }

  /**
   * Get method selection context for debugging
   */
  getMethodSelectionContext(operationType: 'deploy' | 'claim' | 'update' | 'vault'): MethodSelectionContext {
    return {
      operationType,
      hasApiKey: this.configManager.isAPIAvailable(),
      hasBankrbotKey: this.configManager.isBankrbotAvailable(),
      hasWallet: this.configManager.isDirectAvailable(),
      chainSupported: true, // Will be updated by selectMethodForChain
      userPreference: this.configManager.getOperationMethod(),
    };
  }

  private async testDirectConnection(): Promise<{
    connected: boolean;
    latency?: number;
  }> {
    const startTime = Date.now();

    try {
      // This would test the wallet and RPC connection
      // For now, we'll just check if the configuration is available
      const config = this.configManager.getConfig();
      const connected = !!(config.wallet && config.publicClient);
      
      return {
        connected,
        latency: Date.now() - startTime,
      };

    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime,
      };
    }
  }

  // ==========================================================================
  // Multi-Chain Support Methods
  // ==========================================================================

  /**
   * Validate chain compatibility for the given token and method
   */
  private validateChainCompatibility(
    token: ClankerTokenV4, 
    method?: OperationMethod
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestedMethod?: 'api' | 'direct' | 'bankrbot';
  } {
    const chainId = token.chainId || 8453; // Default to Base
    const operationMethod = method || this.configManager.getOperationMethod() || 'auto';

    return this.chainMapper.validateChainCompatibility(chainId, operationMethod);
  }

  /**
   * Select the best method for a specific chain
   */
  private selectMethodForChain(
    token: ClankerTokenV4,
    operationType: 'deploy' | 'claim' | 'update' | 'vault',
    userMethod?: OperationMethod
  ): OperationMethod {
    const chainId = token.chainId || 8453;
    const context = this.getMethodSelectionContext(operationType);
    
    // Override user preference if provided
    if (userMethod) {
      context.userPreference = userMethod;
    }

    // Update chain support based on actual chain
    context.chainSupported = this.chainMapper.isAPISupportedChain(chainId) || 
                            this.chainMapper.isDirectSupportedChain(chainId);

    // If user specified auto, get recommendation from chain mapper
    if (context.userPreference === 'auto') {
      const recommendation = this.chainMapper.getRecommendedMethod(chainId);
      
      switch (recommendation.method) {
        case 'api':
          if (context.hasApiKey) {
            return 'api';
          }
          break;
        case 'direct':
          if (context.hasWallet) {
            return 'direct';
          }
          break;
        case 'both':
          // Use method selector to choose between available options
          break;
        case 'none':
          throw createValidationError(
            `Chain ${chainId} is not supported by any method`,
            'auto',
            [`Chain ${chainId} not supported`]
          );
      }
    }

    return this.methodSelector.selectMethod(context);
  }

  /**
   * Get supported chains for current configuration
   */
  getSupportedChains(): {
    api: Array<{ id: number; name: string; nativeCurrency: string }>;
    direct: Array<{ id: number; name: string; nativeCurrency: string }>;
    both: Array<{ id: number; name: string; nativeCurrency: string }>;
  } {
    const apiChains = this.chainMapper.getAPISupportedChains();
    const directChains = this.chainMapper.getDirectSupportedChains();
    
    // Find chains supported by both methods
    const bothChains = apiChains.filter(apiChain => 
      directChains.some(directChain => directChain.id === apiChain.id)
    );

    // Chains only supported by API
    const apiOnlyChains = apiChains.filter(apiChain => 
      !directChains.some(directChain => directChain.id === apiChain.id)
    );

    // Chains only supported by direct
    const directOnlyChains = directChains.filter(directChain => 
      !apiChains.some(apiChain => apiChain.id === directChain.id)
    );

    return {
      api: apiOnlyChains.map(chain => ({
        id: chain.id,
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
      })),
      direct: directOnlyChains.map(chain => ({
        id: chain.id,
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
      })),
      both: bothChains.map(chain => ({
        id: chain.id,
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
      })),
    };
  }

  /**
   * Get chain-specific configuration and recommendations
   */
  getChainInfo(chainId: number): {
    supported: boolean;
    methods: OperationMethod[];
    recommendedMethod: OperationMethod;
    specialConsiderations: string[];
    configuration: {
      hasFeeDynamicHook: boolean;
      hasMevModule: boolean;
      defaultPairedToken: string;
    };
  } {
    const chainInfo = this.chainMapper.getChainInfo(chainId);
    const recommendation = this.chainMapper.getRecommendedMethod(chainId);
    const config = this.chainMapper.getChainSpecificConfig(chainId);

    if (!chainInfo) {
      return {
        supported: false,
        methods: [],
        recommendedMethod: 'direct',
        specialConsiderations: ['Chain not recognized'],
        configuration: {
          hasFeeDynamicHook: false,
          hasMevModule: false,
          defaultPairedToken: '0x0000000000000000000000000000000000000000',
        },
      };
    }

    const methods: OperationMethod[] = [];
    if (chainInfo.apiSupported) methods.push('api');
    if (chainInfo.directSupported) methods.push('direct');
    if (methods.length > 1) methods.push('auto');

    return {
      supported: methods.length > 0,
      methods,
      recommendedMethod: recommendation.method === 'both' ? 'auto' : 
                        recommendation.method === 'none' ? 'direct' : 
                        recommendation.method,
      specialConsiderations: config.specialConsiderations,
      configuration: {
        hasFeeDynamicHook: config.hasFeeDynamicHook,
        hasMevModule: config.hasMevModule,
        defaultPairedToken: config.defaultPairedToken,
      },
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private selectMethod(
    operationType: 'deploy' | 'claim' | 'update' | 'vault',
    userMethod?: OperationMethod
  ): OperationMethod {
    const context = this.getMethodSelectionContext(operationType);
    
    // Override user preference if provided
    if (userMethod) {
      context.userPreference = userMethod;
    }

    return this.methodSelector.selectMethod(context);
  }

  private validateMethodAvailability(method: OperationMethod): void {
    switch (method) {
      case 'api':
        if (!this.configManager.isAPIAvailable()) {
          throw createConfigError(
            'API method selected but API configuration is not available',
            'api',
            { 
              hasApiKey: !!this.configManager.getAPIConfig()?.apiKey,
              suggestion: 'Provide API key in configuration'
            }
          );
        }
        break;

      case 'direct':
        if (!this.configManager.isDirectAvailable()) {
          throw createConfigError(
            'Direct method selected but wallet/client configuration is not available',
            'direct',
            { 
              hasWallet: !!this.configManager.getConfig().wallet,
              hasPublicClient: !!this.configManager.getConfig().publicClient,
              suggestion: 'Provide wallet and publicClient in configuration'
            }
          );
        }
        break;

      case 'auto':
        const availableMethods = this.getAvailableMethods();
        if (availableMethods.length === 0) {
          throw createConfigError(
            'Auto method selected but no methods are available',
            'auto',
            { 
              suggestion: 'Configure either API key or wallet/publicClient'
            }
          );
        }
        break;
    }
  }

  private async deployViaBankrbot(token: ClankerTokenV4): Promise<DeployResult> {
    if (!this.bankrbotMethod) {
      throw createConfigError(
        'Bankrbot method not available - missing configuration',
        'bankrbot',
        { token: token.name }
      );
    }

    return await this.bankrbotMethod.deploy(token);
  }

  private async deployViaAPI(token: ClankerTokenV4): Promise<DeployResult> {
    if (!this.apiMethod) {
      throw createConfigError(
        'API method not available - missing configuration',
        'api',
        { token: token.name }
      );
    }

    return await this.apiMethod.deploy(token);
  }

  private async deployViaDirect(token: ClankerTokenV4): Promise<DeployResult> {
    // Get wallet and publicClient from config
    const config = this.configManager.getConfig();
    
    if (!config.wallet || !config.publicClient) {
      throw createConfigError(
        'Direct method requires wallet and publicClient configuration',
        'direct',
        { 
          token: token.name,
          hasWallet: !!config.wallet,
          hasPublicClient: !!config.publicClient,
          suggestion: 'Configure wallet and publicClient or use API method'
        }
      );
    }

    // Ensure wallet has account
    if (!config.wallet.account) {
      throw createConfigError(
        'Wallet must have an account configured',
        'direct',
        { 
          token: token.name,
          suggestion: 'Configure wallet with account or use API method'
        }
      );
    }

    // Import deployToken function
    const { deployToken } = await import('../../core/deploy.js');
    
    // Use existing direct deployment logic
    // Cast to any to bypass TypeScript strict checking since we've validated the wallet has an account
    return await deployToken(token, config.wallet as any, config.publicClient);
  }

  private validateTokenConfigDirect(token: ClankerTokenV4): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    estimatedGas?: string;
    estimatedCost?: string;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation for direct method
    if (!token.name?.trim()) {
      errors.push('Token name is required');
    }

    if (!token.symbol?.trim()) {
      errors.push('Token symbol is required');
    }

    if (!token.tokenAdmin?.trim()) {
      errors.push('Token admin address is required');
    }

    // Add more validation as needed
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

  private async batchDeployViaDirect(
    tokens: ClankerTokenV4[]
  ): Promise<BatchDeploymentResponse> {
    const results: BatchDeploymentResult[] = [];
    const chainSummary: Record<number, ChainSummary> = {};

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

    // Process each chain sequentially
    for (const [chainId, chainTokens] of tokensByChain.entries()) {
      for (const token of chainTokens) {
        try {
          const result = await this.deployViaDirect(token);
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
    }

    return {
      method: 'direct',
      results,
      chainSummary,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create unified executor with configuration
 */
export function createUnifiedExecutor(config: ClankerSDKConfig = {}): UnifiedExecutor {
  return new UnifiedExecutor(config);
}

/**
 * Create unified executor from environment variables
 */
export function createUnifiedExecutorFromEnv(): UnifiedExecutor {
  const config = createConfigFromEnv();
  return new UnifiedExecutor(config);
}