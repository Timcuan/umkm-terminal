/**
 * Constants and default values for the Simplified Batch Deployment System
 * 
 * This module defines all default values, limits, and configuration constants
 * used throughout the system.
 */

import type { GasStrategy, DeploymentOptions } from '../types/core.js';

// ============================================================================
// System Limits and Constraints
// ============================================================================

/**
 * Maximum configuration steps allowed
 * Requirements: 1.1 - Maximum of 4 configuration steps
 */
export const MAX_CONFIGURATION_STEPS = 4;

/**
 * Token configuration limits
 * Requirements: 9.4 - Supply range validation
 */
export const TOKEN_LIMITS = {
  /** Minimum token name length */
  MIN_NAME_LENGTH: 1,
  /** Maximum token name length */
  MAX_NAME_LENGTH: 50,
  /** Minimum token symbol length */
  MIN_SYMBOL_LENGTH: 1,
  /** Maximum token symbol length */
  MAX_SYMBOL_LENGTH: 10,
  /** Minimum initial supply */
  MIN_INITIAL_SUPPLY: '1',
  /** Maximum initial supply (1 trillion tokens) */
  MAX_INITIAL_SUPPLY: '1000000000000',
  /** Default token decimals */
  DEFAULT_DECIMALS: 18,
  /** Maximum tokens in a single batch */
  MAX_BATCH_SIZE: 100
} as const;

/**
 * Gas configuration constants
 * Requirements: 7.3 - Conservative gas buffer (20%)
 */
export const GAS_CONFIG = {
  /** Gas buffer percentage (20%) */
  GAS_BUFFER_PERCENTAGE: 20,
  /** Default gas limit for token deployment */
  DEFAULT_GAS_LIMIT: '2000000',
  /** Fallback gas price in gwei */
  FALLBACK_GAS_PRICE_GWEI: '20',
  /** Maximum gas price in gwei */
  MAX_GAS_PRICE_GWEI: '500',
  /** Gas price update interval in milliseconds */
  GAS_PRICE_UPDATE_INTERVAL: 30000
} as const;

/**
 * Retry configuration
 * Requirements: 4.2 - Exponential backoff retry
 */
export const RETRY_CONFIG = {
  /** Default maximum retry attempts */
  DEFAULT_MAX_RETRIES: 3,
  /** Base retry delay in milliseconds */
  BASE_RETRY_DELAY: 1000,
  /** Maximum retry delay in milliseconds */
  MAX_RETRY_DELAY: 30000,
  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
  /** Jitter factor for retry delays */
  JITTER_FACTOR: 0.1
} as const;

/**
 * Session management constants
 * Requirements: 8.4 - Session persistence
 */
export const SESSION_CONFIG = {
  /** Session timeout in milliseconds (24 hours) */
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  /** Maximum number of sessions to keep in history */
  MAX_SESSION_HISTORY: 100,
  /** Session cleanup interval in milliseconds (1 hour) */
  CLEANUP_INTERVAL: 60 * 60 * 1000,
  /** Auto-save interval in milliseconds */
  AUTO_SAVE_INTERVAL: 5000
} as const;

/**
 * Progress tracking constants
 * Requirements: 5.2 - Time estimation accuracy
 */
export const PROGRESS_CONFIG = {
  /** Minimum samples for time estimation */
  MIN_TIME_SAMPLES: 3,
  /** Maximum samples to keep for averaging */
  MAX_TIME_SAMPLES: 10,
  /** Progress update interval in milliseconds */
  PROGRESS_UPDATE_INTERVAL: 1000,
  /** Time estimation smoothing factor */
  TIME_SMOOTHING_FACTOR: 0.3
} as const;

/**
 * Balance checking constants
 * Requirements: 3.3 - Safety buffer calculation
 */
