import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// Mock types and interfaces for testing
interface BankrSDKOperationStructure {
  operation: 'deploy' | 'trade' | 'portfolio' | 'marketData' | 'social';
  parameters: {
    tokenName?: string;
    tokenSymbol?: string;
    amount?: number;
    recipient?: string;
    chainId?: number;
    metadata?: Record<string, any>;
    socialPlatforms?: string[];
    customFees?: {
      recipients: Array<{
        address: string;
        percentage: number;
      }>;
    };
  };
  context: {
    requestId: string;
    timestamp: number;
    version: string;
  };
}

interface BankrSDKResponseStructure {
  success: boolean;
  data?: {
    txHash?: string;
    tokenAddress?: string;
    blockNumber?: number;
    gasUsed?: number;
    socialPosts?: Array<{
      platform: string;
      postId: string;
      url: string;
    }>;
    feeDistribution?: Array<{
      recipient: string;
      amount: number;
      percentage: number;
    }>;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata: {
    operation: string;
    requestId: string;
    timestamp: number;
    processingTime: number;
    version: string;
  };
}

interface TypeValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    expected: string;
    actual: string;
    message: string;
  }>;
  warnings: string[];
}

interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  required?: boolean;
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition;
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

class TypeValidationError extends Error {
  field: string;
  expected: string;
  actual: string;

  constructor(field: string, expected: string, actual: string) {
    super(`Type validation failed for field '${field}': expected ${expected}, got ${actual}`);
    this.name = 'TypeValidationError';
    this.field = field;
    this.expected = expected;
    this.actual = actual;
  }
}

// Mock TypeSafetyValidator class for testing
class MockTypeSafetyValidator {
  private operationSchemas: Record<string, SchemaDefinition>;
  private responseSchemas: Record<string, SchemaDefinition>;

  constructor() {
    this.operationSchemas = this.initializeOperationSchemas();
    this.responseSchemas = this.initializeResponseSchemas();
  }

