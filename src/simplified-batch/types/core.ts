/**
 * Core type definitions for the Simplified Batch Deployment System
 * 
 * This module defines the essential interfaces and types for the streamlined
 * batch deployment system that replaces the complex multi-layered architecture
 * with a user-focused design.
 */

import type { Address } from 'viem';

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Minimal token configuration required per token
 * Requirements: 1.2 - Only essential fields: name, symbol, initial supply
 */
export interface TokenConfig {
  /** Token name (e.g., "My Token") */
  name: string;
  /** Token symbol (e.g., "TKN") */
  symbol: string;
  /** Initial supply as string to handle large numbers */
  initialSupply: string;
  /** Token decimals (defaults to 18) */
  decimals?: number;
  /** Optional advanced settings */
  advanced?: AdvancedTokenConfig;
}

/**
 * Advanced token configuration (hidden behind optional section)
 * Requirements: 1.3 - Advanced options hidden behind "Advanced Settings"
 */
export interface AdvancedTokenConfig {
  /** Whether token is mintable */
  mintable?: boolean;
  /** Whether token is burnable */
  burnable?: boolean;
  /** Whether token is pausable */
  pausable?: boolean;
  /** Custom gas limit for deployment */
  customGasLimit?: number;
  /** Token admin address (defaults to deployer) */
  tokenAdmin?: Address;
  /** Custom metadata */
  metadata?: TokenMetadata;
}

/**
 * Token metadata for additional information
 */
export interface TokenMetadata {
  /** Token description */
  description?: string;
  /** Token image URL */
  image?: string;
  /** Social links */
  socials?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
}

/**
 * Deployment session state
 * Requirements: 8.1, 8.2, 8.4 - Session management with pause/resume capability
 */
export interface DeploymentSession {
  /** Unique session identifier */
  id: string;
  /** Current session status */
  status: SessionStatus;
  /** Token configurations to deploy */
  configs: TokenConfig[];
  /** Deployment results for completed tokens */
  results: TokenDeploymentResult[];
  /** Current deployment progress */
  progress: DeploymentProgress;
  /** Session start time */
  startTime: Date;
  /** Session end time (if completed) */
  endTime?: Date;
  /** Total deployment cost */
  totalCost: string;
  /** Wallet address used for deployment */
  walletAddress: Address;
  /** Gas strategy used */
  gasStrategy: GasStrategy;
  /** Deployment options */
  options: DeploymentOptions;
}

/**
 * Session status enumeration
 */
export type SessionStatus = 
  | 'pending'     // Session created but not started
  | 'running'     // Deployment in progress
  | 'paused'      // Deployment paused by user
  | 'completed'   // All deployments finished
  | 'cancelled'   // Deployment cancelled by user
  | 'failed';     // Deployment failed with unrecoverable error

/**
 * Gas strategy options
 * Requirements: 7.1 - Automatic gas estimation using network conditions
 */
export type GasStrategy = 'conservative' | 'standard' | 'fast';

/**
 * Deployment options
 * Requirements: 2.1 - Single wallet deployment as default
 */
export interface DeploymentOptions {
  /** Wallet address for deployment */
  walletAddress: Address;
  /** Gas strategy to use */
  gasStrategy: GasStrategy;
  /** Maximum concurrent deployments (defaults to 1 for single wallet) */
  maxConcurrency?: number;
  /** Number of retry attempts for failed deployments */
  retryAttempts?: number;
  /** Delay between deployments in milliseconds */
  deploymentDelay?: number;
}

// ============================================================================
// Progress and Result Types
// ============================================================================

/**
 * Real-time deployment progress information
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 - Real-time progress tracking
 */
export interface DeploymentProgress {
  /** Total number of tokens to deploy */
  totalTokens: number;
  /** Number of completed deployments */
  completedTokens: number;
  /** Currently deploying token name */
  currentToken: string;
  /** Number of successful deployments */
  successCount: number;
  /** Number of failed deployments */
  failureCount: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number;
  /** Average deployment time in seconds */
  averageDeploymentTime: number;
  /** Current deployment phase */
  currentPhase: DeploymentPhase;
}

/**
 * Deployment phase enumeration
 */