export const BALANCE_CONFIG = {
  /** Safety buffer percentage (10%) */
  SAFETY_BUFFER_PERCENTAGE: 10,
  /** Balance check interval in milliseconds */
  BALANCE_CHECK_INTERVAL: 30000,
  /** Minimum balance threshold in ETH */
  MIN_BALANCE_THRESHOLD: '0.001',
  /** Balance cache duration in milliseconds */
  BALANCE_CACHE_DURATION: 60000
} as const;

/**
 * Validation constants
 * Requirements: 9.1 - Real-time validation
 */
export const VALIDATION_CONFIG = {
  /** Validation debounce delay in milliseconds */
  VALIDATION_DEBOUNCE: 300,
  /** Maximum validation errors to display */
  MAX_VALIDATION_ERRORS: 10,
  /** Validation timeout in milliseconds */
  VALIDATION_TIMEOUT: 5000
} as const;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default token configuration
 * Requirements: 1.4 - Sensible defaults for non-essential options
 */
export const DEFAULT_TOKEN_CONFIG = {
  decimals: TOKEN_LIMITS.DEFAULT_DECIMALS,
  advanced: {
    mintable: false,
    burnable: false,
    pausable: false
  }
} as const;

/**
 * Default deployment options
 * Requirements: 2.1 - Single wallet deployment as default
 */
export const DEFAULT_DEPLOYMENT_OPTIONS: Partial<DeploymentOptions> = {
  gasStrategy: 'standard' as GasStrategy,
  maxConcurrency: 1, // Single wallet default
  retryAttempts: RETRY_CONFIG.DEFAULT_MAX_RETRIES,
  deploymentDelay: 2000 // 2 seconds between deployments
} as const;

/**
 * Default gas strategies
 * Requirements: 7.1 - Network-based gas estimation
 */
export const GAS_STRATEGIES = {
  conservative: {
    multiplier: 1.5,
    priority: 'low'
  },
  standard: {
    multiplier: 1.2,
    priority: 'medium'
  },
  fast: {
    multiplier: 1.8,
    priority: 'high'
  }
} as const;

// ============================================================================
// Error Messages and Codes
// ============================================================================

/**
 * Standard error messages
 * Requirements: 4.1 - Clear, actionable error messages
 */
export const ERROR_MESSAGES = {
  // Configuration errors
  INVALID_TOKEN_NAME: 'Token name must be between 1 and 50 characters',
  INVALID_TOKEN_SYMBOL: 'Token symbol must be between 1 and 10 characters',
  INVALID_INITIAL_SUPPLY: 'Initial supply must be a positive number',
  DUPLICATE_TOKEN_NAME: 'Token name already exists in this batch',
  DUPLICATE_TOKEN_SYMBOL: 'Token symbol already exists in this batch',
  
  // Balance errors
  INSUFFICIENT_FUNDS: 'Insufficient funds for deployment',
  BALANCE_CHECK_FAILED: 'Unable to check wallet balance',
  
  // Network errors
  NETWORK_ERROR: 'Network connection error',
  RPC_ERROR: 'RPC endpoint error',
  TRANSACTION_FAILED: 'Transaction failed',
  
  // Gas errors
  GAS_ESTIMATION_FAILED: 'Gas estimation failed',
  GAS_PRICE_TOO_HIGH: 'Gas price exceeds maximum threshold',
  
  // Session errors
  SESSION_NOT_FOUND: 'Deployment session not found',
  SESSION_EXPIRED: 'Deployment session has expired',
  SESSION_ALREADY_RUNNING: 'Another deployment session is already running',
  
  // General errors
  VALIDATION_FAILED: 'Configuration validation failed',
  DEPLOYMENT_TIMEOUT: 'Deployment operation timed out',
  UNKNOWN_ERROR: 'An unexpected error occurred'
} as const;

/**
 * Error codes for programmatic handling
 */
