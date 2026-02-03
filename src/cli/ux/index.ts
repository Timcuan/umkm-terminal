/**
 * CLI User Experience Optimization - Main Entry Point
 * 
 * This module exports all the core types, interfaces, and utilities for the CLI UX optimization system.
 * It provides a clean API for consumers of the CLI UX optimization functionality.
 */

// ============================================================================
// Core Types and Enums
// ============================================================================

export {
  // Core Enums
  UXMode,
  Platform,
  ErrorCategory,
  FeeStrategy,
  DeployMode,
  ValidationLevel,
  IntegrationMode
} from './types.js';

export {
  // Interface Enums
  PromptType,
  DeploymentStatus,
  LogLevel,
  CLIEvent
} from './interfaces.js';

// ============================================================================
// Core Types
// ============================================================================

export type {
  Result,
  WithDefault,
  DeepPartial,
  ProgressCallback,
  ConfigurationChangeCallback,
  ErrorHandlerCallback,
  ValidationCallback
} from './types.js';

// ============================================================================
// Core Interfaces
// ============================================================================

export type {
  // Configuration Interfaces
  ConfirmationLevel,
  PlatformSettings,
  TerminalCapabilities,
  UsagePattern,
  DefaultValues,
  FeeConfiguration,
  FeeCalculation,
  FeePreview,
  DistributionStrategy,
  SpoofingConfiguration,
  
  // Error Handling Interfaces
  Suggestion,
  RecoveryOption,
  ErrorContext,
  CLIError,
  ErrorResponse,
  
  // Deployment Interfaces
  QuickDeployOptions,
  AdvancedDeployOptions,
  DeployConfiguration,
  EssentialDeploymentInfo,
  ClankerVerificationResult,
  EssentialInfo,
  DeployResult,
  ValidationResult,
  
  // Data Storage Interfaces
  UserPreferences,
  UsageHistoryEntry,
  GlobalSettings,
  UserProfile,
  ConfigurationProfile,
  ConfigurationStorage,
  DeploymentTemplate,
  CacheEntry,
  DeploymentContext,
  DeploymentHistory,
  TimeConstraints,
  
  // Configuration Management
  ConfigurationChanges
} from './types.js';

// ============================================================================
// Component Interfaces
// ============================================================================

export type {
  // Core System Interfaces
  CLIEntryPoint,
  
  // Error Handling
  EnhancedErrorHandler,
  
  // Fee Management
  UnifiedFeeManager,
  
  // Spoofing Configuration
  SpoofingConfigurationEngine,
  
  // Deployment Management
  DeployManager,
  Deployment,
  
  // Clanker World Integration
  ClankerWorldIntegration,
  VerificationResult,
  VerificationError,
  RetryResult,
  
  // Configuration Management
  ConfigurationManager,
  ConfigurationConflict,
  
  // Interactive Menus
  InteractiveMenuSystem,
  MenuOptions,
  MenuItem,
  MenuResult,
  Menu,
  KeyboardShortcut,
  MenuTheme,
  MenuHistoryEntry,
  
  // Services
  CacheService,
  CacheStats,
  LoggerService,
  FileSystemService,
  FileStats,
  
  // Factories
  ComponentFactory,
  ServiceFactory,
  
  // Events
  EventEmitter,
  EventData
} from './interfaces.js';

// ============================================================================
// Component Exports
// ============================================================================

// UX Mode Manager
export { UXModeManager } from './components/ux-mode-manager/index.js';

// Performance Optimizer
export { PerformanceOptimizer } from './components/performance-optimizer/index.js';

// Cross-Platform Handler
export { CrossPlatformHandler } from './components/cross-platform-handler/index.js';

// Smart Defaults Engine
export { 
  SmartDefaultsEngine,
  FallbackDefaultsProvider,
  PreferencePersistenceManager
} from './components/smart-defaults-engine/index.js';

export type {
  LearningPattern,
  ContextualDefault,
  UsageAnalytics,
  RecommendationScore,
  UserChoice,
  ContextAnalysis,
  DefaultGenerationStrategy,
  LearningConfig,
  PatternMatch,
  SuggestionFeedback
} from './components/smart-defaults-engine/index.js';

// Enhanced Error Handler
export { EnhancedErrorHandler } from './components/enhanced-error-handler/index.js';

export type {
  ErrorHandlerConfig,
  ErrorAnalysisResult,
  SuggestionRanking,
  RecoveryStrategy,
  ProgressState,
  ProgressStep,
  ProgressCheckpoint,
  RetryConfig,
  RetryAttempt,
  RecoveryExecutionResult
} from './components/enhanced-error-handler/index.js';

// Unified Fee Manager
export { 
  UnifiedFeeManager,
  FeeConfigurationMenu 
} from './components/unified-fee-manager/index.js';

