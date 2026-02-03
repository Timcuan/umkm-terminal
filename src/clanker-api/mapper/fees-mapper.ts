/**
 * Fees Mapper
 * Specialized mapping for fee configurations between SDK and API formats
 */

import type { FeeConfig, StaticFeeConfig, DynamicFeeConfig } from '../../types/index.js';
import type { ClankerAPITokenRequest } from '../types/api-types.js';

// ============================================================================
// Fees Mapper Class
// ============================================================================

export class FeesMapper {
  /**
   * Convert SDK fees format to API format
   */
  mapToAPI(
    fees: FeeConfig | undefined
  ): {
    data: ClankerAPITokenRequest['fees'] | undefined;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fees) {
      return { data: undefined, errors, warnings };
    }

    const apiFeesConfig: ClankerAPITokenRequest['fees'] = {
      type: fees.type,
    };

    if (fees.type === 'static') {
      const staticFees = fees as StaticFeeConfig;
      
      // Validate static fee values
      this.validateStaticFees(staticFees, errors, warnings);
      
      apiFeesConfig.clankerFee = staticFees.clankerFee;
      apiFeesConfig.pairedFee = staticFees.pairedFee;
      
    } else if (fees.type === 'dynamic') {
      const dynamicFees = fees as DynamicFeeConfig;
      
      // Validate dynamic fee values
      this.validateDynamicFees(dynamicFees, errors, warnings);
      
      apiFeesConfig.baseFee = dynamicFees.baseFee;
      apiFeesConfig.maxFee = dynamicFees.maxFee;
      apiFeesConfig.referenceTickFilterPeriod = dynamicFees.referenceTickFilterPeriod;
      apiFeesConfig.resetPeriod = dynamicFees.resetPeriod;
      apiFeesConfig.resetTickFilter = dynamicFees.resetTickFilter;
      apiFeesConfig.feeControlNumerator = dynamicFees.feeControlNumerator;
      apiFeesConfig.decayFilterBps = dynamicFees.decayFilterBps;
    } else {
      errors.push(`Unknown fee type: ${(fees as any).type}`);
    }

