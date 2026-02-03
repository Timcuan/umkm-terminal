/**
 * Configuration types for Bankrbot API integration
 */

import type { PublicClient, WalletClient, Chain } from 'viem';
import type { BankrbotAPIConfig, ClankerAPIConfig } from './api-types.js';
import type { DeployResult } from '../../types/index.js';

// ============================================================================
// Enhanced SDK Configuration
// ============================================================================

export interface ClankerSDKConfig {
  // Operation method selection
  operationMethod?: 'direct' | 'api' | 'bankrbot' | 'auto';
  
  // Bankrbot API configuration
  bankrbot?: BankrbotAPIConfig;
  
  // Clanker API configuration (legacy)
  api?: ClankerAPIConfig;
  
  // Existing viem configuration (unchanged for backward compatibility)
  publicClient?: PublicClient;
  wallet?: WalletClient;
  chain?: Chain;
  chains?: Chain[];
}

// ============================================================================
// Method Selection Types
// ============================================================================

export type OperationMethod = 'direct' | 'api' | 'bankrbot' | 'auto';

export interface MethodSelectionContext {
  operationType: 'deploy' | 'claim' | 'update' | 'vault';
  hasApiKey: boolean;
  hasBankrbotKey: boolean;
  hasWallet: boolean;
  chainSupported: boolean;
  userPreference?: OperationMethod;
}

// ============================================================================
// Batch Operation Types
// ============================================================================

export interface BatchDeploymentResult {
  token: string;
  chainId: number;
  success: boolean;
  result?: DeployResult;
  error?: string;
  methodUsed?: OperationMethod;
}

export interface ChainSummary {
  total: number;
  successful: number;
  failed: number;
  methodUsed: OperationMethod;
}

export interface BatchDeploymentResponse {
  method: OperationMethod;
  results: BatchDeploymentResult[];
  chainSummary: Record<number, ChainSummary>;
}

// ============================================================================
// Configuration Validation Types
// ============================================================================

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  method: OperationMethod;
}

export interface ConfigValidationOptions {
  strict?: boolean; // Require all optional fields
  validateApiKey?: boolean; // Test API key validity
  validateWallet?: boolean; // Test wallet connectivity
}