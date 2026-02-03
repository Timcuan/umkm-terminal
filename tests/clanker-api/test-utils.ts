/**
 * Test Utilities for Clanker API Compatibility Tests
 */

import type { ClankerTokenV4, DeployResult } from '../../src/types/index.js';
import type { ClankerSDKConfig } from '../../src/clanker-api/index.js';

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generate a valid token configuration for testing
 */
export function createMockTokenConfig(overrides: Partial<ClankerTokenV4> = {}): ClankerTokenV4 {
  return {
    name: 'Mock Token',
    symbol: 'MOCK',
    tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
    chainId: 8453,
    description: 'A mock token for testing',
    image: 'https://example.com/mock-token.png',
    ...overrides,
  };
}

/**
 * Generate an invalid token configuration for testing
 */
export function createInvalidTokenConfig(invalidFields: Partial<Record<keyof ClankerTokenV4, any>> = {}): any {
  const baseInvalid = {
    name: '', // Invalid: empty name
    symbol: 'TOOLONGSYMBOL123456789', // Invalid: too long
    tokenAdmin: 'not-an-address', // Invalid: not an address
    chainId: -1, // Invalid: negative chain ID
    image: 'not-a-url', // Invalid: not a URL
    twitter: 'invalid-twitter-handle-way-too-long', // Invalid: too long
    telegram: 'ab', // Invalid: too short
    website: 'not-a-url', // Invalid: not a URL
  };

  return {
    ...baseInvalid,
    ...invalidFields,
  };
}

/**
 * Generate a mock deploy result for testing
 */
export function createMockDeployResult(overrides: Partial<DeployResult> = {}): DeployResult {
  return {
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    chainId: 8453,
    async waitForTransaction() {
      return {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
      };
    },
    ...overrides,
  };
}

/**
 * Generate a valid SDK configuration for testing
 */
export function createMockSDKConfig(overrides: Partial<ClankerSDKConfig> = {}): ClankerSDKConfig {
  return {
    operationMethod: 'direct',
    publicClient: {} as any,
    wallet: {} as any,
    ...overrides,
  };
}

/**
 * Generate an API-enabled SDK configuration for testing
 */
export function createMockAPIConfig(overrides: Partial<ClankerSDKConfig> = {}): ClankerSDKConfig {
  return {
    operationMethod: 'api',
    api: {
      apiKey: 'test-api-key-with-sufficient-length',
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      retries: 3,
    },
    ...overrides,
  };
}

// ============================================================================
// Test Assertion Helpers
// ============================================================================

/**
 * Assert that a validation result indicates success
 */
export function assertValidationSuccess(result: { valid: boolean; errors: any[]; warnings: any[] }) {
  if (!result.valid) {
    throw new Error(`Validation failed with errors: ${result.errors.map(e => e.message || e).join(', ')}`);
  }
}

/**
 * Assert that a validation result indicates failure
 */
export function assertValidationFailure(result: { valid: boolean; errors: any[]; warnings: any[] }) {
  if (result.valid) {
    throw new Error('Expected validation to fail, but it succeeded');
  }
  if (result.errors.length === 0) {
    throw new Error('Expected validation errors, but none were found');
  }
}

/**
 * Assert that an error has the expected structure
 */
export function assertStructuredError(error: any, expectedCode?: string) {
  if (!error || typeof error !== 'object') {
    throw new Error('Expected structured error object');
  }

  if (!('code' in error)) {
    throw new Error('Expected error to have a code property');
  }

  if (!('message' in error)) {
    throw new Error('Expected error to have a message property');
  }

  if (expectedCode && error.code !== expectedCode) {
    throw new Error(`Expected error code '${expectedCode}', got '${error.code}'`);
  }
}

/**
 * Assert that a deploy result has the expected structure
 */
export function assertDeployResultStructure(result: any) {
  if (!result || typeof result !== 'object') {
    throw new Error('Expected deploy result to be an object');
  }

  if (!('txHash' in result)) {
    throw new Error('Expected deploy result to have txHash property');
  }

  if (!('chainId' in result)) {
    throw new Error('Expected deploy result to have chainId property');
  }

  if (!('waitForTransaction' in result)) {
    throw new Error('Expected deploy result to have waitForTransaction method');
  }

  if (typeof result.waitForTransaction !== 'function') {
    throw new Error('Expected waitForTransaction to be a function');
  }
}

/**
 * Assert that a batch result has the expected structure
 */
