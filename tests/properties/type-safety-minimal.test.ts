import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateAddress } from '../../src/types/runtime-validation.js';

describe('Minimal Type Safety Test', () => {
  it('should work', () => {
    const result = validateAddress('0x1234567890123456789012345678901234567890');
    expect(result.success).toBe(true);
  });

  it('should work with fast-check', () => {
    fc.assert(fc.property(
      fc.constant('0x1234567890123456789012345678901234567890'),
      (address) => {
        const result = validateAddress(address);
        return result.success;
      }
    ), { numRuns: 10 });
  });
});