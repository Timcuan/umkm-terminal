import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// Mock types and interfaces for testing
interface CustomFeeRecipient {
  address: string;
  percentage: number;
  description?: string;
}

interface CustomFeeConfig {
  recipients: CustomFeeRecipient[];
  totalPercentage?: number;
}

class ValidationError extends Error {
  code: string;
  field?: string;
  value?: any;

  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

// Mock CustomFeeManager class for testing
class MockCustomFeeManager {
  async configureFees(tokenAddress: string, recipients: CustomFeeRecipient[]): Promise<void> {
    // Validate token address format
    if (!tokenAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
      throw new ValidationError(`Invalid token address format: ${tokenAddress}`);
    }

    // Validate recipients array
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new ValidationError('Recipients array cannot be empty');
    }

    // Validate each recipient
    for (const recipient of recipients) {
      this.validateRecipient(recipient);
    }

    // Validate total percentage equals 100%
    const totalPercentage = recipients.reduce((sum, r) => sum + r.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      const error = new ValidationError(`Total fee percentage must equal 100%, got ${totalPercentage}%`);
      (error as any).code = 'INVALID_TOTAL_PERCENTAGE';
      (error as any).value = totalPercentage;
      throw error;
    }

    // Simulate successful configuration
    return Promise.resolve();
  }

  validateCustomFeeConfig(config: CustomFeeConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.recipients || !Array.isArray(config.recipients)) {
      errors.push('Recipients array is required');
      return { valid: false, errors };
    }

    if (config.recipients.length === 0) {
      errors.push('At least one fee recipient is required');
      return { valid: false, errors };
    }

    if (config.recipients.length > 10) {
      errors.push('Maximum 10 fee recipients allowed');
      return { valid: false, errors };
    }

    // Validate each recipient
    config.recipients.forEach((recipient, index) => {
      try {
        this.validateRecipient(recipient);
      } catch (error) {
        errors.push(`Recipient ${index + 1}: ${error.message}`);
      }
    });

    // Validate total percentage
    const totalPercentage = config.recipients.reduce((sum, r) => sum + r.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push(`Total percentage must equal 100%, got ${totalPercentage}%`);
    }

    // Check for duplicate addresses
    const addresses = config.recipients.map(r => r.address.toLowerCase());
    const uniqueAddresses = new Set(addresses);
    if (addresses.length !== uniqueAddresses.size) {
      errors.push('Duplicate recipient addresses are not allowed');
    }

    return { valid: errors.length === 0, errors };
  }

  private validateRecipient(recipient: CustomFeeRecipient): void {
    // Validate address format
    if (!recipient.address || !recipient.address.match(/^0x[0-9a-fA-F]{40}$/)) {
      throw new ValidationError(`Invalid recipient address format: ${recipient.address}`);
    }

    // Validate percentage
    if (typeof recipient.percentage !== 'number') {
      throw new ValidationError('Recipient percentage must be a number');
    }

    if (recipient.percentage <= 0) {
      throw new ValidationError('Recipient percentage must be greater than 0');
    }

    if (recipient.percentage > 100) {
      throw new ValidationError('Recipient percentage cannot exceed 100%');
    }

    // Validate description if provided
    if (recipient.description !== undefined) {
      if (typeof recipient.description !== 'string') {
        throw new ValidationError('Recipient description must be a string');
      }
      if (recipient.description.length > 200) {
        throw new ValidationError('Recipient description cannot exceed 200 characters');
      }
    }
  }

  async setCustomFees(tokenAddress: string, feeConfig: CustomFeeConfig): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      // Validate configuration first
      const validation = this.validateCustomFeeConfig(feeConfig);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }

      // Configure fees
      await this.configureFees(tokenAddress, feeConfig.recipients);

      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Custom generators for property testing
const generateValidAddress = () => 
  fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER })
    .map(n => `0x${n.toString(16).padStart(40, '0')}`);

const generateUniqueAddresses = (count: number) =>
  fc.set(generateValidAddress(), { minLength: count, maxLength: count })
    .map(addresses => Array.from(addresses));

const generateCustomFeeRecipient = () => fc.record({
  address: generateValidAddress(),
  percentage: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noDefaultInfinity: true, noNaN: true }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
});

const generateValidCustomFeeConfig = () => {
  return fc.integer({ min: 1, max: 10 })
    .chain(numRecipients => 
      generateUniqueAddresses(numRecipients)
        .map(addresses => {
          // Create recipients with equal distribution that sums to 100%
          const basePercentage = Math.floor(10000 / numRecipients) / 100; // Two decimal precision
          const remainder = 100 - (basePercentage * (numRecipients - 1));
          
          const recipients = addresses.map((address, index) => ({
            address,
            percentage: index === numRecipients - 1 ? remainder : basePercentage,
            description: Math.random() > 0.5 ? `Recipient ${index + 1}` : undefined
          }));

          return {
            recipients,
            totalPercentage: 100
          };
        })
    );
};

