import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateAddress,
  validateChainId,
  validateTokenName,
  validateTokenSymbol,
  createValidationContext
} from '../../src/types/runtime-validation.js';

describe('Property 17: Runtime Type Validation Consistency', () => {
  it('Feature: codebase-refactoring, Property 17: Valid addresses are accepted by runtime validation', () => {
    const validAddressArbitrary = fc.string({ minLength: 40, maxLength: 40 })
      .filter(s => /^[a-fA-F0-9]{40}$/.test(s))
      .map(hex => `0x${hex}` as const);

    fc.assert(fc.property(
      validAddressArbitrary,
      (address) => {
        const result = validateAddress(address);
        return result.success && result.data === address;
      }
    ), { numRuns: 5 });
  });

  it('Feature: codebase-refactoring, Property 17: Invalid addresses are rejected by runtime validation', () => {
    const invalidAddressArbitrary = fc.oneof(
      fc.string().filter(s => !/^0x[a-fA-F0-9]{40}$/.test(s)),
      fc.integer(),
      fc.boolean()
    );

    fc.assert(fc.property(
      invalidAddressArbitrary,
      (invalidAddress) => {
        const result = validateAddress(invalidAddress);
        return !result.success && result.errors.length > 0;
      }
    ), { numRuns: 5 });
  });

  it('Feature: codebase-refactoring, Property 17: Valid chain IDs are accepted by runtime validation', () => {
    const validChainIdArbitrary = fc.constantFrom(1, 8453, 42161, 1301, 34443);

    fc.assert(fc.property(
      validChainIdArbitrary,
      (chainId) => {
        const result = validateChainId(chainId);
        return result.success && result.data === chainId;
      }
    ), { numRuns: 5 });
  });

  it('Feature: codebase-refactoring, Property 17: Invalid chain IDs are rejected by runtime validation', () => {
    const invalidChainIdArbitrary = fc.oneof(
      fc.string(),
      fc.float(),
      fc.integer({ max: 0 }),
      fc.boolean()
    );

    fc.assert(fc.property(
      invalidChainIdArbitrary,
      (invalidChainId) => {
        const result = validateChainId(invalidChainId);
        return !result.success && result.errors.length > 0;
      }
    ), { numRuns: 5 });
  });

  it('Feature: codebase-refactoring, Property 17: Valid token names are accepted by runtime validation', () => {
    const validTokenNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
      .filter(s => s.trim().length > 0);

    fc.assert(fc.property(
      validTokenNameArbitrary,
      (name) => {
        const result = validateTokenName(name);
        return result.success && typeof result.data === 'string' && result.data.length > 0;
      }
    ), { numRuns: 5 });
  });

  it('Feature: codebase-refactoring, Property 17: Valid token symbols are accepted by runtime validation', () => {
    const validTokenSymbolArbitrary = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[A-Z0-9]+$/.test(s.trim().toUpperCase()))
      .map(s => s.trim().toUpperCase());

    fc.assert(fc.property(
      validTokenSymbolArbitrary,
      (symbol) => {
        const result = validateTokenSymbol(symbol);
        return result.success && typeof result.data === 'string' && /^[A-Z0-9]+$/.test(result.data);
      }
    ), { numRuns: 5 });
  });
});