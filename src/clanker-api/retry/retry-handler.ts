/**
 * Retry Handler for Clanker API Integration
 * Provides intelligent retry logic with method-specific backoff strategies
 */

import type { OperationMethod } from '../types/config-types.js';
import { 
  ClankerSDKError, 
  shouldRetryError, 
  calculateRetryDelay,
  APIError
} from '../errors/unified-error-hierarchy.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  retryableErrorCodes: string[];
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  error: ClankerSDKError;
  timestamp: Date;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date;
  nextAttemptTime: Date;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: ClankerSDKError;
  attempts: RetryAttempt[];
  totalTime: number;
  circuitBreakerTriggered: boolean;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffStrategy: 'exponential',
  retryableErrorCodes: [
    'NETWORK_ERROR',
    'RATE_LIMIT_ERROR',
    'SERVER_ERROR',
    'TIMEOUT_ERROR',
  ],
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000, // 1 minute
};

const METHOD_SPECIFIC_CONFIGS: Record<OperationMethod, Partial<RetryConfig>> = {
  direct: {
    maxRetries: 5,
    baseDelay: 2000,
    backoffStrategy: 'exponential',
    retryableErrorCodes: ['NETWORK_ERROR', 'CONTRACT_ERROR'],
  },
  api: {
    maxRetries: 3,
    baseDelay: 1000,
    backoffStrategy: 'linear',
    retryableErrorCodes: ['NETWORK_ERROR', 'RATE_LIMIT_ERROR', 'SERVER_ERROR'],
  },
  bankrbot: {
    maxRetries: 3,
    baseDelay: 1500,
    backoffStrategy: 'exponential',
    retryableErrorCodes: ['NETWORK_ERROR', 'RATE_LIMIT_ERROR', 'SERVER_ERROR', 'BANKRBOT_ERROR'],
  },
  auto: {
    maxRetries: 4,
    baseDelay: 1500,
    backoffStrategy: 'exponential',
  },
};

// ============================================================================
// Retry Handler Class
// ============================================================================

