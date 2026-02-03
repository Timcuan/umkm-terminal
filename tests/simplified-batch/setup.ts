/**
 * Test setup for Simplified Batch Deployment System
 * 
 * This module provides test utilities, generators, and setup functions
 * for property-based testing with fast-check.
 */

import fc from 'fast-check';
import type { Address } from 'viem';
import type { TokenConfig, DeploymentOptions, GasStrategy } from '../../src/simplified-batch/types/core.js';
import { TOKEN_LIMITS } from '../../src/simplified-batch/constants/index.js';

// ============================================================================
// Test Generators
// ============================================================================

/**
 * Generates valid Ethereum addresses
 */
export const addressArbitrary = fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 40, maxLength: 40 })
  .map(bytes => `0x${bytes.map(b => b.toString(16)).join('')}` as Address);

/**
 * Generates valid token names
 */
export const tokenNameArbitrary = fc.string({ 
  minLength: TOKEN_LIMITS.MIN_NAME_LENGTH, 
  maxLength: TOKEN_LIMITS.MAX_NAME_LENGTH 
}).filter(name => name.trim().length >= TOKEN_LIMITS.MIN_NAME_LENGTH);

/**
 * Generates valid token symbols
 */
export const tokenSymbolArbitrary = fc.string({ 
  minLength: TOKEN_LIMITS.MIN_SYMBOL_LENGTH, 
  maxLength: TOKEN_LIMITS.MAX_SYMBOL_LENGTH 
})
.filter(symbol => /^[A-Z0-9]+$/.test(symbol.toUpperCase()))
.map(symbol => symbol.toUpperCase());

/**
 * Generates valid initial supply values
 */
export const initialSupplyArbitrary = fc.integer({ min: parseInt(TOKEN_LIMITS.MIN_INITIAL_SUPPLY), max: parseInt(TOKEN_LIMITS.MAX_INITIAL_SUPPLY) })
  .map(n => n.toString());

/**
 * Generates valid decimals values
 */
export const decimalsArbitrary = fc.integer({ min: 0, max: 18 });

/**
 * Generates valid gas strategy values
 */
export const gasStrategyArbitrary = fc.constantFrom<GasStrategy>('conservative', 'standard', 'fast');

/**
 * Generates valid token configurations
 */
export const tokenConfigArbitrary: fc.Arbitrary<TokenConfig> = fc.record({
  name: tokenNameArbitrary,
  symbol: tokenSymbolArbitrary,
  initialSupply: initialSupplyArbitrary,
  decimals: fc.option(decimalsArbitrary),
  advanced: fc.option(fc.record({
    mintable: fc.boolean(),
    burnable: fc.boolean(),
    pausable: fc.boolean(),
    customGasLimit: fc.option(fc.integer({ min: 21000, max: 10000000 })),
    tokenAdmin: fc.option(addressArbitrary),
    metadata: fc.option(fc.record({
      description: fc.option(fc.string({ maxLength: 500 })),
      image: fc.option(fc.webUrl()),
      socials: fc.option(fc.record({
        website: fc.option(fc.webUrl()),
        twitter: fc.option(fc.string({ maxLength: 50 })),
        telegram: fc.option(fc.string({ maxLength: 50 })),
        discord: fc.option(fc.string({ maxLength: 50 }))
      }))
    }))
  }))
});

/**
 * Generates arrays of unique token configurations
 */
export const uniqueTokenConfigsArbitrary = fc.array(tokenConfigArbitrary, { 
  minLength: 1, 
  maxLength: TOKEN_LIMITS.MAX_BATCH_SIZE 
}).chain(configs => {
  // Ensure unique names and symbols
  const uniqueConfigs: TokenConfig[] = [];
  const usedNames = new Set<string>();
  const usedSymbols = new Set<string>();
  
  for (const config of configs) {
    const name = config.name.toLowerCase();
    const symbol = config.symbol.toUpperCase();
    
    if (!usedNames.has(name) && !usedSymbols.has(symbol)) {
      usedNames.add(name);
      usedSymbols.add(symbol);
      uniqueConfigs.push(config);
    }
  }
  
  return fc.constant(uniqueConfigs.length > 0 ? uniqueConfigs : [configs[0]]);
});

/**
 * Generates valid deployment options
 */
export const deploymentOptionsArbitrary: fc.Arbitrary<DeploymentOptions> = fc.record({
  walletAddress: addressArbitrary,
  gasStrategy: gasStrategyArbitrary,
  maxConcurrency: fc.option(fc.integer({ min: 1, max: 10 })),
  retryAttempts: fc.option(fc.integer({ min: 0, max: 5 })),
  deploymentDelay: fc.option(fc.integer({ min: 0, max: 10000 }))
});

