/**
 * Enhanced Error Handler - Types
 * 
 * Type definitions specific to the enhanced error handler component.
 */

import { 
  ErrorCategory, 
  CLIError, 
  ErrorResponse, 
  Suggestion, 
  RecoveryOption,
  Platform,
  UXMode 
} from '../../types';

/**
 * Configuration for the enhanced error handler
 */
export interface ErrorHandlerConfig {
  enableSuggestionRanking: boolean;
  maxSuggestions: number;
  enableRecoveryOptions: boolean;
  logErrors: boolean;
  contextualHelpEnabled: boolean;
  autoRetryEnabled: boolean;
  maxRetryAttempts: number;
}

/**
 * Result of error analysis
 */
export interface ErrorAnalysisResult {
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  contextualFactors: string[];
  suggestedActions: Suggestion[];
  recoveryStrategies: RecoveryStrategy[];
}

/**
 * Suggestion ranking criteria
 */
export interface SuggestionRanking {
  suggestion: Suggestion;
  score: number;
  factors: RankingFactor[];
}

/**
 * Factors used in suggestion ranking
 */
export interface RankingFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

/**
 * Recovery strategy for error handling
 */
export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  steps: RecoveryStep[];
  estimatedTime: number;
  successRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  automated: boolean;
}

/**
 * Individual recovery step
 */
export interface RecoveryStep {
  id: string;
  description: string;
  action: () => Promise<boolean>;
  rollbackAction?: () => Promise<void>;
  required: boolean;
  estimatedTime: number;
}

/**
 * Error pattern for pattern matching
 */
export interface ErrorPattern {
  pattern: RegExp | string;
  category: ErrorCategory;
  commonCauses: string[];
  suggestedSolutions: Suggestion[];
  recoveryStrategies: string[];
}

/**
 * Error statistics for learning
 */
export interface ErrorStatistics {
  category: ErrorCategory;
  frequency: number;
  lastOccurrence: Date;
  commonContext: string[];
  successfulResolutions: string[];
  averageResolutionTime: number;
}

/**
 * Progress state for preserving user progress during errors
 */
export interface ProgressState {
  id: string;
  operation: string;
  timestamp: Date;
  completedSteps: ProgressStep[];
  currentStep: ProgressStep;
  totalSteps: number;
  data: Record<string, any>;
  checkpoints: ProgressCheckpoint[];
}

/**
 * Individual progress step
 */
export interface ProgressStep {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  startTime?: Date;
  endTime?: Date;
  data?: Record<string, any>;
  rollbackAction?: () => Promise<void>;
}

/**
 * Progress checkpoint for rollback capability
 */
export interface ProgressCheckpoint {
  id: string;
  stepId: string;
  timestamp: Date;
  state: Record<string, any>;
  description: string;
}

/**
 * Retry configuration for automatic retry mechanisms
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableCategories: ErrorCategory[];
  retryablePatterns: (string | RegExp)[];
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  error: CLIError;
  delay: number;
  success: boolean;
  duration?: number;
}

/**
 * Recovery execution result
 */
export interface RecoveryExecutionResult {
  success: boolean;
  recoveryId: string;
  executedSteps: RecoveryStep[];
  failedStep?: RecoveryStep;
  error?: Error;
  duration: number;
  progressRestored?: ProgressState;
}