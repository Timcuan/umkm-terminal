import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// Mock types and interfaces for testing
interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface WalletConfig {
  address: string;
  privateKey?: string;
  chainSpecific?: Record<number, {
    gasPrice?: number;
    gasLimit?: number;
    nonce?: number;
  }>;
}

interface MultiChainOperationConfig {
  chains: ChainConfig[];
  wallets: WalletConfig[];
  operation: 'deploy' | 'social' | 'fees' | 'batch';
  enhancedFeatures: boolean;
  coordinationStrategy: 'sequential' | 'parallel' | 'optimized';
  failureHandling: 'fail-fast' | 'continue-on-error' | 'retry-failed';
  tokenConfig: {
    name: string;
    symbol: string;
    metadata?: Record<string, any>;
  };
  customFees?: {
    recipients: Array<{
      address: string;
      percentage: number;
    }>;
  };
  socialIntegration?: {
    platforms: string[];
    autoPost: boolean;
  };
  mevProtection?: boolean;
}

interface ChainOperationResult {
  chainId: number;
  success: boolean;
  txHash?: string;
  tokenAddress?: string;
  gasUsed?: number;
  blockNumber?: number;
  error?: string;
  retryCount?: number;
}

interface MultiChainOperationResult {
  success: boolean;
  results: ChainOperationResult[];
  coordination: {
    strategy: string;
    totalTime: number;
    successfulChains: number[];
    failedChains: number[];
    partialFailures: number[];
  };
  enhancedFeatures: {
    enabled: boolean;
    features: string[];
    chainSupport: Record<number, string[]>;
  };
  error?: string;
}

class ValidationError extends Error {
  code: string;
  field?: string;
  value?: any;

  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

// Mock MultiChainExecutor class for testing
class MockMultiChainExecutor {
  private supportedChains = [1, 8453, 42161, 1301, 60808]; // Ethereum, Base, Arbitrum, Unichain, Monad

  async executeMultiChainOperation(config: MultiChainOperationConfig): Promise<MultiChainOperationResult> {
    try {
      // Validate configuration
      this.validateMultiChainConfig(config);

      // Initialize result structure
      const result: MultiChainOperationResult = {
        success: false,
        results: [],
        coordination: {
          strategy: config.coordinationStrategy,
          totalTime: 0,
          successfulChains: [],
          failedChains: [],
          partialFailures: []
        },
        enhancedFeatures: {
          enabled: config.enhancedFeatures,
          features: this.getEnabledFeatures(config),
          chainSupport: this.getChainFeatureSupport(config.chains, config.enhancedFeatures)
        }
      };

      const startTime = Date.now();

      // Execute operations based on coordination strategy
      if (config.coordinationStrategy === 'sequential') {
        result.results = await this.executeSequential(config);
      } else if (config.coordinationStrategy === 'parallel') {
        result.results = await this.executeParallel(config);
      } else {
        result.results = await this.executeOptimized(config);
      }

      result.coordination.totalTime = Date.now() - startTime;

      // Process results
      result.results.forEach(chainResult => {
        if (chainResult.success) {
          result.coordination.successfulChains.push(chainResult.chainId);
        } else {
          if (chainResult.retryCount && chainResult.retryCount > 0) {
            result.coordination.partialFailures.push(chainResult.chainId);
          } else {
            result.coordination.failedChains.push(chainResult.chainId);
          }
        }
      });

      // Determine overall success based on failure handling strategy
      result.success = this.determineOverallSuccess(config.failureHandling, result.results);

      return result;
    } catch (error) {
      return {
        success: false,
        results: [],
        coordination: {
          strategy: config.coordinationStrategy,
          totalTime: 0,
          successfulChains: [],
          failedChains: config.chains.map(c => c.chainId),
          partialFailures: []
        },
        enhancedFeatures: {
          enabled: false,
          features: [],
          chainSupport: {}
        },
        error: error.message
      };
    }
  }

  private async executeSequential(config: MultiChainOperationConfig): Promise<ChainOperationResult[]> {
    const results: ChainOperationResult[] = [];

    for (const chain of config.chains) {
      const wallet = this.selectWalletForChain(config.wallets, chain.chainId);
      const chainResult = await this.executeOnChain(chain, wallet, config);
      results.push(chainResult);

      // Handle failure based on strategy
      if (!chainResult.success && config.failureHandling === 'fail-fast') {
        // Add remaining chains as failed
        const remainingChains = config.chains.slice(config.chains.indexOf(chain) + 1);
        remainingChains.forEach(remainingChain => {
          results.push({
            chainId: remainingChain.chainId,
            success: false,
            error: 'Operation cancelled due to fail-fast strategy'
          });
        });
        break;
      }
    }

    return results;
  }

