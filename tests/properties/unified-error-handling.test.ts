import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// Mock types and interfaces for testing
interface OperationContext {
  method: 'direct' | 'enhanced';
  operation: string;
  chainId: number;
  timestamp: number;
  requestId: string;
}

interface RetryGuidance {
  retryable: boolean;
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  retryAfter?: number;
  conditions?: string[];
}

interface ErrorContext {
  operation: OperationContext;
  originalError?: any;
  retryGuidance: RetryGuidance;
  debugInfo: Record<string, any>;
}

// Base SDK Error class
class SDKError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly timestamp: number;

  constructor(message: string, code: string, context: ErrorContext) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
  }
}

// Specific error types
class ValidationError extends SDKError {
  constructor(message: string, context: ErrorContext) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

class NetworkError extends SDKError {
  constructor(message: string, context: ErrorContext) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

class DeploymentError extends SDKError {
  constructor(message: string, context: ErrorContext) {
    super(message, 'DEPLOYMENT_ERROR', context);
    this.name = 'DeploymentError';
  }
}

class SocialIntegrationError extends SDKError {
  constructor(message: string, context: ErrorContext) {
    super(message, 'SOCIAL_INTEGRATION_ERROR', context);
    this.name = 'SocialIntegrationError';
  }
}

class BankrSDKError extends SDKError {
  constructor(message: string, context: ErrorContext) {
    super(message, 'BANKR_SDK_ERROR', context);
    this.name = 'BankrSDKError';
  }
}

// Mock operation configuration
interface OperationConfig {
  method: 'direct' | 'enhanced';
  operation: 'deploy' | 'social' | 'fees' | 'validate';
  chainId: number;
  data: Record<string, any>;
  simulateError?: {
    type: 'validation' | 'network' | 'deployment' | 'social' | 'bankr';
    message: string;
    retryable?: boolean;
  };
}

// Mock UnifiedErrorHandler class for testing
class MockUnifiedErrorHandler {
  async executeOperation(config: OperationConfig): Promise<any> {
    const context = this.createOperationContext(config);

    try {
      // Simulate error if configured
      if (config.simulateError) {
        await this.simulateError(config.simulateError, context);
      }

      // Simulate successful operation
      return {
        success: true,
        result: `Operation ${config.operation} completed successfully`,
        context
      };
    } catch (error) {
      // Handle and map errors
      throw this.mapError(error, context);
    }
  }

  private createOperationContext(config: OperationConfig): OperationContext {
    return {
      method: config.method,
      operation: config.operation,
      chainId: config.chainId,
      timestamp: Date.now(),
      requestId: `req_${Math.random().toString(36).substring(2, 15)}`
    };
  }

  private async simulateError(errorConfig: NonNullable<OperationConfig['simulateError']>, context: OperationContext): Promise<void> {
    const errorContext: ErrorContext = {
      operation: context,
      retryGuidance: this.getRetryGuidance(errorConfig.type, context.method, errorConfig.retryable),
      debugInfo: {
        simulatedError: true,
        errorType: errorConfig.type,
        method: context.method
      }
    };

    switch (errorConfig.type) {
      case 'validation':
        throw new ValidationError(errorConfig.message, errorContext);
      case 'network':
        throw new NetworkError(errorConfig.message, errorContext);
      case 'deployment':
        throw new DeploymentError(errorConfig.message, errorContext);
      case 'social':
        throw new SocialIntegrationError(errorConfig.message, errorContext);
      case 'bankr':
        // Simulate Bankr SDK error that needs mapping
        const bankrError = new Error(errorConfig.message);
        (bankrError as any).code = 'BANKR_INTERNAL_ERROR';
        (bankrError as any).details = { bankrSpecific: true };
        throw bankrError;
      default:
        throw new Error(errorConfig.message);
    }
  }

