/**
 * Vanity Address Generator for Clanker
 *
 * Clanker CREATE2 Mechanism (from v4-contracts source):
 *
 * In ClankerDeployer.sol:
 * ```solidity
 * ClankerToken token = new ClankerToken{
 *     salt: keccak256(abi.encode(tokenConfig.tokenAdmin, tokenConfig.salt))
 * }(name, symbol, supply, admin, image, metadata, context, chainId);
 * ```
 *
 * CREATE2 Address Formula:
 * address = keccak256(0xff ++ deployer ++ actualSalt ++ initCodeHash)[12:]
 *
 * Where:
 * - deployer = Clanker factory address
 * - actualSalt = keccak256(abi.encode(tokenAdmin, userSalt))
 * - initCodeHash = keccak256(creationCode + constructorArgs)
 *
 * Key insight: The actualSalt depends on tokenAdmin, so we mine userSalt
 * and compute actualSalt for each attempt.
 */

import { concat, encodeAbiParameters, getAddress, keccak256, pad, toBytes } from 'viem';

export interface VanityResult {
  salt: `0x${string}`;
  address: `0x${string}`;
  attempts: number;
  timeMs: number;
}

export interface TokenParams {
  name: string;
  symbol: string;
  tokenAdmin: `0x${string}`;
  image?: string;
  metadata?: string;
  context?: string;
  chainId: number;
}

// Factory addresses per chain
const FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  8453: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9', // Base
  1: '0x6C8599779B03B00AAaE63C6378830919Abb75473', // Ethereum
  42161: '0xEb9D2A726Edffc887a574dC7f46b3a3638E8E44f', // Arbitrum
  130: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9', // Unichain
  10143: '0xF9a0C289Eab6B571c6247094a853810987E5B26D', // Monad
};

// Default Clanker suffix pattern (standard Clanker behavior)
export const CLANKER_DEFAULT_SUFFIX = 'b07';

// Maximum time for vanity mining (in ms) to prevent deploy timeout
export const MAX_MINING_TIME_MS = 30000; // 30 seconds

// Vanity mode types
export type VanityMode = 'off' | 'random' | 'custom';

// Popular 3-char suffix patterns for random mode (fast mining)
const QUICK_SUFFIX_PATTERNS = [
  '000',
  '111',
  '222',
  '333',
  '444',
  '555',
  '666',
  '777',
  '888',
  '999',
  'aaa',
  'bbb',
  'ccc',
  'ddd',
  'eee',
  'fff',
  'abc',
  'def',
  'ace',
  'bad',
  'bed',
  'cab',
  'dab',
  'fab',
  '420',
  '069',
  '007',
  '100',
  '123',
  '321',
  '911',
  'dad',
  'mom',
  'bae',
  'bff',
  'wow',
  'lol',
];

/**
 * Get a random vanity suffix for "random" mode (3 chars only for speed)
 */
export function getRandomVanityPattern(): { prefix?: string; suffix?: string } {
  const suffix = QUICK_SUFFIX_PATTERNS[Math.floor(Math.random() * QUICK_SUFFIX_PATTERNS.length)];
  return { suffix };
}

/**
 * Generate a random 32-byte salt
 */
export function generateRandomSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as `0x${string}`;
}

/**
 * Compute the actual salt used by Clanker factory
 * From ClankerDeployer.sol: salt = keccak256(abi.encode(tokenAdmin, userSalt))
 */
export function computeActualSalt(
  tokenAdmin: `0x${string}`,
  userSalt: `0x${string}`
): `0x${string}` {
  const encoded = encodeAbiParameters(
    [{ type: 'address' }, { type: 'bytes32' }],
    [tokenAdmin, userSalt]
  );
  return keccak256(encoded);
}

/**
 * Increment a salt by 1 (for sequential mining)
 */
function incrementSalt(salt: `0x${string}`): `0x${string}` {
  const bytes = new Uint8Array(32);
  const hexStr = salt.slice(2);

  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
  }

  // Increment from the end (big-endian)
  for (let i = 31; i >= 0; i--) {
    if (bytes[i] < 255) {
      bytes[i]++;
      break;
    }
    bytes[i] = 0;
  }

  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as `0x${string}`;
}

/**
 * Compute CREATE2 address
 * Formula: keccak256(0xff ++ factory ++ salt ++ initCodeHash)[12:]
 */
export function computeCreate2Address(
  factory: `0x${string}`,
  salt: `0x${string}`,
  initCodeHash: `0x${string}`
): `0x${string}` {
  const saltBytes = pad(toBytes(salt), { size: 32 });

  const data = concat(['0xff', factory, saltBytes, initCodeHash]);
  const hash = keccak256(data);
  return getAddress(`0x${hash.slice(-40)}`) as `0x${string}`;
}

/**
 * Check if address matches vanity pattern
 */
function matchesPattern(address: string, prefix?: string, suffix?: string): boolean {
  const addr = address.toLowerCase().slice(2);

  if (prefix) {
    const p = prefix.toLowerCase().replace(/^0x/, '');
    if (!addr.startsWith(p)) return false;
  }

  if (suffix) {
    const s = suffix.toLowerCase().replace(/^0x/, '');
    if (!addr.endsWith(s)) return false;
  }

  return true;
}

/**
 * Estimate difficulty based on pattern length
 */