export function assertBatchResultStructure(result: any) {
  if (!result || typeof result !== 'object') {
    throw new Error('Expected batch result to be an object');
  }

  if (!('method' in result)) {
    throw new Error('Expected batch result to have method property');
  }

  if (!('results' in result)) {
    throw new Error('Expected batch result to have results property');
  }

  if (!('chainSummary' in result)) {
    throw new Error('Expected batch result to have chainSummary property');
  }

  if (!Array.isArray(result.results)) {
    throw new Error('Expected batch results to be an array');
  }

  if (typeof result.chainSummary !== 'object') {
    throw new Error('Expected chainSummary to be an object');
  }
}

// ============================================================================
// Performance Testing Helpers
// ============================================================================

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  return { result, duration };
}

/**
 * Assert that a function executes within a time limit
 */
export async function assertExecutionTime<T>(
  fn: () => Promise<T> | T,
  maxDuration: number,
  description?: string
): Promise<T> {
  const { result, duration } = await measureExecutionTime(fn);
  
  if (duration > maxDuration) {
    throw new Error(
      `${description || 'Function'} took ${duration}ms, expected less than ${maxDuration}ms`
    );
  }
  
  return result;
}

/**
 * Run a function multiple times and measure average execution time
 */
export async function measureAverageExecutionTime<T>(
  fn: () => Promise<T> | T,
  iterations: number = 10
): Promise<{ averageDuration: number; results: T[] }> {
  const results: T[] = [];
  let totalDuration = 0;

  for (let i = 0; i < iterations; i++) {
    const { result, duration } = await measureExecutionTime(fn);
    results.push(result);
    totalDuration += duration;
  }

  return {
    averageDuration: totalDuration / iterations,
    results,
  };
}

// ============================================================================
// Memory Testing Helpers
// ============================================================================

/**
 * Get current memory usage
 */
export function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

/**
 * Assert that memory usage doesn't increase beyond a threshold
 */
export function assertMemoryUsage(
  initialMemory: NodeJS.MemoryUsage,
  finalMemory: NodeJS.MemoryUsage,
  maxIncreaseBytes: number,
  description?: string
) {
  const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  
  if (heapIncrease > maxIncreaseBytes) {
    throw new Error(
      `${description || 'Operation'} increased heap usage by ${heapIncrease} bytes, ` +
      `expected less than ${maxIncreaseBytes} bytes`
    );
  }
}

// ============================================================================
// Mock Implementation Helpers
// ============================================================================

/**
 * Create a mock API client for testing
 */
export function createMockAPIClient() {
  return {
    deployToken: jest.fn().mockResolvedValue({
      success: true,
      data: {
        success: true,
        expectedAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        deploymentTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
    }),
    batchDeployTokens: jest.fn().mockResolvedValue({
      success: true,
      data: {
        batchId: 'test-batch-id',
        results: [],
      },
    }),
    validateTokenConfig: jest.fn().mockResolvedValue({
      success: true,
      data: {
        valid: true,
        errors: [],
        warnings: [],
      },
    }),
    healthCheck: jest.fn().mockResolvedValue({
      success: true,
      data: { status: 'ok' },
    }),
    testAuthentication: jest.fn().mockResolvedValue({
      success: true,
      data: { authenticated: true },
    }),
    getDeploymentStatus: jest.fn().mockResolvedValue({
      success: true,
      data: {
        status: 'completed',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
      },
    }),
    getBatchStatus: jest.fn().mockResolvedValue({
      success: true,
      data: {
        batchId: 'test-batch-id',
        status: 'completed',
        completed: 1,
        total: 1,
        results: [],
      },
    }),
    updateConfig: jest.fn(),
    getConfig: jest.fn().mockReturnValue({
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      retries: 3,
      hasApiKey: true,
    }),
    enableLogging: jest.fn(),
    disableLogging: jest.fn(),
    getRequestStats: jest.fn().mockReturnValue({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    }),
  };
}

// ============================================================================
// Test Data Constants
// ============================================================================

export const TEST_ADDRESSES = {
  VALID: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  INVALID: 'not-an-address',
  ZERO: '0x0000000000000000000000000000000000000000',
} as const;

export const TEST_CHAIN_IDS = {
  BASE: 8453,
  ETHEREUM: 1,
  ARBITRUM: 42161,
  UNICHAIN: 130,
  MONAD: 10143,
  INVALID: -1,
} as const;

export const TEST_URLS = {
  VALID: 'https://example.com',
  INVALID: 'not-a-url',
  HTTP: 'http://example.com',
  HTTPS: 'https://example.com',
} as const;

export const TEST_SOCIAL_HANDLES = {
  TWITTER: {
    VALID: '@testtoken',
    INVALID: 'invalid-twitter-handle-way-too-long',
    SHORT: '@t',
  },
  TELEGRAM: {
    VALID: '@testtokengroup',
    INVALID: 'ab',
    LONG: '@' + 'a'.repeat(33),
  },
} as const;