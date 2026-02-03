/**
 * Core interface definitions for the Simplified Batch Deployment System
 * 
 * This module defines the interfaces for all major components in the system,
 * following the layered architecture with clear separation of concerns.
 */

import type { Address } from 'viem';
import type {
  TokenConfig,
  DeploymentSession,
  DeploymentOptions,
  DeploymentResult,
  TokenDeploymentResult,
  DeploymentProgress,
  ValidationResult,
  DuplicateCheckResult,
  BalanceInfo,
  CostEstimate,
  FundsValidation,
  DeploymentError,
  GasEstimate,
  DeploymentHistory,
  ErrorCategory,
  RecoveryAction,
  SessionStatus
} from '../types/core.js';

// ============================================================================
// Deployment Controller Interface
// ============================================================================

/**
 * Central orchestrator that coordinates all deployment activities
 * Requirements: All requirements (foundational component)
 */
export interface IDeploymentController {
  // Configuration management
  setTokenConfigs(configs: TokenConfig[]): ValidationResult;
  getTokenConfigs(): TokenConfig[];
  clearTokenConfigs(): void;
  
  // Deployment lifecycle
  validateDeployment(): Promise<ValidationResult>;
  startDeployment(options?: Partial<DeploymentOptions>): Promise<DeploymentSession>;
  pauseDeployment(): Promise<void>;
  resumeDeployment(): Promise<void>;
  cancelDeployment(): Promise<void>;
  
  // Session management
  getCurrentSession(): DeploymentSession | null;
  getSessionStatus(): SessionStatus;
  
  // Event handling
  onProgress(callback: (progress: DeploymentProgress) => void): void;
  onError(callback: (error: DeploymentError) => void): void;
  onComplete(callback: (result: DeploymentResult) => void): void;
  onStatusChange(callback: (status: SessionStatus) => void): void;
  
  // Cleanup
  removeAllListeners(): void;
}

// ============================================================================
// Configuration Validator Interface
// ============================================================================

/**
 * Validates token configurations and deployment settings in real-time
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5 - Real-time validation
 */
export interface IConfigurationValidator {
  // Individual token validation
  validateTokenConfig(config: TokenConfig): ValidationResult;
  validateTokenName(name: string): ValidationResult;
  validateTokenSymbol(symbol: string): ValidationResult;
  validateInitialSupply(supply: string): ValidationResult;
  
  // Batch validation
  validateBatchConfig(configs: TokenConfig[]): ValidationResult;
  checkDuplicates(configs: TokenConfig[]): DuplicateCheckResult;
  
  // Advanced validation
  validateSupplyRange(supply: string): ValidationResult;
  validateAdvancedConfig(advanced: TokenConfig['advanced']): ValidationResult;
  
  // Real-time validation
  validateField(field: string, value: unknown, context?: TokenConfig): ValidationResult;
}

// ============================================================================
// Balance Checker Interface
// ============================================================================

/**
 * Proactively validates wallet balance and estimates deployment costs
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5 - Proactive balance validation
 */
export interface IBalanceChecker {
  // Balance operations
  checkBalance(walletAddress: Address): Promise<BalanceInfo>;
  refreshBalance(walletAddress: Address): Promise<BalanceInfo>;
  
  // Cost estimation
  estimateDeploymentCost(configs: TokenConfig[], options?: DeploymentOptions): Promise<CostEstimate>;
  estimateTokenCost(config: TokenConfig): Promise<string>;
  
  // Validation
  validateSufficientFunds(
    walletAddress: Address, 
    configs: TokenConfig[], 
    options?: DeploymentOptions
  ): Promise<FundsValidation>;
  
  // Monitoring
  startBalanceMonitoring(walletAddress: Address, callback: (balance: BalanceInfo) => void): void;
  stopBalanceMonitoring(): void;
}

// ============================================================================
// Simple Deployer Interface
// ============================================================================

/**
 * Handles the actual token deployment process with automatic nonce and gas management
 * Requirements: 2.2, 2.4, 7.1, 7.2, 7.3 - Single wallet deployment with gas management
 */
export interface ISimpleDeployer {
  // Main deployment methods
  deploy(configs: TokenConfig[], options: DeploymentOptions): Promise<DeploymentResult>;
  deployToken(config: TokenConfig, nonce: number, options: DeploymentOptions): Promise<TokenDeploymentResult>;
  
  // Gas estimation
  estimateGas(config: TokenConfig): Promise<GasEstimate>;
  getCurrentGasPrice(): Promise<string>;
  
  // Nonce management
  getCurrentNonce(walletAddress: Address): Promise<number>;
  reserveNonce(walletAddress: Address): Promise<number>;
  
  // Deployment state
  isDeploying(): boolean;
  getCurrentDeployment(): TokenConfig | null;
}

// ============================================================================
// Progress Tracker Interface
// ============================================================================

/**
 * Provides real-time feedback on deployment progress
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 - Real-time progress tracking
 */
export interface IProgressTracker {
  // Progress management
  startTracking(totalTokens: number): void;
  updateProgress(completed: number, current: string): void;
  recordSuccess(result: TokenDeploymentResult): void;
  recordFailure(error: DeploymentError): void;
  completeTracking(): void;
  
  // Progress information
  getProgress(): DeploymentProgress;
  estimateTimeRemaining(): number;
  getAverageDeploymentTime(): number;
  
  // Event handling
  onProgressUpdate(callback: (progress: DeploymentProgress) => void): void;
  onPhaseChange(callback: (phase: DeploymentProgress['currentPhase']) => void): void;
}

// ============================================================================
// Error Handler Interface
// ============================================================================

/**
 * Manages error scenarios with clear, actionable messages
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5 - Streamlined error handling
 */