  validateBankrSDKOperation(operation: any): TypeValidationResult {
    try {
      const errors: Array<{ field: string; expected: string; actual: string; message: string }> = [];
      const warnings: string[] = [];

      // Validate against operation schema
      const operationSchema = this.operationSchemas['bankrOperation'];
      this.validateAgainstSchema(operation, operationSchema, '', errors);

      // Additional business logic validation
      if (operation.operation === 'deploy') {
        if (!operation.parameters?.tokenName || operation.parameters.tokenName.trim().length === 0) {
          errors.push({
            field: 'parameters.tokenName',
            expected: 'non-empty string',
            actual: typeof operation.parameters?.tokenName,
            message: 'Token name is required for deploy operations'
          });
        }
        if (!operation.parameters?.tokenSymbol || operation.parameters.tokenSymbol.trim().length === 0) {
          errors.push({
            field: 'parameters.tokenSymbol',
            expected: 'non-empty string',
            actual: typeof operation.parameters?.tokenSymbol,
            message: 'Token symbol is required for deploy operations'
          });
        }
      }

      if (operation.operation === 'trade') {
        if (!operation.parameters?.amount || operation.parameters.amount <= 0) {
          errors.push({
            field: 'parameters.amount',
            expected: 'positive number',
            actual: typeof operation.parameters?.amount,
            message: 'Amount is required and must be positive for trade operations'
          });
        }
      }

      // Validate custom fees if present
      if (operation.parameters?.customFees) {
        const feeValidation = this.validateCustomFees(operation.parameters.customFees);
        errors.push(...feeValidation.errors);
        warnings.push(...feeValidation.warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: 'root',
          expected: 'valid object',
          actual: typeof operation,
          message: error.message
        }],
        warnings: []
      };
    }
  }

  validateBankrSDKResponse(response: any, expectedOperation?: string): TypeValidationResult {
    try {
      const errors: Array<{ field: string; expected: string; actual: string; message: string }> = [];
      const warnings: string[] = [];

      // Validate against response schema
      const responseSchema = this.responseSchemas['bankrResponse'];
      this.validateAgainstSchema(response, responseSchema, '', errors);

      // Validate operation-specific response data
      if (expectedOperation && response.metadata?.operation !== expectedOperation) {
        errors.push({
          field: 'metadata.operation',
          expected: expectedOperation,
          actual: response.metadata?.operation,
          message: 'Response operation does not match expected operation'
        });
      }

      // Validate success/error consistency
      if (response.success === true && response.error) {
        warnings.push('Response marked as successful but contains error information');
      }
      if (response.success === false && !response.error) {
        errors.push({
          field: 'error',
          expected: 'error object',
          actual: 'undefined',
          message: 'Failed response must contain error information'
        });
      }

      // Validate data consistency
      if (response.success === true && response.data) {
        if (expectedOperation === 'deploy') {
          if (!response.data.txHash || !response.data.tokenAddress) {
            warnings.push('Deploy response should contain txHash and tokenAddress');
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: 'root',
          expected: 'valid object',
          actual: typeof response,
          message: error.message
        }],
        warnings: []
      };
    }
  }

  validateRuntimeTypeChecking(data: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof data === 'string';
      case 'number':
        return typeof data === 'number' && !isNaN(data);
      case 'boolean':
        return typeof data === 'boolean';
      case 'object':
        return typeof data === 'object' && data !== null && !Array.isArray(data);
      case 'array':
        return Array.isArray(data);
      case 'address':
        return typeof data === 'string' && /^0x[0-9a-fA-F]{40}$/.test(data);
      case 'txHash':
        return typeof data === 'string' && /^0x[0-9a-fA-F]{64}$/.test(data);
      case 'chainId':
        return typeof data === 'number' && data > 0 && Number.isInteger(data);
      case 'percentage':
        return typeof data === 'number' && data >= 0 && data <= 100;
      default:
        return false;
    }
  }

  exportBankrSDKTypes(): Record<string, SchemaDefinition> {
    return {
      BankrSDKOperationStructure: this.operationSchemas['bankrOperation'],
      BankrSDKResponseStructure: this.responseSchemas['bankrResponse'],
      CustomFeesStructure: {
        type: 'object',
        properties: {
          recipients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                address: { type: 'string', pattern: '^0x[0-9a-fA-F]{40}$' },
                percentage: { type: 'number', minimum: 0, maximum: 100 }
              }
            }
          }
        }
      }
    };
  }

  private validateAgainstSchema(
    data: any, 
    schema: SchemaDefinition, 
    path: string, 
    errors: Array<{ field: string; expected: string; actual: string; message: string }>
  ): void {
    if (schema.required && (data === undefined || data === null)) {
      errors.push({
        field: path || 'root',
        expected: schema.type,
        actual: 'undefined/null',
        message: `Required field is missing`
      });
      return;
    }

    if (data === undefined || data === null) {
      return; // Optional field
    }

    // Type validation
    switch (schema.type) {
      case 'string':
        if (typeof data !== 'string') {
          errors.push({
            field: path,
            expected: 'string',
            actual: typeof data,
            message: 'Expected string type'
          });
          return;
        }
        if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
          errors.push({
            field: path,
            expected: `string matching ${schema.pattern}`,
            actual: data,
            message: 'String does not match required pattern'
          });
        }
        if (schema.minLength && data.length < schema.minLength) {
          errors.push({
            field: path,
            expected: `string with min length ${schema.minLength}`,
            actual: `string with length ${data.length}`,
            message: 'String is too short'
          });
        }
        if (schema.maxLength && data.length > schema.maxLength) {
          errors.push({
            field: path,
            expected: `string with max length ${schema.maxLength}`,
            actual: `string with length ${data.length}`,
            message: 'String is too long'
          });
        }
        break;

      case 'number':
        if (typeof data !== 'number' || isNaN(data)) {
          errors.push({
            field: path,
            expected: 'number',
            actual: typeof data,
            message: 'Expected number type'
          });
          return;
        }
        if (schema.minimum !== undefined && data < schema.minimum) {
          errors.push({
            field: path,
            expected: `number >= ${schema.minimum}`,
            actual: data.toString(),
            message: 'Number is below minimum'
          });
        }
        if (schema.maximum !== undefined && data > schema.maximum) {
          errors.push({
            field: path,
            expected: `number <= ${schema.maximum}`,
            actual: data.toString(),
            message: 'Number is above maximum'
          });
        }
        break;

      case 'boolean':
        if (typeof data !== 'boolean') {
          errors.push({
            field: path,
            expected: 'boolean',
            actual: typeof data,
            message: 'Expected boolean type'
          });
        }
        break;

      case 'array':
        if (!Array.isArray(data)) {
          errors.push({
            field: path,
            expected: 'array',
            actual: typeof data,
            message: 'Expected array type'
          });
          return;
        }
        if (schema.items) {
          data.forEach((item, index) => {
            this.validateAgainstSchema(item, schema.items!, `${path}[${index}]`, errors);
          });
        }
        break;

      case 'object':
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          errors.push({
            field: path,
            expected: 'object',
            actual: Array.isArray(data) ? 'array' : typeof data,
            message: 'Expected object type'
          });
          return;
        }
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, propSchema]) => {
            const propPath = path ? `${path}.${key}` : key;
            this.validateAgainstSchema(data[key], propSchema, propPath, errors);
          });
        }
        break;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        field: path,
        expected: `one of [${schema.enum.join(', ')}]`,
        actual: data.toString(),
        message: 'Value is not in allowed enum values'
      });
    }
  }

  private validateCustomFees(customFees: any): { errors: Array<{ field: string; expected: string; actual: string; message: string }>; warnings: string[] } {
    const errors: Array<{ field: string; expected: string; actual: string; message: string }> = [];
    const warnings: string[] = [];

    if (!customFees.recipients || !Array.isArray(customFees.recipients)) {
      errors.push({
        field: 'customFees.recipients',
        expected: 'array',
        actual: typeof customFees.recipients,
        message: 'Custom fees must have recipients array'
      });
      return { errors, warnings };
    }

    if (customFees.recipients.length === 0) {
      errors.push({
        field: 'customFees.recipients',
        expected: 'non-empty array',
        actual: 'empty array',
        message: 'At least one fee recipient is required'
      });
      return { errors, warnings };
    }

    let totalPercentage = 0;
    const addresses = new Set<string>();

    customFees.recipients.forEach((recipient: any, index: number) => {
      if (!recipient.address || typeof recipient.address !== 'string') {
        errors.push({
          field: `customFees.recipients[${index}].address`,
          expected: 'string',
          actual: typeof recipient.address,
          message: 'Recipient address is required'
        });
      } else if (!/^0x[0-9a-fA-F]{40}$/.test(recipient.address)) {
        errors.push({
          field: `customFees.recipients[${index}].address`,
          expected: 'valid Ethereum address',
          actual: recipient.address,
          message: 'Invalid Ethereum address format'
        });
      } else if (addresses.has(recipient.address.toLowerCase())) {
        errors.push({
          field: `customFees.recipients[${index}].address`,
          expected: 'unique address',
          actual: recipient.address,
          message: 'Duplicate recipient address'
        });
      } else {
        addresses.add(recipient.address.toLowerCase());
      }

      if (typeof recipient.percentage !== 'number') {
        errors.push({
          field: `customFees.recipients[${index}].percentage`,
          expected: 'number',
          actual: typeof recipient.percentage,
          message: 'Recipient percentage must be a number'
        });
      } else if (recipient.percentage < 0 || recipient.percentage > 100) {
        errors.push({
          field: `customFees.recipients[${index}].percentage`,
          expected: 'number between 0 and 100',
          actual: recipient.percentage.toString(),
          message: 'Percentage must be between 0 and 100'
        });
      } else {
        totalPercentage += recipient.percentage;
      }
    });

    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push({
        field: 'customFees.recipients',
        expected: 'percentages totaling 100%',
        actual: `percentages totaling ${totalPercentage}%`,
        message: 'Fee percentages must total exactly 100%'
      });
    }

    return { errors, warnings };
  }

  private initializeOperationSchemas(): Record<string, SchemaDefinition> {
    return {
      bankrOperation: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['deploy', 'trade', 'portfolio', 'marketData', 'social'],
            required: true
          },
          parameters: {
            type: 'object',
            properties: {
              tokenName: { type: 'string', minLength: 1, maxLength: 50 },
              tokenSymbol: { type: 'string', minLength: 1, maxLength: 10 },
              amount: { type: 'number', minimum: 0 },
              recipient: { type: 'string', pattern: '^0x[0-9a-fA-F]{40}$' },
              chainId: { type: 'number', minimum: 1 },
              metadata: { type: 'object' },
              socialPlatforms: {
                type: 'array',
                items: { type: 'string', enum: ['twitter', 'farcaster'] }
              },
              customFees: {
                type: 'object',
                properties: {
                  recipients: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        address: { type: 'string', pattern: '^0x[0-9a-fA-F]{40}$', required: true },
                        percentage: { type: 'number', minimum: 0, maximum: 100, required: true }
                      }
                    }
                  }
                }
              }
            }
          },
          context: {
            type: 'object',
            required: true,
            properties: {
              requestId: { type: 'string', required: true },
              timestamp: { type: 'number', required: true },
              version: { type: 'string', required: true }
            }
          }
        }
      }
    };
  }

  private initializeResponseSchemas(): Record<string, SchemaDefinition> {
    return {
      bankrResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', required: true },
          data: {
            type: 'object',
            properties: {
              txHash: { type: 'string', pattern: '^0x[0-9a-fA-F]{64}$' },
              tokenAddress: { type: 'string', pattern: '^0x[0-9a-fA-F]{40}$' },
              blockNumber: { type: 'number', minimum: 0 },
              gasUsed: { type: 'number', minimum: 0 },
              socialPosts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    platform: { type: 'string' },
                    postId: { type: 'string' },
                    url: { type: 'string' }
                  }
                }
              },
              feeDistribution: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    recipient: { type: 'string', pattern: '^0x[0-9a-fA-F]{40}$' },
                    amount: { type: 'number', minimum: 0 },
                    percentage: { type: 'number', minimum: 0, maximum: 100 }
                  }
                }
              }
            }
          },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', required: true },
              message: { type: 'string', required: true },
              details: { type: 'object' }
            }
          },
          metadata: {
            type: 'object',
            required: true,
            properties: {
              operation: { type: 'string', required: true },
              requestId: { type: 'string', required: true },
              timestamp: { type: 'number', required: true },
              processingTime: { type: 'number', minimum: 0, required: true },
              version: { type: 'string', required: true }
            }
          }
        }
      }
    };
  }
}