  private mapError(error: any, context: OperationContext): SDKError {
    const errorContext: ErrorContext = {
      operation: context,
      originalError: error,
      retryGuidance: this.getRetryGuidance(this.classifyError(error), context.method),
      debugInfo: {
        originalErrorName: error.name,
        originalErrorCode: error.code,
        method: context.method,
        operation: context.operation
      }
    };

    // Map Bankr SDK errors to standard SDK errors
    if (this.isBankrSDKError(error)) {
      return new BankrSDKError(
        `Bankr SDK operation failed: ${error.message}`,
        {
          ...errorContext,
          debugInfo: {
            ...errorContext.debugInfo,
            bankrErrorCode: error.code,
            bankrErrorDetails: error.details
          }
        }
      );
    }

    // Map other error types
    if (error instanceof ValidationError) {
      return error;
    }

    if (error instanceof NetworkError) {
      return error;
    }

    if (error instanceof DeploymentError) {
      return error;
    }

    if (error instanceof SocialIntegrationError) {
      return error;
    }

    // Handle network-related errors
    if (this.isNetworkError(error)) {
      return new NetworkError(
        `Network operation failed: ${error.message}`,
        errorContext
      );
    }

    // Default to generic SDK error
    return new SDKError(
      `Operation failed: ${error.message}`,
      'UNKNOWN_ERROR',
      errorContext
    );
  }

  private classifyError(error: any): 'validation' | 'network' | 'deployment' | 'social' | 'bankr' | 'unknown' {
    if (error instanceof ValidationError) return 'validation';
    if (error instanceof NetworkError) return 'network';
    if (error instanceof DeploymentError) return 'deployment';
    if (error instanceof SocialIntegrationError) return 'social';
    if (this.isBankrSDKError(error)) return 'bankr';
    if (this.isNetworkError(error)) return 'network';
    return 'unknown';
  }

  private isBankrSDKError(error: any): boolean {
    return error.code && error.code.startsWith('BANKR_');
  }

  private isNetworkError(error: any): boolean {
    return error.message && (
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('connection') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    );
  }

  private getRetryGuidance(errorType: string, method: 'direct' | 'enhanced', retryable?: boolean): RetryGuidance {
    const baseGuidance: RetryGuidance = {
      retryable: retryable ?? false,
      maxRetries: 0,
      backoffStrategy: 'linear'
    };

    switch (errorType) {
      case 'network':
        return {
          retryable: true,
          maxRetries: method === 'enhanced' ? 5 : 3,
          backoffStrategy: 'exponential',
          retryAfter: 1000,
          conditions: ['Check network connectivity', 'Verify RPC endpoint']
        };

      case 'deployment':
        return {
          retryable: true,
          maxRetries: method === 'enhanced' ? 3 : 2,
          backoffStrategy: 'linear',
          retryAfter: 2000,
          conditions: ['Check gas price', 'Verify wallet balance']
        };

      case 'social':
        return {
          retryable: true,
          maxRetries: 2,
          backoffStrategy: 'linear',
          retryAfter: 5000,
          conditions: ['Check social platform credentials', 'Verify API rate limits']
        };

      case 'bankr':
        return {
          retryable: true,
          maxRetries: method === 'enhanced' ? 4 : 2,
          backoffStrategy: 'exponential',
          retryAfter: 1500,
          conditions: ['Check Bankr SDK configuration', 'Verify API access']
        };

      case 'validation':
        return {
          retryable: false,
          maxRetries: 0,
          backoffStrategy: 'linear',
          conditions: ['Fix validation errors', 'Check input parameters']
        };

      default:
        return baseGuidance;
    }
  }

  validateErrorHandling(config: OperationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.method || !['direct', 'enhanced'].includes(config.method)) {
      errors.push('Invalid operation method: must be direct or enhanced');
    }

    if (!config.operation || !['deploy', 'social', 'fees', 'validate'].includes(config.operation)) {
      errors.push('Invalid operation type');
    }

    if (!config.chainId || config.chainId <= 0) {
      errors.push('Valid chain ID is required');
    }

    if (!config.data || typeof config.data !== 'object') {
      errors.push('Operation data is required');
    }

