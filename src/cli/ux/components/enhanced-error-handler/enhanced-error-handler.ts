/**
 * Enhanced Error Handler
 * 
 * Provides contextual error messages with actionable suggestions and recovery options.
 * Implements error categorization, suggestion ranking, and automated recovery mechanisms.
 */

import { 
  ErrorCategory, 
  CLIError, 
  ErrorResponse, 
  Suggestion, 
  RecoveryOption,
  ErrorContext,
  Platform,
  UXMode 
} from '../../types';

import {
  ErrorHandlerConfig,
  ErrorAnalysisResult,
  SuggestionRanking,
  RecoveryStrategy,
  ErrorPattern,
  ErrorStatistics,
  RankingFactor,
  ProgressState,
  ProgressStep,
  ProgressCheckpoint,
  RetryConfig,
  RetryAttempt,
  RecoveryExecutionResult
} from './types';

/**
 * Enhanced Error Handler implementation
 */
export class EnhancedErrorHandler {
  private config: ErrorHandlerConfig;
  private errorPatterns: ErrorPattern[];
  private errorStatistics: Map<string, ErrorStatistics>;
  private progressStates: Map<string, ProgressState>;
  private retryConfig: RetryConfig;
  private activeRetries: Map<string, RetryAttempt[]>;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableSuggestionRanking: true,
      maxSuggestions: 5,
      enableRecoveryOptions: true,
      logErrors: true,
      contextualHelpEnabled: true,
      autoRetryEnabled: true,
      maxRetryAttempts: 3,
      ...config
    };

    this.errorPatterns = this.initializeErrorPatterns();
    this.errorStatistics = new Map();
    this.progressStates = new Map();
    this.activeRetries = new Map();
    
    this.retryConfig = {
      maxAttempts: this.config.maxRetryAttempts,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      retryableCategories: [
        ErrorCategory.NETWORK,
        ErrorCategory.SYSTEM
      ],
      retryablePatterns: [
        /timeout/i,
        /connection/i,
        /temporary/i,
        /retry/i
      ]
    };
  }

  /**
   * Handle an error with contextual analysis and suggestions
   */
  async handleError(error: CLIError): Promise<ErrorResponse> {
    try {
      // Analyze the error
      const analysis = await this.analyzeError(error);
      
      // Generate suggestions
      const suggestions = this.generateSuggestions(error, analysis);
      
      // Rank suggestions by likelihood of success
      const rankedSuggestions = this.config.enableSuggestionRanking 
        ? this.rankSuggestions(suggestions, error.context)
        : suggestions;

      // Generate recovery options
      const recoveryOptions = this.config.enableRecoveryOptions
        ? this.generateRecoveryOptions(error, analysis)
        : [];

      // Create user-friendly message
      const userMessage = this.createUserMessage(error, analysis);

      // Log error if enabled
      if (this.config.logErrors) {
        this.logErrorWithContext(error, error.context);
      }

      // Update error statistics
      this.updateErrorStatistics(error, analysis);

      return {
        handled: true,
        userMessage,
        suggestions: rankedSuggestions.slice(0, this.config.maxSuggestions),
        recoveryOptions,
        shouldRetry: analysis.recoverable && this.config.autoRetryEnabled
      };

    } catch (handlingError) {
      // Fallback error handling
      return {
        handled: false,
        userMessage: `An error occurred while handling the original error: ${error.message}`,
        suggestions: [{
          description: 'Try restarting the CLI',
          action: 'restart',
          likelihood: 0.7,
          automated: false
        }],
        recoveryOptions: [],
        shouldRetry: false
      };
    }
  }

  /**
   * Categorize an error based on its characteristics
   */
  categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Configuration errors
    if (message.includes('config') || message.includes('setting') || 
        message.includes('invalid mode') || message.includes('percentage')) {
      return ErrorCategory.CONFIGURATION;
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || 
        message.includes('connection') || message.includes('api') ||
        message.includes('fetch') || message.includes('request')) {
      return ErrorCategory.NETWORK;
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation') ||
        message.includes('required') || message.includes('format') ||
        message.includes('symbol') || message.includes('token name')) {
      return ErrorCategory.VALIDATION;
    }

    // System errors
    if (message.includes('permission') || message.includes('access') ||
        message.includes('file system') || message.includes('memory') ||
        message.includes('platform') || stack.includes('system')) {
      return ErrorCategory.SYSTEM;
    }

    // Default to user input errors
    return ErrorCategory.USER_INPUT;
  }

  /**
   * Generate contextual suggestions for an error
   */
  generateSuggestions(error: CLIError, analysis: ErrorAnalysisResult): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Add pattern-based suggestions
    const matchingPattern = this.findMatchingPattern(error);
    if (matchingPattern) {
      suggestions.push(...matchingPattern.suggestedSolutions);
    }

    // Add category-specific suggestions
    suggestions.push(...this.getCategorySuggestions(error.category, error.context));

    // Add context-specific suggestions
    suggestions.push(...this.getContextualSuggestions(error.context, analysis));

    return suggestions;
  }

  /**
   * Generate recovery options for an error
   */
  generateRecoveryOptions(error: CLIError, analysis: ErrorAnalysisResult): RecoveryOption[] {
    const recoveryOptions: RecoveryOption[] = [];

    if (!analysis.recoverable) {
      return recoveryOptions;
    }

    // Add automatic retry option for recoverable errors
    if (this.config.autoRetryEnabled && this.shouldRetry(error)) {
      recoveryOptions.push({
        id: 'auto-retry',
        description: `Automatically retry the operation (up to ${this.retryConfig.maxAttempts} attempts)`,
        action: async () => {
          const result = await this.attemptAutoRetry(error, async () => {
            // This would be replaced with the actual operation in real usage
            console.log('Retrying operation...');
            return { success: true };
          });
          
          if (!result.success) {
            throw new Error(`Auto-retry failed after ${result.attempts.length} attempts`);
          }
        },
        riskLevel: 'low'
      });
    }

    // Add progress restoration option if progress exists
    const progressState = this.restoreProgressState(error.context.operation);
    if (progressState && progressState.checkpoints.length > 0) {
      recoveryOptions.push({
        id: 'restore-progress',
        description: 'Restore progress from last checkpoint and continue',
        action: async () => {
          const latestCheckpoint = progressState.checkpoints[progressState.checkpoints.length - 1];
          const success = await this.rollbackToCheckpoint(progressState.id, latestCheckpoint.id);
          if (!success) {
            throw new Error('Failed to restore progress from checkpoint');
          }
        },
        riskLevel: 'low'
      });
    }

    // Add category-specific recovery options
    switch (error.category) {
      case ErrorCategory.CONFIGURATION:
        recoveryOptions.push({
          id: 'reset-config',
          description: 'Reset configuration to defaults and preserve progress',
          action: async () => {
            // Save current progress before reset
            if (progressState) {
              this.createProgressCheckpoint(
                progressState.id,
                'pre-config-reset',
                progressState.data,
                'Checkpoint before configuration reset'
              );
            }
            console.log('Resetting configuration...');
          },
          riskLevel: 'medium'
        });
        break;

      case ErrorCategory.NETWORK:
        recoveryOptions.push({
          id: 'retry-with-timeout',
          description: 'Retry with increased timeout and preserve progress',
          action: async () => {
            console.log('Retrying with increased timeout...');
          },
          riskLevel: 'low'
        });
        break;

      case ErrorCategory.VALIDATION:
        recoveryOptions.push({
          id: 'use-smart-defaults',
          description: 'Use smart defaults for invalid values and continue',
          action: async () => {
            console.log('Applying smart defaults...');
          },
          riskLevel: 'low'
        });
        break;

      case ErrorCategory.SYSTEM:
        recoveryOptions.push({
          id: 'graceful-degradation',
          description: 'Continue with reduced functionality',
          action: async () => {
            console.log('Enabling graceful degradation mode...');
          },
          riskLevel: 'medium'
        });
        break;
    }

    return recoveryOptions;
  }

  /**
   * Log error with context for debugging
   */
  logErrorWithContext(error: CLIError, context: ErrorContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        category: error.category,
        stack: error.stack
      },
      context: {
        operation: context.operation,
        platform: context.platform,
        uxMode: context.uxMode,
        userInput: context.userInput
      }
    };

    console.error('[Enhanced Error Handler]', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Analyze error to determine characteristics and recovery options
   */
  private async analyzeError(error: CLIError): Promise<ErrorAnalysisResult> {
    const category = error.category || this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    const recoverable = this.isRecoverable(error, category);
    const contextualFactors = this.extractContextualFactors(error.context);

    return {
      category,
      severity,
      recoverable,
      contextualFactors,
      suggestedActions: [],
      recoveryStrategies: []
    };
  }

  /**
   * Rank suggestions by likelihood of success
   */
  private rankSuggestions(suggestions: Suggestion[], context: ErrorContext): Suggestion[] {
    const rankings: SuggestionRanking[] = suggestions.map(suggestion => {
      const factors = this.calculateRankingFactors(suggestion, context);
      const score = factors.reduce((total, factor) => total + (factor.weight * factor.value), 0);
      
      return {
        suggestion: {
          ...suggestion,
          likelihood: Math.min(1, Math.max(0, score))
        },
        score,
        factors
      };
    });

    // Sort by score (highest first)
    rankings.sort((a, b) => b.score - a.score);
    
    return rankings.map(ranking => ranking.suggestion);
  }

  /**
   * Calculate ranking factors for a suggestion
   */
  private calculateRankingFactors(suggestion: Suggestion, context: ErrorContext): RankingFactor[] {
    const factors: RankingFactor[] = [];

    // Base likelihood factor
    factors.push({
      name: 'base_likelihood',
      weight: 0.4,
      value: suggestion.likelihood,
      description: 'Base likelihood of success'
    });

    // Automation factor (automated suggestions are more reliable)
    factors.push({
      name: 'automation',
      weight: 0.2,
      value: suggestion.automated ? 1 : 0.5,
      description: 'Whether the suggestion can be automated'
    });

    // Platform compatibility factor
    const platformCompatible = this.isPlatformCompatible(suggestion, context.platform);
    factors.push({
      name: 'platform_compatibility',
      weight: 0.2,
      value: platformCompatible ? 1 : 0.3,
      description: 'Compatibility with current platform'
    });

    // UX mode factor (some suggestions work better in certain modes)
    const uxModeScore = this.getUXModeScore(suggestion, context.uxMode);
    factors.push({
      name: 'ux_mode_compatibility',
      weight: 0.2,
      value: uxModeScore,
      description: 'Compatibility with current UX mode'
    });

    return factors;
  }

  /**
   * Create user-friendly error message
   */
  private createUserMessage(error: CLIError, analysis: ErrorAnalysisResult): string {
    const categoryMessages = {
      [ErrorCategory.CONFIGURATION]: 'Configuration Error',
      [ErrorCategory.NETWORK]: 'Network Error',
      [ErrorCategory.VALIDATION]: 'Validation Error',
      [ErrorCategory.SYSTEM]: 'System Error',
      [ErrorCategory.USER_INPUT]: 'Input Error'
    };

    const severityEmojis = {
      low: '⚠️',
      medium: '❌',
      high: '🚨',
      critical: '💥'
    };

    const emoji = severityEmojis[analysis.severity];
    const categoryName = categoryMessages[analysis.category];
    
    return `${emoji} ${categoryName}: ${error.message}`;
  }

  /**
   * Initialize error patterns for pattern matching
   */
  private initializeErrorPatterns(): ErrorPattern[] {
    return [
      {
        pattern: /invalid.*percentage/i,
        category: ErrorCategory.VALIDATION,
        commonCauses: ['Value outside 1-99% range', 'Non-numeric input'],
        suggestedSolutions: [
          {
            description: 'Use a percentage between 1% and 99%',
            action: 'validate_percentage',
            likelihood: 0.9,
            automated: true
          }
        ],
        recoveryStrategies: ['use_smart_defaults', 'prompt_for_valid_input']
      },
      {
        pattern: /network.*timeout/i,
        category: ErrorCategory.NETWORK,
        commonCauses: ['Slow internet connection', 'Server overload', 'Firewall blocking'],
        suggestedSolutions: [
          {
            description: 'Check your internet connection and try again',
            action: 'retry_with_timeout',
            likelihood: 0.8,
            automated: true
          }
        ],
        recoveryStrategies: ['retry_with_backoff', 'use_cached_data']
      },
      {
        pattern: /invalid.*token.*name/i,
        category: ErrorCategory.VALIDATION,
        commonCauses: ['Special characters in name', 'Name too long', 'Reserved keywords'],
        suggestedSolutions: [
          {
            description: 'Use only alphanumeric characters and spaces',
            action: 'sanitize_token_name',
            likelihood: 0.85,
            automated: true
          }
        ],
        recoveryStrategies: ['auto_sanitize', 'suggest_alternatives']
      }
    ];
  }

  /**
   * Find matching error pattern
   */
  private findMatchingPattern(error: CLIError): ErrorPattern | null {
    return this.errorPatterns.find(pattern => {
      if (typeof pattern.pattern === 'string') {
        return error.message.includes(pattern.pattern);
      }
      return pattern.pattern.test(error.message);
    }) || null;
  }

  /**
   * Get category-specific suggestions
   */
  private getCategorySuggestions(category: ErrorCategory, context: ErrorContext): Suggestion[] {
    const suggestions: Suggestion[] = [];

    switch (category) {
      case ErrorCategory.CONFIGURATION:
        suggestions.push({
          description: 'Check your configuration settings',
          action: 'validate_config',
          likelihood: 0.7,
          automated: true
        });
        break;

      case ErrorCategory.NETWORK:
        suggestions.push({
          description: 'Verify your internet connection',
          action: 'check_network',
          likelihood: 0.6,
          automated: false
        });
        break;

      case ErrorCategory.VALIDATION:
        suggestions.push({
          description: 'Review the input format requirements',
          action: 'show_format_help',
          likelihood: 0.8,
          automated: false
        });
        break;

      case ErrorCategory.SYSTEM:
        suggestions.push({
          description: 'Check system permissions and resources',
          action: 'check_system',
          likelihood: 0.5,
          automated: false
        });
        break;

      case ErrorCategory.USER_INPUT:
        suggestions.push({
          description: 'Review the command syntax and try again',
          action: 'show_help',
          likelihood: 0.9,
          automated: false
        });
        break;
    }

    return suggestions;
  }

  /**
   * Get contextual suggestions based on error context
   */
  private getContextualSuggestions(context: ErrorContext, analysis: ErrorAnalysisResult): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // UX mode specific suggestions
    if (context.uxMode === UXMode.FAST || context.uxMode === UXMode.ULTRA) {
      suggestions.push({
        description: 'Switch to normal mode for more detailed error information',
        action: 'switch_to_normal_mode',
        likelihood: 0.6,
        automated: true
      });
    }

    // Platform specific suggestions
    if (context.platform === Platform.WINDOWS) {
      suggestions.push({
        description: 'Try running as administrator if permission denied',
        action: 'run_as_admin',
        likelihood: 0.7,
        automated: false
      });
    }

    return suggestions;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: CLIError, category: ErrorCategory): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors that prevent CLI from functioning
    if (error.message.includes('fatal') || error.message.includes('crash')) {
      return 'critical';
    }

    // High severity for system and configuration errors
    if (category === ErrorCategory.SYSTEM || 
        (category === ErrorCategory.CONFIGURATION && error.message.includes('corrupt'))) {
      return 'high';
    }

    // Medium severity for network and validation errors
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.VALIDATION) {
      return 'medium';
    }

    // Low severity for user input errors
    return 'low';
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(error: CLIError, category: ErrorCategory): boolean {
    // System errors are often not recoverable
    if (category === ErrorCategory.SYSTEM && error.message.includes('permission')) {
      return false;
    }

    // Most other errors are recoverable
    return true;
  }

  /**
   * Extract contextual factors from error context
   */
  private extractContextualFactors(context: ErrorContext): string[] {
    const factors: string[] = [];

    factors.push(`Platform: ${context.platform}`);
    factors.push(`UX Mode: ${context.uxMode}`);
    factors.push(`Operation: ${context.operation}`);

    if (context.userInput) {
      factors.push('User input provided');
    }

    return factors;
  }

  /**
   * Check if suggestion is compatible with platform
   */
  private isPlatformCompatible(suggestion: Suggestion, platform: Platform): boolean {
    // Platform-specific compatibility checks
    if (suggestion.action === 'run_as_admin' && platform !== Platform.WINDOWS) {
      return false;
    }

    // Most suggestions are platform-agnostic
    return true;
  }

  /**
   * Get UX mode compatibility score for suggestion
   */
  private getUXModeScore(suggestion: Suggestion, uxMode: UXMode): number {
    // Automated suggestions work better in fast/ultra modes
    if (suggestion.automated && (uxMode === UXMode.FAST || uxMode === UXMode.ULTRA)) {
      return 1;
    }

    // Manual suggestions work better in normal/expert modes
    if (!suggestion.automated && (uxMode === UXMode.NORMAL || uxMode === UXMode.EXPERT)) {
      return 1;
    }

    return 0.7; // Neutral compatibility
  }

  /**
   * Update error statistics for learning
   */
  private updateErrorStatistics(error: CLIError, analysis: ErrorAnalysisResult): void {
    const key = `${error.category}:${error.message.substring(0, 50)}`;
    const existing = this.errorStatistics.get(key);

    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = new Date();
    } else {
      this.errorStatistics.set(key, {
        category: error.category,
        frequency: 1,
        lastOccurrence: new Date(),
        commonContext: analysis.contextualFactors,
        successfulResolutions: [],
        averageResolutionTime: 0
      });
    }
  }

  // ============================================================================
  // Progress Preservation Methods
  // ============================================================================

  /**
   * Save progress state for an operation
   */
  saveProgressState(progressState: ProgressState): void {
    this.progressStates.set(progressState.id, {
      ...progressState,
      timestamp: new Date()
    });
  }

  /**
   * Restore progress state for an operation
   */
  restoreProgressState(operationId: string): ProgressState | null {
    return this.progressStates.get(operationId) || null;
  }

  /**
   * Create a progress checkpoint
   */
  createProgressCheckpoint(
    operationId: string, 
    stepId: string, 
    state: Record<string, any>, 
    description: string
  ): void {
    const progressState = this.progressStates.get(operationId);
    if (progressState) {
      const checkpoint: ProgressCheckpoint = {
        id: `${operationId}-${stepId}-${Date.now()}`,
        stepId,
        timestamp: new Date(),
        state: { ...state },
        description
      };
      
      progressState.checkpoints.push(checkpoint);
      this.progressStates.set(operationId, progressState);
    }
  }

  /**
   * Rollback to a specific checkpoint
   */
  async rollbackToCheckpoint(operationId: string, checkpointId: string): Promise<boolean> {
    const progressState = this.progressStates.get(operationId);
    if (!progressState) {
      return false;
    }

    const checkpoint = progressState.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      return false;
    }

    try {
      // Find the step associated with this checkpoint
      const step = progressState.completedSteps.find(s => s.id === checkpoint.stepId);
      
      // Execute rollback actions for all steps after the checkpoint
      const stepsToRollback = progressState.completedSteps.filter(s => {
        const stepIndex = progressState.completedSteps.indexOf(s);
        const checkpointStepIndex = progressState.completedSteps.findIndex(cs => cs.id === checkpoint.stepId);
        return stepIndex > checkpointStepIndex;
      });

      for (const stepToRollback of stepsToRollback.reverse()) {
        if (stepToRollback.rollbackAction) {
          await stepToRollback.rollbackAction();
        }
        stepToRollback.completed = false;
      }

      // Restore state from checkpoint
      progressState.data = { ...checkpoint.state };
      progressState.completedSteps = progressState.completedSteps.filter(s => {
        const stepIndex = progressState.completedSteps.indexOf(s);
        const checkpointStepIndex = progressState.completedSteps.findIndex(cs => cs.id === checkpoint.stepId);
        return stepIndex <= checkpointStepIndex;
      });

      this.progressStates.set(operationId, progressState);
      return true;

    } catch (error) {
      console.error('Failed to rollback to checkpoint:', error);
      return false;
    }
  }

  /**
   * Clear progress state for completed or failed operations
   */
  clearProgressState(operationId: string): void {
    this.progressStates.delete(operationId);
  }

  // ============================================================================
  // Automatic Retry Methods
  // ============================================================================

  /**
   * Attempt automatic retry for recoverable errors
   */
  async attemptAutoRetry(
    error: CLIError, 
    operation: () => Promise<any>
  ): Promise<{ success: boolean; result?: any; attempts: RetryAttempt[] }> {
    const operationId = `${error.context.operation}-${Date.now()}`;
    
    if (!this.shouldRetry(error)) {
      return { success: false, attempts: [] };
    }

    const attempts: RetryAttempt[] = [];
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      const delay = this.calculateRetryDelay(attempt);
      
      // Wait before retry (except for first attempt)
      if (attempt > 1) {
        await this.sleep(delay);
      }

      const attemptInfo: RetryAttempt = {
        attemptNumber: attempt,
        timestamp: new Date(),
        error,
        delay,
        success: false
      };

      const startTime = Date.now();

      try {
        const result = await operation();
        attemptInfo.success = true;
        attemptInfo.duration = Date.now() - startTime;
        attempts.push(attemptInfo);
        
        // Clear retry history on success
        this.activeRetries.delete(operationId);
        
        return { success: true, result, attempts };

      } catch (retryError) {
        attemptInfo.duration = Date.now() - startTime;
        attempts.push(attemptInfo);
        
        // Update error for next attempt
        if (retryError instanceof Error) {
          error = {
            ...error,
            message: retryError.message,
            stack: retryError.stack
          };
        }
      }
    }

    // Store retry history for analysis
    this.activeRetries.set(operationId, attempts);
    
    return { success: false, attempts };
  }

  /**
   * Execute a recovery strategy
   */
  async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    error: CLIError
  ): Promise<RecoveryExecutionResult> {
    const startTime = Date.now();
    const executedSteps: RecoveryStep[] = [];
    
    const result: RecoveryExecutionResult = {
      success: false,
      recoveryId: strategy.id,
      executedSteps,
      duration: 0
    };

    try {
      for (const step of strategy.steps) {
        const stepStartTime = Date.now();
        
        try {
          const success = await step.action();
          
          const executedStep = {
            ...step,
            duration: Date.now() - stepStartTime
          };
          
          executedSteps.push(executedStep);
          
          if (!success && step.required) {
            result.failedStep = executedStep;
            result.duration = Date.now() - startTime;
            return result;
          }
          
        } catch (stepError) {
          const executedStep = {
            ...step,
            duration: Date.now() - stepStartTime
          };
          
          executedSteps.push(executedStep);
          result.failedStep = executedStep;
          result.error = stepError instanceof Error ? stepError : new Error(String(stepError));
          result.duration = Date.now() - startTime;
          
          if (step.required) {
            return result;
          }
        }
      }

      // All steps completed successfully
      result.success = true;
      result.duration = Date.now() - startTime;
      
      // Try to restore progress if available
      const progressState = this.restoreProgressState(error.context.operation);
      if (progressState) {
        result.progressRestored = progressState;
      }
      
      return result;

    } catch (error) {
      result.error = error instanceof Error ? error : new Error(String(error));
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Get retry history for an operation
   */
  getRetryHistory(operationId: string): RetryAttempt[] {
    return this.activeRetries.get(operationId) || [];
  }

  /**
   * Clear retry history
   */
  clearRetryHistory(operationId?: string): void {
    if (operationId) {
      this.activeRetries.delete(operationId);
    } else {
      this.activeRetries.clear();
    }
  }

  // ============================================================================
  // Private Helper Methods for Recovery
  // ============================================================================

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: CLIError): boolean {
    // Check if category is retryable
    if (!this.retryConfig.retryableCategories.includes(error.category)) {
      return false;
    }

    // Check if error message matches retryable patterns
    const messageMatches = this.retryConfig.retryablePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return error.message.toLowerCase().includes(pattern.toLowerCase());
      }
      return pattern.test(error.message);
    });

    return messageMatches;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptNumber - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}