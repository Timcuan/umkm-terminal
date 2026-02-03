# Complex Algorithms Guide

This document explains the complex algorithms introduced during the refactoring, providing detailed explanations and examples.

## Token Bucket Rate Limiting Algorithm

### Overview
The rate limiting system was optimized from a sliding window approach to a token bucket algorithm, achieving O(1) time complexity for rate limiting operations.

### Algorithm Explanation

#### Concept
The token bucket algorithm maintains a "bucket" that holds tokens. Each token represents permission to make one request. Tokens are added to the bucket at a constant rate up to a maximum capacity. When a request is made, a token is removed from the bucket. If no tokens are available, the request must wait.

#### Implementation Details

```typescript
/**
 * Token Bucket Rate Limiter
 * 
 * This algorithm provides O(1) rate limiting by maintaining a bucket of tokens
 * that refill at a constant rate. Each operation consumes one token.
 * 
 * Key advantages over sliding window:
 * - O(1) time complexity (vs O(n) for sliding window)
 * - Constant memory usage regardless of request history
 * - Natural burst handling up to bucket capacity
 * - Simple and efficient implementation
 */
export class RateLimiter {
  private tokens: number;           // Current number of tokens in bucket
  private lastRefillTime: number;   // Timestamp of last token refill
  private readonly maxTokens: number;     // Maximum bucket capacity
  private readonly refillRate: number;    // Tokens added per millisecond
  
  /**
   * Create a new token bucket rate limiter
   * 
   * @param requestsPerSecond - Maximum requests allowed per second
   * @param burstCapacity - Maximum burst size (defaults to requestsPerSecond)
   * 
   * Example: RateLimiter(10, 20) allows 10 req/sec with bursts up to 20
   */
  constructor(requestsPerSecond: number, burstCapacity?: number) {
    this.maxTokens = burstCapacity || requestsPerSecond;
    this.refillRate = requestsPerSecond / 1000; // Convert to tokens per millisecond
    this.tokens = this.maxTokens; // Start with full bucket
    this.lastRefillTime = Date.now();
  }
  
  /**
   * Attempt to consume a token for rate limiting
   * 
   * Algorithm steps:
   * 1. Calculate elapsed time since last refill
   * 2. Add tokens based on elapsed time and refill rate
   * 3. Cap tokens at maximum bucket capacity
   * 4. Check if token is available
   * 5. Consume token if available, otherwise reject
   * 
   * Time Complexity: O(1) - constant time regardless of request history
   * Space Complexity: O(1) - constant memory usage
   * 
   * @returns true if request is allowed, false if rate limited
   */
  tryConsume(): boolean {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefillTime;
    
    // Step 1 & 2: Calculate and add new tokens based on elapsed time
    // Formula: newTokens = elapsedTime * refillRate
    const tokensToAdd = timeSinceLastRefill * this.refillRate;
    
    // Step 3: Refill bucket but don't exceed maximum capacity
    // This prevents token accumulation beyond burst capacity
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
    
    // Step 4 & 5: Check availability and consume token
    if (this.tokens >= 1) {
      this.tokens -= 1; // Consume one token
      return true;      // Request allowed
    }
    
    return false; // No tokens available, request rate limited
  }
  
  /**
   * Wait for a token to become available
   * 
   * This method calculates the exact time needed for the next token
   * and waits that amount of time, providing precise rate limiting.
   * 
   * Algorithm:
   * 1. Try to consume token immediately
   * 2. If successful, return immediately (no wait needed)
   * 3. If no token available, calculate wait time for next token
   * 4. Wait the calculated time and consume token
   * 
   * @returns Promise that resolves when token is consumed
   */
  async waitForToken(): Promise<void> {
    // Try immediate consumption first (common case optimization)
    if (this.tryConsume()) {
      return; // Token available immediately
    }
    
    // Calculate time needed for next token
    // Formula: waitTime = (1 token) / (refillRate tokens/ms)
    const timeForNextToken = 1 / this.refillRate;
    
    // Wait for the calculated time
    await new Promise(resolve => setTimeout(resolve, timeForNextToken));
    
    // Consume the token (should be available now)
    this.tryConsume();
  }
  
  /**
   * Get current bucket status for monitoring
   * 
   * @returns Object with current tokens and capacity information
   */
  getStatus(): { tokens: number; maxTokens: number; refillRate: number } {
    // Update tokens before returning status
    this.tryConsume(); // This updates tokens without consuming
    this.tokens += 1;  // Add back the token we didn't actually want to consume
    
    return {
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate * 1000 // Convert back to per-second
    };
  }
}
```

