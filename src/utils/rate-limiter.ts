/**
 * Rate Limiter for API calls
 * Prevents overwhelming upstream services
 */

export interface RateLimiterOptions {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Maximum tokens in bucket (for token bucket algorithm) */
  bucketSize?: number;
  /** Refill rate per ms (for token bucket algorithm) */
  refillRate?: number;
}

export class RateLimiter {
  private requestTimes: number[] = [];
  private tokens: number;
  private lastRefill: number;
  private options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    this.options = {
      bucketSize: options.maxRequests,
      refillRate: options.maxRequests / options.windowMs,
      ...options,
    };

    this.tokens = this.options.bucketSize;
    this.lastRefill = Date.now();
  }

  /**
   * Check if request is allowed (sliding window algorithm)
   */
  async checkLimit(): Promise<boolean> {
    const now = Date.now();

    // Remove old requests outside window
    this.requestTimes = this.requestTimes.filter((time) => now - time < this.options.windowMs);

    return this.requestTimes.length < this.options.maxRequests;
  }

  /**
   * Wait until request is allowed
   */
  async waitForSlot(): Promise<void> {
    while (!(await this.checkLimit())) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = oldestRequest + this.options.windowMs - Date.now();

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.requestTimes.push(Date.now());
  }

  /**
   * Token bucket algorithm - more efficient for high-frequency requests
   */
  async consumeToken(): Promise<boolean> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Wait for token to be available
   */
  async waitForToken(): Promise<void> {
    while (!(await this.consumeToken())) {
      const waitTime = Math.ceil(1000 / this.options.refillRate);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.options.refillRate;

    this.tokens = Math.min(this.options.bucketSize, this.tokens + tokensToAdd);

    this.lastRefill = now;
  }

  /**
   * Get current usage statistics
   */
  getStats(): { used: number; remaining: number; resetTime: number } {
    const now = Date.now();
    const recentRequests = this.requestTimes.filter((time) => now - time < this.options.windowMs);

    return {
      used: recentRequests.length,
      remaining: Math.max(0, this.options.maxRequests - recentRequests.length),
      resetTime:
        recentRequests.length > 0 ? Math.min(...this.requestTimes) + this.options.windowMs : now,
    };
  }
}

/**
 * Create a rate limiter with sensible defaults
 */
export function createRateLimiter(options: Partial<RateLimiterOptions> = {}): RateLimiter {
  return new RateLimiter({
    maxRequests: 60, // 60 requests per minute
    windowMs: 60000, // 1 minute window
    ...options,
  });
}
