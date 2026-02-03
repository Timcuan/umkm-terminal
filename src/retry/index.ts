/**
 * Retry Mechanism for Network Operations
 * Provides configurable retry logic with exponential backoff
 */

import { NetworkError, RetryError, TimeoutError } from '../errors/index.js';
import { createRateLimiter, RateLimiter, type RateLimiterOptions } from '../utils/rate-limiter.js';

// ============================================================================
// Types
// ============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay between retries in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay between retries in ms (default: 10000) */
  maxDelay?: number;
  /** Exponential backoff factor (default: 2) */
  backoffFactor?: number;
  /** Jitter factor for randomizing delay (default: 0.1) */
  jitterFactor?: number;
  /** Timeout for each attempt in ms (default: 30000) */
  timeout?: number;
  /** Custom retry condition function */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Callback before each retry */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

// ============================================================================
// Retry Class
// ============================================================================

export class RetryHandler {
  private options: RetryOptions;

  constructor(options: RetryOptions = {}) {
    this.options = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitterFactor: 0.1,
      timeout: 30000,
      shouldRetry: () => true,
      abortSignal: undefined,
      onRetry: undefined,
      ...options,
    };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;

    // Check if already aborted
    if (this.options.abortSignal?.aborted) {
      throw new RetryError('Operation aborted', 0, new Error('AbortSignal already aborted'));
    }

    for (let attempt = 1; attempt <= (this.options.maxAttempts ?? 3); attempt++) {
      try {
        // Create timeout controller for this attempt
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout ?? 30000);

        // Handle abort signal
        if (this.options.abortSignal) {
          this.options.abortSignal.addEventListener('abort', () => {
            controller.abort();
          });
        }

        // Execute with timeout
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new TimeoutError('Operation timed out', this.options.timeout ?? 30000));
            });
          }),
        ]);

        clearTimeout(timeoutId);

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;

        // Check if should retry
        if (
          attempt < (this.options.maxAttempts ?? 3) &&
          (this.options.shouldRetry?.(lastError, attempt) ?? true)
        ) {
          const delay = this.calculateDelay(attempt);

          // Call retry callback if provided
          this.options.onRetry?.(attempt, lastError, delay);

          // Wait before retry (check abort signal)
          await this.waitForRetry(delay);
        } else {
          break;
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError,
      attempts: this.options.maxAttempts || 3,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff
    const initialDelay = this.options.initialDelay || 1000;
    const backoffFactor = this.options.backoffFactor || 2;
    let delay = initialDelay * backoffFactor ** (attempt - 1);

    // Apply maximum delay limit
    const maxDelay = this.options.maxDelay || 10000;
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd
    const jitterFactor = this.options.jitterFactor || 0.1;
    if (jitterFactor > 0) {
      const jitter = delay * jitterFactor * Math.random();
      delay += jitter;
    }

    return Math.floor(delay);
  }

  /**
   * Wait for retry delay with abort signal support
   */
  private async waitForRetry(delay: number): Promise<void> {
    if (this.options.abortSignal?.aborted) {
      throw new RetryError(
        'Operation aborted during retry wait',
        0,
        new Error('AbortSignal aborted')
      );
    }

    return new Promise((resolve, reject) => {
      const timeoutId: NodeJS.Timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, delay);

      const abortHandler = () => {
        cleanup();
        reject(
          new RetryError('Operation aborted during retry wait', 0, new Error('AbortSignal aborted'))
        );
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (this.options.abortSignal) {
          this.options.abortSignal.removeEventListener('abort', abortHandler);
        }
      };

      // Set up abort listener if signal provided
      if (this.options.abortSignal) {
        this.options.abortSignal.addEventListener('abort', abortHandler, { once: true });
      }
    });
  }
}

// ============================================================================
// HTTP Client with Retry
// ============================================================================

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  retryOptions?: RetryOptions;
}

export class RetryHttpClient {
  private rateLimiter: RateLimiter;

  constructor(private defaultRetryOptions?: RetryOptions & { rateLimit?: RateLimiterOptions }) {
    // Initialize rate limiter
    this.rateLimiter = defaultRetryOptions?.rateLimit
      ? new RateLimiter(defaultRetryOptions.rateLimit)
      : createRateLimiter({
          maxRequests: 60,
          windowMs: 60000,
        });
  }

  /**
   * Fetch with retry logic and rate limiting
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
    // Apply rate limiting
    await this.rateLimiter.waitForSlot();

    const retryOptions = { ...this.defaultRetryOptions, ...options.retryOptions };
    const retryHandler = new RetryHandler(retryOptions);

    const result = await retryHandler.execute(async () => {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new NetworkError(
          'HTTP_ERROR',
          `HTTP ${response.status}: ${response.statusText}`,
          url,
          response.status
        );
      }

      return response;
    });

    if (!result.success || !result.data) {
      throw new RetryError(url, result.attempts, result.error || new Error('Unknown error'));
    }

    return result.data;
  }

  /**
   * Fetch JSON with retry logic and rate limiting
   */
  async fetchJson<T extends Record<string, unknown> = Record<string, unknown>>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, options);
    return response.json() as Promise<T>;
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimitStats() {
    return this.rateLimiter.getStats();
  }
}

// ============================================================================
// Farcaster API Client with Retry
// ============================================================================

export class FarcasterApiClient {
  private httpClient: RetryHttpClient;

  constructor(retryOptions?: RetryOptions) {
    this.httpClient = new RetryHttpClient({
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      timeout: 5000,
      shouldRetry: (error, _attempt) => {
        // Retry on timeout, 5xx errors, and rate limits
        if (error instanceof TimeoutError) return true;
        if (error instanceof NetworkError) {
          return error.statusCode === 429 || (error.statusCode && error.statusCode >= 500) || false;
        }
        return false;
      },
      ...retryOptions,
    });
  }

  /**
   * Fetch from Warpcast API
   */
  async fetchFromWarpcast(endpoint: string): Promise<Record<string, unknown>> {
    return this.httpClient.fetchJson(`https://api.warpcast.com${endpoint}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Clanker-SDK/4.25.0',
      },
    });
  }

  /**
   * Fetch from Neynar API
   */
  async fetchFromNeynar(endpoint: string, apiKey?: string): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'Clanker-SDK/4.25.0',
    };

    if (apiKey) {
      headers.api_key = apiKey;
    }

    return this.httpClient.fetchJson(`https://api.neynar.com${endpoint}`, {
      headers,
    });
  }

  /**
   * Get user by FID from Warpcast API
   */
  async getUserByFid(fid: number): Promise<Record<string, unknown>> {
    return this.fetchFromWarpcast(`/v2/user?fid=${fid}`);
  }

  /**
   * Get user by username from Warpcast API
   */
  async getUserByUsername(username: string): Promise<Record<string, unknown>> {
    return this.fetchFromWarpcast(`/v2/user-by-username?username=${username}`);
  }

  /**
   * Fetch from Farcaster Hub
   */
  async fetchFromHub(hubUrl: string, endpoint: string): Promise<Record<string, unknown>> {
    return this.httpClient.fetchJson(`${hubUrl}${endpoint}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Clanker-SDK/4.25.0',
      },
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a retry handler with default options
 */
export function createRetryHandler(options?: RetryOptions): RetryHandler {
  return new RetryHandler(options);
}

/**
 * Execute a function with retry using default options
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const handler = new RetryHandler(options);
  const result = await handler.execute(fn);

  if (!result.success || !result.data) {
    throw result.error || new Error('Operation failed after retries');
  }

  return result.data;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: readonly unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: readonly unknown[]) => unknown>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn(...args);
    }
  };
}
