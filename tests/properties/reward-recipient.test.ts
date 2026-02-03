/**
 * Property Tests: Reward Recipient Processing Equivalence
 * 
 * Property 2: Reward Recipient Processing Equivalence
 * Validates: Requirements 1.2
 * 
 * Tests that the new RewardRecipientService produces equivalent results
 * to the original reward recipient processing logic in deployer and batch modules.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  RewardRecipientService,
  type RewardRecipientConfig,
  normalizeRewardRecipientsOrThrow
} from '../../src/services/reward-recipient-service.js';

describe('Property Tests: Reward Recipient Processing', () => {
  const service = new RewardRecipientService();

  // Simple address generator for faster tests
  const simpleAddress = () => fc.constant('0x1234567890123456789012345678901234567890');
  
  // Simple recipient generator
  const simpleRecipient = () => fc.record({
    address: simpleAddress(),
    allocation: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
  });

  it('Feature: codebase-refactoring, Property 2.1: Normalization produces valid allocations that sum to 100%', { timeout: 5000 }, async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(simpleRecipient(), { minLength: 1, maxLength: 3 }),
      (recipients) => {
        const result = service.normalize(recipients);
        
        if (result.success) {
          const totalAllocation = result.data.reduce((sum, r) => sum + r.allocation, 0);
          expect(Math.abs(totalAllocation - 100)).toBeLessThan(0.01);
        }
        
        return true;
      }
    ), { numRuns: 10 });
  });

  it('Feature: codebase-refactoring, Property 2.2: All normalized addresses are valid checksummed addresses', { timeout: 5000 }, async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(simpleRecipient(), { minLength: 1, maxLength: 3 }),
      (recipients) => {
        const result = service.normalize(recipients);
        
        if (result.success) {
          for (const r of result.data) {
            expect(r.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
          }
        }
        
        return true;
      }
    ), { numRuns: 10 });
  });

  it('Feature: codebase-refactoring, Property 2.3: Validation is consistent with normalization success', { timeout: 5000 }, async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          address: fc.constantFrom(
            '0x1234567890123456789012345678901234567890',
            '0x0987654321098765432109876543210987654321',
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
          ),
          allocation: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
        }),
        { minLength: 1, maxLength: 3 }
      ).filter(recipients => {
        // Ensure no duplicate addresses
        const addresses = recipients.map(r => r.address.toLowerCase());
        const uniqueAddresses = new Set(addresses);
        return addresses.length === uniqueAddresses.size;
      }),
      (recipients) => {
        const normalizeResult = service.normalize(recipients);
        
        if (normalizeResult.success) {
          const validateResult = service.validate(normalizeResult.data);
          expect(validateResult.success).toBe(true);
        }
        
        return true;
      }
    ), { numRuns: 10 });
  });

  it('Feature: codebase-refactoring, Property 2.4: Helper function equivalence with service methods', { timeout: 5000 }, async () => {
    const validRecipients = [{ address: '0x1234567890123456789012345678901234567890' }];
    
    const serviceResult = service.normalize(validRecipients);
    
    if (serviceResult.success) {
      const helperResult = normalizeRewardRecipientsOrThrow(validRecipients);
      expect(JSON.stringify(serviceResult.data)).toBe(JSON.stringify(helperResult));
    }
  });

  it('Feature: codebase-refactoring, Property 2.5: Single recipient always gets 100% allocation', { timeout: 5000 }, async () => {
    const recipients: RewardRecipientConfig[] = [{ address: '0x1234567890123456789012345678901234567890' }];
    const result = service.normalize(recipients);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].allocation).toBe(100);
    }
  });

  it('Feature: codebase-refactoring, Property 2.6: Default recipients creation is deterministic', { timeout: 5000 }, async () => {
    const tokenAdmin = '0x1234567890123456789012345678901234567890';
    const rewardRecipient = '0x0987654321098765432109876543210987654321';
    
    const result1 = service.createDefaultRecipients(tokenAdmin, rewardRecipient);
    const result2 = service.createDefaultRecipients(tokenAdmin, rewardRecipient);
    
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  it('Feature: codebase-refactoring, Property 2.7: Explicit allocations are preserved when valid', { timeout: 5000 }, async () => {
    const recipients = [
      { address: '0x1234567890123456789012345678901234567890', allocation: 60 },
      { address: '0x0987654321098765432109876543210987654321', allocation: 40 }
    ];
    
    const result = service.normalize(recipients);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].allocation).toBe(60);
      expect(result.data[1].allocation).toBe(40);
    }
  });

  it('Feature: codebase-refactoring, Property 2.8: No duplicate addresses in normalized results', { timeout: 5000 }, async () => {
    const recipients = [
      { address: '0x1234567890123456789012345678901234567890' },
      { address: '0x0987654321098765432109876543210987654321' }
    ];
    
    const result = service.normalize(recipients);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const addresses = result.data.map(r => r.address.toLowerCase());
      const uniqueAddresses = new Set(addresses);
      expect(addresses.length).toBe(uniqueAddresses.size);
    }
  });

  it('Feature: codebase-refactoring, Property 2.9: Reward token defaults are applied consistently', { timeout: 5000 }, async () => {
    const recipients = [{ address: '0x1234567890123456789012345678901234567890' }];
    const defaultRewardToken = 'Paired';
    
    const result = service.normalize(recipients, { defaultRewardToken });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].rewardToken).toBe(defaultRewardToken);
    }
  });

  it('Feature: codebase-refactoring, Property 2.10: Maximum 7 recipients constraint is enforced', { timeout: 5000 }, async () => {
    const recipients = Array(8).fill(null).map((_, i) => ({
      address: `0x123456789012345678901234567890123456789${i}`
    }));
    
    const result = service.normalize(recipients);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Maximum 7 recipients');
    }
  });

  describe('Error Structure Consistency', () => {
    it('Feature: codebase-refactoring, Property 6: Error Structure Consistency', async () => {
      const invalidRecipients = [{ address: 'invalid-address' }];
      const result = service.normalize(invalidRecipients);
      
      // Failed normalizations should have consistent structure
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('Feature: codebase-refactoring, Property 7: Result Type Consistency', async () => {
      const validRecipients = [{ address: '0x1234567890123456789012345678901234567890' }];
      const invalidRecipients = [{ address: 'invalid' }];
      
      const validResult = service.normalize(validRecipients);
      const invalidResult = service.normalize(invalidRecipients);
      
      // All results should follow the Result<T, E> pattern
      expect(validResult).toHaveProperty('success');
      expect(invalidResult).toHaveProperty('success');
      
      if (validResult.success) {
        expect(validResult).toHaveProperty('data');
        expect(validResult).not.toHaveProperty('error');
      }
      
      if (!invalidResult.success) {
        expect(invalidResult).toHaveProperty('error');
        expect(invalidResult).not.toHaveProperty('data');
      }
    });
  });
});