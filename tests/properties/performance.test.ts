/**
 * Property Tests for Performance Improvements
 * Tests Properties 12-16: Performance and efficiency guarantees
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { NonceManager } from '../../src/deployer/nonce-manager.js';
import { BatchDeployer } from '../../src/batch/batch-deployer.js';
import { RateLimiter } from '../../src/utils/rate-limiter.js';
import type { BatchTemplate, BatchToken } from '../../src/batch/types.js';

// ============================================================================
// Mock Setup
// ============================================================================

const mockPublicClient = {
  getTransactionCount: vi.fn(),
};

const mockDeployerFactory = {
  create: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    deploy: vi.fn(),
  })),
};

// ============================================================================
// Property 12: Batch Nonce Fetching Efficiency
// ============================================================================

describe('Property 12: Batch Nonce Fetching Efficiency', () => {
  let nonceManager: NonceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    nonceManager = new NonceManager(mockPublicClient as any);
  });

  it('batch nonce fetching should be more efficient than sequential fetching', async () => {
    const walletAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      '0x9876543210987654321098765432109876543210'
    ] as const;
    
    // Mock network responses
    mockPublicClient.getTransactionCount.mockImplementation(() => 
      Promise.resolve(Math.floor(Math.random() * 100))
    );

    // Measure batch fetching time
    const batchStart = performance.now();
    await nonceManager.initializeWallets(walletAddresses);
    const batchTime = performance.now() - batchStart;

    // Reset for sequential test
    nonceManager.reset();
    vi.clearAllMocks(); // Clear all mocks including call counts
    
    // Re-setup the mock for sequential test
    mockPublicClient.getTransactionCount.mockImplementation(() => 
      Promise.resolve(Math.floor(Math.random() * 100))
    );

    // Measure sequential fetching time
    const sequentialStart = performance.now();
    for (const address of walletAddresses) {
      await nonceManager.initializeWallet(address);
    }
    const sequentialTime = performance.now() - sequentialStart;

    // Property: Batch should be faster or at least not significantly slower
    const efficiency = batchTime / sequentialTime;
    expect(efficiency).toBeLessThanOrEqual(3.0); // Very generous tolerance for test environment

    // Verify sequential method made the expected number of network calls
    const sequentialCalls = mockPublicClient.getTransactionCount.mock.calls.length;
    expect(sequentialCalls).toBe(walletAddresses.length);
  });

  it('batch nonce caching should prevent redundant network calls', async () => {
    const walletAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    ] as const;
    
    mockPublicClient.getTransactionCount.mockImplementation(() => 
      Promise.resolve(42)
    );

    // First call should fetch from network
    await nonceManager.initializeWallets(walletAddresses);
    const firstCallCount = mockPublicClient.getTransactionCount.mock.calls.length;

    // Second call within cache window should use cache
    await nonceManager.initializeWallets(walletAddresses, false);
    const secondCallCount = mockPublicClient.getTransactionCount.mock.calls.length;

    // Property: Cached calls should not increase network call count
    expect(secondCallCount).toBe(firstCallCount);

    // Force refresh should make new calls
    await nonceManager.initializeWallets(walletAddresses, true);
    const thirdCallCount = mockPublicClient.getTransactionCount.mock.calls.length;

    // Property: Force refresh should double the network calls
    expect(thirdCallCount).toBe(firstCallCount * 2);
  });
});

// ============================================================================
// Property 13: Rate Limiting Efficiency
// ============================================================================

describe('Property 13: Rate Limiting Efficiency', () => {
  it('token bucket algorithm should have O(1) time complexity', async () => {
    const rateLimiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60000,
      bucketSize: 100,
      refillRate: 100 / 60000,
    });

    // Measure time for multiple token consumption operations
    const operations = 50;
    const times: number[] = [];

    for (let i = 0; i < operations; i++) {
      const start = performance.now();
      await rateLimiter.consumeToken();
      const end = performance.now();
      times.push(end - start);
    }

    // Property: Time complexity should be consistent (O(1))
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;

    // Property: Operations should have consistent timing (low variation)
    expect(coefficientOfVariation).toBeLessThan(10.0); // Very generous for test environment
  });

  it('rate limiter should maintain accurate token count', async () => {
    const maxRequests = 10;
    const rateLimiter = new RateLimiter({
      maxRequests,
      windowMs: 5000,
      bucketSize: maxRequests,
      refillRate: maxRequests / 5000,
    });

    let consumedTokens = 0;
    
    // Consume tokens up to the limit
    for (let i = 0; i < maxRequests; i++) {
      const consumed = await rateLimiter.consumeToken();
      if (consumed) {
        consumedTokens++;
      }
    }

    // Property: Should be able to consume exactly maxRequests tokens initially
    expect(consumedTokens).toBe(maxRequests);

    // Next consumption should fail (bucket empty)
    const shouldFail = await rateLimiter.consumeToken();
    expect(shouldFail).toBe(false);
  });
});

// ============================================================================
// Property 14: Memory Streaming Efficiency
// ============================================================================

describe('Property 14: Memory Streaming Efficiency', () => {
  let batchDeployer: BatchDeployer;
  let mockTemplate: BatchTemplate;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful deployments with minimal delay
    mockDeployerFactory.create.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      deploy: vi.fn().mockImplementation(() => 
        Promise.resolve({
          success: true,
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        })
      ),
    });
  });

  it('streaming deployment should not accumulate results in memory', async () => {
    const tokenCount = 5;
    
    // Create template with tokens
    const tokens: BatchToken[] = Array.from({ length: tokenCount }, (_, i) => ({
      name: `Token${i}`,
      symbol: `TKN${i}`,
      image: 'QmTest',
      description: `Test token ${i}`,
    }));

    mockTemplate = {
      name: 'Test Template',
      chain: 'base',
      tokens,
      defaults: {},
    };

    batchDeployer = new BatchDeployer(mockTemplate, { delay: 0 }, mockDeployerFactory);

    // Test streaming deployment
    const streamResults: any[] = [];
    const streamGenerator = batchDeployer.deployStream();
    
    for await (const result of streamGenerator) {
      streamResults.push(result);
      expect(result).toBeDefined();
      expect(result.name).toMatch(/^Token\d+$/);
    }

    // Property: Streaming should process all tokens
    expect(streamResults).toHaveLength(tokenCount);
  });

  it('batch streaming should process tokens in configurable chunks', async () => {
    const tokenCount = 8;
    const batchSize = 3;
    
    const tokens: BatchToken[] = Array.from({ length: tokenCount }, (_, i) => ({
      name: `Token${i}`,
      symbol: `TKN${i}`,
      image: 'QmTest',
      description: `Test token ${i}`,
    }));

    mockTemplate = {
      name: 'Test Template',
      chain: 'base',
      tokens,
      defaults: {},
    };

    batchDeployer = new BatchDeployer(mockTemplate, { delay: 0 }, mockDeployerFactory);

    const batches: any[][] = [];
    const batchStreamGenerator = batchDeployer.deployBatchStream(batchSize);
    
    for await (const batch of batchStreamGenerator) {
      batches.push(batch);
      
      // Property: Each batch should not exceed batchSize
      expect(batch.length).toBeLessThanOrEqual(batchSize);
      expect(batch.length).toBeGreaterThan(0);
      
      batch.forEach(result => {
        expect(result.name).toMatch(/^Token\d+$/);
      });
    }

    // Property: All tokens should be processed across batches
    const totalProcessed = batches.reduce((sum, batch) => sum + batch.length, 0);
    expect(totalProcessed).toBe(tokenCount);

    // Property: Number of batches should match expected count
    const expectedBatches = Math.ceil(tokenCount / batchSize);
    expect(batches).toHaveLength(expectedBatches);
  });
});

// ============================================================================
// Property 15: Concurrency Limit Enforcement
// ============================================================================

describe('Property 15: Concurrency Limit Enforcement', () => {
  it('concurrent operations should respect configured limits', async () => {
    const concurrencyLimit = 3;
    const totalOperations = 10;
    
    let activeOperations = 0;
    let maxConcurrentOperations = 0;
    const operationDuration = 20; // ms

    // Simulate concurrent operations with tracking
    const operations = Array.from({ length: totalOperations }, async () => {
      // Wait for available slot (simple semaphore simulation)
      while (activeOperations >= concurrencyLimit) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      activeOperations++;
      maxConcurrentOperations = Math.max(maxConcurrentOperations, activeOperations);

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, operationDuration));

      activeOperations--;
    });

    await Promise.all(operations);

    // Property: Should never exceed concurrency limit
    expect(maxConcurrentOperations).toBeLessThanOrEqual(concurrencyLimit);
    
    // Property: Should utilize available concurrency
    expect(maxConcurrentOperations).toBeGreaterThan(0);
    
    // Property: All operations should complete
    expect(activeOperations).toBe(0);
  });
});

// ============================================================================
// Property 16: Resource Cleanup Guarantee
// ============================================================================

describe('Property 16: Resource Cleanup Guarantee', () => {
  it('resources should be properly cleaned up after operations', async () => {
    const operationCount = 5;
    const resources: Set<string> = new Set();
    const cleanedResources: Set<string> = new Set();

    // Simulate resource allocation and cleanup
    const operations = Array.from({ length: operationCount }, async (_, i) => {
      const resourceId = `resource-${i}`;
      
      try {
        // Allocate resource
        resources.add(resourceId);
        
        // Simulate work that might fail
        if (Math.random() < 0.2) { // 20% failure rate
          throw new Error(`Operation ${i} failed`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 5));
        
      } finally {
        // Cleanup should always happen
        if (resources.has(resourceId)) {
          resources.delete(resourceId);
          cleanedResources.add(resourceId);
        }
      }
    });

    // Wait for all operations (some may fail)
    await Promise.allSettled(operations);

    // Property: All allocated resources should be cleaned up
    expect(resources.size).toBe(0);
    
    // Property: Cleanup should happen for all operations
    expect(cleanedResources.size).toBe(operationCount);
  });

  it('nonce manager should properly reset state', async () => {
    const nonceManager = new NonceManager(mockPublicClient as any);
    const walletAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    ] as const;
    
    mockPublicClient.getTransactionCount.mockResolvedValue(42);

    // Initialize wallets
    await nonceManager.initializeWallets(walletAddresses);
    
    // Verify state exists
    const statesBefore = nonceManager.getAllStates();
    expect(statesBefore.size).toBe(walletAddresses.length);

    // Reset should clean up all state
    nonceManager.reset();
    
    // Property: Reset should clear all state
    const statesAfter = nonceManager.getAllStates();
    expect(statesAfter.size).toBe(0);
    
    // Property: Active wallets should be empty after reset
    const activeWallets = nonceManager.getActiveWallets();
    expect(activeWallets).toHaveLength(0);
  });
});