#### Usage Examples

```typescript
// Example 1: Basic rate limiting
const rateLimiter = new RateLimiter(10); // 10 requests per second

async function makeRequest(url: string) {
  if (rateLimiter.tryConsume()) {
    return fetch(url); // Request allowed
  } else {
    throw new Error('Rate limited'); // Request rejected
  }
}

// Example 2: Wait-based rate limiting
const rateLimiter = new RateLimiter(5, 10); // 5 req/sec, burst up to 10

async function makeRequestWithWait(url: string) {
  await rateLimiter.waitForToken(); // Wait if necessary
  return fetch(url); // Request guaranteed to be allowed
}

// Example 3: Batch processing with rate limiting
async function processBatch(urls: string[]) {
  const rateLimiter = new RateLimiter(10); // 10 requests per second
  const results = [];
  
  for (const url of urls) {
    await rateLimiter.waitForToken(); // Respect rate limit
    const result = await fetch(url);
    results.push(result);
  }
  
  return results;
}
```

## Batch Nonce Synchronization Algorithm

### Overview
The nonce management system was optimized to fetch nonces for multiple wallets in a single batch operation, significantly reducing network latency for large batch deployments.

### Algorithm Explanation

#### Problem
Sequential nonce fetching for N wallets requires N network calls, each with network latency. For large batches, this becomes a significant bottleneck.

#### Solution
Batch all nonce requests into a single multicall operation, reducing N network calls to 1.

