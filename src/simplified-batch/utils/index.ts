/**
 * Utility functions for the Simplified Batch Deployment System
 * 
 * This module provides common utility functions used throughout the system
 * for validation, formatting, calculations, and other helper operations.
 */

import type { Address } from 'viem';
import type { 
  TokenConfig, 
  ValidationResult, 
  ValidationError,
  DeploymentError,
  ErrorCategory,
  GasEstimate 
} from '../types/core.js';
import { 
  TOKEN_LIMITS, 
  GAS_CONFIG, 
  RETRY_CONFIG, 
  ERROR_MESSAGES, 
  ERROR_CODES 
} from '../constants/index.js';

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates an Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates a token name
 * Requirements: 9.1 - Real-time validation
 */
export function validateTokenName(name: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Token name is required',
      code: ERROR_CODES.E001,
      value: name
    });
  } else {
    const trimmed = name.trim();
    if (trimmed.length < TOKEN_LIMITS.MIN_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Token name must be at least ${TOKEN_LIMITS.MIN_NAME_LENGTH} character`,
        code: ERROR_CODES.E001,
        value: name
      });
    } else if (trimmed.length > TOKEN_LIMITS.MAX_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Token name must not exceed ${TOKEN_LIMITS.MAX_NAME_LENGTH} characters`,
        code: ERROR_CODES.E001,
        value: name,
        suggestion: trimmed.substring(0, TOKEN_LIMITS.MAX_NAME_LENGTH)
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    data: typeof name === 'string' ? name.trim() : undefined
  };
}

/**
 * Validates a token symbol
 * Requirements: 9.1 - Real-time validation
 */