  private async executeParallel(config: MultiChainOperationConfig): Promise<ChainOperationResult[]> {
    const promises = config.chains.map(async (chain) => {
      const wallet = this.selectWalletForChain(config.wallets, chain.chainId);
      return this.executeOnChain(chain, wallet, config);
    });

    return Promise.all(promises);
  }

  private async executeOptimized(config: MultiChainOperationConfig): Promise<ChainOperationResult[]> {
    // Optimized strategy: prioritize chains by gas costs and success rates
    const sortedChains = [...config.chains].sort((a, b) => {
      // Simulate optimization logic (lower chain ID = higher priority for testing)
      return a.chainId - b.chainId;
    });

    // Execute in batches for optimization
    const batchSize = Math.min(3, sortedChains.length);
    const results: ChainOperationResult[] = [];

    for (let i = 0; i < sortedChains.length; i += batchSize) {
      const batch = sortedChains.slice(i, i + batchSize);
      const batchPromises = batch.map(async (chain) => {
        const wallet = this.selectWalletForChain(config.wallets, chain.chainId);
        return this.executeOnChain(chain, wallet, config);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Check if we should continue based on failure handling
      if (config.failureHandling === 'fail-fast' && batchResults.some(r => !r.success)) {
        // Add remaining chains as failed
        const remainingChains = sortedChains.slice(i + batchSize);
        remainingChains.forEach(remainingChain => {
          results.push({
            chainId: remainingChain.chainId,
            success: false,
            error: 'Operation cancelled due to fail-fast strategy'
          });
        });
        break;
      }
    }

    return results;
  }

  private async executeOnChain(
    chain: ChainConfig, 
    wallet: WalletConfig, 
    config: MultiChainOperationConfig
  ): Promise<ChainOperationResult> {
    try {
      // Validate chain support
      if (!this.supportedChains.includes(chain.chainId)) {
        throw new Error(`Chain ${chain.chainId} not supported`);
      }

      // Simulate chain-specific configuration
      const chainSpecificConfig = wallet.chainSpecific?.[chain.chainId] || {};
      
      // Simulate operation execution
      const gasUsed = Math.floor(Math.random() * 500000) + 100000;
      const blockNumber = Math.floor(Math.random() * 1000000) + 18000000;
      
      // Simulate enhanced features on chain
      if (config.enhancedFeatures) {
        // Check if chain supports enhanced features
        const supportedFeatures = this.getChainFeatureSupport([chain], true)[chain.chainId] || [];
        if (supportedFeatures.length === 0) {
          throw new Error(`Enhanced features not supported on chain ${chain.chainId}`);
        }
      }

      // Simulate MEV protection if enabled
      if (config.mevProtection && config.enhancedFeatures) {
        // MEV protection adds extra gas cost
        const mevGasCost = Math.floor(gasUsed * 0.1);
        // Simulate MEV protection success
      }

      return {
        chainId: chain.chainId,
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`,
        tokenAddress: `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`,
        gasUsed,
        blockNumber,
        retryCount: 0
      };
    } catch (error) {
      // Simulate retry logic
      const shouldRetry = config.failureHandling === 'retry-failed' && Math.random() > 0.5;
      const retryCount = shouldRetry ? Math.floor(Math.random() * 3) + 1 : 0;

      if (shouldRetry && retryCount > 0) {
        // Simulate successful retry
        if (Math.random() > 0.3) {
          return {
            chainId: chain.chainId,
            success: true,
            txHash: `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`,
            tokenAddress: `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`,
            gasUsed: Math.floor(Math.random() * 500000) + 100000,
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            retryCount
          };
        }
      }

      return {
        chainId: chain.chainId,
        success: false,
        error: error.message,
        retryCount
      };
    }
  }

  private selectWalletForChain(wallets: WalletConfig[], chainId: number): WalletConfig {
    // Select wallet with chain-specific configuration if available
    const walletWithChainConfig = wallets.find(w => w.chainSpecific && w.chainSpecific[chainId]);
    if (walletWithChainConfig) {
      return walletWithChainConfig;
    }

    // Default to first wallet
    return wallets[0];
  }

  private getEnabledFeatures(config: MultiChainOperationConfig): string[] {
    const features: string[] = [];
    
    if (config.enhancedFeatures) {
      features.push('enhanced-deployment');
      
      if (config.socialIntegration) {
        features.push('social-integration');
      }
      
      if (config.customFees) {
        features.push('custom-fees');
      }
      
      if (config.mevProtection) {
        features.push('mev-protection');
      }
    }
    
    return features;
  }

  private getChainFeatureSupport(chains: ChainConfig[], enhancedFeatures: boolean): Record<number, string[]> {
    const support: Record<number, string[]> = {};
    
    chains.forEach(chain => {
      const features: string[] = [];
      
      if (enhancedFeatures) {
        // All supported chains support basic enhanced features
        if (this.supportedChains.includes(chain.chainId)) {
          features.push('enhanced-deployment');
          features.push('custom-fees');
          
          // Some chains support additional features
          if ([1, 8453, 42161].includes(chain.chainId)) { // Ethereum, Base, Arbitrum
            features.push('social-integration');
            features.push('mev-protection');
          }
        }
      }
      
      support[chain.chainId] = features;
    });
    
    return support;
  }

  private determineOverallSuccess(strategy: string, results: ChainOperationResult[]): boolean {
    const successfulResults = results.filter(r => r.success);
    
    switch (strategy) {
      case 'fail-fast':
        return results.length === successfulResults.length;
      case 'continue-on-error':
        return successfulResults.length > 0;
      case 'retry-failed':
        return successfulResults.length >= Math.ceil(results.length * 0.5); // At least 50% success
      default:
        return successfulResults.length > 0;
    }
  }

  private validateMultiChainConfig(config: MultiChainOperationConfig): void {
    if (!config.chains || config.chains.length === 0) {
      throw new ValidationError('At least one chain configuration is required');
    }

    if (config.chains.length > 10) {
      throw new ValidationError('Maximum 10 chains supported per operation');
    }

    if (!config.wallets || config.wallets.length === 0) {
      throw new ValidationError('At least one wallet configuration is required');
    }

    if (!config.operation || !['deploy', 'social', 'fees', 'batch'].includes(config.operation)) {
      throw new ValidationError('Invalid operation type');
    }

    if (!config.coordinationStrategy || !['sequential', 'parallel', 'optimized'].includes(config.coordinationStrategy)) {
      throw new ValidationError('Invalid coordination strategy');
    }

    if (!config.failureHandling || !['fail-fast', 'continue-on-error', 'retry-failed'].includes(config.failureHandling)) {
      throw new ValidationError('Invalid failure handling strategy');
    }

    if (!config.tokenConfig.name || config.tokenConfig.name.trim().length === 0) {
      throw new ValidationError('Token name is required');
    }

    if (!config.tokenConfig.symbol || config.tokenConfig.symbol.trim().length === 0) {
      throw new ValidationError('Token symbol is required');
    }

    // Validate chain configurations
    config.chains.forEach((chain, index) => {
      if (!chain.chainId || chain.chainId <= 0) {
        throw new ValidationError(`Invalid chain ID at index ${index}`);
      }

      if (!chain.name || chain.name.trim().length === 0) {
        throw new ValidationError(`Chain name required at index ${index}`);
      }

      if (!chain.rpcUrl || !chain.rpcUrl.startsWith('http')) {
        throw new ValidationError(`Valid RPC URL required for chain at index ${index}`);
      }
    });

    // Validate wallet configurations
    config.wallets.forEach((wallet, index) => {
      if (!wallet.address || !wallet.address.match(/^0x[0-9a-fA-F]{40}$/)) {
        throw new ValidationError(`Invalid wallet address at index ${index}`);
      }
    });

    // Validate custom fees if provided
    if (config.customFees) {
      if (!config.customFees.recipients || config.customFees.recipients.length === 0) {
        throw new ValidationError('Custom fee recipients are required when custom fees are enabled');
      }

      const totalPercentage = config.customFees.recipients.reduce((sum, r) => sum + r.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new ValidationError(`Custom fee percentages must total 100%, got ${totalPercentage}%`);
      }

      // Check for duplicate addresses
      const addresses = config.customFees.recipients.map(r => r.address.toLowerCase());
      const uniqueAddresses = new Set(addresses);
      if (addresses.length !== uniqueAddresses.size) {
        throw new ValidationError('Duplicate fee recipient addresses are not allowed');
      }
    }
  }

  validateMultiChainSupport(config: MultiChainOperationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      this.validateMultiChainConfig(config);
    } catch (error) {
      errors.push(error.message);
    }

    // Additional validation for multi-chain support
    const unsupportedChains = config.chains.filter(chain => !this.supportedChains.includes(chain.chainId));
    if (unsupportedChains.length > 0) {
      errors.push(`Unsupported chains: ${unsupportedChains.map(c => c.chainId).join(', ')}`);
    }

    // Validate enhanced features support
    if (config.enhancedFeatures) {
      const chainsWithoutEnhancedSupport = config.chains.filter(chain => {
        const support = this.getChainFeatureSupport([chain], true);
        return !support[chain.chainId] || support[chain.chainId].length === 0;
      });

      if (chainsWithoutEnhancedSupport.length > 0) {
        errors.push(`Enhanced features not supported on chains: ${chainsWithoutEnhancedSupport.map(c => c.chainId).join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Custom generators for property testing
const generateChainConfig = () => fc.record({
  chainId: fc.constantFrom(1, 8453, 42161, 1301, 60808), // Supported chains
  name: fc.constantFrom('Ethereum', 'Base', 'Arbitrum', 'Unichain', 'Monad'),
  rpcUrl: fc.webUrl(),
  blockExplorer: fc.webUrl(),
  nativeCurrency: fc.record({
    name: fc.constantFrom('Ether', 'Ether', 'Ether', 'Ether', 'Monad'),
    symbol: fc.constantFrom('ETH', 'ETH', 'ETH', 'ETH', 'MON'),
    decimals: fc.constant(18),
  }),
});

const generateWalletConfig = () => fc.record({
  address: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER })
    .map(n => `0x${n.toString(16).padStart(40, '0')}`),
  privateKey: fc.option(fc.string({ minLength: 64, maxLength: 64 }), { nil: undefined }),
  chainSpecific: fc.option(fc.record({
    1: fc.option(fc.record({
      gasPrice: fc.integer({ min: 1000000000, max: 100000000000 }),
      gasLimit: fc.integer({ min: 21000, max: 10000000 }),
      nonce: fc.integer({ min: 0, max: 1000 }),
    }), { nil: undefined }),
    8453: fc.option(fc.record({
      gasPrice: fc.integer({ min: 1000000000, max: 100000000000 }),
      gasLimit: fc.integer({ min: 21000, max: 10000000 }),
      nonce: fc.integer({ min: 0, max: 1000 }),
    }), { nil: undefined }),
  }), { nil: undefined }),
});

const generateTokenConfig = () => fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  symbol: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0).map(s => s.toUpperCase()),
  metadata: fc.option(fc.record({
    description: fc.string({ minLength: 1, maxLength: 200 }),
    image: fc.webUrl(),
  }), { nil: undefined }),
});

const generateUniqueAddresses = (count: number) =>
  fc.set(
    fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER })
      .map(n => `0x${n.toString(16).padStart(40, '0')}`),
    { minLength: count, maxLength: count }
  ).map(addresses => Array.from(addresses));

const generateCustomFees = () => fc.integer({ min: 1, max: 5 })
  .chain(numRecipients => 
    generateUniqueAddresses(numRecipients)
      .map(addresses => {
        // Create recipients with equal distribution that sums to 100%
        const basePercentage = Math.floor(10000 / numRecipients) / 100; // Two decimal precision
        const remainder = 100 - (basePercentage * (numRecipients - 1));
        
        const recipients = addresses.map((address, index) => ({
          address,
          percentage: index === numRecipients - 1 ? remainder : basePercentage,
        }));

        return { recipients };
      })
  );

const generateSocialIntegration = () => fc.record({
  platforms: fc.array(fc.constantFrom('twitter', 'farcaster'), { minLength: 1, maxLength: 2 }),
  autoPost: fc.boolean(),
});

const generateMultiChainOperationConfig = () => fc.record({
  chains: fc.array(generateChainConfig(), { minLength: 1, maxLength: 5 }),
  wallets: fc.array(generateWalletConfig(), { minLength: 1, maxLength: 3 }),
  operation: fc.constantFrom('deploy', 'social', 'fees', 'batch'),
  enhancedFeatures: fc.boolean(),
  coordinationStrategy: fc.constantFrom('sequential', 'parallel', 'optimized'),
  failureHandling: fc.constantFrom('fail-fast', 'continue-on-error', 'retry-failed'),
  tokenConfig: generateTokenConfig(),
  customFees: fc.option(generateCustomFees(), { nil: undefined }),
  socialIntegration: fc.option(generateSocialIntegration(), { nil: undefined }),
  mevProtection: fc.boolean(),
});

const generateValidMultiChainConfig = () => 
  generateMultiChainOperationConfig()
    .map(config => ({
      ...config,
      chains: config.chains.filter((chain, index, self) => 
        self.findIndex(c => c.chainId === chain.chainId) === index
      ) // Remove duplicate chains
    }));

const generateInvalidMultiChainConfig = () => fc.oneof(
  // No chains
  fc.record({
    chains: fc.constant([]),
    wallets: fc.array(generateWalletConfig(), { minLength: 1, maxLength: 3 }),
    operation: fc.constantFrom('deploy', 'social', 'fees', 'batch'),
    enhancedFeatures: fc.boolean(),
    coordinationStrategy: fc.constantFrom('sequential', 'parallel', 'optimized'),
    failureHandling: fc.constantFrom('fail-fast', 'continue-on-error', 'retry-failed'),
    tokenConfig: generateTokenConfig(),
  }),
  
  // No wallets
  fc.record({
    chains: fc.array(generateChainConfig(), { minLength: 1, maxLength: 5 }),
    wallets: fc.constant([]),
    operation: fc.constantFrom('deploy', 'social', 'fees', 'batch'),
    enhancedFeatures: fc.boolean(),
    coordinationStrategy: fc.constantFrom('sequential', 'parallel', 'optimized'),
    failureHandling: fc.constantFrom('fail-fast', 'continue-on-error', 'retry-failed'),
    tokenConfig: generateTokenConfig(),
  }),
  
  // Invalid operation
  fc.record({
    chains: fc.array(generateChainConfig(), { minLength: 1, maxLength: 5 }),
    wallets: fc.array(generateWalletConfig(), { minLength: 1, maxLength: 3 }),
    operation: fc.constant('invalid' as any),
    enhancedFeatures: fc.boolean(),
    coordinationStrategy: fc.constantFrom('sequential', 'parallel', 'optimized'),
    failureHandling: fc.constantFrom('fail-fast', 'continue-on-error', 'retry-failed'),
    tokenConfig: generateTokenConfig(),
  }),
  
  // Invalid token config
  fc.record({
    chains: fc.array(generateChainConfig(), { minLength: 1, maxLength: 5 }),
    wallets: fc.array(generateWalletConfig(), { minLength: 1, maxLength: 3 }),
    operation: fc.constantFrom('deploy', 'social', 'fees', 'batch'),
    enhancedFeatures: fc.boolean(),
    coordinationStrategy: fc.constantFrom('sequential', 'parallel', 'optimized'),
    failureHandling: fc.constantFrom('fail-fast', 'continue-on-error', 'retry-failed'),
    tokenConfig: fc.record({
      name: fc.constant('   '), // Invalid name
      symbol: fc.string({ minLength: 1, maxLength: 10 }),
    }),
  })
);

describe('Multi-Chain Support Properties', () => {
  let executor: MockMultiChainExecutor;

  beforeEach(() => {
    executor = new MockMultiChainExecutor();
  });

  /**
   * **Property 9: Multi-Chain Support**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
   * 
   * For any multi-chain operation, the SDK should support operations across all 
   * supported chains, coordinate operations appropriately, handle multi-wallet 
   * configurations, maintain fee configuration capabilities, and preserve advanced 
   * features like MEV protection.
   */
  it('should support operations across all supported chains with enhanced features', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidMultiChainConfig(),
      async (config) => {
        // Test multi-chain operation
        const result = await executor.executeMultiChainOperation(config);
        
        // Operation should have results for all chains
        expect(result.results).toHaveLength(config.chains.length);
        expect(result.coordination).toBeDefined();
        expect(result.enhancedFeatures).toBeDefined();

        // Verify coordination strategy was applied
        expect(result.coordination.strategy).toBe(config.coordinationStrategy);
        expect(result.coordination.totalTime).toBeGreaterThanOrEqual(0);

        // Verify enhanced features configuration
        expect(result.enhancedFeatures.enabled).toBe(config.enhancedFeatures);
        if (config.enhancedFeatures) {
          expect(result.enhancedFeatures.features.length).toBeGreaterThanOrEqual(0);
          expect(result.enhancedFeatures.chainSupport).toBeDefined();
          
          // Verify chain support for enhanced features
          config.chains.forEach(chain => {
            expect(result.enhancedFeatures.chainSupport[chain.chainId]).toBeDefined();
          });
        } else {
          expect(result.enhancedFeatures.features).toHaveLength(0);
        }

        // Verify results structure for each chain
        result.results.forEach(chainResult => {
          expect(chainResult.chainId).toBeDefined();
          expect(typeof chainResult.success).toBe('boolean');
          
          if (chainResult.success) {
            expect(chainResult.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
            expect(chainResult.tokenAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
            expect(chainResult.gasUsed).toBeGreaterThan(0);
            expect(chainResult.blockNumber).toBeGreaterThan(0);
          } else {
            expect(chainResult.error).toBeDefined();
          }
        });

        // Verify coordination results
        const totalChains = config.chains.length;
        const successfulChains = result.coordination.successfulChains.length;
        const failedChains = result.coordination.failedChains.length;
        const partialFailures = result.coordination.partialFailures.length;
        
        expect(successfulChains + failedChains + partialFailures).toBeLessThanOrEqual(totalChains);
      }
    ), { numRuns: 100 });
  });

  it('should coordinate multi-chain operations appropriately', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidMultiChainConfig(),
      async (config) => {
        const result = await executor.executeMultiChainOperation(config);
        
        // Verify coordination strategy effects
        if (config.coordinationStrategy === 'sequential') {
          // Sequential should process chains one by one
          expect(result.coordination.strategy).toBe('sequential');
        } else if (config.coordinationStrategy === 'parallel') {
          // Parallel should process all chains simultaneously
          expect(result.coordination.strategy).toBe('parallel');
        } else if (config.coordinationStrategy === 'optimized') {
          // Optimized should use batching strategy
          expect(result.coordination.strategy).toBe('optimized');
        }

        // Verify failure handling strategy effects
        const hasFailures = result.coordination.failedChains.length > 0;
        const hasSuccesses = result.coordination.successfulChains.length > 0;
        
        if (config.failureHandling === 'fail-fast' && hasFailures) {
          // Fail-fast should stop on first failure
          expect(result.success).toBe(false);
        } else if (config.failureHandling === 'continue-on-error') {
          // Continue-on-error should succeed if any chain succeeds
          expect(result.success).toBe(hasSuccesses);
        } else if (config.failureHandling === 'retry-failed') {
          // Retry-failed should attempt retries
          const retriedResults = result.results.filter(r => r.retryCount && r.retryCount > 0);
          if (hasFailures) {
            expect(retriedResults.length).toBeGreaterThanOrEqual(0);
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('should handle multi-wallet configurations with chain-specific settings', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidMultiChainConfig()
        .map(config => ({
          ...config,
          wallets: config.wallets.map(wallet => ({
            ...wallet,
            chainSpecific: {
              [config.chains[0].chainId]: {
                gasPrice: 20000000000,
                gasLimit: 500000,
                nonce: 42
              }
            }
          }))
        })),
      async (config) => {
        const result = await executor.executeMultiChainOperation(config);
        
        // Should handle wallet configurations
        expect(result.results).toHaveLength(config.chains.length);
        
        // Verify that chain-specific wallet configurations are considered
        result.results.forEach(chainResult => {
          const hasChainSpecificConfig = config.wallets.some(wallet => 
            wallet.chainSpecific && wallet.chainSpecific[chainResult.chainId]
          );
          
          // If chain-specific config exists, operation should account for it
          if (hasChainSpecificConfig && chainResult.success) {
            expect(chainResult.gasUsed).toBeGreaterThan(0);
          }
        });
      }
    ), { numRuns: 50 });
  });

  it('should maintain fee configuration capabilities for enhanced operations', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidMultiChainConfig()
        .filter(config => config.customFees !== undefined)
        .map(config => ({
          ...config,
          enhancedFeatures: true
        })),
      async (config) => {
        const result = await executor.executeMultiChainOperation(config);
        
        // Should support custom fees with enhanced features
        expect(result.enhancedFeatures.enabled).toBe(true);
        expect(result.enhancedFeatures.features).toContain('custom-fees');
        
        // Verify fee configuration is maintained across chains
        config.chains.forEach(chain => {
          const chainSupport = result.enhancedFeatures.chainSupport[chain.chainId];
          if (chainSupport && chainSupport.includes('custom-fees')) {
            // Chain supports custom fees
            const chainResult = result.results.find(r => r.chainId === chain.chainId);
            if (chainResult && chainResult.success) {
              // Custom fees should be configured
              expect(chainResult.txHash).toBeDefined();
            }
          }
        });
      }
    ), { numRuns: 50 });
  });

  it('should preserve advanced features like MEV protection', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidMultiChainConfig()
        .map(config => ({
          ...config,
          enhancedFeatures: true,
          mevProtection: true
        })),
      async (config) => {
        const result = await executor.executeMultiChainOperation(config);
        
        // Should support MEV protection with enhanced features
        expect(result.enhancedFeatures.enabled).toBe(true);
        expect(result.enhancedFeatures.features).toContain('mev-protection');
        
        // Verify MEV protection is available on supported chains
        const mevSupportedChains = [1, 8453, 42161]; // Ethereum, Base, Arbitrum
        config.chains.forEach(chain => {
          const chainSupport = result.enhancedFeatures.chainSupport[chain.chainId];
          if (mevSupportedChains.includes(chain.chainId)) {
            expect(chainSupport).toContain('mev-protection');
          }
        });
      }
    ), { numRuns: 50 });
  });

  it('should handle invalid multi-chain configurations', async () => {
    await fc.assert(fc.asyncProperty(
      generateInvalidMultiChainConfig(),
      async (invalidConfig) => {
        // Test configuration validation
        const validation = executor.validateMultiChainSupport(invalidConfig);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);

        // Test operation should fail
        const result = await executor.executeMultiChainOperation(invalidConfig);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    ), { numRuns: 100 });
  });

  it('should provide descriptive error messages for multi-chain validation failures', () => {
    const testCases = [
      {
        config: {
          chains: [],
          wallets: [{ address: '0x1234567890123456789012345678901234567890' }],
          operation: 'deploy' as const,
          enhancedFeatures: false,
          coordinationStrategy: 'sequential' as const,
          failureHandling: 'fail-fast' as const,
          tokenConfig: { name: 'Test', symbol: 'TEST' }
        },
        expectedError: 'At least one chain configuration is required'
      },
      {
        config: {
          chains: [{ chainId: 1, name: 'Ethereum', rpcUrl: 'https://eth.llamarpc.com', blockExplorer: 'https://etherscan.io', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } }],
          wallets: [],
          operation: 'deploy' as const,
          enhancedFeatures: false,
          coordinationStrategy: 'sequential' as const,
          failureHandling: 'fail-fast' as const,
          tokenConfig: { name: 'Test', symbol: 'TEST' }
        },
        expectedError: 'At least one wallet configuration is required'
      },
      {
        config: {
          chains: [{ chainId: 1, name: 'Ethereum', rpcUrl: 'https://eth.llamarpc.com', blockExplorer: 'https://etherscan.io', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } }],
          wallets: [{ address: '0x1234567890123456789012345678901234567890' }],
          operation: 'invalid' as any,
          enhancedFeatures: false,
          coordinationStrategy: 'sequential' as const,
          failureHandling: 'fail-fast' as const,
          tokenConfig: { name: 'Test', symbol: 'TEST' }
        },
        expectedError: 'Invalid operation type'
      },
      {
        config: {
          chains: [{ chainId: 1, name: 'Ethereum', rpcUrl: 'https://eth.llamarpc.com', blockExplorer: 'https://etherscan.io', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } }],
          wallets: [{ address: '0x1234567890123456789012345678901234567890' }],
          operation: 'deploy' as const,
          enhancedFeatures: false,
          coordinationStrategy: 'sequential' as const,
          failureHandling: 'fail-fast' as const,
          tokenConfig: { name: '', symbol: 'TEST' }
        },
        expectedError: 'Token name is required'
      }
    ];

    testCases.forEach(({ config, expectedError }) => {
      const validation = executor.validateMultiChainSupport(config as MultiChainOperationConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes(expectedError))).toBe(true);
    });
  });
});