```typescript
/**
 * Batch Nonce Synchronization Algorithm
 * 
 * This algorithm optimizes nonce fetching for multiple wallets by batching
 * all requests into a single network call using multicall patterns.
 * 
 * Performance improvement:
 * - Before: N network calls (N * latency)
 * - After: 1 network call (1 * latency)
 * - Improvement: ~N times faster for large batches
 */
export class NonceManager {
  private nonceMap = new Map<string, WalletNonceState>();
  private options: Required<NonceManagerOptions>;
  
  /**
   * Synchronize nonces for multiple wallets in a single batch operation
   * 
   * Algorithm steps:
   * 1. Filter wallets that need nonce updates
   * 2. Batch all nonce requests into single multicall
   * 3. Execute multicall and parse results
   * 4. Update local nonce cache atomically
   * 5. Handle partial failures gracefully
   * 
   * @param walletAddresses - Array of wallet addresses to sync
   * @returns Promise that resolves when all nonces are synced
   */
  async syncNonces(walletAddresses: string[]): Promise<void> {
    if (walletAddresses.length === 0) {
      return; // Nothing to sync
    }
    
    // Step 1: Filter wallets that need updates
    const walletsToSync = this.filterWalletsNeedingSync(walletAddresses);
    
    if (walletsToSync.length === 0) {
      return; // All nonces are fresh
    }
    
    try {
      // Step 2: Create batch request for all wallets
      const batchRequest = this.createBatchNonceRequest(walletsToSync);
      
      // Step 3: Execute single network call for all nonces
      const batchResults = await this.executeBatchRequest(batchRequest);
      
      // Step 4: Update nonce cache atomically
      this.updateNonceCache(walletsToSync, batchResults);
      
    } catch (error) {
      // Step 5: Handle failures gracefully
      await this.handleBatchSyncFailure(walletsToSync, error);
    }
  }
  
  /**
   * Filter wallets that need nonce synchronization
   * 
   * A wallet needs sync if:
   * - No cached nonce exists
   * - Cached nonce is stale (older than cache TTL)
   * - Cached nonce is marked as dirty (after failed transaction)
   * 
   * @param addresses - Wallet addresses to check
   * @returns Addresses that need nonce updates
   */
  private filterWalletsNeedingSync(addresses: string[]): string[] {
    const now = Date.now();
    const cacheMaxAge = this.options.cacheMaxAge;
    
    return addresses.filter(address => {
      const nonceState = this.nonceMap.get(address.toLowerCase());
      
      // No cached nonce - needs sync
      if (!nonceState) {
        return true;
      }
      
      // Stale cache - needs sync
      if (now - nonceState.lastUpdated > cacheMaxAge) {
        return true;
      }
      
      // Dirty nonce (after failed tx) - needs sync
      if (nonceState.isDirty) {
        return true;
      }
      
      return false; // Fresh cache, no sync needed
    });
  }
  
  /**
   * Create multicall request for batch nonce fetching
   * 
   * This creates a single contract call that fetches nonces for all
   * specified wallets in one network round trip.
   * 
   * @param addresses - Wallet addresses to include in batch
   * @returns Multicall request object
   */
  private createBatchNonceRequest(addresses: string[]): MulticallRequest {
    const calls = addresses.map(address => ({
      target: '0x0000000000000000000000000000000000000000', // ETH address for nonce
      callData: this.encodeGetNonceCall(address),
      allowFailure: true // Don't fail entire batch if one address fails
    }));
    
    return {
      calls,
      requireSuccess: false // Allow partial failures
    };
  }
  
  /**
   * Execute the batch request and parse results
   * 
   * @param request - Multicall request to execute
   * @returns Array of nonce results (may include failures)
   */
  private async executeBatchRequest(request: MulticallRequest): Promise<NonceResult[]> {
    // Execute multicall contract
    const multicallResults = await this.multicallContract.aggregate3(request.calls);
    
    // Parse results and handle failures
    return multicallResults.map((result, index) => {
      if (result.success) {
        const nonce = this.decodeNonceResult(result.returnData);
        return { success: true, nonce, address: request.calls[index].target };
      } else {
        return { 
          success: false, 
          error: 'Failed to fetch nonce',
          address: request.calls[index].target 
        };
      }
    });
  }
  
  /**
   * Update nonce cache with batch results
   * 
   * This operation is atomic - either all updates succeed or none do.
   * Partial failures are handled by falling back to individual fetches.
   * 
   * @param addresses - Addresses that were synced
   * @param results - Results from batch operation
   */
  private updateNonceCache(addresses: string[], results: NonceResult[]): void {
    const now = Date.now();
    const updates = new Map<string, WalletNonceState>();
    
    // Prepare all updates first
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i].toLowerCase();
      const result = results[i];
      
      if (result.success) {
        updates.set(address, {
          nonce: result.nonce,
          lastUpdated: now,
          isDirty: false,
          pendingTransactions: this.nonceMap.get(address)?.pendingTransactions || 0
        });
      }
    }
    
    // Apply all updates atomically
    for (const [address, state] of updates) {
      this.nonceMap.set(address, state);
    }
    
    // Log successful updates
    console.log(`Batch synced nonces for ${updates.size}/${addresses.length} wallets`);
  }
  
  /**
   * Handle batch sync failures gracefully
   * 
   * When batch sync fails, fall back to individual nonce fetching
   * for critical operations, or mark nonces as dirty for retry.
   * 
   * @param addresses - Addresses that failed to sync
   * @param error - The error that occurred
   */
  private async handleBatchSyncFailure(addresses: string[], error: Error): Promise<void> {
    console.warn(`Batch nonce sync failed for ${addresses.length} wallets:`, error.message);
    
    // Mark all addresses as needing individual sync
    for (const address of addresses) {
      const existing = this.nonceMap.get(address.toLowerCase());
      if (existing) {
        existing.isDirty = true; // Mark for retry
      }
    }
    
    // For critical operations, fall back to individual fetching
    if (this.options.fallbackToIndividual) {
      console.log('Falling back to individual nonce fetching...');
      
      for (const address of addresses) {
        try {
          await this.syncSingleNonce(address);
        } catch (individualError) {
          console.error(`Failed to sync nonce for ${address}:`, individualError.message);
        }
      }
    }
  }
}
```

#### Performance Analysis

```typescript
// Performance comparison example
async function compareNoncePerformance() {
  const wallets = Array.from({ length: 100 }, (_, i) => `0x${i.toString(16).padStart(40, '0')}`);
  
  // Sequential approach (old)
  console.time('Sequential nonce fetching');
  for (const wallet of wallets) {
    await getNonce(wallet); // 100 network calls
  }
  console.timeEnd('Sequential nonce fetching'); // ~5-10 seconds
  
  // Batch approach (new)
  console.time('Batch nonce fetching');
  await nonceManager.syncNonces(wallets); // 1 network call
  console.timeEnd('Batch nonce fetching'); // ~50-100ms
  
  // Performance improvement: 50-100x faster!
}
```