export function estimateVanityDifficulty(
  prefix?: string,
  suffix?: string
): {
  difficulty: number;
  estimatedAttempts: number;
  estimatedTimeSeconds: number;
} {
  let chars = 0;
  if (prefix) chars += prefix.replace(/^0x/, '').length;
  if (suffix) chars += suffix.replace(/^0x/, '').length;

  const difficulty = 16 ** chars;
  const estimatedAttempts = difficulty;
  const estimatedTimeSeconds = estimatedAttempts / 100000;

  return { difficulty, estimatedAttempts, estimatedTimeSeconds };
}

/**
 * Format time duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 1) return 'instant';
  if (seconds < 60) return `~${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)}m`;
  if (seconds < 86400) return `~${Math.ceil(seconds / 3600)}h`;
  return `~${Math.ceil(seconds / 86400)}d`;
}

export interface VanityMineOptions {
  chainId: number;
  tokenAdmin: `0x${string}`;
  prefix?: string;
  suffix?: string;
  maxAttempts?: number;
  maxTimeMs?: number;
  onProgress?: (attempts: number, rate: number, currentSalt: string) => void;
}

/**
 * Mine for a vanity address using actual Clanker CREATE2 mechanism
 *
 * This mines userSalt values and computes the actual CREATE2 address
 * using the Clanker factory's salt derivation:
 * actualSalt = keccak256(abi.encode(tokenAdmin, userSalt))
 *
 * Features:
 * - Timeout protection to prevent deploy errors
 * - Progress callback for UI updates
 * - Returns null if not found (deploy will use random salt)
 */
export async function mineVanitySalt(options: VanityMineOptions): Promise<VanityResult | null> {
  const {
    chainId,
    tokenAdmin,
    prefix,
    suffix,
    maxAttempts = 5000000,
    maxTimeMs = MAX_MINING_TIME_MS,
    onProgress,
  } = options;

  const factory = FACTORY_ADDRESSES[chainId];
  if (!factory) {
    // Don't throw, just return null - deploy will use random salt
    return null;
  }

  if (!prefix && !suffix) {
    const salt = generateRandomSalt();
    return {
      salt,
      address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      attempts: 1,
      timeMs: 0,
    };
  }

  const startTime = Date.now();
  let userSalt = generateRandomSalt();
  let lastProgressTime = startTime;

  // Mine by finding a userSalt where the actualSalt has the desired pattern
  for (let i = 0; i < maxAttempts; i++) {
    // Check timeout to prevent deploy errors
    const elapsed = Date.now() - startTime;
    if (elapsed > maxTimeMs) {
      // Timeout - return null, deploy will proceed with random salt
      return null;
    }

    // Compute the actual salt that Clanker will use
    const actualSalt = computeActualSalt(tokenAdmin, userSalt);

    // Check if actualSalt matches the pattern
    if (matchesPattern(actualSalt, prefix, suffix)) {
      return {
        salt: userSalt,
        address: `0x${actualSalt.slice(2, 42)}` as `0x${string}`,
        attempts: i + 1,
        timeMs: elapsed,
      };
    }

    if (onProgress && i > 0 && i % 50000 === 0) {
      const now = Date.now();
      const elapsedSinceProgress = (now - lastProgressTime) / 1000;
      const rate = 50000 / elapsedSinceProgress;
      onProgress(i, rate, `${userSalt.slice(0, 10)}...`);
      lastProgressTime = now;
    }

    userSalt = incrementSalt(userSalt);

    // Yield to event loop periodically
    if (i % 100000 === 0 && i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return null;
}

/**
 * Quick mine with short timeout - for default Clanker suffix
 * Returns salt quickly or null if not found
 */
export async function quickMineVanitySalt(
  tokenAdmin: `0x${string}`,
  suffix: string = CLANKER_DEFAULT_SUFFIX,
  maxTimeMs: number = 10000
): Promise<`0x${string}` | null> {
  const startTime = Date.now();
  let userSalt = generateRandomSalt();

  // Quick mining loop with timeout
  for (let i = 0; i < 1000000; i++) {
    if (Date.now() - startTime > maxTimeMs) {
      return null;
    }

    const actualSalt = computeActualSalt(tokenAdmin, userSalt);
    const actualSaltLower = actualSalt.toLowerCase().slice(2);

    if (actualSaltLower.endsWith(suffix.toLowerCase())) {
      return userSalt;
    }

    userSalt = incrementSalt(userSalt);

    // Yield occasionally
    if (i % 50000 === 0 && i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return null;
}

/**
 * Validate vanity pattern - limited to 3 chars for suffix to avoid timeout
 */
export function validateVanityPattern(pattern: string): { valid: boolean; error?: string } {
  const cleaned = pattern.replace(/^0x/, '').toLowerCase();

  if (cleaned.length === 0) {
    return { valid: true };
  }

  if (cleaned.length > 3) {
    return { valid: false, error: 'Max 3 characters to avoid timeout during deploy' };
  }

  if (!/^[0-9a-f]*$/.test(cleaned)) {
    return { valid: false, error: 'Must be hexadecimal (0-9, a-f)' };
  }

  return { valid: true };
}

/**
 * Get factory address for chain
 */
export function getFactoryAddress(chainId: number): `0x${string}` | undefined {
  return FACTORY_ADDRESSES[chainId];
}