// Custom generators for property testing
const generateValidBankrSDKOperation = () => fc.record({
  operation: fc.constantFrom('deploy', 'trade', 'portfolio', 'marketData', 'social'),
  parameters: fc.record({
    tokenName: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
    tokenSymbol: fc.option(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0).map(s => s.toUpperCase()), { nil: undefined }),
    amount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(1000000) }).filter(n => !isNaN(n)), { nil: undefined }),
    recipient: fc.option(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }).map(n => `0x${n.toString(16).padStart(40, '0')}`), { nil: undefined }),
    chainId: fc.option(fc.constantFrom(1, 8453, 42161, 1301, 60808), { nil: undefined }),
    metadata: fc.option(fc.record({
      description: fc.string({ minLength: 1, maxLength: 200 }),
      image: fc.webUrl(),
    }), { nil: undefined }),
    socialPlatforms: fc.option(fc.array(fc.constantFrom('twitter', 'farcaster'), { minLength: 1, maxLength: 2 }), { nil: undefined }),
    customFees: fc.option(generateValidCustomFees(), { nil: undefined }),
  }),
  context: fc.record({
    requestId: fc.uuid(),
    timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
    version: fc.constantFrom('1.0.0', '1.1.0', '2.0.0'),
  }),
}).map(op => {
  // Ensure operation-specific required fields
  if (op.operation === 'deploy') {
    return {
      ...op,
      parameters: {
        ...op.parameters,
        tokenName: op.parameters.tokenName || 'TestToken',
        tokenSymbol: op.parameters.tokenSymbol || 'TEST',
      }
    };
  }
  if (op.operation === 'trade') {
    return {
      ...op,
      parameters: {
        ...op.parameters,
        amount: (op.parameters.amount && !isNaN(op.parameters.amount)) ? op.parameters.amount : 100,
      }
    };
  }
  return op;
});