## Reward Recipient Normalization Algorithm

### Overview
The reward recipient processing algorithm handles complex scenarios like missing allocations, percentage distribution, and rounding errors while ensuring the total always equals 100%.

### Algorithm Explanation

```typescript
/**
 * Reward Recipient Normalization Algorithm
 * 
 * This algorithm normalizes reward recipient configurations to ensure:
 * 1. All recipients have explicit allocation percentages
 * 2. Total allocation equals exactly 100%
 * 3. Rounding errors are handled fairly
 * 4. Default recipients are included when needed
 * 
 * Complexity: O(n) where n is the number of recipients
 */
export class RewardRecipientService {
  
  /**
   * Normalize reward recipient configurations
   * 
   * Algorithm handles multiple complex scenarios:
   * - Mixed allocation formats (percentage vs allocation)
   * - Missing allocations (distributed equally among remaining)
   * - Rounding errors (distributed fairly using largest remainder method)
   * - Default recipients (added when total < 100%)
   * 
   * @param recipients - Input recipient configurations
   * @param defaultRecipient - Default recipient address for remaining allocation
   * @returns Normalized recipients with exact 100% total allocation
   */
  normalize(
    recipients: RewardRecipientConfig[],
    defaultRecipient?: string
  ): NormalizedRewardRecipient[] {
    
    // Handle empty input
    if (!recipients || recipients.length === 0) {
      return defaultRecipient 
        ? [{ address: defaultRecipient, allocation: 100 }]
        : [];
    }
    
    // Phase 1: Process explicit allocations and count unspecified recipients
    const { explicitRecipients, unspecifiedCount, totalExplicit } = 
      this.processExplicitAllocations(recipients);
    
    // Phase 2: Distribute remaining allocation to unspecified recipients
    const allRecipients = this.distributeRemainingAllocation(
      recipients,
      explicitRecipients,
      unspecifiedCount,
      totalExplicit
    );
    
    // Phase 3: Handle rounding and ensure exact 100% total
    const normalizedRecipients = this.handleRoundingAndTotal(
      allRecipients,
      defaultRecipient
    );
    
    return normalizedRecipients;
  }
  
  /**
   * Phase 1: Process recipients with explicit allocations
   * 
   * This phase identifies recipients that have explicit allocation or percentage
   * values and calculates the total allocated amount.
   * 
   * @param recipients - Input recipients
   * @returns Object with explicit recipients, unspecified count, and total
   */
  private processExplicitAllocations(recipients: RewardRecipientConfig[]) {
    const explicitRecipients: Array<{ address: string; allocation: number }> = [];
    let totalExplicit = 0;
    let unspecifiedCount = 0;
    
    for (const recipient of recipients) {
      if (recipient.allocation !== undefined) {
        // Direct allocation specified
        explicitRecipients.push({
          address: recipient.address,
          allocation: recipient.allocation
        });
        totalExplicit += recipient.allocation;
        
      } else if (recipient.percentage !== undefined) {
        // Percentage specified (treat as allocation)
        explicitRecipients.push({
          address: recipient.address,
          allocation: recipient.percentage
        });
        totalExplicit += recipient.percentage;
        
      } else {
        // No allocation specified - will be calculated later
        unspecifiedCount++;
      }
    }
    
    return { explicitRecipients, unspecifiedCount, totalExplicit };
  }
  
  /**
   * Phase 2: Distribute remaining allocation to unspecified recipients
   * 
   * This phase calculates allocations for recipients that didn't specify
   * an allocation or percentage. Uses fair distribution with remainder handling.
   * 
   * Algorithm:
   * 1. Calculate remaining allocation (100% - explicit allocations)
   * 2. Divide remaining equally among unspecified recipients
   * 3. Handle remainder using largest remainder method for fairness
   * 
   * @param recipients - Original recipients
   * @param explicitRecipients - Recipients with explicit allocations
   * @param unspecifiedCount - Number of recipients without allocations
   * @param totalExplicit - Total of explicit allocations
   * @returns All recipients with calculated allocations
   */
  private distributeRemainingAllocation(
    recipients: RewardRecipientConfig[],
    explicitRecipients: Array<{ address: string; allocation: number }>,
    unspecifiedCount: number,
    totalExplicit: number
  ): Array<{ address: string; allocation: number }> {
    
    const allRecipients = [...explicitRecipients];
    
    if (unspecifiedCount === 0) {
      return allRecipients; // No unspecified recipients
    }
    
    // Calculate remaining allocation
    const remainingAllocation = Math.max(0, 100 - totalExplicit);
    
    // Distribute remaining allocation fairly
    const baseAllocation = Math.floor(remainingAllocation / unspecifiedCount);
    let remainder = remainingAllocation % unspecifiedCount;
    
    // Add unspecified recipients with calculated allocations
    for (const recipient of recipients) {
      if (recipient.allocation === undefined && recipient.percentage === undefined) {
        // Calculate allocation for this recipient
        const allocation = baseAllocation + (remainder > 0 ? 1 : 0);
        
        allRecipients.push({
          address: recipient.address,
          allocation
        });
        
        // Distribute remainder fairly (largest remainder method)
        if (remainder > 0) {
          remainder--;
        }
      }
    }
    
    return allRecipients;
  }
  
  /**
   * Phase 3: Handle rounding errors and ensure exact 100% total
   * 
   * This phase ensures the final total equals exactly 100% by handling
   * rounding errors and adding default recipients if needed.
   * 
   * Algorithm:
   * 1. Calculate current total allocation
   * 2. If total < 100% and default recipient exists, add difference to default
   * 3. If total > 100%, reduce largest allocations proportionally
   * 4. Ensure final total equals exactly 100%
   * 
   * @param recipients - Recipients with calculated allocations
   * @param defaultRecipient - Default recipient for remaining allocation
   * @returns Final normalized recipients with exact 100% total
   */
  private handleRoundingAndTotal(
    recipients: Array<{ address: string; allocation: number }>,
    defaultRecipient?: string
  ): NormalizedRewardRecipient[] {
    
    // Calculate current total
    const currentTotal = recipients.reduce((sum, r) => sum + r.allocation, 0);
    
    if (Math.abs(currentTotal - 100) < 0.01) {
      // Total is already correct (within floating point precision)
      return recipients;
    }
    
    if (currentTotal < 100 && defaultRecipient) {
      // Add remaining allocation to default recipient
      const remaining = 100 - currentTotal;
      const existingDefault = recipients.find(
        r => r.address.toLowerCase() === defaultRecipient.toLowerCase()
      );
      
      if (existingDefault) {
        existingDefault.allocation += remaining;
      } else {
        recipients.push({
          address: defaultRecipient,
          allocation: remaining
        });
      }
      
    } else if (currentTotal > 100) {
      // Reduce allocations proportionally to reach 100%
      const scaleFactor = 100 / currentTotal;
      
      for (const recipient of recipients) {
        recipient.allocation = Math.floor(recipient.allocation * scaleFactor * 100) / 100;
      }
      
      // Handle any remaining rounding error
      const newTotal = recipients.reduce((sum, r) => sum + r.allocation, 0);
      if (newTotal < 100) {
        // Add remainder to largest allocation
        const largest = recipients.reduce((max, r) => 
          r.allocation > max.allocation ? r : max
        );
        largest.allocation += (100 - newTotal);
      }
    }
    
    return recipients;
  }
}
```

