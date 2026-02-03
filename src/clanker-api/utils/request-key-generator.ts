/**
 * Request Key Generator
 * Generates unique 32-character request keys for Clanker API v4
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique 32-character request key
 * Uses cryptographically secure random bytes
 * 
 * @returns 32-character hexadecimal string
 * 
 * @example
 * ```typescript
 * const requestKey = generateRequestKey();
 * console.log(requestKey); // "abcdef1234567890abcdef1234567890"
 * ```
 */
export function generateRequestKey(): string {
  // Generate 16 random bytes (will be 32 hex characters)
  const bytes = randomBytes(16);
  return bytes.toString('hex');
}

/**
 * Validate a request key format
 * 
 * @param key The request key to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = validateRequestKey('abcdef1234567890abcdef1234567890');
 * console.log(isValid); // true
 * ```
 */
export function validateRequestKey(key: string): boolean {
  // Must be exactly 32 characters
  if (key.length !== 32) {
    return false;
  }

  // Must be hexadecimal (0-9, a-f, A-F)
  const hexRegex = /^[0-9a-fA-F]{32}$/;
  return hexRegex.test(key);
}

/**
 * Ensure a request key exists, generating one if not provided
 * 
 * @param key Optional existing request key
 * @returns Valid request key (existing or newly generated)
 * 
 * @example
 * ```typescript
 * const key1 = ensureRequestKey(); // Generates new key
 * const key2 = ensureRequestKey('existing123...'); // Uses existing key
 * ```
 */
export function ensureRequestKey(key?: string): string {
  if (key) {
    if (!validateRequestKey(key)) {
      throw new Error(`Invalid request key format: must be 32 hexadecimal characters`);
    }
    return key;
  }

  return generateRequestKey();
}

/**
 * Generate multiple unique request keys
 * 
 * @param count Number of keys to generate
 * @returns Array of unique request keys
 * 
 * @example
 * ```typescript
 * const keys = generateRequestKeys(5);
 * console.log(keys.length); // 5
 * ```
 */
export function generateRequestKeys(count: number): string[] {
  if (count < 1) {
    throw new Error('Count must be at least 1');
  }

  const keys = new Set<string>();
  
  while (keys.size < count) {
    keys.add(generateRequestKey());
  }

  return Array.from(keys);
}

/**
 * Create a request key from a seed (deterministic)
 * Useful for testing or when you need reproducible keys
 * 
 * @param seed Seed string
 * @returns 32-character request key
 * 
 * @example
 * ```typescript
 * const key = createRequestKeyFromSeed('my-token-name');
 * // Always generates the same key for the same seed
 * ```
 */
export function createRequestKeyFromSeed(seed: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return hash; // MD5 produces 32 hex characters
}
