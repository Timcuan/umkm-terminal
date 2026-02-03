/**
 * Test imports for type safety
 */

import { describe, it, expect } from 'vitest';
import {
  validateAddress,
  validateChainId,
  validateTokenName,
  validateTokenSymbol,
  createValidationContext
} from '../../src/types/runtime-validation.js';

describe('Import Test', () => {
  it('should import validation functions', () => {
    expect(typeof validateAddress).toBe('function');
    expect(typeof validateChainId).toBe('function');
    expect(typeof validateTokenName).toBe('function');
    expect(typeof validateTokenSymbol).toBe('function');
    expect(typeof createValidationContext).toBe('function');
  });
});