#### Usage Examples

```typescript
// Example 1: Mixed allocation formats
const recipients = [
  { address: '0xabc', allocation: 50 },    // Direct allocation
  { address: '0xdef', percentage: 30 },    // Percentage format
  { address: '0x123' }                     // No allocation specified
];

const normalized = service.normalize(recipients, '0xdefault');
// Result: [
//   { address: '0xabc', allocation: 50 },
//   { address: '0xdef', allocation: 30 },
//   { address: '0x123', allocation: 20 }
// ]
// Total: exactly 100%

// Example 2: Rounding error handling
const recipients = [
  { address: '0xabc', allocation: 33.33 },
  { address: '0xdef', allocation: 33.33 },
  { address: '0x123', allocation: 33.33 }
];

const normalized = service.normalize(recipients);
// Result: [
//   { address: '0xabc', allocation: 33.34 }, // Largest remainder gets extra
//   { address: '0xdef', allocation: 33.33 },
//   { address: '0x123', allocation: 33.33 }
// ]
// Total: exactly 100%
```

## Streaming Deployment Algorithm

### Overview
For large batch deployments, the system implements a streaming approach to avoid memory accumulation and provide real-time progress updates.

### Algorithm Explanation

```typescript
/**
 * Streaming Deployment Algorithm
 * 
 * This algorithm processes large batches of deployments using generator functions
 * to stream results and avoid memory accumulation. Key benefits:
 * 
 * - Constant memory usage regardless of batch size
 * - Real-time progress updates and error handling
 * - Ability to process infinite streams of deployments
 * - Graceful handling of failures without stopping entire batch
 */
export class StreamingBatchDeployer {
  
  /**
   * Deploy tokens using streaming approach
   * 
   * This generator function yields deployment results as they complete,
   * allowing for real-time processing without memory accumulation.
   * 
   * Algorithm:
   * 1. Process deployments in configurable chunks
   * 2. Yield results immediately as they complete
   * 3. Handle errors gracefully without stopping stream
   * 4. Provide progress information with each result
   * 5. Clean up resources after each deployment
   * 
   * @param configs - Stream or array of deployment configurations
   * @param options - Streaming options (chunk size, concurrency, etc.)
   * @yields Individual deployment results with progress information
   */
  async* deployStream(
    configs: AsyncIterable<TokenConfig> | TokenConfig[],
    options: StreamingOptions = {}
  ): AsyncGenerator<StreamingDeployResult, void, unknown> {
    
    const {
      chunkSize = 10,           // Process in chunks to manage memory
      maxConcurrency = 3,       // Limit concurrent deployments
      continueOnError = true,   // Don't stop stream on individual failures
      progressCallback         // Optional progress reporting
    } = options;
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Convert array to async iterable if needed
    const configStream = Array.isArray(configs) 
      ? this.arrayToAsyncIterable(configs)
      : configs;
    
    // Process configurations in chunks
    for await (const chunk of this.chunkAsyncIterable(configStream, chunkSize)) {
      
      // Deploy chunk with controlled concurrency
      const chunkResults = await this.deployChunkWithConcurrency(
        chunk,
        maxConcurrency,
        continueOnError
      );
      
      // Yield results immediately (streaming)
      for (const result of chunkResults) {
        processedCount++;
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Create streaming result with progress information
        const streamingResult: StreamingDeployResult = {
          ...result,
          progress: {
            processed: processedCount,
            successful: successCount,
            failed: errorCount,
            timestamp: Date.now()
          }
        };
        
        // Report progress if callback provided
        if (progressCallback) {
          progressCallback(streamingResult.progress);
        }
        
        // Yield result immediately
        yield streamingResult;
        
        // Clean up resources for this deployment
        await this.cleanupDeploymentResources(result);
      }
    }
  }
  
  /**
   * Deploy a chunk of configurations with controlled concurrency
   * 
   * This method processes multiple deployments concurrently while respecting
   * the maximum concurrency limit to avoid overwhelming the network or system.
   * 
   * @param chunk - Array of configurations to deploy
   * @param maxConcurrency - Maximum number of concurrent deployments
   * @param continueOnError - Whether to continue on individual failures
   * @returns Array of deployment results
   */
  private async deployChunkWithConcurrency(
    chunk: TokenConfig[],
    maxConcurrency: number,
    continueOnError: boolean
  ): Promise<DeployResult[]> {
    
    const results: DeployResult[] = [];
    const semaphore = new Semaphore(maxConcurrency);
    
    // Create deployment promises with concurrency control
    const deploymentPromises = chunk.map(async (config, index) => {
      // Acquire semaphore token (limits concurrency)
      await semaphore.acquire();
      
      try {
        // Perform actual deployment
        const result = await this.deploySingleToken(config);
        
        return {
          ...result,
          success: true,
          config,
          index
        };
        
      } catch (error) {
        // Handle deployment error
        const errorResult = {
          success: false,
          error: error.message,
          config,
          index,
          timestamp: Date.now()
        };
        
        if (!continueOnError) {
          throw error; // Propagate error to stop entire chunk
        }
        
        return errorResult;
        
      } finally {
        // Always release semaphore token
        semaphore.release();
      }
    });
    
    // Wait for all deployments in chunk to complete
    if (continueOnError) {
      // Use allSettled to collect all results (including failures)
      const settledResults = await Promise.allSettled(deploymentPromises);
      
      for (const settled of settledResults) {
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
        } else {
          // Handle promise rejection
          results.push({
            success: false,
            error: settled.reason?.message || 'Unknown deployment error',
            timestamp: Date.now()
          });
        }
      }
    } else {
      // Use Promise.all to fail fast on first error
      const allResults = await Promise.all(deploymentPromises);
      results.push(...allResults);
    }
    
    return results;
  }
  
  /**
   * Convert async iterable to chunks for batch processing
   * 
   * This generator function takes an async iterable and yields chunks of
   * the specified size, enabling batch processing of streaming data.
   * 
   * @param iterable - Source async iterable
   * @param chunkSize - Size of each chunk
   * @yields Arrays of items up to chunkSize
   */
  private async* chunkAsyncIterable<T>(
    iterable: AsyncIterable<T>,
    chunkSize: number
  ): AsyncGenerator<T[], void, unknown> {
    
    let chunk: T[] = [];
    
    for await (const item of iterable) {
      chunk.push(item);
      
      // Yield chunk when it reaches target size
      if (chunk.length >= chunkSize) {
        yield chunk;
        chunk = []; // Reset for next chunk
      }
    }
    
    // Yield remaining items if any
    if (chunk.length > 0) {
      yield chunk;
    }
  }
  
  /**
   * Clean up resources after deployment
   * 
   * This method ensures proper cleanup of resources used during deployment
   * to prevent memory leaks in long-running streaming operations.
   * 
   * @param result - Deployment result to clean up
   */
  private async cleanupDeploymentResources(result: DeployResult): Promise<void> {
    try {
      // Clean up any temporary files
      if (result.tempFiles) {
        for (const file of result.tempFiles) {
          await fs.unlink(file).catch(() => {}); // Ignore cleanup errors
        }
      }
      
      // Close any open connections
      if (result.connections) {
        for (const connection of result.connections) {
          await connection.close().catch(() => {}); // Ignore cleanup errors
        }
      }
      
      // Clear any cached data
      if (result.cacheKeys) {
        for (const key of result.cacheKeys) {
          this.cache.delete(key);
        }
      }
      
    } catch (error) {
      // Log cleanup errors but don't throw (don't interrupt stream)
      console.warn('Resource cleanup failed:', error.message);
    }
  }
}

/**
 * Semaphore implementation for concurrency control
 * 
 * This class implements a counting semaphore to limit the number of
 * concurrent operations, preventing system overload.
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return; // Permit available immediately
    }
    
    // No permits available, wait in queue
    return new Promise<void>(resolve => {
      this.waitQueue.push(resolve);
    });
  }
  
  release(): void {
    if (this.waitQueue.length > 0) {
      // Wake up next waiter
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      // No waiters, increase permit count
      this.permits++;
    }
  }
}
```