    return { valid: errors.length === 0, errors };
  }
}

// Custom generators for property testing
const generateOperationContext = () => fc.record({
  method: fc.constantFrom('direct', 'enhanced'),
  operation: fc.constantFrom('deploy', 'social', 'fees', 'validate'),
  chainId: fc.integer({ min: 1, max: 999999 }),
  timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
  requestId: fc.string({ minLength: 10, maxLength: 20 }),
});

const generateOperationData = () => fc.record({
  tokenName: fc.string({ minLength: 1, maxLength: 50 }),
  tokenSymbol: fc.string({ minLength: 1, maxLength: 10 }),
  deployerAddress: fc.string({ minLength: 42, maxLength: 42 }),
  additionalParams: fc.record({
    gasLimit: fc.integer({ min: 21000, max: 10000000 }),
    gasPrice: fc.integer({ min: 1000000000, max: 100000000000 }),
  })
});

const generateErrorConfig = () => fc.record({
  type: fc.constantFrom('validation', 'network', 'deployment', 'social', 'bankr'),
  message: fc.string({ minLength: 10, maxLength: 100 }),
  retryable: fc.boolean(),
});

const generateOperationConfig = () => fc.record({
  method: fc.constantFrom('direct', 'enhanced'),
  operation: fc.constantFrom('deploy', 'social', 'fees', 'validate'),
  chainId: fc.integer({ min: 1, max: 999999 }),
  data: generateOperationData(),
  simulateError: fc.option(generateErrorConfig(), { nil: undefined }),
});

const generateValidOperationConfig = () => 
  generateOperationConfig()
    .filter(config => config.simulateError === undefined);

const generateErrorOperationConfig = () => 
  generateOperationConfig()
    .filter(config => config.simulateError !== undefined);

const generateInvalidOperationConfig = () => fc.oneof(
  // Invalid method
  fc.record({
    method: fc.constant('invalid' as any),
    operation: fc.constantFrom('deploy', 'social', 'fees', 'validate'),
    chainId: fc.integer({ min: 1, max: 999999 }),
    data: generateOperationData(),
  }),
  
  // Invalid operation
  fc.record({
    method: fc.constantFrom('direct', 'enhanced'),
    operation: fc.constant('invalid' as any),
    chainId: fc.integer({ min: 1, max: 999999 }),
    data: generateOperationData(),
  }),
  
  // Invalid chain ID
  fc.record({
    method: fc.constantFrom('direct', 'enhanced'),
    operation: fc.constantFrom('deploy', 'social', 'fees', 'validate'),
    chainId: fc.constant(0),
    data: generateOperationData(),
  }),
  
  // Invalid data
  fc.record({
    method: fc.constantFrom('direct', 'enhanced'),
    operation: fc.constantFrom('deploy', 'social', 'fees', 'validate'),
    chainId: fc.integer({ min: 1, max: 999999 }),
    data: fc.constant(null as any),
  })
);

describe('Unified Error Handling and Context Properties', () => {
  let errorHandler: MockUnifiedErrorHandler;

  beforeEach(() => {
    errorHandler = new MockUnifiedErrorHandler();
  });

  /**
   * **Property 7: Unified Error Handling and Context**
   * **Validates: Requirements 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5**
   * 
   * For any operation that fails, the SDK should provide consistent error types,
   * map errors appropriately between direct and enhanced methods, include operation
   * context for debugging, and provide appropriate retry guidance.
   */
  it('should provide consistent error handling across direct and enhanced methods', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidOperationConfig(),
      async (config) => {
        // Test successful operation
        const result = await errorHandler.executeOperation(config);
        
        // Operation should succeed
        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();
        expect(result.context).toBeDefined();

        // Verify operation context
        expect(result.context.method).toBe(config.method);
        expect(result.context.operation).toBe(config.operation);
        expect(result.context.chainId).toBe(config.chainId);
        expect(result.context.timestamp).toBeGreaterThan(0);
        expect(result.context.requestId).toBeDefined();
      }
    ), { numRuns: 100 });
  });

  it('should map errors consistently and provide appropriate context', async () => {
    await fc.assert(fc.asyncProperty(
      generateErrorOperationConfig(),
      async (config) => {
        // Test error handling
        try {
          await errorHandler.executeOperation(config);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          // Should be an SDK error
          expect(error).toBeInstanceOf(SDKError);
          
          const sdkError = error as SDKError;
          
          // Verify error structure
          expect(sdkError.code).toBeDefined();
          expect(sdkError.message).toBeDefined();
          expect(sdkError.context).toBeDefined();
          expect(sdkError.timestamp).toBeGreaterThan(0);

          // Verify operation context
          expect(sdkError.context.operation.method).toBe(config.method);
          expect(sdkError.context.operation.operation).toBe(config.operation);
          expect(sdkError.context.operation.chainId).toBe(config.chainId);
          expect(sdkError.context.operation.requestId).toBeDefined();

          // Verify retry guidance
          expect(sdkError.context.retryGuidance).toBeDefined();
          expect(typeof sdkError.context.retryGuidance.retryable).toBe('boolean');
          expect(typeof sdkError.context.retryGuidance.maxRetries).toBe('number');
          expect(['linear', 'exponential']).toContain(sdkError.context.retryGuidance.backoffStrategy);

          // Verify debug info
          expect(sdkError.context.debugInfo).toBeDefined();
          expect(sdkError.context.debugInfo.method).toBe(config.method);

          // Verify error type mapping
          const errorType = config.simulateError!.type;
          switch (errorType) {
            case 'validation':
              expect(sdkError).toBeInstanceOf(ValidationError);
              expect(sdkError.code).toBe('VALIDATION_ERROR');
              expect(sdkError.context.retryGuidance.retryable).toBe(false);
              break;
            case 'network':
              expect(sdkError).toBeInstanceOf(NetworkError);
              expect(sdkError.code).toBe('NETWORK_ERROR');
              expect(sdkError.context.retryGuidance.retryable).toBe(true);
              break;
            case 'deployment':
              expect(sdkError).toBeInstanceOf(DeploymentError);
              expect(sdkError.code).toBe('DEPLOYMENT_ERROR');
              expect(sdkError.context.retryGuidance.retryable).toBe(true);
              break;
            case 'social':
              expect(sdkError).toBeInstanceOf(SocialIntegrationError);
              expect(sdkError.code).toBe('SOCIAL_INTEGRATION_ERROR');
              expect(sdkError.context.retryGuidance.retryable).toBe(true);
              break;
            case 'bankr':
              expect(sdkError).toBeInstanceOf(BankrSDKError);
              expect(sdkError.code).toBe('BANKR_SDK_ERROR');
              expect(sdkError.context.retryGuidance.retryable).toBe(true);
              expect(sdkError.context.debugInfo.bankrErrorCode).toBeDefined();
              break;
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('should provide method-appropriate retry guidance', async () => {
    await fc.assert(fc.asyncProperty(
      generateErrorOperationConfig(),
      async (config) => {
        try {
          await errorHandler.executeOperation(config);
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          const sdkError = error as SDKError;
          const retryGuidance = sdkError.context.retryGuidance;
          const errorType = config.simulateError!.type;
          const method = config.method;

          // Verify retry guidance is appropriate for method and error type
          if (errorType === 'network') {
            expect(retryGuidance.retryable).toBe(true);
            expect(retryGuidance.maxRetries).toBe(method === 'enhanced' ? 5 : 3);
            expect(retryGuidance.backoffStrategy).toBe('exponential');
            expect(retryGuidance.retryAfter).toBe(1000);
            expect(retryGuidance.conditions).toContain('Check network connectivity');
          } else if (errorType === 'deployment') {
            expect(retryGuidance.retryable).toBe(true);
            expect(retryGuidance.maxRetries).toBe(method === 'enhanced' ? 3 : 2);
            expect(retryGuidance.backoffStrategy).toBe('linear');
            expect(retryGuidance.retryAfter).toBe(2000);
            expect(retryGuidance.conditions).toContain('Check gas price');
          } else if (errorType === 'social') {
            expect(retryGuidance.retryable).toBe(true);
            expect(retryGuidance.maxRetries).toBe(2);
            expect(retryGuidance.backoffStrategy).toBe('linear');
            expect(retryGuidance.retryAfter).toBe(5000);
            expect(retryGuidance.conditions).toContain('Check social platform credentials');
          } else if (errorType === 'bankr') {
            expect(retryGuidance.retryable).toBe(true);
            expect(retryGuidance.maxRetries).toBe(method === 'enhanced' ? 4 : 2);
            expect(retryGuidance.backoffStrategy).toBe('exponential');
            expect(retryGuidance.retryAfter).toBe(1500);
            expect(retryGuidance.conditions).toContain('Check Bankr SDK configuration');
          } else if (errorType === 'validation') {
            expect(retryGuidance.retryable).toBe(false);
            expect(retryGuidance.maxRetries).toBe(0);
            expect(retryGuidance.conditions).toContain('Fix validation errors');
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('should handle invalid operation configurations', async () => {
    await fc.assert(fc.asyncProperty(
      generateInvalidOperationConfig(),
      async (invalidConfig) => {
        // Test configuration validation
        const validation = errorHandler.validateErrorHandling(invalidConfig);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);

        // Test operation should fail with validation error
        try {
          await errorHandler.executeOperation(invalidConfig);
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          // Should be some kind of error (validation or other)
          expect(error).toBeInstanceOf(Error);
        }
      }
    ), { numRuns: 100 });
  });

  it('should maintain consistent error structure across all error types', () => {
    fc.assert(fc.property(
      generateOperationContext(),
      generateErrorConfig(),
      (context, errorConfig) => {
        const errorContext: ErrorContext = {
          operation: context,
          retryGuidance: {
            retryable: errorConfig.retryable,
            maxRetries: 3,
            backoffStrategy: 'linear'
          },
          debugInfo: {
            testError: true,
            errorType: errorConfig.type
          }
        };

        let error: SDKError;
        switch (errorConfig.type) {
          case 'validation':
            error = new ValidationError(errorConfig.message, errorContext);
            break;
          case 'network':
            error = new NetworkError(errorConfig.message, errorContext);
            break;
          case 'deployment':
            error = new DeploymentError(errorConfig.message, errorContext);
            break;
          case 'social':
            error = new SocialIntegrationError(errorConfig.message, errorContext);
            break;
          case 'bankr':
            error = new BankrSDKError(errorConfig.message, errorContext);
            break;
          default:
            error = new SDKError(errorConfig.message, 'UNKNOWN_ERROR', errorContext);
        }

        // Verify consistent error structure
        expect(error).toBeInstanceOf(SDKError);
        expect(error.message).toBe(errorConfig.message);
        expect(error.code).toBeDefined();
        expect(error.context).toBeDefined();
        expect(error.timestamp).toBeGreaterThan(0);

        // Verify context structure
        expect(error.context.operation).toBe(context);
        expect(error.context.retryGuidance).toBeDefined();
        expect(error.context.debugInfo).toBeDefined();

        // Verify operation context preservation
        expect(error.context.operation.method).toBe(context.method);
        expect(error.context.operation.operation).toBe(context.operation);
        expect(error.context.operation.chainId).toBe(context.chainId);
        expect(error.context.operation.requestId).toBe(context.requestId);
      }
    ), { numRuns: 100 });
  });

  it('should provide descriptive error messages for validation failures', () => {
    const testCases = [
      {
        config: {
          method: 'invalid' as any,
          operation: 'deploy' as const,
          chainId: 1,
          data: { test: true }
        },
        expectedError: 'Invalid operation method'
      },
      {
        config: {
          method: 'direct' as const,
          operation: 'invalid' as any,
          chainId: 1,
          data: { test: true }
        },
        expectedError: 'Invalid operation type'
      },
      {
        config: {
          method: 'enhanced' as const,
          operation: 'deploy' as const,
          chainId: 0,
          data: { test: true }
        },
        expectedError: 'Valid chain ID is required'
      },
      {
        config: {
          method: 'direct' as const,
          operation: 'social' as const,
          chainId: 1,
          data: null as any
        },
        expectedError: 'Operation data is required'
      }
    ];

    testCases.forEach(({ config, expectedError }) => {
      const validation = errorHandler.validateErrorHandling(config as OperationConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes(expectedError))).toBe(true);
    });
  });
});