    return { data: apiFeesConfig, errors, warnings };
  }

  /**
   * Convert API fees format back to SDK format
   */
  mapFromAPI(
    apiFees: ClankerAPITokenRequest['fees']
  ): {
    data: FeeConfig | undefined;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!apiFees) {
      return { data: undefined, errors, warnings };
    }

    if (apiFees.type === 'static') {
      const staticConfig: StaticFeeConfig = {
        type: 'static',
        clankerFee: apiFees.clankerFee ?? 0,
        pairedFee: apiFees.pairedFee ?? 0,
      };

      this.validateStaticFees(staticConfig, errors, warnings);
      return { data: staticConfig, errors, warnings };

    } else if (apiFees.type === 'dynamic') {
      const dynamicConfig: DynamicFeeConfig = {
        type: 'dynamic',
        startingSniperFee: 0, // Default value - API doesn't provide this
        endingSniperFee: 0, // Default value - API doesn't provide this
        baseFee: apiFees.baseFee ?? 0,
        maxFee: apiFees.maxFee ?? 0,
        clankerFee: 0, // Default value - API doesn't provide this
        referenceTickFilterPeriod: apiFees.referenceTickFilterPeriod ?? 0,
        resetPeriod: apiFees.resetPeriod ?? 0,
        resetTickFilter: apiFees.resetTickFilter ?? 0,
        feeControlNumerator: apiFees.feeControlNumerator ?? 0,
        decayFilterBps: apiFees.decayFilterBps ?? 0,
        decayDuration: 0, // Default value - API doesn't provide this
      };

      this.validateDynamicFees(dynamicConfig, errors, warnings);
      return { data: dynamicConfig, errors, warnings };

    } else {
      errors.push(`Unknown API fee type: ${apiFees.type}`);
      return { data: undefined, errors, warnings };
    }
  }

  /**
   * Validate fee configuration
   */
  validateFees(fees: FeeConfig | undefined): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fees) {
      return { valid: true, errors, warnings };
    }

    if (fees.type === 'static') {
      this.validateStaticFees(fees as StaticFeeConfig, errors, warnings);
    } else if (fees.type === 'dynamic') {
      this.validateDynamicFees(fees as DynamicFeeConfig, errors, warnings);
    } else {
      errors.push(`Invalid fee type: ${(fees as any).type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Private Validation Methods
  // ==========================================================================

  private validateStaticFees(
    fees: StaticFeeConfig,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate clanker fee
    if (fees.clankerFee !== undefined) {
      if (typeof fees.clankerFee !== 'number' || fees.clankerFee < 0) {
        errors.push('Clanker fee must be a non-negative number');
      } else if (fees.clankerFee > 1000) { // 10%
        warnings.push('Clanker fee is very high (>10%)');
      }
    }

    // Validate paired fee
    if (fees.pairedFee !== undefined) {
      if (typeof fees.pairedFee !== 'number' || fees.pairedFee < 0) {
        errors.push('Paired fee must be a non-negative number');
      } else if (fees.pairedFee > 1000) { // 10%
        warnings.push('Paired fee is very high (>10%)');
      }
    }

    // Check total fees
    const totalFee = (fees.clankerFee || 0) + (fees.pairedFee || 0);
    if (totalFee > 1500) { // 15%
      warnings.push(`Total fees are very high (${totalFee / 100}%)`);
    }
  }

  private validateDynamicFees(
    fees: DynamicFeeConfig,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate base fee
    if (fees.baseFee !== undefined) {
      if (typeof fees.baseFee !== 'number' || fees.baseFee < 0) {
        errors.push('Base fee must be a non-negative number');
      } else if (fees.baseFee > 500) { // 5%
        warnings.push('Base fee is very high (>5%)');
      }
    }

    // Validate max fee
    if (fees.maxFee !== undefined) {
      if (typeof fees.maxFee !== 'number' || fees.maxFee < 0) {
        errors.push('Max fee must be a non-negative number');
      } else if (fees.maxFee > 1000) { // 10%
        warnings.push('Max fee is very high (>10%)');
      }
    }

    // Validate base fee <= max fee
    if (fees.baseFee !== undefined && fees.maxFee !== undefined) {
      if (fees.baseFee > fees.maxFee) {
        errors.push('Base fee cannot be higher than max fee');
      }
    }

    // Validate reference tick filter period
    if (fees.referenceTickFilterPeriod !== undefined) {
      if (typeof fees.referenceTickFilterPeriod !== 'number' || fees.referenceTickFilterPeriod <= 0) {
        errors.push('Reference tick filter period must be a positive number');
      } else if (fees.referenceTickFilterPeriod < 10) {
        warnings.push('Reference tick filter period is very low (<10)');
      }
    }

    // Validate reset period
    if (fees.resetPeriod !== undefined) {
      if (typeof fees.resetPeriod !== 'number' || fees.resetPeriod <= 0) {
        errors.push('Reset period must be a positive number');
      } else if (fees.resetPeriod < 60) {
        warnings.push('Reset period is very low (<60 seconds)');
      }
    }

    // Validate reset tick filter
    if (fees.resetTickFilter !== undefined) {
      if (typeof fees.resetTickFilter !== 'number' || fees.resetTickFilter < 0) {
        errors.push('Reset tick filter must be a non-negative number');
      }
    }

    // Validate fee control numerator
    if (fees.feeControlNumerator !== undefined) {
      if (typeof fees.feeControlNumerator !== 'number' || fees.feeControlNumerator <= 0) {
        errors.push('Fee control numerator must be a positive number');
      }
    }

    // Validate decay filter bps
    if (fees.decayFilterBps !== undefined) {
      if (typeof fees.decayFilterBps !== 'number' || fees.decayFilterBps < 0 || fees.decayFilterBps > 10000) {
        errors.push('Decay filter bps must be between 0 and 10000');
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create fees mapper
 */
export function createFeesMapper(): FeesMapper {
  return new FeesMapper();
}

/**
 * Quick fees mapping to API format
 */
export function mapFeesToAPI(
  fees: FeeConfig | undefined
): {
  data: ClankerAPITokenRequest['fees'] | undefined;
  errors: string[];
  warnings: string[];
} {
  const mapper = createFeesMapper();
  return mapper.mapToAPI(fees);
}

/**
 * Quick fees mapping from API format
 */
export function mapFeesFromAPI(
  apiFees: ClankerAPITokenRequest['fees']
): {
  data: FeeConfig | undefined;
  errors: string[];
  warnings: string[];
} {
  const mapper = createFeesMapper();
  return mapper.mapFromAPI(apiFees);
}