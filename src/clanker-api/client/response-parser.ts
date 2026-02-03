/**
 * Response Parser
 * Handles parsing and validation of API responses
 */

import type { ClankerAPIResponse, ClankerAPIErrorResponse } from '../types/api-types.js';
import { createAPIError } from '../types/error-types.js';

// ============================================================================
// Response Parser Class
// ============================================================================

export class ResponseParser {
  /**
   * Parse token deployment response
   */
  parseDeployResponse(
    response: any
  ): {
    success: boolean;
    data?: ClankerAPIResponse;
    error?: ClankerAPIErrorResponse;
  } {
    try {
      // Validate response structure
      if (!response || typeof response !== 'object') {
        return {
          success: false,
          error: {
            success: false,
            error: 'Invalid response format',
            message: 'Response is not a valid object',
          },
        };
      }

      // Check if it's an error response
      if (response.success === false) {
        return {
          success: false,
          error: this.parseErrorResponse(response),
        };
      }

      // Parse success response
      const parsedResponse = this.parseSuccessResponse(response);
      
      return {
        success: true,
        data: parsedResponse,
      };

    } catch (error) {
      return {
        success: false,
        error: {
          success: false,
          error: 'PARSE_ERROR',
          message: `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  /**
   * Validate response completeness
   */
  validateResponse(response: ClankerAPIResponse): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields for successful response
    if (response.success) {
      if (!response.expectedAddress) {
        errors.push('Missing expected token address in successful response');
      } else if (!this.isValidAddress(response.expectedAddress)) {
        errors.push('Invalid token address format in response');
      }

      // Optional but expected fields
      if (!response.deploymentTxHash) {
        warnings.push('Missing deployment transaction hash');
      } else if (!this.isValidTxHash(response.deploymentTxHash)) {
        warnings.push('Invalid deployment transaction hash format');
      }

      if (!response.poolAddress) {
        warnings.push('Missing pool address');
      } else if (!this.isValidAddress(response.poolAddress)) {
        warnings.push('Invalid pool address format');
      }

      if (!response.liquidityTxHash) {
        warnings.push('Missing liquidity transaction hash');
      } else if (!this.isValidTxHash(response.liquidityTxHash)) {
        warnings.push('Invalid liquidity transaction hash format');
      }

      // Validate numeric fields
      if (response.estimatedGas && !this.isValidGasEstimate(response.estimatedGas)) {
        warnings.push('Invalid gas estimate format');
      }

      if (response.totalCost && !this.isValidCostEstimate(response.totalCost)) {
        warnings.push('Invalid total cost format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extract deployment information from response
   */
  extractDeploymentInfo(response: ClankerAPIResponse): {
    tokenAddress?: string;
    deploymentTx?: string;
    poolAddress?: string;
    liquidityTx?: string;
    gasEstimate?: string;
    totalCost?: string;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (!response.success) {
      warnings.push('Cannot extract deployment info from failed response');
      return { warnings };
    }

    const info = {
      tokenAddress: response.expectedAddress,
      deploymentTx: response.deploymentTxHash,
      poolAddress: response.poolAddress,
      liquidityTx: response.liquidityTxHash,
      gasEstimate: response.estimatedGas,
      totalCost: response.totalCost,
      warnings,
    };

    // Validate extracted information
    if (info.tokenAddress && !this.isValidAddress(info.tokenAddress)) {
      warnings.push('Extracted token address appears invalid');
    }

    if (info.deploymentTx && !this.isValidTxHash(info.deploymentTx)) {
      warnings.push('Extracted deployment transaction hash appears invalid');
    }

    if (info.poolAddress && !this.isValidAddress(info.poolAddress)) {
      warnings.push('Extracted pool address appears invalid');
    }

    if (info.liquidityTx && !this.isValidTxHash(info.liquidityTx)) {
      warnings.push('Extracted liquidity transaction hash appears invalid');
    }

    return info;
  }

  /**
   * Parse error details from failed response
   */
  parseErrorDetails(errorResponse: ClankerAPIErrorResponse): {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  } {
    const code = errorResponse.code || 'UNKNOWN_ERROR';
    const message = errorResponse.message || errorResponse.error || 'Unknown error occurred';
    const details = errorResponse.details;

    // Determine if error is retryable based on code/message
    const retryable = this.isRetryableError(code, message);

    return {
      code,
      message,
      details,
      retryable,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private parseSuccessResponse(response: any): ClankerAPIResponse {
    return {
      success: true,
      expectedAddress: response.expectedAddress,
      deploymentTxHash: response.deploymentTxHash,
      poolAddress: response.poolAddress,
      liquidityTxHash: response.liquidityTxHash,
      estimatedGas: response.estimatedGas,
      totalCost: response.totalCost,
    };
  }

  private parseErrorResponse(response: any): ClankerAPIErrorResponse {
    return {
      success: false,
      error: response.error || 'Unknown error',
      message: response.message,
      code: response.code,
      details: response.details,
    };
  }

  private isRetryableError(code: string, message: string): boolean {
    // Network/server errors are typically retryable
    const retryableCodes = [
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'TIMEOUT',
      'RATE_LIMIT',
      'SERVICE_UNAVAILABLE',
    ];

    if (retryableCodes.includes(code)) {
      return true;
    }

    // Check message for retryable indicators
    const retryableMessages = [
      'timeout',
      'rate limit',
      'server error',
      'service unavailable',
      'internal error',
    ];

    const lowerMessage = message.toLowerCase();
    return retryableMessages.some(indicator => lowerMessage.includes(indicator));
  }

  // ==========================================================================
  // Validation Utilities
  // ==========================================================================

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  private isValidGasEstimate(gas: string): boolean {
    // Should be a numeric string
    return /^\d+$/.test(gas) && parseInt(gas) > 0;
  }

  private isValidCostEstimate(cost: string): boolean {
    // Should be a numeric string (possibly with decimals)
    return /^\d+(\.\d+)?$/.test(cost) && parseFloat(cost) >= 0;
  }
}

// ============================================================================
// Response Utilities
// ============================================================================

/**
 * Quick response parsing
 */
export function parseAPIResponse(response: any): {
  success: boolean;
  data?: ClankerAPIResponse;
  error?: ClankerAPIErrorResponse;
} {
  const parser = new ResponseParser();
  return parser.parseDeployResponse(response);
}

/**
 * Extract key information from successful response
 */
export function extractDeploymentResult(response: ClankerAPIResponse): {
  address: string;
  txHash: string;
  poolAddress?: string;
  liquidityTxHash?: string;
} | null {
  if (!response.success || !response.expectedAddress) {
    return null;
  }

  return {
    address: response.expectedAddress,
    txHash: response.deploymentTxHash || '',
    poolAddress: response.poolAddress,
    liquidityTxHash: response.liquidityTxHash,
  };
}

/**
 * Check if response indicates a retryable error
 */
export function isRetryableResponse(response: any): boolean {
  if (response.success) {
    return false;
  }

  const parser = new ResponseParser();
  const errorDetails = parser.parseErrorDetails(response);
  return errorDetails.retryable;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create response parser
 */
export function createResponseParser(): ResponseParser {
  return new ResponseParser();
}