export type DeploymentPhase = 
  | 'validating'    // Validating configurations
  | 'checking'      // Checking balance
  | 'deploying'     // Deploying tokens
  | 'confirming'    // Waiting for confirmations
  | 'completed';    // All done

/**
 * Individual token deployment result
 * Requirements: 4.3 - Continue with remaining tokens on failure
 */
export interface TokenDeploymentResult {
  /** Whether deployment was successful */
  success: boolean;
  /** Token configuration that was deployed */
  config: TokenConfig;
  /** Deployed token contract address */
  tokenAddress?: Address;
  /** Transaction hash */
  transactionHash?: `0x${string}`;
  /** Gas used for deployment */
  gasUsed?: string;
  /** Gas price used */
  gasPrice?: string;
  /** Deployment cost in ETH */
  cost?: string;
  /** Error information if deployment failed */
  error?: DeploymentError;
  /** Deployment timestamp */
  timestamp: Date;
  /** Block number where transaction was mined */
  blockNumber?: number;
}

/**
 * Complete deployment result
 */
export interface DeploymentResult {
  /** Session ID */
  sessionId: string;
  /** Overall success status */
  success: boolean;
  /** Individual token results */
  results: TokenDeploymentResult[];
  /** Total deployment cost */
  totalCost: string;
  /** Total gas used */
  totalGasUsed: string;
  /** Deployment summary */
  summary: DeploymentSummary;
}

/**
 * Deployment summary information
 */
export interface DeploymentSummary {
  /** Total tokens attempted */
  totalTokens: number;
  /** Successfully deployed tokens */
  successfulDeployments: number;
  /** Failed deployments */
  failedDeployments: number;
  /** Total time taken */
  totalTime: number;
  /** Average time per deployment */
  averageTime: number;
  /** Total cost in ETH */
  totalCost: string;
  /** Average cost per deployment */
  averageCost: string;
}

// ============================================================================
// Balance and Cost Types
// ============================================================================

/**
 * Wallet balance information
 * Requirements: 3.2, 3.4 - Display current balance and required amount
 */
export interface BalanceInfo {
  /** Current wallet balance in wei */
  currentBalance: string;
  /** Current balance in ETH for display */
  balanceInEth: string;
  /** Last balance update timestamp */
  lastUpdated: Date;
  /** Network/chain ID */
  chainId: number;
}

/**
 * Deployment cost estimate
 * Requirements: 3.3 - Include gas fees, deployment costs, and safety buffer
 */
export interface CostEstimate {
  /** Total estimated gas cost in wei */
  totalGasCost: string;
  /** Cost per token deployment in wei */
  perTokenCost: string;
  /** Safety buffer amount in wei */
  safetyBuffer: string;
  /** Total estimated cost including buffer in wei */
  estimatedTotal: string;
  /** Cost breakdown by component */
  breakdown: CostBreakdown;
}

/**
 * Cost breakdown details
 */
export interface CostBreakdown {
  /** Base deployment cost per token */
  baseDeploymentCost: string;
  /** Gas cost estimate */
  gasCost: string;
  /** Network fees */
  networkFees: string;
  /** Safety buffer (20% of total) */
  safetyBuffer: string;
}

/**
 * Funds validation result
 * Requirements: 3.5 - Prevent deployment when funds insufficient
 */
