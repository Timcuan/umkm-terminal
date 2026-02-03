/**
 * Unified Fee Manager - Export Module
 * 
 * Exports the unified fee management system components for single percentage
 * configuration of both Token and WETH fees with strategy support.
 */

export { UnifiedFeeManager } from './unified-fee-manager';
export { FeeConfigurationMenu } from './fee-configuration-menu';

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
  FeeHistoryEntry
} from './types';

export { 
  FeeManagerError, 
  FeeErrorCode 
} from './types';