/**
 * Generates wei amounts as strings
 */
export const weiAmountArbitrary = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }).map(n => n.toString());

/**
 * Generates gas prices in wei
 */
export const gasPriceArbitrary = fc.integer({ min: 1000000000, max: 500000000000 }) // 1 to 500 gwei
  .map(n => n.toString());

/**
 * Generates gas limits
 */
export const gasLimitArbitrary = fc.integer({ min: 21000, max: 10000000 }).map(n => n.toString());

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a mock deployment session for testing
 */
export function createMockSession(overrides: Partial<any> = {}): any {
  return {
    id: `test-session-${Date.now()}`,
    status: 'pending',
    configs: [],
    results: [],
    progress: {
      totalTokens: 0,
      completedTokens: 0,
      currentToken: '',
      successCount: 0,
      failureCount: 0,
      estimatedTimeRemaining: 0,
      averageDeploymentTime: 0,
      currentPhase: 'validating'
    },
    startTime: new Date(),
    totalCost: '0',
    walletAddress: '0x1234567890123456789012345678901234567890' as Address,
    gasStrategy: 'standard' as GasStrategy,
    options: {
      walletAddress: '0x1234567890123456789012345678901234567890' as Address,
      gasStrategy: 'standard' as GasStrategy
    },
    ...overrides
  };
}

/**
 * Creates a mock validation result
 */
export function createMockValidationResult(valid = true, errors: any[] = [], warnings: any[] = []): any {
  return {
    valid,
    errors,
    warnings,
    data: valid ? {} : undefined
  };
}

/**
 * Creates a mock deployment error
 */
export function createMockDeploymentError(category = 'unknown_error', message = 'Test error'): any {
  return {
    category,
    message,
    technicalDetails: 'Test technical details',
    recoveryAction: {
      action: 'manual',
      description: 'Test recovery action',
      automated: false
    },
    retryable: false,
    timestamp: new Date(),
    code: 'TEST_ERROR'
  };
}

/**
 * Creates a mock balance info
 */
export function createMockBalanceInfo(balance = '1000000000000000000'): any {
  return {
    currentBalance: balance,
    balanceInEth: (Number(balance) / 1e18).toString(),
    lastUpdated: new Date(),
    chainId: 1
  };
}

/**
 * Creates a mock cost estimate
 */
export function createMockCostEstimate(totalCost = '100000000000000000'): any {
  return {
    totalGasCost: totalCost,
    perTokenCost: totalCost,
    safetyBuffer: (BigInt(totalCost) / BigInt(10)).toString(),
    estimatedTotal: (BigInt(totalCost) + BigInt(totalCost) / BigInt(10)).toString(),
    breakdown: {
      baseDeploymentCost: (BigInt(totalCost) / BigInt(2)).toString(),
      gasCost: (BigInt(totalCost) / BigInt(2)).toString(),
      networkFees: '0',
      safetyBuffer: (BigInt(totalCost) / BigInt(10)).toString()
    }
  };
}

// ============================================================================
// Property Test Helpers
// ============================================================================

/**
 * Property test configuration
 */
export const PROPERTY_TEST_CONFIG = {
  numRuns: 100,
  timeout: 10000,
  verbose: false
};

/**
 * Creates a property test with standard configuration
 */
export function createPropertyTest<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void,
  config = PROPERTY_TEST_CONFIG
) {
  return fc.assert(
    fc.property(arbitrary, predicate),
    {
      ...config,
      examples: []
    }
  );
}

/**
 * Creates a property test for validation functions
 */
export function createValidationPropertyTest<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  validationFn: (value: T) => any,
  config = PROPERTY_TEST_CONFIG
) {
  return createPropertyTest(
    name,
    arbitrary,
    (value) => {
      const result = validationFn(value);
      
      // Validation result should have required properties
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      
      // If valid, should have data
      if (result.valid) {
        expect(result).toHaveProperty('data');
      }
      
      // Errors should have proper structure
      result.errors.forEach((error: any) => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
        expect(typeof error.field).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(typeof error.code).toBe('string');
      });
    },
    config
  );
}

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Mock blockchain client for testing
 */
export class MockBlockchainClient {
  private balances = new Map<Address, string>();
  private nonces = new Map<Address, number>();
  private gasPrice = '20000000000'; // 20 gwei
  
  setBalance(address: Address, balance: string) {
    this.balances.set(address, balance);
  }
  
  setNonce(address: Address, nonce: number) {
    this.nonces.set(address, nonce);
  }
  