export interface FundsValidation {
  /** Whether funds are sufficient */
  sufficient: boolean;
  /** Current wallet balance */
  currentBalance: string;
  /** Required amount for deployment */
  requiredAmount: string;
  /** Shortfall amount if insufficient */
  shortfall?: string;
  /** Recommendation for user action */
  recommendation?: string;
  /** Detailed validation message */
  message: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Deployment error information
 * Requirements: 4.1, 4.4 - Clear, actionable error messages with categorization
 */
export interface DeploymentError {
  /** Error category for handling */
  category: ErrorCategory;
  /** User-friendly error message */
  message: string;
  /** Technical error details */
  technicalDetails: string;
  /** Suggested recovery action */
  recoveryAction: RecoveryAction;
  /** Whether error is retryable */
  retryable: boolean;
  /** Error timestamp */
  timestamp: Date;
  /** Error code for programmatic handling */
  code: string;
  /** Additional context */
  context?: ErrorContext;
}

/**
 * Error category enumeration
 * Requirements: 4.4 - Categorize errors for appropriate handling
 */
export type ErrorCategory = 
  | 'insufficient_funds'    // Not enough balance for deployment
  | 'network_error'         // Network connectivity or RPC issues
  | 'configuration_error'   // Invalid token configuration
  | 'contract_error'        // Smart contract deployment failure
  | 'gas_estimation_error'  // Gas estimation failure
  | 'validation_error'      // Input validation failure
  | 'timeout_error'         // Operation timeout
  | 'unknown_error';        // Unclassified error

/**
 * Recovery action information
 */
export interface RecoveryAction {
  /** Action identifier */
  action: string;
  /** Human-readable description */
  description: string;
  /** Whether action can be automated */
  automated: boolean;
  /** Parameters for automated action */
  parameters?: Record<string, unknown>;
}

/**
 * Error context for debugging
 */
export interface ErrorContext {
  /** Operation being performed */
  operation?: string;
  /** Component that generated error */
  component?: string;
  /** Token index in batch */
  tokenIndex?: number;
  /** Wallet address */
  walletAddress?: Address;
  /** Chain ID */
  chainId?: number;
  /** Transaction hash if available */
  txHash?: `0x${string}`;
  /** Additional context data */
  [key: string]: unknown;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 * Requirements: 9.1, 9.3, 9.5 - Real-time validation with immediate feedback
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Validated and normalized data */
  data?: unknown;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Current invalid value */
  value?: unknown;
  /** Suggested valid value */
  suggestion?: unknown;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field with warning */
  field: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
  /** Current value */
  value?: unknown;
}

/**
 * Duplicate check result
 * Requirements: 9.2 - Check for duplicate token names and symbols
 */
export interface DuplicateCheckResult {
  /** Whether duplicates were found */
  hasDuplicates: boolean;
  /** Duplicate name conflicts */
  nameConflicts: DuplicateConflict[];
  /** Duplicate symbol conflicts */
  symbolConflicts: DuplicateConflict[];
}

/**
 * Duplicate conflict information
 */
export interface DuplicateConflict {
  /** Conflicting value */
  value: string;
  /** Indices of conflicting tokens */
  indices: number[];
  /** Field type (name or symbol) */
  field: 'name' | 'symbol';
}

// ============================================================================
// Gas Estimation Types
// ============================================================================

/**
 * Gas estimation result
 * Requirements: 7.1, 7.4 - Network-based gas estimation with fallbacks
 */
export interface GasEstimate {
  /** Estimated gas limit */
  gasLimit: string;
  /** Estimated gas price in wei */
  gasPrice: string;
  /** Maximum fee per gas (EIP-1559) */
  maxFeePerGas?: string;
  /** Maximum priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: string;
  /** Total estimated cost in wei */
  estimatedCost: string;
  /** Whether estimate is from fallback data */
  isFromFallback: boolean;
  /** Confidence level of estimate */
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================================
// History Types
// ============================================================================

/**
 * Deployment history record
 * Requirements: 10.1, 10.2, 10.4 - Maintain deployment history
 */
export interface DeploymentHistory {
  /** All deployment sessions */
  sessions: DeploymentSession[];
  /** Total number of deployments across all sessions */
  totalDeployments: number;
  /** Total cost across all sessions */
  totalCost: string;
  /** Overall success rate */
  successRate: number;
  /** Last deployment timestamp */
  lastDeployment: Date;
  /** Statistics by time period */
  statistics: HistoryStatistics;
}

/**
 * Historical statistics
 */
export interface HistoryStatistics {
  /** Statistics for last 24 hours */
  last24Hours: PeriodStatistics;
  /** Statistics for last 7 days */
  last7Days: PeriodStatistics;
  /** Statistics for last 30 days */
  last30Days: PeriodStatistics;
  /** All-time statistics */
  allTime: PeriodStatistics;
}

/**
 * Statistics for a time period
 */
export interface PeriodStatistics {
  /** Number of sessions */
  sessions: number;
  /** Total deployments */
  deployments: number;
  /** Successful deployments */
  successful: number;
  /** Failed deployments */
  failed: number;
  /** Total cost */
  totalCost: string;
  /** Average cost per deployment */
  averageCost: string;
  /** Success rate percentage */
  successRate: number;
}