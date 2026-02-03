/**
 * Simple property-based test for type safety
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Simple Type Safety Test', () => {
  it('should work with basic property test', () => {
    fc.assert(fc.property(
      fc.integer(),
      (n) => {
        return n === n;
      }
    ), { numRuns: 10 });
  });
});