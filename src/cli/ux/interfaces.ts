/**
 * CLI User Experience Optimization - Core Component Interfaces
 * 
 * This module defines the interfaces for all major components in the CLI UX optimization system.
 * These interfaces provide contracts for dependency injection and testing.
 */

import {
  UXMode,
  Platform,
  ErrorCategory,
  FeeStrategy,
  DeployMode,
  ValidationLevel,
  ConfirmationLevel,
  PlatformSettings,
  UsagePattern,
  DefaultValues,
  CLIError,
  ErrorResponse,
  Suggestion,
  RecoveryOption,
  FeeConfiguration,
  FeeCalculation,
  FeePreview,
  SpoofingConfiguration,
  DistributionStrategy,
  QuickDeployOptions,
  AdvancedDeployOptions,
  DeployResult,
  ValidationResult,
  UserPreferences,
  ConfigurationStorage,
  DeploymentContext,
  ClankerVerificationResult,
  EssentialInfo,
  VerificationError,
  RetryResult,
  ConfigurationChanges,
  ProgressCallback,
  Result
} from './types.js';

// ============================================================================
// Core System Interfaces
// ============================================================================

/**
 * Main CLI entry point interface
 */
export interface CLIEntryPoint {
  initialize(): Promise<void>;
  setupPerformanceOptimizations(): void;
  routeCommand(command: string, args: string[]): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Performance optimizer interface
 */
export interface PerformanceOptimizer {
  enableConditionalImports(): void;
  setupLazyLoading(): void;
  optimizeMemoryUsage(): void;
  cacheFrequentlyUsedData(): void;
  getPerformanceMetrics(): PerformanceMetrics;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  startupTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  averageResponseTime: number;
}

// ============================================================================
// UX Mode Management
// ============================================================================

/**
 * UX Mode Manager interface
 */
export interface UXModeManager {
  getCurrentMode(): UXMode;
  setMode(mode: UXMode): Promise<void>;
  getConfirmationLevel(): ConfirmationLevel;
  shouldShowPrompt(promptType: PromptType): boolean;
  applyModeSettings(mode: UXMode): void;
  persistMode(mode: UXMode): Promise<void>;
  loadPersistedMode(): Promise<UXMode>;
}

/**
 * Prompt types for UX mode decisions
 */
export enum PromptType {
  CONFIRMATION = 'confirmation',
  OPTIONAL = 'optional',
  TRANSACTION = 'transaction',
  SAFETY = 'safety',
  INFORMATION = 'information'
}

/**
 * Deployment status enum
 */
export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * CLI events enum
 */
export enum CLIEvent {
  STARTUP = 'startup',
  SHUTDOWN = 'shutdown',
  MODE_CHANGED = 'mode_changed',
  DEPLOYMENT_STARTED = 'deployment_started',
  DEPLOYMENT_COMPLETED = 'deployment_completed',
  DEPLOYMENT_FAILED = 'deployment_failed',
  CONFIGURATION_CHANGED = 'configuration_changed',
  ERROR_OCCURRED = 'error_occurred'
}

// ============================================================================
// Cross-Platform Handling
// ============================================================================

/**
 * Cross-platform handler interface
 */
export interface CrossPlatformHandler {
  detectPlatform(): Platform;
  applyPlatformOptimizations(platform: Platform): void;
  handlePlatformSpecificBehaviors(): void;
  ensureCommandCompatibility(): void;
  optimizeForEnvironment(environment: Environment): void;
  getPlatformSettings(platform: Platform): PlatformSettings;
}

/**
 * Environment information
 */
export interface Environment {
  platform: Platform;
  nodeVersion: string;
  terminalType: string;
  shellType: string;
  isCI: boolean;
  hasInteractivity: boolean;
}

// ============================================================================
// Smart Defaults System
// ============================================================================

/**
 * Smart defaults engine interface
 */
export interface SmartDefaultsEngine {
  recordUserChoice(context: string, choice: any): Promise<void>;
  getSuggestedDefault(context: string): Promise<any>;
  analyzeUsagePatterns(): Promise<UsagePattern[]>;
  updateRecommendations(patterns: UsagePattern[]): Promise<void>;
  getContextualDefaults(deploymentContext: DeploymentContext): Promise<DefaultValues>;
  clearHistory(context?: string): Promise<void>;
  exportPreferences(): Promise<UserPreferences>;
  importPreferences(preferences: UserPreferences): Promise<void>;
}

// ============================================================================
// Enhanced Error Handling
// ============================================================================

/**
 * Enhanced error handler interface
 */
export interface EnhancedErrorHandler {
  handleError(error: CLIError): Promise<ErrorResponse>;
  categorizeError(error: Error): ErrorCategory;
  generateSuggestions(error: CLIError): Suggestion[];
  offerRecoveryOptions(error: CLIError): RecoveryOption[];
  logErrorWithContext(error: CLIError, context: ErrorContext): void;
  registerErrorHandler(category: ErrorCategory, handler: ErrorHandlerCallback): void;
  createCLIError(message: string, category: ErrorCategory, context: ErrorContext): CLIError;
}

/**
 * Error handler callback type
 */
export type ErrorHandlerCallback = (error: CLIError) => Promise<ErrorResponse>;

/**
 * Error context for debugging
 */
export interface ErrorContext {
  operation: string;
  timestamp: Date;
  platform: Platform;
  uxMode: UXMode;
  userInput?: any;
  systemState?: any;
}

// ============================================================================
// Fee Management
// ============================================================================

/**
 * Unified fee manager interface
 */
export interface UnifiedFeeManager {
  setFeePercentage(percentage: number): Promise<void>;
  getFeeConfiguration(): Promise<FeeConfiguration>;
  calculateFees(amount: number, strategy: FeeStrategy): Promise<FeeCalculation>;
  previewFees(amount: number, strategy: FeeStrategy): FeePreview;
  getAvailableStrategies(): FeeStrategy[];
  validateFeeConfiguration(config: FeeConfiguration): ValidationResult;
  resetToDefaults(): Promise<void>;
  exportConfiguration(): Promise<FeeConfiguration>;
  importConfiguration(config: FeeConfiguration): Promise<void>;
}

// ============================================================================
// Spoofing Configuration
// ============================================================================

/**
 * Spoofing configuration engine interface
 */
export interface SpoofingConfigurationEngine {
  setDistributionStrategy(strategy: DistributionStrategy): Promise<void>;
  getCurrentConfiguration(): Promise<SpoofingConfiguration>;
  applyRealtimeChanges(changes: ConfigurationChanges): Promise<void>;
  getAvailableStrategies(): DistributionStrategy[];
  validateConfiguration(config: SpoofingConfiguration): ValidationResult;
  createCustomStrategy(
    name: string,
    adminPercentage: number,
    recipientPercentage: number
  ): Promise<DistributionStrategy>;
  resetToDefaults(): Promise<void>;
}

// ============================================================================
// Deployment Management
// ============================================================================

/**
 * Deploy manager interface
 */
export interface DeployManager {
  quickDeploy(options: QuickDeployOptions): Promise<DeployResult>;
  advancedDeploy(options: AdvancedDeployOptions): Promise<DeployResult>;
  validateDeployment(deployment: Deployment): Promise<ValidationResult>;
  estimateDeploymentTime(options: QuickDeployOptions | AdvancedDeployOptions): Promise<number>;
  cancelDeployment(deploymentId: string): Promise<void>;
  getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus>;
}

/**
 * Deployment interface
 */
export interface Deployment {
  id: string;
  configuration: DeployConfiguration;
  status: DeploymentStatus;
  startTime: Date;
  estimatedCompletion?: Date;
  progress: number;
}

/**
 * Deployment status enum
 */
export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Deploy configuration interface
 */
export interface DeployConfiguration {
  tokenName: string;
  symbol: string;
  feeConfiguration: FeeConfiguration;
  spoofingConfiguration: SpoofingConfiguration;
  validationLevel: ValidationLevel;
  clankerIntegration: boolean;
}

// ============================================================================
// Clanker World Integration
// ============================================================================

/**
 * Clanker World integration interface
 */
export interface ClankerWorldIntegration {
  optimizeVerification(deployment: Deployment): Promise<VerificationResult>;
  reduceValidationOverhead(): void;
  cacheVerificationResults(result: VerificationResult): Promise<void>;
  handleVerificationFailure(error: VerificationError): Promise<RetryResult>;
  getEssentialVerificationInfo(result: VerificationResult): EssentialInfo;
  clearCache(): Promise<void>;
  getVerificationHistory(): Promise<VerificationResult[]>;
}

/**
 * Verification result interface
 */
export interface VerificationResult {
  verified: boolean;
  verificationId: string;
  timestamp: Date;
  essentialInfo: EssentialInfo;
  cached: boolean;
}

/**
 * Verification error interface
 */
export interface VerificationError extends Error {
  code: string;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * Retry result interface
 */
export interface RetryResult {
  success: boolean;
  attempts: number;
  finalError?: VerificationError;
  result?: VerificationResult;
}

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Configuration manager interface
 */
export interface ConfigurationManager {
  persistConfiguration(config: ConfigurationStorage): Promise<void>;
  loadConfiguration(): Promise<ConfigurationStorage>;
  validateConfiguration(config: ConfigurationStorage): ValidationResult;
  exportConfiguration(format: 'json' | 'yaml'): Promise<string>;
  importConfiguration(data: string, format: 'json' | 'yaml'): Promise<void>;
  resolveConflicts(conflicts: ConfigurationConflict[]): Promise<void>;
  createProfile(name: string, config: Partial<ConfigurationStorage>): Promise<string>;
  switchProfile(profileId: string): Promise<void>;
  listProfiles(): Promise<ConfigurationProfile[]>;
}

/**
 * Configuration conflict interface
 */
export interface ConfigurationConflict {
  key: string;
  currentValue: any;
  newValue: any;
  source: string;
  resolution?: 'keep_current' | 'use_new' | 'merge';
}

/**
 * Configuration profile interface
 */
export interface ConfigurationProfile {
  id: string;
  name: string;
  description: string;
  configuration: Partial<ConfigurationStorage>;
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
}

// ============================================================================
// Interactive Menu System
// ============================================================================

/**
 * Interactive menu system interface
 */
export interface InteractiveMenuSystem {
  createMenu(options: MenuOptions): Promise<Menu>;
  showMenu(menu: Menu): Promise<MenuResult>;
  addKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void;
  showContextualHelp(context: string): void;
  getMenuHistory(): MenuHistoryEntry[];
  clearMenuHistory(): void;
  setMenuTheme(theme: MenuTheme): void;
}

/**
 * Menu options interface
 */
export interface MenuOptions {
  title: string;
  description?: string;
  items: MenuItem[];
  allowMultiSelect?: boolean;
  showHelp?: boolean;
  theme?: MenuTheme;
}

/**
 * Menu item interface
 */
export interface MenuItem {
  id: string;
  label: string;
  description?: string;
  value: any;
  disabled?: boolean;
  shortcut?: string;
  icon?: string;
}

/**
 * Menu result interface
 */
export interface MenuResult {
  selectedItems: MenuItem[];
  cancelled: boolean;
  timestamp: Date;
}

/**
 * Menu interface
 */
export interface Menu {
  id: string;
  options: MenuOptions;
  render(): void;
  handleInput(input: string): Promise<MenuResult>;
  destroy(): void;
}

/**
 * Keyboard shortcut interface
 */
export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  global?: boolean;
}

/**
 * Menu theme interface
 */
export interface MenuTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted';
}

