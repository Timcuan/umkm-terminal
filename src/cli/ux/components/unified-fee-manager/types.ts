/**
 * Unified Fee Manager Types
 * 
 * Types and interfaces for the unified fee management system that provides
 * single percentage configuration for both Token and WETH fees.
 */

import { FeeStrategy, FeeConfiguration, FeeCalculation, FeePreview } from '../../types';

// ============================================================================
// Core Fee Manager Types
// ============================================================================

/**
 * Configuration for the Unified Fee Manager
 */
export interface UnifiedFeeManagerConfig {
  /** Default fee percentage (1-99%) */
  defaultPercentage: number;
  /** Default fee strategy */
  defaultStrategy: FeeStrategy;
  /** Enable real-time fee preview calculations */
  enableRealTimePreview: boolean;
  /** Enable fee validation */
  enableValidation: boolean;
  /** Maximum allowed fee percentage */
  maxPercentage: number;
  /** Minimum allowed fee percentage */
  minPercentage: number;
}

/**
 * Fee strategy configuration with metadata
 */
export interface FeeStrategyConfig {
  strategy: FeeStrategy;
  name: string;
  description: string;
  percentageRange: {
    min: number;
    max: number;
  };
  isCustomizable: boolean;
  defaultPercentage: number;
}

/**
 * Fee calculation input parameters
 */
export interface FeeCalculationInput {
  tokenAmount: number;
  pairedAmount: number;
  strategy: FeeStrategy;
  percentage: number;
}

/**
 * Detailed fee calculation result
 */
export interface DetailedFeeCalculation extends FeeCalculation {
  tokenFeeAmount: number;
  pairedFeeAmount: number;
  totalFeeAmount: number;
  effectiveRate: number;
  calculatedAt: Date;
}

/**
 * Fee preview with visual formatting
 */
export interface FormattedFeePreview extends FeePreview {
  formattedTokenFee: string;
  formattedPairedFee: string;
  formattedTotalFees: string;
  percentageDisplay: string;
  strategyDisplay: string;
}

/**
 * Fee validation result
 */
export interface FeeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  correctedPercentage?: number;
}

/**
 * Fee configuration change event
 */
export interface FeeConfigurationChange {
  previousConfiguration: FeeConfiguration;
  newConfiguration: FeeConfiguration;
  changeType: 'percentage' | 'strategy' | 'both';
  timestamp: Date;
  reason: string;
}

/**
 * Fee manager state
 */
export interface FeeManagerState {
  currentConfiguration: FeeConfiguration;
  availableStrategies: FeeStrategyConfig[];
  lastCalculation?: DetailedFeeCalculation;
  lastPreview?: FormattedFeePreview;
  validationEnabled: boolean;
  previewEnabled: boolean;
}

// ============================================================================
// Strategy-Specific Types
// ============================================================================

/**
 * Dynamic fee strategy parameters
 */
export interface DynamicFeeParameters {
  basePercentage: number;
  volatilityMultiplier: number;
  marketConditions: 'low' | 'medium' | 'high';
  adjustmentFactor: number;
}

/**
 * Flat fee strategy parameters
 */
export interface FlatFeeParameters {
  fixedPercentage: number;
  appliesTo: ('TOKEN' | 'WETH')[];
}

/**
 * Custom fee strategy parameters
 */
export interface CustomFeeParameters {
  tokenPercentage: number;
  pairedPercentage: number;
  allowDifferentRates: boolean;
}

/**
 * Strategy parameters union type
 */
export type StrategyParameters = 
  | DynamicFeeParameters 
  | FlatFeeParameters 
  | CustomFeeParameters;

// ============================================================================
// Menu and UI Types
// ============================================================================

/**
 * Fee configuration menu options
 */
export interface FeeConfigurationMenuOptions {
  title: string;
  showPreview: boolean;
  allowStrategyChange: boolean;
  allowPercentageChange: boolean;
  showAdvancedOptions: boolean;
}

/**
 * Fee menu item for strategy selection
 */
export interface FeeMenuItem {
  id: string;
  strategy: FeeStrategy;
  label: string;
  description: string;
  percentage: number;
  preview: FormattedFeePreview;
  recommended: boolean;
}

/**
 * Fee configuration menu result
 */
export interface FeeConfigurationMenuResult {
  selectedStrategy: FeeStrategy;
  selectedPercentage: number;
  configuration: FeeConfiguration;
  userConfirmed: boolean;
  cancelled: boolean;
}

// ============================================================================
// Event and Callback Types
// ============================================================================

/**
 * Fee change callback
 */
export type FeeChangeCallback = (change: FeeConfigurationChange) => void;

/**
 * Fee validation callback
 */
export type FeeValidationCallback = (
  percentage: number, 
  strategy: FeeStrategy
) => FeeValidationResult;

/**
 * Fee preview callback
 */
export type FeePreviewCallback = (preview: FormattedFeePreview) => void;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Fee manager specific errors
 */
export class FeeManagerError extends Error {
  constructor(
    message: string,
    public code: FeeErrorCode,
    public context?: any
  ) {
    super(message);
    this.name = 'FeeManagerError';
  }
}

/**
 * Fee error codes
 */
export enum FeeErrorCode {
  INVALID_PERCENTAGE = 'INVALID_PERCENTAGE',
  INVALID_STRATEGY = 'INVALID_STRATEGY',
  CALCULATION_FAILED = 'CALCULATION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Fee amount with currency information
 */
export interface FeeAmount {
  amount: number;
  currency: 'TOKEN' | 'WETH' | 'USD';
  formatted: string;
}

/**
 * Fee comparison result
 */
export interface FeeComparison {
  strategy1: FeeStrategy;
  strategy2: FeeStrategy;
  percentage1: number;
  percentage2: number;
  difference: number;
  recommendation: 'strategy1' | 'strategy2' | 'equivalent';
  reasoning: string;
}

/**
 * Fee history entry
 */
export interface FeeHistoryEntry {
  timestamp: Date;
  configuration: FeeConfiguration;
  calculation: DetailedFeeCalculation;
  context: string;
}