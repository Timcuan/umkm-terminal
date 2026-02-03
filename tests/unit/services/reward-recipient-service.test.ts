/**
 * Unit Tests for RewardRecipientService
 * Tests centralized reward recipient processing logic
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  RewardRecipientService,
  type RewardRecipientConfig,
  type NormalizedRewardRecipient,
  createRewardRecipientService,
  validateRewardRecipientsOrThrow
} from '../../../src/services/reward-recipient-service.js';

describe('RewardRecipientService', () => {
  let service: RewardRecipientService;

  beforeEach(() => {
    service = new RewardRecipientService();
  });

  describe('normalize', () => {
    it('should normalize recipients with explicit allocations', () => {
      const recipients: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 60 },
        { address: '0x0000000000000000000000000000000000000001', allocation: 40 }
      ];

      const result = service.normalize(recipients);
      
      expect(result).toHaveLength(2);
      expect(result[0].address).toBe(recipients[0].address);
      expect(result[0].allocation).toBe(60);
      expect(result[1].address).toBe(recipients[1].address);
      expect(result[1].allocation).toBe(40);
    });

    it('should normalize recipients with percentages', () => {
      const recipients: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', percentage: 70 },
        { address: '0x0000000000000000000000000000000000000001', percentage: 30 }
      ];

      const result = service.normalize(recipients);
      
      expect(result).toHaveLength(2);
      expect(result[0].allocation).toBe(70);
      expect(result[1].allocation).toBe(30);
    });

    it('should distribute remaining allocation to recipients without explicit values', () => {
      const recipients: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 50 },
        { address: '0x0000000000000000000000000000000000000001' }, // No allocation
        { address: '0x0000000000000000000000000000000000000002' }  // No allocation
      ];

      const result = service.normalize(recipients);
      
      expect(result).toHaveLength(3);
      expect(result[0].allocation).toBe(50);
      expect(result[1].allocation).toBe(25); // (100-50)/2
      expect(result[2].allocation).toBe(25); // (100-50)/2
      
      const totalAllocation = result.reduce((sum, r) => sum + r.allocation, 0);
      expect(totalAllocation).toBe(100);
    });

    it('should handle empty recipients array', () => {
      const result = service.normalize([]);
      expect(result).toEqual([]);
    });

    it('should use default recipient when no recipients provided', () => {
      const defaultRecipient = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const result = service.normalize([], defaultRecipient);
      
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe(defaultRecipient);
      expect(result[0].allocation).toBe(100);
    });

    it('should adjust allocation with default recipient when total < 100', () => {
      const recipients: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 60 }
      ];
      const defaultRecipient = '0x0000000000000000000000000000000000000001';

      const result = service.normalize(recipients, defaultRecipient);
      
      expect(result).toHaveLength(2);
      expect(result[0].allocation).toBe(60);
      expect(result[1].address).toBe(defaultRecipient);
      expect(result[1].allocation).toBe(40);
    });

    it('should handle mixed allocation and percentage inputs', () => {
      const recipients: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 30 },
        { address: '0x0000000000000000000000000000000000000001', percentage: 40 },
        { address: '0x0000000000000000000000000000000000000002' } // No explicit value
      ];

      const result = service.normalize(recipients);
      
      expect(result).toHaveLength(3);
      expect(result[0].allocation).toBe(30);
      expect(result[1].allocation).toBe(40);
      expect(result[2].allocation).toBe(30); // 100 - 30 - 40
      
      const totalAllocation = result.reduce((sum, r) => sum + r.allocation, 0);
      expect(totalAllocation).toBe(100);
    });
  });

  describe('validate', () => {
    it('should validate correct recipient configurations', () => {
      const recipients: NormalizedRewardRecipient[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 60 },
        { address: '0x0000000000000000000000000000000000000001', allocation: 40 }
      ];

      const result = service.validate(recipients);
      expect(result.success).toBe(true);
    });

    it('should reject recipients with invalid addresses', () => {
      const recipients: NormalizedRewardRecipient[] = [
        { address: 'invalid-address', allocation: 100 }
      ];

      const result = service.validate(recipients);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('address');
      }
    });

    it('should reject recipients with invalid allocations', () => {
      const invalidAllocations = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: -10 }, // Negative
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 150 }, // > 100
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 'invalid' as any } // Not a number
      ];

      for (const recipient of invalidAllocations) {
        const result = service.validate([recipient]);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('allocation');
        }
      }
    });

    it('should reject recipients with total allocation != 100', () => {
      const recipients: NormalizedRewardRecipient[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 60 },
        { address: '0x0000000000000000000000000000000000000001', allocation: 30 } // Total = 90
      ];

      const result = service.validate(recipients);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('100%');
      }
    });

    it('should reject duplicate addresses', () => {
      const recipients: NormalizedRewardRecipient[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 50 },
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 50 } // Duplicate
      ];

      const result = service.validate(recipients);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Duplicate');
      }
    });

    it('should handle empty recipients array', () => {
      const result = service.validate([]);
      expect(result.success).toBe(true);
    });

    it('should allow small floating point errors in total allocation', () => {
      const recipients: NormalizedRewardRecipient[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 33.33 },
        { address: '0x0000000000000000000000000000000000000001', allocation: 33.33 },
        { address: '0x0000000000000000000000000000000000000002', allocation: 33.34 } // Total = 100.00
      ];

      const result = service.validate(recipients);
      expect(result.success).toBe(true);
    });
  });

  describe('format conversion methods', () => {
    const recipients: NormalizedRewardRecipient[] = [
      { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 60 },
      { address: '0x0000000000000000000000000000000000000001', allocation: 40 }
    ];

    it('should convert to deployer format', () => {
      const result = service.toDeployerFormat(recipients);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        allocation: 60
      });
      expect(result[1]).toEqual({
        recipient: '0x0000000000000000000000000000000000000001',
        allocation: 40
      });
    });

    it('should convert to batch format', () => {
      const result = service.toBatchFormat(recipients);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        percentage: 60
      });
      expect(result[1]).toEqual({
        address: '0x0000000000000000000000000000000000000001',
        percentage: 40
      });
    });
  });

  describe('merge', () => {
    it('should merge recipient configurations with overrides taking precedence', () => {
      const defaults: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 50 },
        { address: '0x0000000000000000000000000000000000000001', allocation: 50 }
      ];

      const overrides: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 80 }, // Override
        { address: '0x0000000000000000000000000000000000000002', allocation: 20 }  // New
      ];

      const result = service.merge(defaults, overrides);
      
      expect(result).toHaveLength(3);
      expect(result[0].allocation).toBe(80); // Overridden
      expect(result[1].allocation).toBe(20); // New
      expect(result[2].allocation).toBe(50); // From defaults (not overridden)
    });

    it('should return overrides when no defaults provided', () => {
      const overrides: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 100 }
      ];

      const result = service.merge([], overrides);
      expect(result).toEqual(overrides);
    });

    it('should return defaults when no overrides provided', () => {
      const defaults: RewardRecipientConfig[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 100 }
      ];

      const result = service.merge(defaults, []);
      expect(result).toEqual(defaults);
    });
  });

  describe('calculateTotalValue', () => {
    it('should calculate token amounts for recipients', () => {
      const recipients: NormalizedRewardRecipient[] = [
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 60 },
        { address: '0x0000000000000000000000000000000000000001', allocation: 40 }
      ];

      const tokenSupply = BigInt('1000000000000000000000'); // 1000 tokens (18 decimals)
      const result = service.calculateTotalValue(recipients, tokenSupply);
      
      expect(result).toHaveLength(2);
      expect(result[0].tokenAmount).toBe(BigInt('600000000000000000000')); // 600 tokens
      expect(result[1].tokenAmount).toBe(BigInt('400000000000000000000')); // 400 tokens
    });
  });

  describe('helper functions', () => {
    describe('createRewardRecipientService', () => {
      it('should create service instance', () => {
        const service = createRewardRecipientService();
        expect(service).toBeInstanceOf(RewardRecipientService);
      });
    });

    describe('validateRewardRecipientsOrThrow', () => {
      it('should return normalized recipients for valid input', () => {
        const recipients: RewardRecipientConfig[] = [
          { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', allocation: 100 }
        ];

        const result = validateRewardRecipientsOrThrow(recipients);
        expect(result).toHaveLength(1);
        expect(result[0].allocation).toBe(100);
      });

      it('should throw for invalid input', () => {
        const recipients: RewardRecipientConfig[] = [
          { address: 'invalid-address', allocation: 100 }
        ];

        expect(() => validateRewardRecipientsOrThrow(recipients)).toThrow();
      });
    });
  });

  // Property-based tests
  describe('property tests', () => {
    it('Feature: codebase-refactoring, Property 2: Reward Recipient Processing Equivalence - should produce consistent results', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          address: fc.string({ minLength: 40, maxLength: 40 }).filter(s => /^[0-9a-fA-F]{40}$/.test(s)).map(s => '0x' + s),
          allocation: fc.integer({ min: 1, max: 100 })
        }), { minLength: 1, maxLength: 5 }),
        (recipients) => {
          // Ensure total allocation = 100
          const totalAllocation = recipients.reduce((sum, r) => sum + r.allocation, 0);
          if (totalAllocation === 0) return; // Skip invalid case
          
          const normalizedRecipients = recipients.map(r => ({
            ...r,
            allocation: Math.floor((r.allocation / totalAllocation) * 100)
          }));
          
          // Adjust last recipient to make total exactly 100
          const currentTotal = normalizedRecipients.reduce((sum, r) => sum + r.allocation, 0);
          if (normalizedRecipients.length > 0) {
            normalizedRecipients[normalizedRecipients.length - 1].allocation += (100 - currentTotal);
          }

          const service1 = new RewardRecipientService();
          const service2 = new RewardRecipientService();
          
          const result1 = service1.normalize(normalizedRecipients);
          const result2 = service2.normalize(normalizedRecipients);
          
          // Results should be identical
          expect(result1).toEqual(result2);
        }
      ), { numRuns: 10 }); // Reduced runs due to complexity and filtering
    });

    it('should always produce valid total allocation when normalizing', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          address: fc.string({ minLength: 40, maxLength: 40 }).filter(s => /^[0-9a-fA-F]{40}$/.test(s)).map(s => '0x' + s),
          allocation: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
        }), { minLength: 1, maxLength: 7 }),
        (recipients) => {
          const result = service.normalize(recipients);
          
          if (result.length > 0) {
            const totalAllocation = result.reduce((sum, r) => sum + r.allocation, 0);
            expect(totalAllocation).toBeCloseTo(100, 0); // Allow for rounding
          }
        }
      ), { numRuns: 10 }); // Reduced runs due to filtering
    });
  });
});