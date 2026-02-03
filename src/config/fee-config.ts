/**
 * Fee Configuration Module
 * 
 * Comprehensive fee management with dynamic, flat, and custom fee options.
 * Supports CLI interface for real-time fee configuration.
 */

export interface FeeConfig {
  // Fee Strategy
  feeType: 'dynamic' | 'flat' | 'custom';
  
  // Dynamic Fees (1-5%, auto-adjusts based on volatility)
  dynamicBaseFee: number; // Minimum fee percentage (default: 1%)
  dynamicMaxFee: number;  // Maximum fee percentage (default: 5%)
  
  // Flat Fees (Fixed percentage)
  flatFeePercentage: number; // Fixed fee percentage (default: 3%)
  
  // Custom Fees (Manual configuration 1-99%)
  customFeePercentage: number; // Custom fee percentage (1-99%) - applies to both
  
  // Fee Application (Both tokens get same fee)
  applyToToken: boolean;    // Apply fees to token rewards
  applyToPaired: boolean;   // Apply fees to paired token rewards
  
  // Advanced Settings
  volatilityThreshold: number; // Volatility threshold for dynamic fees
  feeAdjustmentInterval: number; // How often to adjust dynamic fees (ms)
  minimumFeeAmount: number; // Minimum fee amount in USD
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  // Default to dynamic fees (1-5%)
  feeType: 'dynamic',
  
  // Dynamic Fees Configuration
  dynamicBaseFee: 1.0,  // 1% minimum
  dynamicMaxFee: 5.0,   // 5% maximum
  
  // Flat Fee Configuration
  flatFeePercentage: 3.0, // 3% flat fee
  
  // Custom Fee Configuration (same for both tokens)
  customFeePercentage: 5.0,  // 5% custom fee (applies to both)
  
  // Fee Application (both enabled by default)
  applyToToken: true,     // Apply to token rewards
  applyToPaired: true,    // Apply to paired rewards
  
  // Advanced Settings
  volatilityThreshold: 0.1, // 10% volatility threshold
  feeAdjustmentInterval: 300000, // 5 minutes
  minimumFeeAmount: 1.0,  // $1 minimum fee
};

export class FeeConfigManager {
  private config: FeeConfig;
  
  constructor(config?: Partial<FeeConfig>) {
    this.config = { ...DEFAULT_FEE_CONFIG, ...config };
  }
  
  /**
   * Get current fee configuration
   */
  getConfig(): FeeConfig {
    return { ...this.config };
  }
  
