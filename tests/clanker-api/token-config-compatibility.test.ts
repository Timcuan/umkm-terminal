/**
 * TokenConfig Interface Compatibility Tests
 * Ensures the ClankerTokenV4 interface remains backward compatible
 */

import { describe, it, expect } from 'vitest';
import type { ClankerTokenV4 } from '../../src/types/index.js';
import { validateTokenConfig } from '../../src/clanker-api/index.js';

// ============================================================================
// Legacy Token Configuration Tests
// ============================================================================

describe('TokenConfig Interface Compatibility', () => {
  describe('Required Fields Compatibility', () => {
    it('should accept minimal token configuration (v1 style)', () => {
      const v1Token = {
        name: 'Legacy Token',
        symbol: 'LEGACY',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      // Should be assignable to ClankerTokenV4
      const token: ClankerTokenV4 = v1Token;
      expect(token.name).toBe('Legacy Token');
      expect(token.symbol).toBe('LEGACY');
      expect(token.tokenAdmin).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e');
    });

    it('should validate minimal token configuration', () => {
      const minimalToken: ClankerTokenV4 = {
        name: 'Minimal Token',
        symbol: 'MIN',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      const result = validateTokenConfig(minimalToken);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require name field', () => {
      const tokenWithoutName = {
        symbol: 'TEST',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      const result = validateTokenConfig(tokenWithoutName as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('name'))).toBe(true);
    });

    it('should require symbol field', () => {
      const tokenWithoutSymbol = {
        name: 'Test Token',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      const result = validateTokenConfig(tokenWithoutSymbol as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('symbol'))).toBe(true);
    });

    it('should require tokenAdmin field', () => {
      const tokenWithoutAdmin = {
        name: 'Test Token',
        symbol: 'TEST',
      };

      const result = validateTokenConfig(tokenWithoutAdmin as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('admin'))).toBe(true);
    });
  });

  describe('Optional Fields Compatibility', () => {
    it('should accept chainId as optional (v2 addition)', () => {
      const tokenWithChain: ClankerTokenV4 = {
        name: 'Chain Token',
        symbol: 'CHAIN',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453, // Base
      };

      const result = validateTokenConfig(tokenWithChain);
      expect(result.valid).toBe(true);
      expect(tokenWithChain.chainId).toBe(8453);
    });

    it('should accept description as optional (v3 addition)', () => {
      const tokenWithDescription: ClankerTokenV4 = {
        name: 'Described Token',
        symbol: 'DESC',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        description: 'A token with a description',
      };

      const result = validateTokenConfig(tokenWithDescription);
      expect(result.valid).toBe(true);
      expect(tokenWithDescription.description).toBe('A token with a description');
    });

    it('should accept image as optional (v3 addition)', () => {
      const tokenWithImage: ClankerTokenV4 = {
        name: 'Image Token',
        symbol: 'IMG',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        image: 'https://example.com/token.png',
      };

      const result = validateTokenConfig(tokenWithImage);
      expect(result.valid).toBe(true);
      expect(tokenWithImage.image).toBe('https://example.com/token.png');
    });

    it('should accept social media fields as optional (v4 additions)', () => {
      const tokenWithSocials: ClankerTokenV4 = {
        name: 'Social Token',
        symbol: 'SOCIAL',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        twitter: '@socialtoken',
        telegram: '@socialtokengroup',
        website: 'https://socialtoken.com',
      };

      const result = validateTokenConfig(tokenWithSocials);
      expect(result.valid).toBe(true);
      expect(tokenWithSocials.twitter).toBe('@socialtoken');
      expect(tokenWithSocials.telegram).toBe('@socialtokengroup');
      expect(tokenWithSocials.website).toBe('https://socialtoken.com');
    });
  });

  describe('Field Validation Compatibility', () => {
    it('should validate name field constraints', () => {
      const tokenWithLongName: ClankerTokenV4 = {
        name: 'A'.repeat(101), // Too long
        symbol: 'LONG',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      const result = validateTokenConfig(tokenWithLongName);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MAX_LENGTH')).toBe(true);
    });

    it('should validate symbol field constraints', () => {
      const tokenWithLongSymbol: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'VERYLONGSYMBOL123456', // Too long
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      const result = validateTokenConfig(tokenWithLongSymbol);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MAX_LENGTH')).toBe(true);
    });

    it('should validate tokenAdmin address format', () => {
      const tokenWithInvalidAdmin: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: 'not-an-address',
      };

      const result = validateTokenConfig(tokenWithInvalidAdmin);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ADDRESS')).toBe(true);
    });

    it('should validate chainId constraints', () => {
      const tokenWithInvalidChain: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: -1, // Invalid
      };

      const result = validateTokenConfig(tokenWithInvalidChain);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MIN_VALUE')).toBe(true);
    });

    it('should validate image URL format', () => {
      const tokenWithInvalidImage: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        image: 'not-a-url',
      };

      const result = validateTokenConfig(tokenWithInvalidImage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_URL')).toBe(true);
    });

    it('should validate website URL format', () => {
      const tokenWithInvalidWebsite: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        website: 'not-a-url',
      };

      const result = validateTokenConfig(tokenWithInvalidWebsite);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_URL')).toBe(true);
    });

    it('should validate twitter handle format', () => {
      const tokenWithInvalidTwitter: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        twitter: 'invalid-twitter-handle-too-long',
      };

      const result = validateTokenConfig(tokenWithInvalidTwitter);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should validate telegram handle format', () => {
      const tokenWithInvalidTelegram: ClankerTokenV4 = {
        name: 'Test Token',
        symbol: 'TEST',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        telegram: 'ab', // Too short
      };

      const result = validateTokenConfig(tokenWithInvalidTelegram);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });
  });

  describe('Backward Compatibility Edge Cases', () => {
    it('should handle tokens with extra unknown fields gracefully', () => {
      const tokenWithExtraFields = {
        name: 'Extra Token',
        symbol: 'EXTRA',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        unknownField: 'should be ignored',
        anotherUnknownField: 123,
      };

      // Should still be assignable (TypeScript structural typing)
      const token: ClankerTokenV4 = tokenWithExtraFields;
      expect(token.name).toBe('Extra Token');
    });

    it('should provide warnings for recommended optional fields', () => {
      const minimalToken: ClankerTokenV4 = {
        name: 'Minimal Token',
        symbol: 'MIN',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        // No description
      };

      const result = validateTokenConfig(minimalToken);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => 
        w.message.toLowerCase().includes('description')
      )).toBe(true);
    });

    it('should handle null/undefined optional fields', () => {
      const tokenWithNullFields: ClankerTokenV4 = {
        name: 'Null Token',
        symbol: 'NULL',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        description: undefined,
        image: null as any,
        chainId: undefined,
      };

      const result = validateTokenConfig(tokenWithNullFields);
      expect(result.valid).toBe(true);
    });

    it('should handle empty string optional fields', () => {
      const tokenWithEmptyFields: ClankerTokenV4 = {
        name: 'Empty Token',
        symbol: 'EMPTY',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        description: '',
        image: '',
        twitter: '',
        telegram: '',
        website: '',
      };

      // Empty strings should be treated as not provided
      const result = validateTokenConfig(tokenWithEmptyFields);
      expect(result.valid).toBe(true);
    });
  });

  describe('Type Safety Compatibility', () => {
    it('should maintain type safety for required fields', () => {
      // This should cause a TypeScript error if uncommented:
      // const invalidToken: ClankerTokenV4 = {
      //   symbol: 'TEST',
      //   tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      //   // Missing required 'name' field
      // };

      // This should work fine:
      const validToken: ClankerTokenV4 = {
        name: 'Valid Token',
        symbol: 'VALID',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      expect(validToken.name).toBe('Valid Token');
    });

    it('should allow optional fields to be omitted', () => {
      const tokenWithoutOptionals: ClankerTokenV4 = {
        name: 'Basic Token',
        symbol: 'BASIC',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        // All optional fields omitted
      };

      expect(tokenWithoutOptionals.chainId).toBeUndefined();
      expect(tokenWithoutOptionals.description).toBeUndefined();
      expect(tokenWithoutOptionals.image).toBeUndefined();
    });

    it('should allow partial specification of optional fields', () => {
      const tokenWithSomeOptionals: ClankerTokenV4 = {
        name: 'Partial Token',
        symbol: 'PART',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
        chainId: 8453,
        description: 'A partially configured token',
        // image, twitter, telegram, website omitted
      };

      expect(tokenWithSomeOptionals.chainId).toBe(8453);
      expect(tokenWithSomeOptionals.description).toBe('A partially configured token');
      expect(tokenWithSomeOptionals.image).toBeUndefined();
    });
  });

  describe('Migration Path Compatibility', () => {
    it('should support gradual migration from v1 to v4', () => {
      // v1 token (minimal)
      const v1Token = {
        name: 'V1 Token',
        symbol: 'V1',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      // v2 token (with chainId)
      const v2Token = {
        ...v1Token,
        chainId: 8453,
      };

      // v3 token (with metadata)
      const v3Token = {
        ...v2Token,
        description: 'A v3 token with metadata',
        image: 'https://example.com/token.png',
      };

      // v4 token (with social links)
      const v4Token: ClankerTokenV4 = {
        ...v3Token,
        twitter: '@v4token',
        telegram: '@v4tokengroup',
        website: 'https://v4token.com',
      };

      // All versions should be valid
      expect(validateTokenConfig(v1Token).valid).toBe(true);
      expect(validateTokenConfig(v2Token).valid).toBe(true);
      expect(validateTokenConfig(v3Token).valid).toBe(true);
      expect(validateTokenConfig(v4Token).valid).toBe(true);
    });

    it('should maintain consistent validation behavior across versions', () => {
      const baseToken = {
        name: 'Migration Token',
        symbol: 'MIG',
        tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      };

      // Adding optional fields should not change validation result
      const v1Result = validateTokenConfig(baseToken);
      const v4Result = validateTokenConfig({
        ...baseToken,
        chainId: 8453,
        description: 'Migration test',
        image: 'https://example.com/token.png',
        twitter: '@migtoken',
        telegram: '@migtokengroup',
        website: 'https://migtoken.com',
      });

      expect(v1Result.valid).toBe(v4Result.valid);
      expect(v1Result.errors).toHaveLength(v4Result.errors.length);
    });
  });
});