export function validateTokenSymbol(symbol: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!symbol || typeof symbol !== 'string') {
    errors.push({
      field: 'symbol',
      message: 'Token symbol is required',
      code: ERROR_CODES.E002,
      value: symbol
    });
  } else {
    const trimmed = symbol.trim().toUpperCase();
    if (trimmed.length < TOKEN_LIMITS.MIN_SYMBOL_LENGTH) {
      errors.push({
        field: 'symbol',
        message: `Token symbol must be at least ${TOKEN_LIMITS.MIN_SYMBOL_LENGTH} character`,
        code: ERROR_CODES.E002,
        value: symbol
      });
    } else if (trimmed.length > TOKEN_LIMITS.MAX_SYMBOL_LENGTH) {
      errors.push({
        field: 'symbol',
        message: `Token symbol must not exceed ${TOKEN_LIMITS.MAX_SYMBOL_LENGTH} characters`,
        code: ERROR_CODES.E002,
        value: symbol,
        suggestion: trimmed.substring(0, TOKEN_LIMITS.MAX_SYMBOL_LENGTH)
      });
    }
    
    // Check for invalid characters
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
      errors.push({
        field: 'symbol',
        message: 'Token symbol can only contain letters and numbers',
        code: ERROR_CODES.E002,
        value: symbol,
        suggestion: trimmed.replace(/[^A-Z0-9]/g, '')
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    data: typeof symbol === 'string' ? symbol.trim().toUpperCase() : undefined
  };
}

/**
 * Validates initial supply
 * Requirements: 9.4 - Supply range validation
 */
export function validateInitialSupply(supply: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!supply || typeof supply !== 'string') {
    errors.push({
      field: 'initialSupply',
      message: 'Initial supply is required',
      code: ERROR_CODES.E003,
      value: supply
    });
  } else {
    const trimmed = supply.trim();
    
    // Check if it's a valid number
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      errors.push({
        field: 'initialSupply',
        message: 'Initial supply must be a valid number',
        code: ERROR_CODES.E003,
        value: supply
      });
    } else {
      const numValue = parseFloat(trimmed);
      const minSupply = parseFloat(TOKEN_LIMITS.MIN_INITIAL_SUPPLY);
      const maxSupply = parseFloat(TOKEN_LIMITS.MAX_INITIAL_SUPPLY);
      
      if (numValue < minSupply) {
        errors.push({
          field: 'initialSupply',
          message: `Initial supply must be at least ${TOKEN_LIMITS.MIN_INITIAL_SUPPLY}`,
          code: ERROR_CODES.E003,
          value: supply,
          suggestion: TOKEN_LIMITS.MIN_INITIAL_SUPPLY
        });
      } else if (numValue > maxSupply) {
        errors.push({
          field: 'initialSupply',
          message: `Initial supply must not exceed ${TOKEN_LIMITS.MAX_INITIAL_SUPPLY}`,
          code: ERROR_CODES.E003,
          value: supply,
          suggestion: TOKEN_LIMITS.MAX_INITIAL_SUPPLY
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    data: typeof supply === 'string' ? supply.trim() : undefined
  };
}

/**
 * Validates a complete token configuration
 */
export function validateTokenConfig(config: TokenConfig): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings = [];
  
  // Validate name
  const nameResult = validateTokenName(config.name);
  allErrors.push(...nameResult.errors);
  
  // Validate symbol
  const symbolResult = validateTokenSymbol(config.symbol);
  allErrors.push(...symbolResult.errors);
  
  // Validate initial supply
  const supplyResult = validateInitialSupply(config.initialSupply);
  allErrors.push(...supplyResult.errors);
  
  // Validate decimals if provided
  if (config.decimals !== undefined) {
    if (!Number.isInteger(config.decimals) || config.decimals < 0 || config.decimals > 18) {
      allErrors.push({
        field: 'decimals',
        message: 'Decimals must be an integer between 0 and 18',
        code: ERROR_CODES.E003,
        value: config.decimals,
        suggestion: TOKEN_LIMITS.DEFAULT_DECIMALS
      });
    }
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    data: {
      name: nameResult.data,
      symbol: symbolResult.data,
      initialSupply: supplyResult.data,
      decimals: config.decimals ?? TOKEN_LIMITS.DEFAULT_DECIMALS,
      advanced: config.advanced
    }
  };
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Formats wei amount to ETH string
 */
export function formatWeiToEth(wei: string): string {
  const weiNum = BigInt(wei);
  const ethNum = Number(weiNum) / 1e18;
  return ethNum.toFixed(6);
}

/**
 * Formats ETH amount to wei string
 */
export function formatEthToWei(eth: string): string {
  const ethNum = parseFloat(eth);
  const weiNum = BigInt(Math.floor(ethNum * 1e18));
  return weiNum.toString();
}

/**
 * Formats gas price from wei to gwei
 */
export function formatWeiToGwei(wei: string): string {
  const weiNum = BigInt(wei);
  const gweiNum = Number(weiNum) / 1e9;
  return gweiNum.toFixed(2);
}

/**
 * Formats gwei to wei
 */
export function formatGweiToWei(gwei: string): string {
  const gweiNum = parseFloat(gwei);
  const weiNum = BigInt(Math.floor(gweiNum * 1e9));
  return weiNum.toString();
}

/**
 * Formats duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

/**
 * Formats a number with appropriate units (K, M, B, T)
 */
export function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else if (num < 1000000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num < 1000000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  } else {
    return `${(num / 1000000000000).toFixed(1)}T`;
  }
}

/**
 * Truncates an address for display
 */
export function truncateAddress(address: Address, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars + 2) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// ============================================================================
// Calculation Utilities
// ============================================================================

/**
 * Calculates gas cost with buffer
 * Requirements: 7.3 - Conservative gas buffer (20%)
 */
export function calculateGasWithBuffer(gasLimit: string, bufferPercentage = GAS_CONFIG.GAS_BUFFER_PERCENTAGE): string {
  const gasLimitNum = BigInt(gasLimit);
  const buffer = gasLimitNum * BigInt(bufferPercentage) / BigInt(100);
  return (gasLimitNum + buffer).toString();
}

/**
 * Calculates total deployment cost
 */
export function calculateDeploymentCost(gasLimit: string, gasPrice: string): string {
  const gasLimitNum = BigInt(gasLimit);
  const gasPriceNum = BigInt(gasPrice);
  return (gasLimitNum * gasPriceNum).toString();
}

/**
 * Calculates safety buffer for balance
 * Requirements: 3.3 - Safety buffer calculation
 */
export function calculateSafetyBuffer(totalCost: string, bufferPercentage = 10): string {
  const totalCostNum = BigInt(totalCost);
  const buffer = totalCostNum * BigInt(bufferPercentage) / BigInt(100);
  return buffer.toString();
}

/**
 * Calculates exponential backoff delay
 * Requirements: 4.2 - Exponential backoff retry
 */
export function calculateRetryDelay(attempt: number): number {
  const baseDelay = RETRY_CONFIG.BASE_RETRY_DELAY;
  const multiplier = RETRY_CONFIG.BACKOFF_MULTIPLIER;
  const jitter = RETRY_CONFIG.JITTER_FACTOR;
  
  const delay = baseDelay * Math.pow(multiplier, attempt - 1);
  const jitterAmount = delay * jitter * (Math.random() - 0.5);
  const finalDelay = Math.min(delay + jitterAmount, RETRY_CONFIG.MAX_RETRY_DELAY);
  
  return Math.max(finalDelay, baseDelay);
}

/**
 * Calculates estimated time remaining
 * Requirements: 5.2 - Time estimation accuracy
 */
export function calculateTimeRemaining(
  completedCount: number, 
  totalCount: number, 
  averageTime: number
): number {
  if (completedCount === 0 || averageTime === 0) {
    return 0;
  }
  
  const remainingCount = totalCount - completedCount;
  return remainingCount * averageTime;
}

/**
 * Calculates moving average
 */
export function calculateMovingAverage(values: number[], newValue: number, maxSamples = 10): number {
  const updatedValues = [...values, newValue].slice(-maxSamples);
  return updatedValues.reduce((sum, val) => sum + val, 0) / updatedValues.length;
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Creates a standardized deployment error
 */
export function createDeploymentError(
  category: ErrorCategory,
  message: string,
  technicalDetails: string,
  code: string,
  retryable = false,
  context?: Record<string, unknown>
): DeploymentError {
  return {
    category,
    message,
    technicalDetails,
    recoveryAction: {
      action: 'manual',
      description: 'Please review the error and try again',
      automated: false
    },
    retryable,
    timestamp: new Date(),
    code,
    context
  };
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors are typically retryable
  if (message.includes('network') || 
      message.includes('timeout') || 
      message.includes('connection') ||
      message.includes('fetch')) {
    return true;
  }
  
  // Gas estimation errors might be retryable
  if (message.includes('gas') && !message.includes('insufficient')) {
    return true;
  }
  
  // RPC errors might be retryable
  if (message.includes('rpc') || message.includes('provider')) {
    return true;
  }
  
  return false;
}

/**
 * Categorizes an error
 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
    return 'insufficient_funds';
  }
  
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    return 'network_error';
  }
  
  if (message.includes('gas')) {
    return 'gas_estimation_error';
  }
  
  if (message.includes('invalid') || message.includes('validation')) {
    return 'configuration_error';
  }
  
  if (message.includes('contract') || message.includes('revert')) {
    return 'contract_error';
  }
  
  return 'unknown_error';
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Finds duplicate values in an array
 * Requirements: 9.2 - Duplicate detection
 */
export function findDuplicates<T>(array: T[], keyFn: (item: T) => string): Array<{ value: string; indices: number[] }> {
  const valueMap = new Map<string, number[]>();
  
  array.forEach((item, index) => {
    const key = keyFn(item);
    if (!valueMap.has(key)) {
      valueMap.set(key, []);
    }
    valueMap.get(key)!.push(index);
  });
  
  return Array.from(valueMap.entries())
    .filter(([, indices]) => indices.length > 1)
    .map(([value, indices]) => ({ value, indices }));
}

/**
 * Chunks an array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Removes duplicates from an array
 */
export function removeDuplicates<T>(array: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// ============================================================================
// Promise Utilities
// ============================================================================

/**
 * Creates a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a timeout promise that rejects after specified time
 */
export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    )
  ]);
}

/**
 * Retries a promise with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  context?: string
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !isRetryableError(lastError)) {
        throw lastError;
      }
      
      const delayMs = calculateRetryDelay(attempt);
      console.warn(`${context || 'Operation'} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms:`, lastError.message);
      await delay(delayMs);
    }
  }
  
  throw lastError!;
}

// ============================================================================
// ID Generation Utilities
// ============================================================================

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `session-${timestamp}-${random}`;
}

/**
 * Generates a unique transaction ID
 */
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 12);
  return `tx-${timestamp}-${random}`;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for checking if value is a valid token config
 */
export function isTokenConfig(value: unknown): value is TokenConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const config = value as Record<string, unknown>;
  return (
    typeof config.name === 'string' &&
    typeof config.symbol === 'string' &&
    typeof config.initialSupply === 'string' &&
    (config.decimals === undefined || typeof config.decimals === 'number')
  );
}

/**
 * Type guard for checking if value is a valid address
 */
export function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && isValidAddress(value);
}