/**
 * Menu history entry interface
 */
export interface MenuHistoryEntry {
  menuId: string;
  timestamp: Date;
  result: MenuResult;
  duration: number;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Cache service interface
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  getStats(): Promise<CacheStats>;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalSize: number;
  itemCount: number;
}

/**
 * Logger service interface
 */
export interface LoggerService {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error?: Error, context?: any): void;
  setLevel(level: LogLevel): void;
  createChild(namespace: string): LoggerService;
}

/**
 * Log level enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * File system service interface
 */
export interface FileSystemService {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  createDirectory(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listFiles(directory: string): Promise<string[]>;
  getStats(path: string): Promise<FileStats>;
}

/**
 * File statistics interface
 */
export interface FileStats {
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  isFile: boolean;
}

// ============================================================================
// Factory Interfaces
// ============================================================================

/**
 * Component factory interface for dependency injection
 */
export interface ComponentFactory {
  createUXModeManager(): UXModeManager;
  createCrossPlatformHandler(): CrossPlatformHandler;
  createSmartDefaultsEngine(): SmartDefaultsEngine;
  createEnhancedErrorHandler(): EnhancedErrorHandler;
  createUnifiedFeeManager(): UnifiedFeeManager;
  createSpoofingConfigurationEngine(): SpoofingConfigurationEngine;
  createDeployManager(): DeployManager;
  createClankerWorldIntegration(): ClankerWorldIntegration;
  createConfigurationManager(): ConfigurationManager;
  createInteractiveMenuSystem(): InteractiveMenuSystem;
}

/**
 * Service factory interface
 */
export interface ServiceFactory {
  createCacheService(): CacheService;
  createLoggerService(): LoggerService;
  createFileSystemService(): FileSystemService;
}

// ============================================================================
// Event System
// ============================================================================

/**
 * Event emitter interface
 */
export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, listener: (...args: any[]) => void): void;
  removeAllListeners(event?: string): void;
}

/**
 * Event data interface
 */
export interface EventData {
  timestamp: Date;
  source: string;
  data: any;
}