export const ERROR_CODES = {
  // Configuration
  E001: 'INVALID_TOKEN_NAME',
  E002: 'INVALID_TOKEN_SYMBOL', 
  E003: 'INVALID_INITIAL_SUPPLY',
  E004: 'DUPLICATE_TOKEN_NAME',
  E005: 'DUPLICATE_TOKEN_SYMBOL',
  
  // Balance
  E101: 'INSUFFICIENT_FUNDS',
  E102: 'BALANCE_CHECK_FAILED',
  
  // Network
  E201: 'NETWORK_ERROR',
  E202: 'RPC_ERROR',
  E203: 'TRANSACTION_FAILED',
  
  // Gas
  E301: 'GAS_ESTIMATION_FAILED',
  E302: 'GAS_PRICE_TOO_HIGH',
  
  // Session
  E401: 'SESSION_NOT_FOUND',
  E402: 'SESSION_EXPIRED',
  E403: 'SESSION_ALREADY_RUNNING',
  
  // General
  E501: 'VALIDATION_FAILED',
  E502: 'DEPLOYMENT_TIMEOUT',
  E999: 'UNKNOWN_ERROR'
} as const;

// ============================================================================
// Event Names
// ============================================================================

/**
 * System event names for component communication
 */
export const EVENTS = {
  // Deployment events
  DEPLOYMENT_STARTED: 'deployment:started',
  DEPLOYMENT_PAUSED: 'deployment:paused',
  DEPLOYMENT_RESUMED: 'deployment:resumed',
  DEPLOYMENT_CANCELLED: 'deployment:cancelled',
  DEPLOYMENT_COMPLETED: 'deployment:completed',
  DEPLOYMENT_FAILED: 'deployment:failed',
  
  // Progress events
  PROGRESS_UPDATED: 'progress:updated',
  PHASE_CHANGED: 'progress:phase-changed',
  TOKEN_STARTED: 'progress:token-started',
  TOKEN_COMPLETED: 'progress:token-completed',
  TOKEN_FAILED: 'progress:token-failed',
  
  // Balance events
  BALANCE_UPDATED: 'balance:updated',
  BALANCE_LOW: 'balance:low',
  BALANCE_INSUFFICIENT: 'balance:insufficient',
  
  // Gas events
  GAS_PRICE_UPDATED: 'gas:price-updated',
  GAS_ESTIMATION_FAILED: 'gas:estimation-failed',
  
  // Session events
  SESSION_CREATED: 'session:created',
  SESSION_SAVED: 'session:saved',
  SESSION_LOADED: 'session:loaded',
  SESSION_DELETED: 'session:deleted',
  
  // Error events
  ERROR_OCCURRED: 'error:occurred',
  ERROR_RECOVERED: 'error:recovered',
  
  // Validation events
  VALIDATION_STARTED: 'validation:started',
  VALIDATION_COMPLETED: 'validation:completed',
  VALIDATION_FAILED: 'validation:failed'
} as const;

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * Storage keys for persistent data
 */
export const STORAGE_KEYS = {
  SESSIONS: 'simplified-batch:sessions',
  HISTORY: 'simplified-batch:history',
  CONFIG: 'simplified-batch:config',
  CACHE: 'simplified-batch:cache',
  PREFERENCES: 'simplified-batch:preferences'
} as const;

// ============================================================================
// UI Constants
// ============================================================================

/**
 * UI-related constants
 */
export const UI_CONFIG = {
  /** Animation duration in milliseconds */
  ANIMATION_DURATION: 300,
  /** Notification display duration in milliseconds */
  NOTIFICATION_DURATION: 5000,
  /** Loading spinner update interval in milliseconds */
  SPINNER_INTERVAL: 100,
  /** Progress bar update interval in milliseconds */
  PROGRESS_BAR_INTERVAL: 500
} as const;

// ============================================================================
// Network Constants
// ============================================================================

/**
 * Network-related constants
 */
export const NETWORK_CONFIG = {
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,
  /** Connection retry attempts */
  CONNECTION_RETRIES: 3,
  /** Health check interval in milliseconds */
  HEALTH_CHECK_INTERVAL: 60000,
  /** Block confirmation count */
  CONFIRMATION_BLOCKS: 1
} as const;