export type {
  UnifiedFeeManagerConfig,
  FeeStrategyConfig,
  FeeCalculationInput,
  DetailedFeeCalculation,
  FormattedFeePreview,
  FeeValidationResult,
  FeeConfigurationChange,
  FeeManagerState,
  DynamicFeeParameters,
  FlatFeeParameters,
  CustomFeeParameters,
  StrategyParameters,
  FeeConfigurationMenuOptions,
  FeeMenuItem,
  FeeConfigurationMenuResult,
  FeeChangeCallback,
  FeeValidationCallback,
  FeePreviewCallback,
  FeeAmount,
  FeeComparison,
  FeeHistoryEntry,
  FeeManagerError,
  FeeErrorCode
} from './components/unified-fee-manager/index.js';

// ============================================================================
// Version Information
// ============================================================================

export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();

// ============================================================================
// Default Configurations
// ============================================================================

import { 
  UXMode, 
  FeeStrategy, 
  IntegrationMode, 
  Platform, 
  DeployMode,
  ErrorCategory
} from './types.js';
import type { 
  ConfirmationLevel, 
  FeeConfiguration, 
  SpoofingConfiguration, 
  GlobalSettings,
  UserPreferences,
  ConfigurationStorage,
  ValidationResult,
  Suggestion,
  CLIError,
  ErrorContext,
  Result,
  MenuTheme
} from './types.js';

/**
 * Default UX mode configuration
 */
export const DEFAULT_UX_MODE = UXMode.NORMAL;

/**
 * Default confirmation levels for each UX mode
 */
export const DEFAULT_CONFIRMATION_LEVELS: Record<UXMode, ConfirmationLevel> = {
  [UXMode.NORMAL]: {
    requiresConfirmation: true,
    showDetailedPrompts: true,
    enableSmartDefaults: false,
    minimizeOutput: false
  },
  [UXMode.FAST]: {
    requiresConfirmation: false,
    showDetailedPrompts: false,
    enableSmartDefaults: true,
    minimizeOutput: false
  },
  [UXMode.ULTRA]: {
    requiresConfirmation: false,
    showDetailedPrompts: false,
    enableSmartDefaults: true,
    minimizeOutput: true
  },
  [UXMode.EXPERT]: {
    requiresConfirmation: false,
    showDetailedPrompts: false,
    enableSmartDefaults: true,
    minimizeOutput: true
  }
};

/**
 * Default fee configuration
 */
export const DEFAULT_FEE_CONFIGURATION: FeeConfiguration = {
  percentage: 3.0,
  strategy: FeeStrategy.DYNAMIC,
  appliesTo: ['TOKEN', 'WETH'],
  lastModified: new Date()
};

/**
 * Default spoofing configuration
 */
export const DEFAULT_SPOOFING_CONFIGURATION: SpoofingConfiguration = {
  adminAllocation: 0.1,
  recipientAllocation: 99.9,
  strategy: {
    id: 'default',
    name: 'Default Strategy',
    adminPercentage: 0.1,
    recipientPercentage: 99.9,
    description: 'Default distribution strategy with minimal admin allocation'
  },
  realTimeUpdates: true,
  integrationMode: IntegrationMode.STANDARD
};

/**
 * Default global settings
 */
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  version: VERSION,
  defaultUXMode: DEFAULT_UX_MODE,
  performanceOptimizations: true,
  crossPlatformMode: true,
  errorReportingEnabled: true
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a value is a valid UX mode
 */
export function isValidUXMode(value: any): value is UXMode {
  return Object.values(UXMode).includes(value);
}

/**
 * Check if a value is a valid platform
 */
export function isValidPlatform(value: any): value is Platform {
  return Object.values(Platform).includes(value);
}

/**
 * Check if a value is a valid fee strategy
 */
export function isValidFeeStrategy(value: any): value is FeeStrategy {
  return Object.values(FeeStrategy).includes(value);
}

/**
 * Check if a value is a valid deploy mode
 */
export function isValidDeployMode(value: any): value is DeployMode {
  return Object.values(DeployMode).includes(value);
}

/**
 * Check if a fee percentage is valid
 */
export function isValidFeePercentage(percentage: number): boolean {
  return typeof percentage === 'number' && percentage >= 0.1 && percentage <= 99.9;
}

/**
 * Check if allocation percentages sum to 100%
 */
export function isValidAllocationSum(allocations: number[]): boolean {
  const sum = allocations.reduce((total, allocation) => total + allocation, 0);
  return Math.abs(sum - 100) < 0.01; // Allow for floating point precision
}

/**
 * Create a default user preferences object
 */
