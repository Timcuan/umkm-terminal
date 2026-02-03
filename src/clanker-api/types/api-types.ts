/**
 * Bankrbot API Request/Response Types
 * Based on Bankrbot API specification for programmatic token deployment
 */

// ============================================================================
// API Request Types
// ============================================================================

export interface BankrbotAPITokenRequest {
  // Core token fields
  name: string;
  symbol: string;
  tokenAdmin: string;
  image?: string;
  description?: string;
  socialMediaUrls?: string[];
  auditUrls?: string[];
  
  // Enhanced metadata with proper formatting and validation
  metadata?: Record<string, any>;
  
  // Pool configuration
  poolConfig?: {
    type: 'standard' | 'custom';
    pairedToken?: string;
    initialLiquidity?: any;
    positions?: Array<{
      tickLower: number;
      tickUpper: number;
      bps: number;
    }>;
  };
  
  // Fee configuration
  feeConfig?: {
    type: 'static' | 'dynamic';
    clankerFee?: number;
    pairedFee?: number;
    // Dynamic fee fields
    baseFee?: number;
    maxFee?: number;
    startingSniperFee?: number;
    endingSniperFee?: number;
    referenceTickFilterPeriod?: number;
    resetPeriod?: number;
    resetTickFilter?: number;
    feeControlNumerator?: number;
    decayFilterBps?: number;
    decayDuration?: number;
  };
  
  // Rewards configuration (convert basis points to percentages)
  rewardsConfig?: {
    recipients: Array<{
      recipient: string;
      admin: string;
      percentage: number; // 0-100
      feePreference: 'Both' | 'Paired' | 'Clanker';
    }>;
  };
  
  // Vault configuration
  vaultConfig?: {
    percentage: number;
    lockupDuration: number;
    vestingDuration?: number;
    recipient?: string;
  };
  
  // MEV protection configuration
  mevConfig?: {
    type: 'blockDelay' | 'sniperAuction';
    blockDelay?: number;
    sniperAuction?: {
      startingFee: number;
      endingFee: number;
      secondsToDecay: number;
    };
  };
  
  // Chain configuration
  chainId: number;
  
  // Bankrbot-specific configuration
  verificationRequired?: boolean;
  
  socialIntegration?: {
    platform?: 'twitter' | 'farcaster';
    userId?: string;
    messageTemplate?: string;
  };
  
  customParameters?: {
    priorityDeployment?: boolean;
    customGasLimit?: number;
    expeditedProcessing?: boolean;
  };
  
  // Context for tracking
  context?: {
    interface: string;
    version: string;
    timestamp: string;
  };
}

// Legacy type alias for backward compatibility
export interface ClankerAPITokenRequest {
  token: {
    name: string;
    symbol: string;
    image?: string;
    tokenAdmin: string;
    description?: string;
    socialMediaUrls?: Array<{
      platform: string;
      url: string;
    }>;
    auditUrls?: string[];
    requestKey?: string; // 32-character unique identifier (auto-generated if not provided)
  };
  rewards: Array<{
    admin: string;
    recipient: string;
    allocation: number; // Percentage (0-100)
    rewardsToken?: 'Both' | 'Clanker' | 'Paired';
  }>;
  pool?: {
    type?: 'standard' | 'project';
    pairedToken?: string;
    initialMarketCap?: number;
  };
  fees?: {
    type: 'static' | 'dynamic';
    clankerFee?: number;
    pairedFee?: number;
    // Dynamic fee fields
    baseFee?: number;
    maxFee?: number;
    referenceTickFilterPeriod?: number;
    resetPeriod?: number;
    resetTickFilter?: number;
    feeControlNumerator?: number;
    decayFilterBps?: number;
  };
  vault?: {
    percentage: number;
    lockupDuration: number;
    vestingDuration?: number;
    recipient?: string;
  };
  airdrop?: {
    entries: Array<{
      account: string;
      amount: number;
    }>;
    lockupDuration: number;
    vestingDuration: number;
  };
  chainId: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface BankrbotAPIResponse {
  success: boolean;
  tokenAddress: string;
  deploymentTxHash: string;
  poolAddress?: string;
  liquidityTxHash?: string;
  chainId: number;
  
  // Bankrbot-specific response data
  verified: boolean;
  verificationTxHash?: string;
  socialLinks?: {
    platform: string;
    url: string;
  }[];
  deploymentTime: string;
  
  // Cost and gas information
  estimatedGas: string;
  totalCost: string;
  
  // Error information (if success is false)
  error?: string;
  errorCode?: string;
  retryable?: boolean;
}

// Legacy type alias for backward compatibility
export interface ClankerAPIResponse {
  success: boolean;
  expectedAddress?: string;
  deploymentTxHash?: string;
  poolAddress?: string;
  liquidityTxHash?: string;
  estimatedGas?: string;
  totalCost?: string;
  error?: string;
  message?: string;
}

export interface BankrbotAPIErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  retryable?: boolean;
  details?: any;
}

// Legacy type alias for backward compatibility
export interface ClankerAPIErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  retryable?: boolean;
  details?: any;
}

// ============================================================================
// API Configuration Types
// ============================================================================

export interface BankrbotAPIConfig {
  apiKey: string;
  baseUrl?: string; // defaults to Bankrbot API endpoint
  timeout?: number; // request timeout in ms
  retries?: number; // number of retry attempts
}

// Legacy type alias for backward compatibility
export interface ClankerAPIConfig {
  apiKey: string;
  baseUrl?: string; // defaults to 'https://www.clanker.world/api'
  timeout?: number; // request timeout in ms
  retries?: number; // number of retry attempts
}

// ============================================================================
// Utility Types
// ============================================================================

export type BankrbotAPIResult<T> = 
  | { success: true; data: T }
  | { success: false; error: BankrbotAPIErrorResponse };

// Legacy type alias for backward compatibility
export type ClankerAPIResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ClankerAPIErrorResponse };

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// ============================================================================
// New V4 API Types (Extended Features)
// ============================================================================

/**
 * Token information from GET /api/tokens/by-admin endpoint
 */
export interface TokenInfo {
  id: string;
  contract_address: string;
  name: string;
  symbol: string;
  admin: string;
  chain_id: number;
  deployed_at: string;
  pool_address?: string;
  img_url?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Paginated response for token lists
 */
export interface PaginatedTokenResponse {
  data: TokenInfo[];
  total: number;
  cursor?: string;
}

/**
 * Request to get tokens by admin address
 */
export interface GetTokensByAdminRequest {
  adminAddress: string;
  cursor?: string;
  limit?: number;
}

/**
 * Uncollected fees information
 */
export interface UncollectedFeesResponse {
  lockerAddress: string;
  lpNftId: number;
  token0UncollectedRewards: string;
  token1UncollectedRewards: string;
  token0: {
    chainId: number;
    address: string;
    symbol: string;
    decimals: number;
    name: string;
  };
  token1: {
    chainId: number;
    address: string;
    symbol: string;
    decimals: number;
    name: string;
  };
}

/**
 * Request to get uncollected fees (v4 requires reward recipient address)
 */
export interface GetUncollectedFeesRequest {
  contractAddress: string;
  rewardRecipientAddress?: string; // Required for v4 tokens
}

/**
 * Index token request
 */
export interface IndexTokenRequest {
  contractAddress: string;
  chainId: number;
  metadata?: {
    name?: string;
    symbol?: string;
    image?: string;
    description?: string;
  };
}

/**
 * Index token response
 */
export interface IndexTokenResponse {
  success: boolean;
  indexed: boolean;
  tokenId?: string;
  message?: string;
}