const generateValidCustomFees = () => fc.integer({ min: 1, max: 5 })
  .chain(numRecipients => 
    fc.set(
      fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER })
        .map(n => `0x${n.toString(16).padStart(40, '0')}`),
      { minLength: numRecipients, maxLength: numRecipients }
    ).map(addresses => {
      const addressArray = Array.from(addresses);
      const basePercentage = Math.floor(10000 / numRecipients) / 100;
      const remainder = 100 - (basePercentage * (numRecipients - 1));
      
      const recipients = addressArray.map((address, index) => ({
        address,
        percentage: index === numRecipients - 1 ? remainder : basePercentage,
      }));

      return { recipients };
    })
  );

const generateValidBankrSDKResponse = (operation?: string) => fc.record({
  success: fc.boolean(),
  data: fc.option(fc.record({
    txHash: fc.option(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }).map(n => `0x${n.toString(16).padStart(64, '0')}`), { nil: undefined }),
    tokenAddress: fc.option(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }).map(n => `0x${n.toString(16).padStart(40, '0')}`), { nil: undefined }),
    blockNumber: fc.option(fc.integer({ min: 18000000, max: 19000000 }), { nil: undefined }),
    gasUsed: fc.option(fc.integer({ min: 21000, max: 1000000 }), { nil: undefined }),
    socialPosts: fc.option(fc.array(fc.record({
      platform: fc.constantFrom('twitter', 'farcaster'),
      postId: fc.string({ minLength: 10, maxLength: 20 }),
      url: fc.webUrl(),
    }), { minLength: 0, maxLength: 3 }), { nil: undefined }),
    feeDistribution: fc.option(fc.array(fc.record({
      recipient: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }).map(n => `0x${n.toString(16).padStart(40, '0')}`),
      amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }).filter(n => !isNaN(n)),
      percentage: fc.float({ min: Math.fround(0.01), max: Math.fround(100) }).filter(n => !isNaN(n)),
    }), { minLength: 0, maxLength: 5 }), { nil: undefined }),
  }), { nil: undefined }),
  error: fc.option(fc.record({
    code: fc.constantFrom('VALIDATION_ERROR', 'NETWORK_ERROR', 'OPERATION_FAILED'),
    message: fc.string({ minLength: 10, maxLength: 100 }),
    details: fc.option(fc.record({
      field: fc.string({ minLength: 1, maxLength: 50 }),
      value: fc.anything(),
    }), { nil: undefined }),
  }), { nil: undefined }),
  metadata: fc.record({
    operation: operation ? fc.constant(operation) : fc.constantFrom('deploy', 'trade', 'portfolio', 'marketData', 'social'),
    requestId: fc.uuid(),
    timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
    processingTime: fc.integer({ min: 10, max: 5000 }),
    version: fc.constantFrom('1.0.0', '1.1.0', '2.0.0'),
  }),
}).map(response => {
  // Ensure success/error consistency
  if (response.success) {
    // Successful responses should not have error
    return { ...response, error: undefined };
  } else {
    // Failed responses must have error
    return {
      ...response,
      error: response.error || {
        code: 'OPERATION_FAILED',
        message: 'Operation failed',
      }
    };
  }
});