export class RetryHandler {
  private config: RetryConfig;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryStats: Map<string, RetryAttempt[]> = new Map();
  private operationResults: Map<string, boolean> = new Map(); // Track success/failure

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    method: OperationMethod,
    operationId?: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    const effectiveConfig = this.getEffectiveConfig(method);
    const circuitBreakerKey = operationId || `${method}-default`;
    const statsKey = operationId || `${method}-${Date.now()}`;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
      return {
        success: false,
        error: new APIError(
          'Circuit breaker is open - too many recent failures',
          undefined,
          false,
          { circuitBreakerKey, threshold: effectiveConfig.circuitBreakerThreshold }
        ),
        attempts: [],
        totalTime: Date.now() - startTime,
        circuitBreakerTriggered: true,
      };
    }

    let lastError: ClankerSDKError;

    for (let attempt = 1; attempt <= effectiveConfig.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        
        // Success - reset circuit breaker and record stats
        this.resetCircuitBreaker(circuitBreakerKey);
        this.retryStats.set(statsKey, attempts);
        this.operationResults.set(statsKey, true); // Mark as successful
        
        return {
          success: true,
          data: result,
          attempts,
          totalTime: Date.now() - startTime,
          circuitBreakerTriggered: false,
        };

      } catch (error) {
        const sdkError = this.normalizeError(error, method);
        lastError = sdkError;

        const attemptRecord: RetryAttempt = {
          attemptNumber: attempt,
          delay: 0,
          error: sdkError,
          timestamp: new Date(),
        };

        attempts.push(attemptRecord);

        // Update circuit breaker failure count
        this.recordFailure(circuitBreakerKey);

        // Check if we should retry
        if (attempt > effectiveConfig.maxRetries || !this.shouldRetry(sdkError, effectiveConfig)) {
          break;
        }

        // Calculate and apply delay
        const delay = this.calculateDelay(attempt - 1, sdkError, effectiveConfig);
        attemptRecord.delay = delay;

        await this.sleep(delay);
      }
    }

    // Check if circuit breaker should open
    if (this.shouldOpenCircuitBreaker(circuitBreakerKey)) {
      this.openCircuitBreaker(circuitBreakerKey);
    }

    // Record failed operation stats
    this.retryStats.set(statsKey, attempts);
    this.operationResults.set(statsKey, false); // Mark as failed

    return {
      success: false,
      error: lastError!,
      attempts,
      totalTime: Date.now() - startTime,
      circuitBreakerTriggered: false,
    };
  }

  /**
   * Execute operation with custom retry configuration
   */
  async executeWithCustomRetry<T>(
    operation: () => Promise<T>,
    method: OperationMethod,
    customConfig: Partial<RetryConfig>,
    operationId?: string
  ): Promise<RetryResult<T>> {
    const originalConfig = this.config;
    this.config = { ...this.config, ...customConfig };

    try {
      return await this.executeWithRetry(operation, method, operationId);
    } finally {
      this.config = originalConfig;
    }
  }

  // ==========================================================================
  // Configuration Methods
  // ==========================================================================

  private getEffectiveConfig(method: OperationMethod): RetryConfig {
    const methodConfig = METHOD_SPECIFIC_CONFIGS[method] || {};
    return { ...this.config, ...methodConfig };
  }

  private shouldRetry(error: ClankerSDKError, config: RetryConfig): boolean {
    // Use error's built-in retry logic first
    if (!shouldRetryError(error)) {
      return false;
    }

    // Check if error code is in retryable list
    return config.retryableErrorCodes.includes(error.code);
  }

  private calculateDelay(attemptNumber: number, error: ClankerSDKError, config: RetryConfig): number {
    // Use error-specific delay if available
    const errorDelay = calculateRetryDelay(error, attemptNumber);
    if (errorDelay > 0) {
      return Math.min(errorDelay, config.maxDelay);
    }

    // Use configuration-based delay
    let delay: number;
    
    switch (config.backoffStrategy) {
      case 'exponential':
        delay = config.baseDelay * Math.pow(2, attemptNumber);
        break;
      case 'linear':
        delay = config.baseDelay * (attemptNumber + 1);
        break;
      case 'fixed':
      default:
        delay = config.baseDelay;
        break;
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    delay += jitter;

    return Math.min(delay, config.maxDelay);
  }

  // ==========================================================================
  // Circuit Breaker Logic
  // ==========================================================================

  private isCircuitBreakerOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state || !state.isOpen) {
      return false;
    }

    // Check if timeout has passed
    if (Date.now() >= state.nextAttemptTime.getTime()) {
      // Half-open state - allow one attempt
      state.isOpen = false;
      return false;
    }

    return true;
  }

  private recordFailure(key: string): void {
    const state = this.circuitBreakers.get(key) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: new Date(),
      nextAttemptTime: new Date(),
    };

    state.failureCount++;
    state.lastFailureTime = new Date();
    
    this.circuitBreakers.set(key, state);
  }

  private shouldOpenCircuitBreaker(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    return state ? state.failureCount >= this.config.circuitBreakerThreshold : false;
  }

  private openCircuitBreaker(key: string): void {
    const state = this.circuitBreakers.get(key);
    if (state) {
      state.isOpen = true;
      state.nextAttemptTime = new Date(Date.now() + this.config.circuitBreakerTimeout);
      this.circuitBreakers.set(key, state);
    }
  }

  private resetCircuitBreaker(key: string): void {
    const state = this.circuitBreakers.get(key);
    if (state) {
      state.isOpen = false;
      state.failureCount = 0;
      this.circuitBreakers.set(key, state);
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private normalizeError(error: unknown, method: OperationMethod): ClankerSDKError {
    if (error instanceof ClankerSDKError) {
      return error;
    }

    // Convert generic errors to SDK errors
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new APIError(
      message,
      undefined,
      false,
      { originalError: error }
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // Statistics and Monitoring
  // ==========================================================================

  /**
   * Get retry statistics for monitoring
   */
  getRetryStats(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageAttempts: number;
    circuitBreakerActivations: number;
    mostCommonErrors: Array<{ code: string; count: number }>;
  } {
    const operations = this.retryStats.size;
    let successfulOperations = 0;
    let totalAttempts = 0;
    const errorCounts = new Map<string, number>();

    // Count successful operations using the results map
    for (const [key, wasSuccessful] of this.operationResults.entries()) {
      if (wasSuccessful) {
        successfulOperations++;
      }
    }

    for (const attempts of this.retryStats.values()) {
      totalAttempts += attempts.length;

      // Count error types
      for (const attempt of attempts) {
        if (attempt.error) {
          const count = errorCounts.get(attempt.error.code) || 0;
          errorCounts.set(attempt.error.code, count + 1);
        }
      }
    }

    const failedOperations = operations - successfulOperations;
    const averageAttempts = operations > 0 ? totalAttempts / operations : 0;

    // Count circuit breaker activations
    const circuitBreakerActivations = Array.from(this.circuitBreakers.values())
      .filter(state => state.isOpen).length;

    // Get most common errors
    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalOperations: operations,
      successfulOperations,
      failedOperations,
      averageAttempts,
      circuitBreakerActivations,
      mostCommonErrors,
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Array<{
    key: string;
    isOpen: boolean;
    failureCount: number;
    lastFailureTime?: Date;
    nextAttemptTime?: Date;
  }> {
    return Array.from(this.circuitBreakers.entries()).map(([key, state]) => ({
      key,
      isOpen: state.isOpen,
      failureCount: state.failureCount,
      lastFailureTime: state.lastFailureTime,
      nextAttemptTime: state.isOpen ? state.nextAttemptTime : undefined,
    }));
  }

  /**
   * Reset all circuit breakers (for testing or manual recovery)
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  /**
   * Reset retry statistics
   */
  resetStats(): void {
    this.retryStats.clear();
    this.operationResults.clear();
  }

  /**
   * Update retry configuration
   */
  updateConfig(updates: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create retry handler with default configuration
 */
export function createRetryHandler(config?: Partial<RetryConfig>): RetryHandler {
  return new RetryHandler(config);
}

/**
 * Create retry handler optimized for API operations
 */
export function createAPIRetryHandler(): RetryHandler {
  return new RetryHandler({
    maxRetries: 3,
    baseDelay: 1000,
    backoffStrategy: 'linear',
    retryableErrorCodes: ['NETWORK_ERROR', 'RATE_LIMIT_ERROR', 'SERVER_ERROR', 'TIMEOUT_ERROR'],
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
  });
}

/**
 * Create retry handler optimized for contract operations
 */
export function createContractRetryHandler(): RetryHandler {
  return new RetryHandler({
    maxRetries: 5,
    baseDelay: 2000,
    backoffStrategy: 'exponential',
    retryableErrorCodes: ['NETWORK_ERROR', 'CONTRACT_ERROR'],
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 120000, // 2 minutes
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wrap any async function with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  method: OperationMethod,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retryHandler = createRetryHandler(config);
  const result = await retryHandler.executeWithRetry(operation, method);
  
  if (result.success) {
    return result.data!;
  }
  
  throw result.error;
}

/**
 * Create a retryable version of any async function
 */
export function makeRetryable<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  method: OperationMethod,
  config?: Partial<RetryConfig>
): (...args: TArgs) => Promise<TReturn> {
  const retryHandler = createRetryHandler(config);
  
  return async (...args: TArgs): Promise<TReturn> => {
    const result = await retryHandler.executeWithRetry(() => fn(...args), method);
    
    if (result.success) {
      return result.data!;
    }
    
    throw result.error;
  };
}