  setGasPrice(gasPrice: string) {
    this.gasPrice = gasPrice;
  }
  
  async getBalance(address: Address): Promise<string> {
    return this.balances.get(address) || '0';
  }
  
  async getNonce(address: Address): Promise<number> {
    return this.nonces.get(address) || 0;
  }
  
  async getGasPrice(): Promise<string> {
    return this.gasPrice;
  }
  
  async estimateGas(): Promise<string> {
    return '2000000';
  }
  
  async sendTransaction(): Promise<`0x${string}`> {
    return `0x${'1'.repeat(64)}` as `0x${string}`;
  }
  
  async waitForTransaction(): Promise<any> {
    return {
      status: 'success',
      blockNumber: 1,
      gasUsed: '2000000',
      contractAddress: `0x${'2'.repeat(40)}` as Address
    };
  }
  
  async getChainId(): Promise<number> {
    return 1;
  }
  
  async getBlockNumber(): Promise<number> {
    return 1000000;
  }
  
  isConnected(): boolean {
    return true;
  }
  
  async getFeeData() {
    return {
      gasPrice: this.gasPrice,
      maxFeePerGas: this.gasPrice,
      maxPriorityFeePerGas: '2000000000'
    };
  }
}

/**
 * Mock storage implementation for testing
 */
export class MockStorage {
  private data = new Map<string, string>();
  
  async saveSession(session: any): Promise<void> {
    this.data.set(`session:${session.id}`, JSON.stringify(session));
  }
  
  async loadSession(sessionId: string): Promise<any | null> {
    const data = this.data.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    this.data.delete(`session:${sessionId}`);
  }
  
  async listSessions(): Promise<string[]> {
    return Array.from(this.data.keys())
      .filter(key => key.startsWith('session:'))
      .map(key => key.replace('session:', ''));
  }
  
  async saveHistory(history: any): Promise<void> {
    this.data.set('history', JSON.stringify(history));
  }
  
  async loadHistory(): Promise<any> {
    const data = this.data.get('history');
    return data ? JSON.parse(data) : { sessions: [], totalDeployments: 0, totalCost: '0', successRate: 0, lastDeployment: new Date(), statistics: {} };
  }
  
  async addSessionToHistory(session: any): Promise<void> {
    const history = await this.loadHistory();
    history.sessions.push(session);
    await this.saveHistory(history);
  }
  
  async saveConfig(key: string, value: unknown): Promise<void> {
    this.data.set(`config:${key}`, JSON.stringify(value));
  }
  
  async loadConfig(key: string): Promise<unknown> {
    const data = this.data.get(`config:${key}`);
    return data ? JSON.parse(data) : undefined;
  }
  
  async deleteConfig(key: string): Promise<void> {
    this.data.delete(`config:${key}`);
  }
  
  async clear(): Promise<void> {
    this.data.clear();
  }
  
  async getStorageSize(): Promise<number> {
    return Array.from(this.data.values()).reduce((size, value) => size + value.length, 0);
  }
  
  async cleanup(): Promise<void> {
    // Mock cleanup - in real implementation would remove old sessions
  }
}

// ============================================================================
// Test Data
// ============================================================================

/**
 * Sample valid token configurations for testing
 */
export const SAMPLE_TOKEN_CONFIGS: TokenConfig[] = [
  {
    name: 'Test Token 1',
    symbol: 'TEST1',
    initialSupply: '1000000',
    decimals: 18
  },
  {
    name: 'Test Token 2',
    symbol: 'TEST2',
    initialSupply: '500000',
    decimals: 6
  },
  {
    name: 'Advanced Token',
    symbol: 'ADV',
    initialSupply: '2000000',
    decimals: 18,
    advanced: {
      mintable: true,
      burnable: true,
      pausable: false,
      customGasLimit: 3000000,
      metadata: {
        description: 'An advanced test token',
        socials: {
          website: 'https://example.com',
          twitter: '@testtoken'
        }
      }
    }
  }
];

/**
 * Sample invalid token configurations for testing
 */
export const INVALID_TOKEN_CONFIGS = [
  {
    name: '', // Invalid: empty name
    symbol: 'TEST',
    initialSupply: '1000000'
  },
  {
    name: 'Test Token',
    symbol: '', // Invalid: empty symbol
    initialSupply: '1000000'
  },
  {
    name: 'Test Token',
    symbol: 'TEST',
    initialSupply: '0' // Invalid: zero supply
  },
  {
    name: 'Test Token',
    symbol: 'test!@#', // Invalid: special characters in symbol
    initialSupply: '1000000'
  }
];