  /**
   * Update fee configuration
   */
  updateConfig(updates: Partial<FeeConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  /**
   * Get current fee percentages based on strategy
   */
  getCurrentFees(): { tokenFee: number; pairedFee: number } {
    switch (this.config.feeType) {
      case 'dynamic':
        return this.getDynamicFees();
      case 'flat':
        return this.getFlatFees();
      case 'custom':
        return this.getCustomFees();
      default:
        return this.getFlatFees();
    }
  }
  
  /**
   * Get dynamic fees (1-5% based on volatility) - same for both
   */
  private getDynamicFees(): { tokenFee: number; pairedFee: number } {
    // Simulate volatility-based fee calculation
    // In real implementation, this would use market data
    const volatility = this.simulateVolatility();
    const feePercentage = this.calculateDynamicFee(volatility);
    
    return {
      tokenFee: feePercentage,
      pairedFee: feePercentage, // Same fee for both
    };
  }
  
  /**
   * Get flat fees (3% fixed) - same for both
   */
  private getFlatFees(): { tokenFee: number; pairedFee: number } {
    return {
      tokenFee: this.config.flatFeePercentage,
      pairedFee: this.config.flatFeePercentage, // Same fee for both
    };
  }
  
  /**
   * Get custom fees (user-defined 1-99%) - same for both
   */
  private getCustomFees(): { tokenFee: number; pairedFee: number } {
    return {
      tokenFee: this.config.customFeePercentage,
      pairedFee: this.config.customFeePercentage, // Same fee for both
    };
  }
  
  /**
   * Calculate dynamic fee based on volatility
   */
  private calculateDynamicFee(volatility: number): number {
    const { dynamicBaseFee, dynamicMaxFee, volatilityThreshold } = this.config;
    
    if (volatility <= volatilityThreshold) {
      return dynamicBaseFee;
    }
    
    // Linear interpolation between base and max fee
    const volatilityRatio = Math.min(volatility / (volatilityThreshold * 5), 1);
    const feeRange = dynamicMaxFee - dynamicBaseFee;
    
    return dynamicBaseFee + (feeRange * volatilityRatio);
  }
  
  /**
   * Simulate market volatility (replace with real data in production)
   */
  private simulateVolatility(): number {
    // Simulate volatility between 0-50%
    return Math.random() * 0.5;
  }
  
  /**
   * Get fee strategy description
   */
  getFeeStrategyDescription(): string {
    switch (this.config.feeType) {
      case 'dynamic':
        return `Dynamic fees (${this.config.dynamicBaseFee}%-${this.config.dynamicMaxFee}% based on volatility, same for both tokens)`;
      case 'flat':
        return `Flat fee (${this.config.flatFeePercentage}% fixed, same for both tokens)`;
      case 'custom':
        return `Custom fee (${this.config.customFeePercentage}% for both Token and WETH)`;
      default:
        return 'Unknown fee strategy';
    }
  }
  
  /**
   * Validate fee configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate dynamic fees
    if (this.config.dynamicBaseFee < 0.1 || this.config.dynamicBaseFee > 10) {
      errors.push('Dynamic base fee must be between 0.1% and 10%');
    }
    
    if (this.config.dynamicMaxFee < this.config.dynamicBaseFee || this.config.dynamicMaxFee > 20) {
      errors.push('Dynamic max fee must be greater than base fee and less than 20%');
    }
    
    // Validate flat fee
    if (this.config.flatFeePercentage < 0.1 || this.config.flatFeePercentage > 50) {
      errors.push('Flat fee must be between 0.1% and 50%');
    }
    
    // Validate custom fee
    if (this.config.customFeePercentage < 1 || this.config.customFeePercentage > 99) {
      errors.push('Custom fee must be between 1% and 99%');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Get fee preview for given amount
   */
  getFeePreview(amount: number): {
    strategy: string;
    tokenFee: number;
    pairedFee: number;
    tokenAmount: number;
    pairedAmount: number;
    totalFees: number;
  } {
    const fees = this.getCurrentFees();
    const tokenAmount = (amount * fees.tokenFee) / 100;
    const pairedAmount = (amount * fees.pairedFee) / 100;
    
    return {
      strategy: this.config.feeType,
      tokenFee: fees.tokenFee,
      pairedFee: fees.pairedFee,
      tokenAmount,
      pairedAmount,
      totalFees: tokenAmount + pairedAmount,
    };
  }
}

// Environment variable support for fee config
export function loadFeeConfigFromEnv(): Partial<FeeConfig> {
  const feeType = process.env.FEE_TYPE as 'dynamic' | 'flat' | 'custom' || 'dynamic';
  
  // Support new unified FEE_PERCENTAGE parameter with backward compatibility
  const feePercentage = process.env.FEE_PERCENTAGE ? Number(process.env.FEE_PERCENTAGE) : undefined;
  
  // Backward compatibility: map old parameters to new ones
  // Priority: new parameter > old parameter > default
  const dynamicBaseFee = feePercentage ?? 
    (process.env.DYNAMIC_BASE_FEE ? Number(process.env.DYNAMIC_BASE_FEE) : undefined);
  
  const dynamicMaxFee = feePercentage ?? 
    (process.env.DYNAMIC_MAX_FEE ? Number(process.env.DYNAMIC_MAX_FEE) : undefined);
  
  const flatFeePercentage = feePercentage ?? 
    (process.env.FLAT_FEE_PERCENTAGE ? Number(process.env.FLAT_FEE_PERCENTAGE) : undefined);
  
  const customFeePercentage = feePercentage ?? 
    (process.env.CUSTOM_FEE_PERCENTAGE ? Number(process.env.CUSTOM_FEE_PERCENTAGE) : undefined);
  
  // Log warnings for deprecated parameters
  if (process.env.DYNAMIC_BASE_FEE && !process.env.FEE_PERCENTAGE) {
    console.warn('[DEPRECATED] DYNAMIC_BASE_FEE is deprecated. Use FEE_PERCENTAGE instead.');
  }
  if (process.env.DYNAMIC_MAX_FEE && !process.env.FEE_PERCENTAGE) {
    console.warn('[DEPRECATED] DYNAMIC_MAX_FEE is deprecated. Use FEE_PERCENTAGE instead.');
  }
  if (process.env.FLAT_FEE_PERCENTAGE && !process.env.FEE_PERCENTAGE) {
    console.warn('[DEPRECATED] FLAT_FEE_PERCENTAGE is deprecated. Use FEE_PERCENTAGE instead.');
  }
  if (process.env.CUSTOM_FEE_PERCENTAGE && !process.env.FEE_PERCENTAGE) {
    console.warn('[DEPRECATED] CUSTOM_FEE_PERCENTAGE is deprecated. Use FEE_PERCENTAGE instead.');
  }
  if (process.env.VOLATILITY_THRESHOLD) {
    console.warn('[DEPRECATED] VOLATILITY_THRESHOLD is no longer used and will be ignored.');
  }
  if (process.env.MINIMUM_FEE_AMOUNT) {
    console.warn('[DEPRECATED] MINIMUM_FEE_AMOUNT is no longer used and will be ignored.');
  }
  
  return {
    feeType,
    dynamicBaseFee,
    dynamicMaxFee,
    flatFeePercentage,
    customFeePercentage,
    applyToToken: process.env.APPLY_FEE_TO_TOKEN === 'true',
    applyToPaired: process.env.APPLY_FEE_TO_PAIRED === 'true',
    // Deprecated parameters - kept for backward compatibility but not used
    volatilityThreshold: undefined,
    minimumFeeAmount: undefined,
  };
}

// Default instance for easy access
export const defaultFeeConfig = new FeeConfigManager(loadFeeConfigFromEnv());