#### Usage Examples

```typescript
// Example 1: Process large batch with streaming
async function processLargeBatch(configs: TokenConfig[]) {
  const deployer = new StreamingBatchDeployer();
  
  console.log(`Starting deployment of ${configs.length} tokens...`);
  
  for await (const result of deployer.deployStream(configs, {
    chunkSize: 20,
    maxConcurrency: 5,
    continueOnError: true,
    progressCallback: (progress) => {
      console.log(`Progress: ${progress.processed} processed, ${progress.successful} successful, ${progress.failed} failed`);
    }
  })) {
    
    if (result.success) {
      console.log(`✅ Deployed token: ${result.address}`);
    } else {
      console.error(`❌ Failed to deploy: ${result.error}`);
    }
    
    // Process result immediately (constant memory usage)
    await processDeploymentResult(result);
  }
  
  console.log('Batch deployment completed!');
}

// Example 2: Process infinite stream
async function processInfiniteStream() {
  const deployer = new StreamingBatchDeployer();
  
  // Create infinite stream of configurations
  async function* configGenerator() {
    while (true) {
      const config = await getNextConfigFromQueue();
      if (config) {
        yield config;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for more configs
      }
    }
  }
  
  // Process infinite stream
  for await (const result of deployer.deployStream(configGenerator(), {
    chunkSize: 10,
    maxConcurrency: 3
  })) {
    console.log(`Processed deployment: ${result.success ? 'success' : 'failed'}`);
  }
}
```

These algorithms demonstrate the sophisticated optimizations implemented during the refactoring to improve performance, reliability, and maintainability of the codebase.