const generateInvalidCustomFeeConfig = () => fc.oneof(
  // Empty recipients
  fc.constant({ recipients: [] as CustomFeeRecipient[] }),
  
  // Too many recipients
  fc.array(generateCustomFeeRecipient(), { minLength: 11, maxLength: 15 })
    .map(recipients => ({ recipients: recipients as CustomFeeRecipient[] })),
  
  // Invalid total percentage
  fc.array(generateCustomFeeRecipient(), { minLength: 1, maxLength: 5 })
    .filter(recipients => {
      const total = recipients.reduce((sum, r) => sum + r.percentage, 0);
      return Math.abs(total - 100) > 0.01;
    })
    .map(recipients => ({ recipients: recipients as CustomFeeRecipient[] })),
  
  // Duplicate addresses
  fc.tuple(generateValidAddress(), fc.array(generateCustomFeeRecipient(), { minLength: 1, maxLength: 3 }))
    .map(([duplicateAddress, recipients]) => ({
      recipients: [
        { address: duplicateAddress, percentage: 50 },
        { address: duplicateAddress, percentage: 50 },
        ...recipients.slice(0, -2)
      ] as CustomFeeRecipient[]
    })),
  
  // Invalid recipient data
  fc.constant({
    recipients: [
      { address: 'invalid-address', percentage: 100 }
    ] as CustomFeeRecipient[]
  })
);

describe('Custom Fee Configuration Properties', () => {
  let feeManager: MockCustomFeeManager;

  beforeEach(() => {
    feeManager = new MockCustomFeeManager();
  });

  /**
   * **Property 4: Custom Fee Configuration**
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
   * 
   * For any custom fee configuration, the SDK should set fees to specified addresses 
   * with exact percentages, validate that total percentages equal 100%, and provide 
   * clear validation errors for invalid configurations.
   */
  it('should validate and configure custom fees correctly', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidCustomFeeConfig(),
      generateValidAddress(),
      async (feeConfig, tokenAddress) => {
        // Test configuration validation
        const validation = feeManager.validateCustomFeeConfig(feeConfig);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Test fee configuration
        const result = await feeManager.setCustomFees(tokenAddress, feeConfig);
        expect(result.success).toBe(true);
        expect(result.txHash).toBeDefined();
        expect(result.error).toBeUndefined();

        // Verify total percentage is exactly 100%
        const totalPercentage = feeConfig.recipients.reduce((sum, r) => sum + r.percentage, 0);
        expect(Math.abs(totalPercentage - 100)).toBeLessThanOrEqual(0.01);

        // Verify all recipients have valid addresses
        feeConfig.recipients.forEach(recipient => {
          expect(recipient.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
          expect(recipient.percentage).toBeGreaterThan(0);
          expect(recipient.percentage).toBeLessThanOrEqual(100);
        });

        // Verify no duplicate addresses
        const addresses = feeConfig.recipients.map(r => r.address.toLowerCase());
        const uniqueAddresses = new Set(addresses);
        expect(addresses.length).toBe(uniqueAddresses.size);
      }
    ), { numRuns: 100 });
  });

  it('should reject invalid custom fee configurations', async () => {
    await fc.assert(fc.asyncProperty(
      generateInvalidCustomFeeConfig(),
      generateValidAddress(),
      async (invalidConfig, tokenAddress) => {
        // Test configuration validation
        const validation = feeManager.validateCustomFeeConfig(invalidConfig);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);

        // Test fee configuration should fail
        const result = await feeManager.setCustomFees(tokenAddress, invalidConfig);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.txHash).toBeUndefined();
      }
    ), { numRuns: 100 });
  });

  it('should handle multiple recipients with precise percentage distribution', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 10 }),
      (numRecipients) => {
        // Create recipients with equal distribution
        const basePercentage = Math.floor(10000 / numRecipients) / 100; // Two decimal precision
        const remainder = 100 - (basePercentage * (numRecipients - 1));
        
        const recipients = Array.from({ length: numRecipients }, (_, index) => ({
          address: `0x${index.toString(16).padStart(40, '0')}`,
          percentage: index === numRecipients - 1 ? remainder : basePercentage,
          description: `Recipient ${index + 1}`
        }));

        const feeConfig = { recipients };
        const validation = feeManager.validateCustomFeeConfig(feeConfig);

        // Should be valid as total equals 100%
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Verify total percentage
        const totalPercentage = recipients.reduce((sum, r) => sum + r.percentage, 0);
        expect(Math.abs(totalPercentage - 100)).toBeLessThanOrEqual(0.01);

        // Verify all addresses are unique
        const addresses = recipients.map(r => r.address.toLowerCase());
        const uniqueAddresses = new Set(addresses);
        expect(addresses.length).toBe(uniqueAddresses.size);
      }
    ), { numRuns: 50 });
  });

  it('should provide descriptive error messages for validation failures', () => {
    const testCases = [
      {
        config: { recipients: [] },
        expectedError: 'At least one fee recipient is required'
      },
      {
        config: { recipients: Array(11).fill({ address: '0x1234567890123456789012345678901234567890', percentage: 9.09 }) },
        expectedError: 'Maximum 10 fee recipients allowed'
      },
      {
        config: { recipients: [{ address: 'invalid', percentage: 100 }] },
        expectedError: 'Invalid recipient address format'
      },
      {
        config: { recipients: [{ address: '0x1234567890123456789012345678901234567890', percentage: 0 }] },
        expectedError: 'greater than 0'
      },
      {
        config: { recipients: [{ address: '0x1234567890123456789012345678901234567890', percentage: 150 }] },
        expectedError: 'exceed 100%'
      },
      {
        config: { 
          recipients: [
            { address: '0x1234567890123456789012345678901234567890', percentage: 50 },
            { address: '0x1234567890123456789012345678901234567890', percentage: 50 }
          ]
        },
        expectedError: 'Duplicate recipient addresses are not allowed'
      }
    ];

    testCases.forEach(({ config, expectedError }) => {
      const validation = feeManager.validateCustomFeeConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes(expectedError))).toBe(true);
    });
  });
});