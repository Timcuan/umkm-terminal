/**
 * Unified Fee Manager
 * 
 * Provides unified fee configuration for both Token and WETH with single percentage
 * configuration, fee strategy support, and real-time fee preview calculations.
 */

import { 
  FeeStrategy, 
  FeeConfiguration, 
  FeeCalculation, 
  FeePreview,
  UXMode 
} from '../../types';

import {
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
  FeeManagerError,
  FeeErrorCode,
  FeeAmount,
  FeeComparison,
  FeeHistoryEntry,
  FeeChangeCallback,
  FeeValidationCallback,
  FeePreviewCallback
} from './types';

/**
 * Unified Fee Manager implementation
 */
export class UnifiedFeeManager {
  private config: UnifiedFeeManagerConfig;
  private state: FeeManagerState;
  private changeCallbacks: FeeChangeCallback[];
  private validationCallbacks: FeeValidationCallback[];
  private previewCallbacks: FeePreviewCallback[];
  private feeHistory: FeeHistoryEntry[];

  constructor(config: Partial<UnifiedFeeManagerConfig> = {}) {
    this.config = {
      defaultPercentage: 3,
      defaultStrategy: FeeStrategy.FLAT,
      enableRealTimePreview: true,
      enableValidation: true,
      maxPercentage: 99,
      minPercentage: 1,
      ...config
    };

    this.state = {
      currentConfiguration: this.createDefaultConfiguration(),
      availableStrategies: this.initializeStrategies(),
      validationEnabled: this.config.enableValidation,
      previewEnabled: this.config.enableRealTimePreview
    };

    this.changeCallbacks = [];
    this.validationCallbacks = [];
    this.previewCallbacks = [];
    this.feeHistory = [];
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Configure fee with single percentage for both Token and WETH
   */
  async configureFee(percentage: number, strategy: FeeStrategy = FeeStrategy.FLAT): Promise<FeeConfiguration> {
    // Validate percentage
    const validation = this.validatePercentage(percentage, strategy);
    if (!validation.isValid) {
      throw new FeeManagerError(
        `Invalid fee configuration: ${validation.errors.join(', ')}`,
        FeeErrorCode.VALIDATION_FAILED,
        { percentage, strategy, validation }
      );
    }

    // Use corrected percentage if available
    const finalPercentage = validation.correctedPercentage || percentage;

    // Create new configuration
    const previousConfiguration = { ...this.state.currentConfiguration };
    const newConfiguration: FeeConfiguration = {
      percentage: finalPercentage,
      strategy,
      appliesTo: ['TOKEN', 'WETH'],
      lastModified: new Date()
    };

    // Update state
    this.state.currentConfiguration = newConfiguration;

    // Create change event
    const change: FeeConfigurationChange = {
      previousConfiguration,
      newConfiguration,
      changeType: this.determineChangeType(previousConfiguration, newConfiguration),
      timestamp: new Date(),
      reason: 'User configuration update'
    };

    // Notify callbacks
    this.notifyChangeCallbacks(change);

    // Generate preview if enabled
    if (this.state.previewEnabled) {
      await this.generatePreview();
    }

    return newConfiguration;
  }

  /**
   * Get current fee configuration
   */
  getCurrentConfiguration(): FeeConfiguration {
    return { ...this.state.currentConfiguration };
  }

  /**
   * Calculate fees for given amounts
   */
  calculateFees(input: FeeCalculationInput): DetailedFeeCalculation {
    try {
      const { tokenAmount, pairedAmount, strategy, percentage } = input;

      // Validate inputs
      if (tokenAmount < 0 || pairedAmount < 0) {
        throw new FeeManagerError(
          'Token and paired amounts must be non-negative',
          FeeErrorCode.CALCULATION_FAILED,
          { input }
        );
      }

      if (percentage < this.config.minPercentage || percentage > this.config.maxPercentage) {
        throw new FeeManagerError(
          `Percentage must be between ${this.config.minPercentage}% and ${this.config.maxPercentage}%`,
          FeeErrorCode.INVALID_PERCENTAGE,
          { percentage, input }
        );
      }

      // Calculate fees based on strategy
      const calculation = this.performCalculation(input);

      // Update state
      this.state.lastCalculation = calculation;

      // Add to history
      this.addToHistory(calculation, 'fee_calculation');

      return calculation;

    } catch (error) {
      if (error instanceof FeeManagerError) {
        throw error;
      }
      
      throw new FeeManagerError(
        `Fee calculation failed: ${error instanceof Error ? error.message : String(error)}`,
        FeeErrorCode.CALCULATION_FAILED,
        { input, originalError: error }
      );
    }
  }

  /**
   * Generate real-time fee preview
   */
  async generatePreview(
    tokenAmount: number = 1000, 
    pairedAmount: number = 1000
  ): Promise<FormattedFeePreview> {
    const input: FeeCalculationInput = {
      tokenAmount,
      pairedAmount,
      strategy: this.state.currentConfiguration.strategy,
      percentage: this.state.currentConfiguration.percentage
    };

    const calculation = this.calculateFees(input);
    const preview = this.formatPreview(calculation);

    // Update state
    this.state.lastPreview = preview;

    // Notify preview callbacks
    this.notifyPreviewCallbacks(preview);

    return preview;
  }

  /**
   * Get available fee strategies
   */
  getAvailableStrategies(): FeeStrategyConfig[] {
    return [...this.state.availableStrategies];
  }

  /**
   * Get strategy configuration by strategy type
   */
  getStrategyConfig(strategy: FeeStrategy): FeeStrategyConfig | null {
    return this.state.availableStrategies.find(s => s.strategy === strategy) || null;
  }

  /**
   * Validate fee percentage for given strategy
   */
  validatePercentage(percentage: number, strategy: FeeStrategy): FeeValidationResult {
    const result: FeeValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Basic range validation
    if (percentage < this.config.minPercentage || percentage > this.config.maxPercentage) {
      result.isValid = false;
      result.errors.push(
        `Percentage must be between ${this.config.minPercentage}% and ${this.config.maxPercentage}%`
      );
      
      // Suggest correction
      if (percentage < this.config.minPercentage) {
        result.correctedPercentage = this.config.minPercentage;
        result.suggestions.push(`Consider using ${this.config.minPercentage}% (minimum allowed)`);
      } else if (percentage > this.config.maxPercentage) {
        result.correctedPercentage = this.config.maxPercentage;
        result.suggestions.push(`Consider using ${this.config.maxPercentage}% (maximum allowed)`);
      }
    }

    // Strategy-specific validation
    const strategyConfig = this.getStrategyConfig(strategy);
    if (strategyConfig) {
      const { min, max } = strategyConfig.percentageRange;
      
      if (percentage < min || percentage > max) {
        result.warnings.push(
          `For ${strategyConfig.name} strategy, recommended range is ${min}%-${max}%`
        );
        
        if (percentage < min) {
          result.suggestions.push(`Consider ${min}% for optimal ${strategyConfig.name} performance`);
        } else if (percentage > max) {
          result.suggestions.push(`Consider ${max}% to stay within ${strategyConfig.name} guidelines`);
        }
      }
    }

    // Additional validation through callbacks
    for (const callback of this.validationCallbacks) {
      const callbackResult = callback(percentage, strategy);
      if (!callbackResult.isValid) {
        result.isValid = false;
        result.errors.push(...callbackResult.errors);
        result.warnings.push(...callbackResult.warnings);
        result.suggestions.push(...callbackResult.suggestions);
      }
    }

    return result;
  }

  /**
   * Compare two fee strategies
   */
  compareStrategies(
    strategy1: FeeStrategy, 
    percentage1: number,
    strategy2: FeeStrategy, 
    percentage2: number,
    sampleAmount: number = 1000
  ): FeeComparison {
    const calc1 = this.calculateFees({
      tokenAmount: sampleAmount,
      pairedAmount: sampleAmount,
      strategy: strategy1,
      percentage: percentage1
    });

    const calc2 = this.calculateFees({
      tokenAmount: sampleAmount,
      pairedAmount: sampleAmount,
      strategy: strategy2,
      percentage: percentage2
    });

    const difference = calc2.totalFeeAmount - calc1.totalFeeAmount;
    const percentageDifference = Math.abs(difference / calc1.totalFeeAmount) * 100;

    let recommendation: 'strategy1' | 'strategy2' | 'equivalent';
    let reasoning: string;

    if (percentageDifference < 1) {
      recommendation = 'equivalent';
      reasoning = 'Both strategies result in similar fees';
    } else if (difference < 0) {
      recommendation = 'strategy1';
      reasoning = `${this.getStrategyConfig(strategy1)?.name} results in ${Math.abs(difference).toFixed(2)} lower fees`;
    } else {
      recommendation = 'strategy2';
      reasoning = `${this.getStrategyConfig(strategy2)?.name} results in ${Math.abs(difference).toFixed(2)} lower fees`;
    }

    return {
      strategy1,
      strategy2,
      percentage1,
      percentage2,
      difference,
      recommendation,
      reasoning
    };
  }

  // ============================================================================
  // Callback Management
  // ============================================================================

  /**
   * Add fee change callback
   */
  onFeeChange(callback: FeeChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Add fee validation callback
   */
  onFeeValidation(callback: FeeValidationCallback): void {
    this.validationCallbacks.push(callback);
  }

  /**
   * Add fee preview callback
   */
  onFeePreview(callback: FeePreviewCallback): void {
    this.previewCallbacks.push(callback);
  }

  /**
   * Remove callback
   */
  removeCallback(callback: Function): void {
    this.changeCallbacks = this.changeCallbacks.filter(cb => cb !== callback);
    this.validationCallbacks = this.validationCallbacks.filter(cb => cb !== callback);
    this.previewCallbacks = this.previewCallbacks.filter(cb => cb !== callback);
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current manager state
   */
  getState(): FeeManagerState {
    return { ...this.state };
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): FeeConfiguration {
    const defaultConfig = this.createDefaultConfiguration();
    const previousConfig = { ...this.state.currentConfiguration };
    
    this.state.currentConfiguration = defaultConfig;
    
    const change: FeeConfigurationChange = {
      previousConfiguration: previousConfig,
      newConfiguration: defaultConfig,
      changeType: 'both',
      timestamp: new Date(),
      reason: 'Reset to defaults'
    };

    this.notifyChangeCallbacks(change);
    
    return defaultConfig;
  }

  /**
   * Get fee history
   */
  getFeeHistory(): FeeHistoryEntry[] {
    return [...this.feeHistory];
  }

  /**
   * Clear fee history
   */
  clearHistory(): void {
    this.feeHistory = [];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Create default fee configuration
   */
  private createDefaultConfiguration(): FeeConfiguration {
    return {
      percentage: this.config.defaultPercentage,
      strategy: this.config.defaultStrategy,
      appliesTo: ['TOKEN', 'WETH'],
      lastModified: new Date()
    };
  }

  /**
   * Initialize available fee strategies
   */
  private initializeStrategies(): FeeStrategyConfig[] {
    return [
      {
        strategy: FeeStrategy.DYNAMIC,
        name: 'Dynamic',
        description: '1-5% based on market volatility',
        percentageRange: { min: 1, max: 5 },
        isCustomizable: false,
        defaultPercentage: 3
      },
      {
        strategy: FeeStrategy.FLAT,
        name: 'Flat',
        description: '3% fixed rate for predictable costs',
        percentageRange: { min: 3, max: 3 },
        isCustomizable: false,
        defaultPercentage: 3
      },
      {
        strategy: FeeStrategy.CUSTOM,
        name: 'Custom',
        description: '1-99% manual configuration',
        percentageRange: { min: 1, max: 99 },
        isCustomizable: true,
        defaultPercentage: 5
      }
    ];
  }

  /**
   * Perform fee calculation based on strategy
   */
  private performCalculation(input: FeeCalculationInput): DetailedFeeCalculation {
    const { tokenAmount, pairedAmount, strategy, percentage } = input;
    
    let effectivePercentage = percentage;
    
    // Apply strategy-specific logic
    switch (strategy) {
      case FeeStrategy.DYNAMIC:
        effectivePercentage = this.calculateDynamicPercentage(percentage);
        break;
      case FeeStrategy.FLAT:
        effectivePercentage = 3; // Fixed 3% for flat strategy
        break;
      case FeeStrategy.CUSTOM:
        effectivePercentage = percentage; // Use as-is for custom
        break;
    }

    const feeRate = effectivePercentage / 100;
    
    const tokenFeeAmount = tokenAmount * feeRate;
    const pairedFeeAmount = pairedAmount * feeRate;
    const totalFeeAmount = tokenFeeAmount + pairedFeeAmount;
    
    const originalAmount = tokenAmount + pairedAmount;
    const finalAmount = originalAmount - totalFeeAmount;

    return {
      originalAmount,
      feeAmount: totalFeeAmount,
      finalAmount,
      strategy,
      percentage: effectivePercentage,
      tokenFeeAmount,
      pairedFeeAmount,
      totalFeeAmount,
      effectiveRate: feeRate,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate dynamic percentage based on market conditions
   */
  private calculateDynamicPercentage(basePercentage: number): number {
    // Simplified dynamic calculation - in real implementation,
    // this would use actual market data
    const volatilityFactor = Math.random() * 0.5 + 0.75; // 0.75 to 1.25
    const dynamicPercentage = Math.max(1, Math.min(5, basePercentage * volatilityFactor));
    
    return Math.round(dynamicPercentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Format fee preview for display
   */
  private formatPreview(calculation: DetailedFeeCalculation): FormattedFeePreview {
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      }).format(amount);
    };

    const strategyConfig = this.getStrategyConfig(calculation.strategy);
    
    return {
      strategy: calculation.strategy,
      tokenFee: calculation.tokenFeeAmount,
      pairedFee: calculation.pairedFeeAmount,
      tokenAmount: calculation.originalAmount / 2, // Assuming equal split
      pairedAmount: calculation.originalAmount / 2,
      totalFees: calculation.totalFeeAmount,
      formattedTokenFee: formatCurrency(calculation.tokenFeeAmount),
      formattedPairedFee: formatCurrency(calculation.pairedFeeAmount),
      formattedTotalFees: formatCurrency(calculation.totalFeeAmount),
      percentageDisplay: `${calculation.percentage}%`,
      strategyDisplay: strategyConfig?.name || calculation.strategy
    };
  }

  /**
   * Determine the type of configuration change
   */
  private determineChangeType(
    previous: FeeConfiguration, 
    current: FeeConfiguration
  ): 'percentage' | 'strategy' | 'both' {
    const percentageChanged = previous.percentage !== current.percentage;
    const strategyChanged = previous.strategy !== current.strategy;
    
    if (percentageChanged && strategyChanged) return 'both';
    if (percentageChanged) return 'percentage';
    if (strategyChanged) return 'strategy';
    return 'percentage'; // Default fallback
  }

  /**
   * Notify change callbacks
   */
  private notifyChangeCallbacks(change: FeeConfigurationChange): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(change);
      } catch (error) {
        console.error('Error in fee change callback:', error);
      }
    }
  }

  /**
   * Notify preview callbacks
   */
  private notifyPreviewCallbacks(preview: FormattedFeePreview): void {
    for (const callback of this.previewCallbacks) {
      try {
        callback(preview);
      } catch (error) {
        console.error('Error in fee preview callback:', error);
      }
    }
  }

  /**
   * Add calculation to history
   */
  private addToHistory(calculation: DetailedFeeCalculation, context: string): void {
    const entry: FeeHistoryEntry = {
      timestamp: new Date(),
      configuration: { ...this.state.currentConfiguration },
      calculation,
      context
    };

    this.feeHistory.push(entry);

    // Keep only last 100 entries
    if (this.feeHistory.length > 100) {
      this.feeHistory = this.feeHistory.slice(-100);
    }
  }
}