export interface IErrorHandler {
  // Error processing
  handleError(error: Error, context?: Record<string, unknown>): DeploymentError;
  categorizeError(error: Error): ErrorCategory;
  getRecoveryAction(error: DeploymentError): RecoveryAction;
  
  // Retry logic
  shouldRetry(error: DeploymentError): boolean;
  getRetryDelay(attempt: number): number;
  executeWithRetry<T>(
    operation: () => Promise<T>, 
    maxAttempts: number,
    context?: Record<string, unknown>
  ): Promise<T>;
  
  // Error reporting
  reportError(error: DeploymentError): void;
  getErrorHistory(): DeploymentError[];
  clearErrorHistory(): void;
}

// ============================================================================
// Session Manager Interface
// ============================================================================

/**
 * Manages deployment session state and persistence
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5 - Session management
 */
export interface ISessionManager {
  // Session lifecycle
  createSession(configs: TokenConfig[], options: DeploymentOptions): DeploymentSession;
  saveSession(session: DeploymentSession): Promise<void>;
  loadSession(sessionId: string): Promise<DeploymentSession>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Session control
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  cancelSession(sessionId: string): Promise<void>;
  
  // Session queries
  getActiveSession(): DeploymentSession | null;
  getSessionHistory(): Promise<DeploymentSession[]>;
  getSessionById(sessionId: string): Promise<DeploymentSession | null>;
  
  // Session state
  updateSessionProgress(sessionId: string, progress: DeploymentProgress): Promise<void>;
  addSessionResult(sessionId: string, result: TokenDeploymentResult): Promise<void>;
  completeSession(sessionId: string, finalResult: DeploymentResult): Promise<void>;
}

// ============================================================================
// Gas Estimator Interface
// ============================================================================

/**
 * Handles gas estimation and management
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5 - Intelligent gas management
 */
export interface IGasEstimator {
  // Gas estimation
  estimateGasPrice(): Promise<string>;
  estimateGasLimit(config: TokenConfig): Promise<string>;
  estimateDeploymentGas(config: TokenConfig): Promise<GasEstimate>;
  
  // Dynamic adjustment
  adjustGasPrice(currentPrice: string, networkConditions: 'low' | 'medium' | 'high'): string;
  applyGasBuffer(gasLimit: string, bufferPercentage?: number): string;
  
  // Fallback handling
  getFallbackGasPrice(): string;
  getFallbackGasLimit(): string;
  
  // Network monitoring
  getNetworkConditions(): Promise<'low' | 'medium' | 'high'>;
  monitorGasPrices(callback: (price: string) => void): void;
  stopMonitoring(): void;
}

// ============================================================================
// Storage Interface
// ============================================================================

/**
 * Handles persistent storage of sessions and history
 * Requirements: 8.4, 10.1, 10.2, 10.4 - State persistence and history
 */
export interface IStorage {
  // Session storage
  saveSession(session: DeploymentSession): Promise<void>;
  loadSession(sessionId: string): Promise<DeploymentSession | null>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(): Promise<string[]>;
  
  // History storage
  saveHistory(history: DeploymentHistory): Promise<void>;
  loadHistory(): Promise<DeploymentHistory>;
  addSessionToHistory(session: DeploymentSession): Promise<void>;
  
  // Configuration storage
  saveConfig(key: string, value: unknown): Promise<void>;
  loadConfig(key: string): Promise<unknown>;
  deleteConfig(key: string): Promise<void>;
  
  // Storage management
  clear(): Promise<void>;
  getStorageSize(): Promise<number>;
  cleanup(olderThanDays: number): Promise<void>;
}

// ============================================================================
// Event System Interface
// ============================================================================

/**
 * Event system for component communication
 */
export interface IEventEmitter {
  // Event registration
  on(event: string, listener: (...args: unknown[]) => void): void;
  once(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  
  // Event emission
  emit(event: string, ...args: unknown[]): void;
  
  // Event management
  removeAllListeners(event?: string): void;
  listenerCount(event: string): number;
  eventNames(): string[];
}

// ============================================================================
// Blockchain Client Interface
// ============================================================================

/**
 * Blockchain interaction interface
 */
export interface IBlockchainClient {
  // Account operations
  getBalance(address: Address): Promise<string>;
  getNonce(address: Address): Promise<number>;
  
  // Transaction operations
  sendTransaction(transaction: {
    to?: Address;
    data?: `0x${string}`;
    value?: string;
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    nonce?: number;
  }): Promise<`0x${string}`>;
  
  waitForTransaction(hash: `0x${string}`): Promise<{
    status: 'success' | 'reverted';
    blockNumber: number;
    gasUsed: string;
    contractAddress?: Address;
  }>;
  
  // Gas operations
  estimateGas(transaction: {
    to?: Address;
    data?: `0x${string}`;
    value?: string;
    from?: Address;
  }): Promise<string>;
  
  getGasPrice(): Promise<string>;
  getFeeData(): Promise<{
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }>;
  
  // Network information
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<number>;
  isConnected(): boolean;
}

// ============================================================================
// Factory Interface for Dependency Injection
// ============================================================================

/**
 * Factory interface for creating component instances
 */
export interface IComponentFactory {
  createDeploymentController(): IDeploymentController;
  createConfigurationValidator(): IConfigurationValidator;
  createBalanceChecker(): IBalanceChecker;
  createSimpleDeployer(): ISimpleDeployer;
  createProgressTracker(): IProgressTracker;
  createErrorHandler(): IErrorHandler;
  createSessionManager(): ISessionManager;
  createGasEstimator(): IGasEstimator;
  createStorage(): IStorage;
  createEventEmitter(): IEventEmitter;
  createBlockchainClient(): IBlockchainClient;
}