const generateInvalidBankrSDKOperation = () => fc.oneof(
  // Missing required operation
  fc.record({
    operation: fc.constant(undefined as any),
    parameters: fc.record({}),
    context: fc.record({
      requestId: fc.uuid(),
      timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
      version: fc.constantFrom('1.0.0', '1.1.0', '2.0.0'),
    }),
  }),
  
  // Invalid operation type
  fc.record({
    operation: fc.constant('invalid' as any),
    parameters: fc.record({}),
    context: fc.record({
      requestId: fc.uuid(),
      timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
      version: fc.constantFrom('1.0.0', '1.1.0', '2.0.0'),
    }),
  }),
  
  // Missing context
  fc.record({
    operation: fc.constantFrom('deploy', 'trade', 'portfolio', 'marketData', 'social'),
    parameters: fc.record({}),
    context: fc.constant(undefined as any),
  }),
  
  // Deploy operation without required fields
  fc.record({
    operation: fc.constant('deploy' as const),
    parameters: fc.record({
      tokenName: fc.constant(''), // Invalid empty name
      tokenSymbol: fc.constant(''), // Invalid empty symbol
    }),
    context: fc.record({
      requestId: fc.uuid(),
      timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
      version: fc.constantFrom('1.0.0', '1.1.0', '2.0.0'),
    }),
  }),
  
  // Trade operation without amount
  fc.record({
    operation: fc.constant('trade' as const),
    parameters: fc.record({
      amount: fc.constant(-100), // Invalid negative amount
    }),
    context: fc.record({
      requestId: fc.uuid(),
      timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
      version: fc.constantFrom('1.0.0', '1.1.0', '2.0.0'),
    }),
  })
);