export function createDefaultUserPreferences(userId: string): UserPreferences {
  return {
    userId,
    uxMode: DEFAULT_UX_MODE,
    defaultFeeStrategy: FeeStrategy.DYNAMIC,
    preferredDeployMode: DeployMode.QUICK,
    smartDefaultsEnabled: true,
    platformOptimizations: {
      pathSeparator: '/',
      commandPrefix: '',
      environmentVariables: {},
      terminalCapabilities: {
        supportsColor: true,
        supportsUnicode: true,
        supportsInteractivity: true,
        maxWidth: 80,
        maxHeight: 24
      }
    },
    usageHistory: [],
    lastUpdated: new Date()
  };
}

/**
 * Create a default configuration storage object
 */
export function createDefaultConfigurationStorage(): ConfigurationStorage {
  return {
    globalSettings: DEFAULT_GLOBAL_SETTINGS,
    userProfiles: [],
    feeConfigurations: [DEFAULT_FEE_CONFIGURATION],
    spoofingConfigurations: [DEFAULT_SPOOFING_CONFIGURATION],
    deploymentTemplates: [],
    cacheData: []
  };
}

/**
 * Merge user preferences with defaults
 */
export function mergeUserPreferences(
  userPreferences: Partial<UserPreferences>,
  defaults: UserPreferences
): UserPreferences {
  return {
    ...defaults,
    ...userPreferences,
    platformOptimizations: {
      ...defaults.platformOptimizations,
      ...userPreferences.platformOptimizations
    },
    usageHistory: userPreferences.usageHistory || defaults.usageHistory,
    lastUpdated: new Date()
  };
}

/**
 * Validate a configuration object
 */
export function validateConfiguration(config: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: Suggestion[] = [];

  // Validate required fields
  if (!config.tokenName || typeof config.tokenName !== 'string') {
    errors.push('Token name is required and must be a string');
  }

  if (!config.symbol || typeof config.symbol !== 'string') {
    errors.push('Token symbol is required and must be a string');
  }

  // Validate fee configuration
  if (config.feeConfiguration) {
    if (!isValidFeePercentage(config.feeConfiguration.percentage)) {
      errors.push('Fee percentage must be between 0.1 and 99.9');
    }

    if (!isValidFeeStrategy(config.feeConfiguration.strategy)) {
      errors.push('Invalid fee strategy');
    }
  }

  // Validate spoofing configuration
  if (config.spoofingConfiguration) {
    const { adminAllocation, recipientAllocation } = config.spoofingConfiguration;
    if (!isValidAllocationSum([adminAllocation, recipientAllocation])) {
      errors.push('Admin and recipient allocations must sum to 100%');
    }
  }

  // Add suggestions based on configuration
  if (config.feeConfiguration?.strategy === FeeStrategy.CUSTOM && 
      config.feeConfiguration.percentage > 50) {
    warnings.push('High custom fee percentage may impact token adoption');
    suggestions.push({
      description: 'Consider using a lower fee percentage',
      action: 'Reduce fee percentage to below 10%',
      likelihood: 0.8,
      automated: false
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Create a CLI error with context
 */
export function createCLIError(
  message: string,
  category: ErrorCategory,
  context: Partial<ErrorContext> = {}
): CLIError {
  const fullContext: ErrorContext = {
    operation: 'unknown',
    timestamp: new Date(),
    platform: Platform.LINUX,
    uxMode: UXMode.NORMAL,
    ...context
  };

  return {
    name: 'CLIError',
    message,
    category,
    context: fullContext,
    recoverable: true,
    suggestions: []
  };
}

/**
 * Create a success result
 */
export function createSuccessResult<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function createErrorResult<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of iterations for property-based tests
 */
export const MAX_PROPERTY_TEST_ITERATIONS = 1000;

/**
 * Minimum number of iterations for property-based tests
 */
export const MIN_PROPERTY_TEST_ITERATIONS = 100;

/**
 * Default timeout for CLI operations (in milliseconds)
 */
export const DEFAULT_CLI_TIMEOUT = 30000;

/**
 * Quick deploy maximum duration (in milliseconds)
 */
export const QUICK_DEPLOY_MAX_DURATION = 30000;

/**
 * Cache TTL for verification results (in milliseconds)
 */
export const VERIFICATION_CACHE_TTL = 300000; // 5 minutes

/**
 * Maximum number of retry attempts for failed operations
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Supported file formats for configuration export/import
 */
export const SUPPORTED_CONFIG_FORMATS = ['json', 'yaml'] as const;

/**
 * Default menu theme
 */
export const DEFAULT_MENU_THEME: MenuTheme = {
  primaryColor: '#00D9FF',
  secondaryColor: '#0099CC',
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  highlightColor: '#FFFF00',
  borderStyle: 'solid'
};