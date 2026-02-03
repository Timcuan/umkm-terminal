/**
 * CLI User Experience Optimization - Core Types and Interfaces
 * 
 * This module defines the core types, interfaces, and enums for the CLI UX optimization system.
 * It provides the foundation for UX modes, platform handling, error management, and configuration.
 */

// ============================================================================
// Core Enums
// ============================================================================

/**
 * User Experience modes that determine interaction patterns
 */
export enum UXMode {
  NORMAL = 'normal',   // Standard prompts and confirmations
  FAST = 'fast',       // Reduced confirmations, skip optional prompts
  ULTRA = 'ultra',     // Minimal prompts, auto-confirm transactions
  EXPERT = 'expert'    // Direct access, minimal interface overhead
}

/**
 * Supported platforms for cross-platform compatibility
 */
export enum Platform {
  WINDOWS = 'windows',
  MAC = 'mac',
  LINUX = 'linux',
  WSL = 'wsl',
  TERMUX = 'termux'
}

/**
 * Error categories for consistent error handling
 */
export enum ErrorCategory {
  CONFIGURATION = 'configuration',
  NETWORK = 'network',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

/**
 * Fee strategies for unified fee management
 */
export enum FeeStrategy {
  DYNAMIC = 'dynamic', // 1-5% based on market volatility
  FLAT = 'flat',       // 3% fixed
  CUSTOM = 'custom'    // 1-99% manual
}

/**
 * Deploy modes for different deployment workflows
 */
export enum DeployMode {
  QUICK = 'quick',     // 30-second streamlined deployment
  ADVANCED = 'advanced' // Full customization deployment
}

/**
 * Validation levels for deployment validation
 */
export enum ValidationLevel {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  STRICT = 'strict'
}

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Confirmation level configuration for different UX modes
 */
export interface ConfirmationLevel {
  requiresConfirmation: boolean;
  showDetailedPrompts: boolean;
  enableSmartDefaults: boolean;
  minimizeOutput: boolean;
}

/**
 * Platform-specific settings and capabilities
 */
export interface PlatformSettings {
  pathSeparator: string;
  commandPrefix: string;
  environmentVariables: Record<string, string>;
  terminalCapabilities: TerminalCapabilities;
}

/**
 * Terminal capabilities for platform optimization
 */
export interface TerminalCapabilities {
  supportsColor: boolean;
  supportsUnicode: boolean;
  supportsInteractivity: boolean;
  maxWidth: number;
  maxHeight: number;
}

/**
 * Usage pattern for smart defaults learning
 */
export interface UsagePattern {
  context: string;
  frequency: number;
  lastUsed: Date;
  value: any;
  confidence: number;
}

/**
 * Default values provided by smart defaults system
 */
export interface DefaultValues {
  feePercentage: number;
  deploymentMode: string;
  validationLevel: ValidationLevel;
  platformOptimizations: PlatformSettings;
}

/**
 * Error suggestion for enhanced error handling
 */
export interface Suggestion {
  description: string;
  action: string;
  likelihood: number;
  automated: boolean;
}

/**
 * Recovery option for error handling
 */
export interface RecoveryOption {
  id: string;
  description: string;
  action: () => Promise<void>;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Error context for debugging information
 */
export interface ErrorContext {
  operation: string;
  timestamp: Date;
  platform: Platform;
  uxMode: UXMode;
  userInput?: any;
  systemState?: any;
}

/**
 * CLI Error with enhanced context and suggestions
 */
export interface CLIError extends Error {
  category: ErrorCategory;
  context: ErrorContext;
  recoverable: boolean;
  suggestions: Suggestion[];
  recoveryOptions?: RecoveryOption[];
}

/**
 * Error response from enhanced error handler
 */
export interface ErrorResponse {
  handled: boolean;
  userMessage: string;
  suggestions: Suggestion[];
  recoveryOptions: RecoveryOption[];
  shouldRetry: boolean;
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Fee configuration for unified fee management
 */
export interface FeeConfiguration {
  percentage: number;
  strategy: FeeStrategy;
  appliesTo: ['TOKEN', 'WETH'];
  lastModified: Date;
}

/**
 * Fee calculation result
 */
export interface FeeCalculation {
  originalAmount: number;
  feeAmount: number;
  finalAmount: number;
  strategy: FeeStrategy;
  percentage: number;
}

/**
 * Fee preview for user display
 */
export interface FeePreview {
  strategy: string;
  tokenFee: number;
  pairedFee: number;
  tokenAmount: number;
  pairedAmount: number;
  totalFees: number;
}

/**
 * Distribution strategy for spoofing configuration
 */
export interface DistributionStrategy {
  id: string;
  name: string;
  adminPercentage: number;
  recipientPercentage: number;
  description: string;
}

/**
 * Spoofing configuration
 */
export interface SpoofingConfiguration {
  adminAllocation: number;    // 0.1%
  recipientAllocation: number; // 99.9%
  strategy: DistributionStrategy;
  realTimeUpdates: boolean;
  integrationMode: IntegrationMode;
}

/**
 * Integration mode for spoofing
 */
export enum IntegrationMode {
  STANDARD = 'standard',
  OPTIMIZED = 'optimized',
  CUSTOM = 'custom'
}

// ============================================================================
// Deployment Interfaces
// ============================================================================

/**
 * Quick deploy options for 30-second deployment
 */
export interface QuickDeployOptions {
  tokenName: string;
  symbol?: string; // Auto-generated if not provided
  useSmartDefaults: boolean;
  maxDuration: number; // 30 seconds
}

/**
 * Advanced deploy options for full customization
 */
export interface AdvancedDeployOptions {
  tokenName: string;
  symbol: string;
  customConfiguration: DeployConfiguration;
  validationLevel: ValidationLevel;
}

/**
 * Deploy configuration
 */
export interface DeployConfiguration {
  tokenName: string;
  symbol: string;
  feeConfiguration: FeeConfiguration;
  spoofingConfiguration: SpoofingConfiguration;
  validationLevel: ValidationLevel;
  clankerIntegration: boolean;
}

/**
 * Essential deployment information
 */
export interface EssentialDeploymentInfo {
  tokenAddress: string;
  transactionHash: string;
  networkName: string;
  gasUsed: string;
  totalCost: string;
}

/**
 * Clanker verification result
 */
export interface ClankerVerificationResult {
  verified: boolean;
  verificationId: string;
  timestamp: Date;
  essentialInfo: EssentialInfo;
  cached: boolean;
}

/**
 * Essential verification info
 */
export interface EssentialInfo {
  status: string;
  deploymentHash: string;
  networkConfirmation: boolean;
  estimatedTime: number;
}

/**
 * Deploy result
 */
export interface DeployResult {
  success: boolean;
  deploymentId: string;
  essentialInfo: EssentialDeploymentInfo;
  duration: number;
  clankerVerification?: ClankerVerificationResult;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: Suggestion[];
}

// ============================================================================
// Data Storage Interfaces
// ============================================================================

/**
 * User preferences for smart defaults and personalization
 */
export interface UserPreferences {
  userId: string;
  uxMode: UXMode;
  defaultFeeStrategy: FeeStrategy;
  preferredDeployMode: DeployMode;
  smartDefaultsEnabled: boolean;
  platformOptimizations: PlatformSettings;
  usageHistory: UsageHistoryEntry[];
  lastUpdated: Date;
}

/**
 * Usage history entry for smart defaults learning
 */
export interface UsageHistoryEntry {
  action: string;
  context: string;
  value: any;
  timestamp: Date;
  frequency: number;
}

/**
 * Global settings for the CLI system
 */
export interface GlobalSettings {
  version: string;
  defaultUXMode: UXMode;
  performanceOptimizations: boolean;
  crossPlatformMode: boolean;
  errorReportingEnabled: boolean;
}

/**
 * User profile for multi-user support
 */
export interface UserProfile {
  id: string;
  name: string;
  preferences: UserPreferences;
  configurations: ConfigurationProfile[];
  createdAt: Date;
  lastActive: Date;
}

/**
 * Configuration profile for different use cases
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

/**
 * Configuration storage model
 */
export interface ConfigurationStorage {
  globalSettings: GlobalSettings;
  userProfiles: UserProfile[];
  feeConfigurations: FeeConfiguration[];
  spoofingConfigurations: SpoofingConfiguration[];
  deploymentTemplates: DeploymentTemplate[];
  cacheData: CacheEntry[];
}

/**
 * Deployment template for reusable configurations
 */
export interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  configuration: DeployConfiguration;
  createdAt: Date;
  usageCount: number;
}

/**
 * Cache entry for performance optimization
 */
export interface CacheEntry {
  key: string;
  value: any;
  timestamp: Date;
  expiresAt: Date;
  accessCount: number;
}

/**
 * Deployment context for contextual operations
 */
export interface DeploymentContext {
  mode: DeployMode;
  platform: Platform;
  userExperience: UXMode;
  previousDeployments: DeploymentHistory[];
  currentConfiguration: DeployConfiguration;
  timeConstraints: TimeConstraints;
}

/**
 * Deployment history entry
 */
export interface DeploymentHistory {
  id: string;
  timestamp: Date;
  configuration: DeployConfiguration;
  result: DeployResult;
  duration: number;
  platform: Platform;
}

/**
 * Time constraints for deployment operations
 */
export interface TimeConstraints {
  maxDuration?: number;
  startTime: Date;
  deadline?: Date;
  timeoutWarning?: number;
}

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

// ============================================================================
// Event and Callback Types
// ============================================================================

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Configuration change callback
 */
export type ConfigurationChangeCallback = (
  key: string,
  oldValue: any,
  newValue: any
) => void;

/**
 * Error handler callback
 */
export type ErrorHandlerCallback = (error: CLIError) => Promise<ErrorResponse>;

/**
 * Validation callback
 */
export type ValidationCallback = (value: any, context: string) => ValidationResult;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Optional with default value
 */
export type WithDefault<T, D> = T extends undefined ? D : T;

/**
 * Partial recursive for deep partial types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Configuration changes type
 */
export type ConfigurationChanges = DeepPartial<{
  feeConfiguration: FeeConfiguration;
  spoofingConfiguration: SpoofingConfiguration;
  userPreferences: UserPreferences;
  globalSettings: GlobalSettings;
}>;