describe('Type Safety and Validation Properties', () => {
  let validator: MockTypeSafetyValidator;

  beforeEach(() => {
    validator = new MockTypeSafetyValidator();
  });

  /**
   * **Property 8: Type Safety and Validation**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
   * 
   * For any Bankr SDK operation or response, the SDK should define proper TypeScript 
   * interfaces, validate data against defined types, provide runtime type checking, 
   * validate responses against expected types, and export necessary types for external use.
   */
  it('should define and validate TypeScript interfaces for Bankr SDK operations', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidBankrSDKOperation(),
      async (operation) => {
        // Test operation validation
        const result = validator.validateBankrSDKOperation(operation);
        
        // Valid operations should pass validation
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);

        // Verify operation structure
        expect(operation.operation).toBeDefined();
        expect(['deploy', 'trade', 'portfolio', 'marketData', 'social']).toContain(operation.operation);
        expect(operation.parameters).toBeDefined();
        expect(operation.context).toBeDefined();
        expect(operation.context.requestId).toBeDefined();
        expect(operation.context.timestamp).toBeGreaterThan(0);
        expect(operation.context.version).toBeDefined();

        // Verify operation-specific requirements
        if (operation.operation === 'deploy') {
          expect(operation.parameters.tokenName).toBeDefined();
          expect(operation.parameters.tokenSymbol).toBeDefined();
          expect(operation.parameters.tokenName.trim().length).toBeGreaterThan(0);
          expect(operation.parameters.tokenSymbol.trim().length).toBeGreaterThan(0);
        }

        if (operation.operation === 'trade') {
          expect(operation.parameters.amount).toBeDefined();
          expect(operation.parameters.amount).toBeGreaterThan(0);
        }

        // Verify custom fees if present
        if (operation.parameters.customFees) {
          expect(operation.parameters.customFees.recipients).toBeDefined();
          expect(Array.isArray(operation.parameters.customFees.recipients)).toBe(true);
          expect(operation.parameters.customFees.recipients.length).toBeGreaterThan(0);
          
          const totalPercentage = operation.parameters.customFees.recipients.reduce(
            (sum: number, r: any) => sum + r.percentage, 0
          );
          expect(Math.abs(totalPercentage - 100)).toBeLessThanOrEqual(0.01);
        }
      }
    ), { numRuns: 100 });
  });

  it('should define and validate TypeScript interfaces for Bankr SDK responses', async () => {
    await fc.assert(fc.asyncProperty(
      fc.constantFrom('deploy', 'trade', 'portfolio', 'marketData', 'social'),
      generateValidBankrSDKResponse(),
      async (expectedOperation, response) => {
        // Ensure response matches expected operation
        const responseWithOperation = {
          ...response,
          metadata: {
            ...response.metadata,
            operation: expectedOperation
          }
        };

        // Test response validation
        const result = validator.validateBankrSDKResponse(responseWithOperation, expectedOperation);
        
        // Valid responses should pass validation
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);

        // Verify response structure
        expect(typeof responseWithOperation.success).toBe('boolean');
        expect(responseWithOperation.metadata).toBeDefined();
        expect(responseWithOperation.metadata.operation).toBe(expectedOperation);
        expect(responseWithOperation.metadata.requestId).toBeDefined();
        expect(responseWithOperation.metadata.timestamp).toBeGreaterThan(0);
        expect(responseWithOperation.metadata.processingTime).toBeGreaterThanOrEqual(0);
        expect(responseWithOperation.metadata.version).toBeDefined();

        // Verify success/error consistency
        if (responseWithOperation.success) {
          if (responseWithOperation.error) {
            expect(result.warnings.length).toBeGreaterThan(0);
          }
        } else {
          expect(responseWithOperation.error).toBeDefined();
          expect(responseWithOperation.error.code).toBeDefined();
          expect(responseWithOperation.error.message).toBeDefined();
        }

        // Verify operation-specific data
        if (responseWithOperation.success && responseWithOperation.data) {
          if (expectedOperation === 'deploy') {
            if (responseWithOperation.data.txHash) {
              expect(responseWithOperation.data.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
            }
            if (responseWithOperation.data.tokenAddress) {
              expect(responseWithOperation.data.tokenAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
            }
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('should validate data against defined types with runtime type checking', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.record({}),
        fc.array(fc.anything()),
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }).map(n => `0x${n.toString(16).padStart(40, '0')}`),
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }).map(n => `0x${n.toString(16).padStart(64, '0')}`),
        fc.constantFrom(1, 8453, 42161, 1301, 60808),
        fc.float({ min: Math.fround(0), max: Math.fround(100) })
      ),
      (data) => {
        // Test runtime type checking
        const stringCheck = validator.validateRuntimeTypeChecking(data, 'string');
        const numberCheck = validator.validateRuntimeTypeChecking(data, 'number');
        const booleanCheck = validator.validateRuntimeTypeChecking(data, 'boolean');
        const objectCheck = validator.validateRuntimeTypeChecking(data, 'object');
        const arrayCheck = validator.validateRuntimeTypeChecking(data, 'array');

        // Verify type checking accuracy
        expect(stringCheck).toBe(typeof data === 'string');
        expect(numberCheck).toBe(typeof data === 'number' && !isNaN(data));
        expect(booleanCheck).toBe(typeof data === 'boolean');
        expect(objectCheck).toBe(typeof data === 'object' && data !== null && !Array.isArray(data));
        expect(arrayCheck).toBe(Array.isArray(data));

        // Test specialized type checking
        if (typeof data === 'string') {
          const addressCheck = validator.validateRuntimeTypeChecking(data, 'address');
          const txHashCheck = validator.validateRuntimeTypeChecking(data, 'txHash');
          
          expect(addressCheck).toBe(/^0x[0-9a-fA-F]{40}$/.test(data));
          expect(txHashCheck).toBe(/^0x[0-9a-fA-F]{64}$/.test(data));
        }

        if (typeof data === 'number') {
          const chainIdCheck = validator.validateRuntimeTypeChecking(data, 'chainId');
          const percentageCheck = validator.validateRuntimeTypeChecking(data, 'percentage');
          
          expect(chainIdCheck).toBe(data > 0 && Number.isInteger(data));
          expect(percentageCheck).toBe(data >= 0 && data <= 100);
        }
      }
    ), { numRuns: 100 });
  });

  it('should handle invalid operations with descriptive validation errors', async () => {
    await fc.assert(fc.asyncProperty(
      generateInvalidBankrSDKOperation(),
      async (invalidOperation) => {
        // Test invalid operation validation
        const result = validator.validateBankrSDKOperation(invalidOperation);
        
        // Invalid operations should fail validation
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        // Verify error structure
        result.errors.forEach(error => {
          expect(error.field).toBeDefined();
          expect(error.expected).toBeDefined();
          expect(error.actual).toBeDefined();
          expect(error.message).toBeDefined();
          expect(typeof error.field).toBe('string');
          expect(typeof error.expected).toBe('string');
          expect(typeof error.actual).toBe('string');
          expect(typeof error.message).toBe('string');
        });

        // Verify specific error cases
        if (!invalidOperation.operation) {
          expect(result.errors.some(e => e.field.includes('operation'))).toBe(true);
        }
        if (!invalidOperation.context) {
          expect(result.errors.some(e => e.field.includes('context'))).toBe(true);
        }
        if (invalidOperation.operation === 'deploy') {
          if (!invalidOperation.parameters?.tokenName || invalidOperation.parameters.tokenName.trim().length === 0) {
            expect(result.errors.some(e => e.field.includes('tokenName'))).toBe(true);
          }
          if (!invalidOperation.parameters?.tokenSymbol || invalidOperation.parameters.tokenSymbol.trim().length === 0) {
            expect(result.errors.some(e => e.field.includes('tokenSymbol'))).toBe(true);
          }
        }
        if (invalidOperation.operation === 'trade') {
          if (!invalidOperation.parameters?.amount || invalidOperation.parameters.amount <= 0) {
            expect(result.errors.some(e => e.field.includes('amount'))).toBe(true);
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('should export necessary types for external consumption', () => {
    // Test type export functionality
    const exportedTypes = validator.exportBankrSDKTypes();
    
    // Verify exported types structure
    expect(exportedTypes).toBeDefined();
    expect(typeof exportedTypes).toBe('object');
    
    // Verify specific type exports
    expect(exportedTypes.BankrSDKOperationStructure).toBeDefined();
    expect(exportedTypes.BankrSDKResponseStructure).toBeDefined();
    expect(exportedTypes.CustomFeesStructure).toBeDefined();

    // Verify type schema structure
    Object.values(exportedTypes).forEach(typeSchema => {
      expect(typeSchema.type).toBeDefined();
      expect(['object', 'array', 'string', 'number', 'boolean']).toContain(typeSchema.type);
      
      if (typeSchema.type === 'object') {
        expect(typeSchema.properties).toBeDefined();
      }
      if (typeSchema.type === 'array') {
        expect(typeSchema.items).toBeDefined();
      }
    });

    // Verify custom fees type structure
    const customFeesType = exportedTypes.CustomFeesStructure;
    expect(customFeesType.type).toBe('object');
    expect(customFeesType.properties?.recipients).toBeDefined();
    expect(customFeesType.properties?.recipients.type).toBe('array');
    expect(customFeesType.properties?.recipients.items).toBeDefined();
  });

  it('should provide comprehensive validation for complex nested structures', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidBankrSDKOperation().filter(op => op.parameters.customFees !== undefined),
      async (operationWithFees) => {
        // Test complex nested structure validation
        const result = validator.validateBankrSDKOperation(operationWithFees);
        
        // Should pass validation for valid nested structures
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);

        // Verify custom fees validation
        const customFees = operationWithFees.parameters.customFees!;
        expect(customFees.recipients).toBeDefined();
        expect(Array.isArray(customFees.recipients)).toBe(true);
        expect(customFees.recipients.length).toBeGreaterThan(0);

        // Verify each recipient
        customFees.recipients.forEach((recipient, index) => {
          expect(recipient.address).toBeDefined();
          expect(recipient.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
          expect(typeof recipient.percentage).toBe('number');
          expect(recipient.percentage).toBeGreaterThanOrEqual(0);
          expect(recipient.percentage).toBeLessThanOrEqual(100);
        });

        // Verify total percentage
        const totalPercentage = customFees.recipients.reduce((sum, r) => sum + r.percentage, 0);
        expect(Math.abs(totalPercentage - 100)).toBeLessThanOrEqual(0.01);

        // Verify no duplicate addresses
        const addresses = customFees.recipients.map(r => r.address.toLowerCase());
        const uniqueAddresses = new Set(addresses);
        expect(addresses.length).toBe(uniqueAddresses.size);
      }
    ), { numRuns: 50 });
  });
});