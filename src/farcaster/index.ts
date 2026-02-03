/**
 * Farcaster Module
 * Fetch user data from Farcaster using multiple API sources
 */

import { getAddress } from 'viem';
import { errorLogger, NetworkError, wrapError } from '../errors/index.js';
import { FarcasterApiClient, RetryHttpClient } from '../retry/index.js';

// ============================================================================
// Types
// ============================================================================

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  verifiedAddresses?: string[];
  /** Connected wallets (ETH addresses) */
  connectedAddresses?: string[];
  /** Custody address (primary wallet) */
  custodyAddress?: string;
}

export interface FarcasterLookupResult {
  success: boolean;
  user?: FarcasterUser;
  source?: string;
  error?: string;
}

export interface FarcasterWalletsResult {
  success: boolean;
  fid?: number;
  username?: string;
  user?: FarcasterUser;
  /** All wallet addresses (custody + verified + connected) */
  wallets: string[];
  error?: string;
}

// ============================================================================
// Public Hub Endpoints (Free, no API key required)
// ============================================================================

const PUBLIC_HUBS = [
  'https://hub.pinata.cloud',
  'https://nemes.farcaster.xyz:2281',
  'https://hoyt.farcaster.xyz:2281',
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse Hub API response to extract user data
 */
function parseHubUserData(
  fid: number,
  messages: Array<{ data?: { userDataBody?: { type: string; value: string } } }>
): FarcasterUser {
  const user: FarcasterUser = {
    fid,
    username: '',
  };

  for (const msg of messages) {
    const body = msg.data?.userDataBody;
    if (!body) continue;

    switch (body.type) {
      case 'USER_DATA_TYPE_USERNAME':
        user.username = body.value;
        break;
      case 'USER_DATA_TYPE_DISPLAY':
        user.displayName = body.value;
        break;
      case 'USER_DATA_TYPE_PFP':
        user.pfpUrl = body.value;
        break;
      case 'USER_DATA_TYPE_BIO':
        user.bio = body.value;
        break;
    }
  }

  return user;
}

// ============================================================================
// API Client with Retry
// ============================================================================

// Create retry-enabled HTTP client for Farcaster APIs
const farcasterHttpClient = new RetryHttpClient({
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  timeout: 5000,
  shouldRetry: (error, attempt) => {
    // Retry on timeouts, 5xx errors, and rate limits
    if (error instanceof NetworkError) {
      return error.statusCode === 429 || (error.statusCode && error.statusCode >= 500) || false;
    }
    return attempt < 3 && error.message.includes('timeout');
  },
});

// Create Farcaster API client
const farcasterClient = new FarcasterApiClient();

// ============================================================================
// API Methods
// ============================================================================

/**
 * Fetch user by FID from Farcaster Hub
 */
async function fetchFromHub(fid: number, hubUrl: string): Promise<FarcasterUser | null> {
  try {
    const response = await farcasterHttpClient.fetch(`${hubUrl}/v1/userDataByFid?fid=${fid}`, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      messages?: Array<{ data?: { userDataBody?: { type: string; value: string } } }>;
    };

    if (!data.messages || data.messages.length === 0) return null;

    return parseHubUserData(fid, data.messages);
  } catch (error) {
    errorLogger.log(wrapError(error, `Failed to fetch from hub: ${hubUrl}`));
    return null;
  }
}

/**
 * Fetch user by FID from Warpcast API
 */
async function fetchFromWarpcast(fid: number): Promise<FarcasterUser | null> {
  try {
    const response = (await farcasterClient.getUserByFid(fid)) as {
      result?: {
        user?: {
          fid: number;
          username: string;
          displayName: string;
          pfp?: { url: string };
          profile?: { bio?: { text: string } };
          followerCount: number;
          followingCount: number;
          verifications: string[];
        };
        extras?: {
          ethWallets: string[];
          custodyAddress: string;
        };
      };
    };

    if (!response.result?.user) return null;

    const u = response.result.user;
    const extras = response.result.extras;

    return {
      fid: u.fid,
      username: u.username,
      displayName: u.displayName,
      pfpUrl: u.pfp?.url,
      bio: u.profile?.bio?.text,
      followerCount: u.followerCount,
      followingCount: u.followingCount,
      verifiedAddresses: u.verifications,
      connectedAddresses: extras?.ethWallets,
      custodyAddress: extras?.custodyAddress,
    };
  } catch (error) {
    errorLogger.log(wrapError(error, `Failed to fetch user by FID: ${fid}`));
    return null;
  }
}

/**
 * Fetch user by username from Warpcast API
 */
async function fetchByUsernameFromWarpcast(username: string): Promise<FarcasterUser | null> {
  try {
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    if (!cleanUsername) return null;

    const data = (await farcasterClient.getUserByUsername(cleanUsername)) as {
      result?: {
        user?: {
          fid: number;
          username: string;
          displayName: string;
          pfp?: { url: string };
          profile?: { bio?: { text: string } };
          followerCount: number;
          followingCount: number;
          verifications: string[];
        };
        extras?: {
          ethWallets: string[];
          custodyAddress: string;
        };
      };
    };

    if (!data.result?.user) return null;

    const u = data.result.user;
    const extras = data.result.extras;

    return {
      fid: u.fid,
      username: u.username,
      displayName: u.displayName,
      pfpUrl: u.pfp?.url,
      bio: u.profile?.bio?.text,
      followerCount: u.followerCount,
      followingCount: u.followingCount,
      verifiedAddresses: u.verifications,
      connectedAddresses: extras?.ethWallets,
      custodyAddress: extras?.custodyAddress,
    };
  } catch (error) {
    errorLogger.log(wrapError(error, `Failed to fetch user by username: ${username}`));
    return null;
  }
}

/**
 * Fetch user by FID from Neynar API
 */
async function fetchFromNeynar(fid: number): Promise<FarcasterUser | null> {
  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        accept: 'application/json',
        api_key: 'NEYNAR_API_DOCS',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      users?: Array<{
        fid: number;
        username: string;
        display_name?: string;
        pfp_url?: string;
        profile?: { bio?: { text?: string } };
        follower_count?: number;
        following_count?: number;
        verified_addresses?: { eth_addresses?: string[] };
      }>;
    };

    if (!data.users || data.users.length === 0) return null;

    const u = data.users[0];
    return {
      fid: u.fid,
      username: u.username,
      displayName: u.display_name,
      pfpUrl: u.pfp_url,
      bio: u.profile?.bio?.text,
      followerCount: u.follower_count,
      followingCount: u.following_count,
      verifiedAddresses: u.verified_addresses?.eth_addresses,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch user by username from Neynar API
 */
async function fetchByUsernameFromNeynar(username: string): Promise<FarcasterUser | null> {
  try {
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    if (!cleanUsername) return null;

    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/by_username?username=${cleanUsername}`,
      {
        headers: {
          accept: 'application/json',
          api_key: 'NEYNAR_API_DOCS',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      user?: {
        fid: number;
        username: string;
        display_name?: string;
        pfp_url?: string;
        profile?: { bio?: { text?: string } };
        follower_count?: number;
        following_count?: number;
        verified_addresses?: { eth_addresses?: string[] };
      };
    };

    if (!data.user) return null;

    const u = data.user;
    return {
      fid: u.fid,
      username: u.username,
      displayName: u.display_name,
      pfpUrl: u.pfp_url,
      bio: u.profile?.bio?.text,
      followerCount: u.follower_count,
      followingCount: u.following_count,
      verifiedAddresses: u.verified_addresses?.eth_addresses,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Fetch user by FID with multiple fallback sources
 */
export async function getUserByFid(fid: number): Promise<FarcasterLookupResult> {
  const sources = [
    { name: 'Warpcast API', fn: () => fetchFromWarpcast(fid) },
    { name: 'Neynar API', fn: () => fetchFromNeynar(fid) },
    { name: 'Hub API', fn: () => fetchFromHub(fid, PUBLIC_HUBS[0]) },
  ];

  let lastError: Error | undefined;

  for (const source of sources) {
    try {
      const user = await source.fn();
      if (user) {
        return { success: true, user, source: source.name };
      }
    } catch (error) {
      lastError = error as Error;
      errorLogger.log(wrapError(error, `Failed to fetch from ${source.name}`));
      // Continue to next source
    }
  }

  return {
    success: false,
    error: lastError?.message || 'All sources failed',
  };
}

/**
 * Get Farcaster user by username
 * Tries multiple sources for reliability
 */
export async function getUserByUsername(username: string): Promise<FarcasterLookupResult> {
  const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
  if (!cleanUsername) {
    return { success: false, error: 'Invalid username' };
  }

  // Try Warpcast first (most reliable)
  const warpcastUser = await fetchByUsernameFromWarpcast(cleanUsername);
  if (warpcastUser) {
    return { success: true, user: warpcastUser, source: 'warpcast' };
  }

  // Try Neynar
  const neynarUser = await fetchByUsernameFromNeynar(cleanUsername);
  if (neynarUser) {
    return { success: true, user: neynarUser, source: 'neynar' };
  }

  return { success: false, error: 'User not found' };
}

/**
 * Resolve Farcaster input (FID or username) to user data
 * Accepts: FID number, "@username", or "username"
 */
export async function resolveUser(input: string | number): Promise<FarcasterLookupResult> {
  // If number, treat as FID
  if (typeof input === 'number') {
    return getUserByFid(input);
  }

  const trimmed = String(input).trim();
  if (!trimmed) {
    return { success: false, error: 'Empty input' };
  }

  // Check if it's a numeric string (FID)
  const numericFid = Number(trimmed);
  if (!Number.isNaN(numericFid) && numericFid > 0 && String(numericFid) === trimmed) {
    return getUserByFid(numericFid);
  }

  // Otherwise treat as username
  return getUserByUsername(trimmed);
}

/**
 * Validate if a FID exists
 */
export async function validateFid(fid: number): Promise<boolean> {
  const result = await getUserByFid(fid);
  return result.success;
}

/**
 * Validate if a username exists and return FID
 */
export async function validateUsername(username: string): Promise<number | null> {
  const result = await getUserByUsername(username);
  return result.success ? (result.user?.fid ?? null) : null;
}

/**
 * Get profile picture URL for a FID
 */
export async function getProfilePicture(fid: number): Promise<string | null> {
  const result = await getUserByFid(fid);
  return result.success ? (result.user?.pfpUrl ?? null) : null;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Get multiple users by FIDs
 */
export async function getUsersByFids(fids: number[]): Promise<Map<number, FarcasterUser>> {
  const results = new Map<number, FarcasterUser>();

  // Process in parallel with concurrency limit
  const batchSize = 5;
  for (let i = 0; i < fids.length; i += batchSize) {
    const batch = fids.slice(i, i + batchSize);
    const promises = batch.map(async (fid) => {
      const result = await getUserByFid(fid);
      if (result.success && result.user) {
        results.set(fid, result.user);
      }
    });
    await Promise.all(promises);
  }

  return results;
}

// ============================================================================
// Wallet Functions
// ============================================================================

/**
 * Get all wallet addresses for a Farcaster user
 * Combines: custody address + verified addresses + connected addresses
 * Returns unique, deduplicated list
 */
export async function getUserWallets(input: string | number): Promise<FarcasterWalletsResult> {
  const result = await resolveUser(input);

  if (!result.success || !result.user) {
    return {
      success: false,
      wallets: [],
      error: result.error || 'User not found',
    };
  }

  const user = result.user;
  const walletsSet = new Set<string>();
  const orderedWallets: string[] = [];

  // Add custody address (primary wallet)
  if (user.custodyAddress?.startsWith('0x')) {
    const lower = user.custodyAddress.toLowerCase();
    if (!walletsSet.has(lower)) {
      walletsSet.add(lower);
      orderedWallets.push(lower);
    }
  }

  // Add verified addresses
  if (user.verifiedAddresses) {
    const sortedVerified = user.verifiedAddresses
      .filter((addr): addr is string => typeof addr === 'string' && addr.startsWith('0x'))
      .map((addr) => addr.toLowerCase())
      .sort();

    for (const addr of sortedVerified) {
      if (!walletsSet.has(addr)) {
        walletsSet.add(addr);
        orderedWallets.push(addr);
      }
    }
  }

  // Add connected addresses
  if (user.connectedAddresses) {
    const sortedConnected = user.connectedAddresses
      .filter((addr): addr is string => typeof addr === 'string' && addr.startsWith('0x'))
      .map((addr) => addr.toLowerCase())
      .sort();

    for (const addr of sortedConnected) {
      if (!walletsSet.has(addr)) {
        walletsSet.add(addr);
        orderedWallets.push(addr);
      }
    }
  }

  // Convert to array and apply EIP-55 checksum
  const wallets: string[] = [];
  for (const addr of orderedWallets) {
    try {
      // Apply checksum using viem's getAddress
      const checksummed = getAddress(addr as `0x${string}`);
      wallets.push(checksummed);
    } catch {
      // If checksum fails, skip invalid address
    }
  }

  return {
    success: true,
    fid: user.fid,
    username: user.username,
    user,
    wallets,
  };
}

/**
 * Get wallet count for a Farcaster user
 */
export async function getWalletCount(input: string | number): Promise<number> {
  const result = await getUserWallets(input);
  return result.wallets.length;
}
