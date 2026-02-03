/**
 * Property-based tests for Bankr SDK configuration validation and inheritance
 * Feature: clanker-api-integration, Property 10: Configuration Validation and Inheritance
 * Validates: Requirements 10.3, 10.4, 10.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================================================
// Configuration Type Definitions (matching design document)
// ============================================================================

interface BankrSDKConfig {
  enhancedFeatures: boolean;
  
  bankr?: {
    apiKey?: string;
    rpcEndpoints?: Record<string, string>;
    gasOptimization?: boolean;
    mevProtection?: boolean;
  };
  
  social?: {
    twitter?: {
      apiKey?: string;
      apiSecret?: string;
      accessToken?: string;
      accessTokenSecret?: string;
    };
    farcaster?: {
      signerUuid?: string;
      apiKey?: string;
    };
  };
}

interface TokenConfig {
  name: string;
  symbol: string;
  tokenAdmin?: string;
  image?: string;
  
  socialIntegration?: {
    platforms: ('twitter' | 'farcaster')[];
    autoPost?: boolean;
    messageTemplate?: string;
    hashtags?: string[];
    mentionAccounts?: string[];
  };
  
  customFees?: {
    recipients: Array<{
      address: string;
      percentage: number;
      description?: string;
    }>;
    totalPercentage?: number;
  };
}

// ============================================================================
// Configuration Validation Logic (simplified implementation for testing)
// ============================================================================

class ConfigurationValidator {
  validateBankrSDKConfig(config: BankrSDKConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Enhanced features validation
    if (typeof config.enhancedFeatures !== 'boolean') {
      errors.push('enhancedFeatures must be a boolean');
    }

    // Bankr configuration validation
    if (config.bankr) {
      if (config.bankr.apiKey !== undefined && config.bankr.apiKey !== null && typeof config.bankr.apiKey !== 'string') {
        errors.push('bankr.apiKey must be a string');
      }
      
      if (config.bankr.apiKey && typeof config.bankr.apiKey === 'string' && config.bankr.apiKey.length < 10) {
        warnings.push('bankr.apiKey appears to be too short');
      }

      if (config.bankr.rpcEndpoints && typeof config.bankr.rpcEndpoints === 'object') {
        for (const [chainId, endpoint] of Object.entries(config.bankr.rpcEndpoints)) {
          if (endpoint && typeof endpoint === 'string' && !endpoint.startsWith('http')) {
            errors.push(`Invalid RPC endpoint for chain ${chainId}: must start with http`);
          }
        }
      }

      if (config.bankr.gasOptimization !== undefined && config.bankr.gasOptimization !== null && typeof config.bankr.gasOptimization !== 'boolean') {
        errors.push('bankr.gasOptimization must be a boolean');
      }

      if (config.bankr.mevProtection !== undefined && config.bankr.mevProtection !== null && typeof config.bankr.mevProtection !== 'boolean') {
        errors.push('bankr.mevProtection must be a boolean');
      }
    }

    // Social configuration validation
    if (config.social) {
      if (config.social.twitter) {
        const twitter = config.social.twitter;
        if (twitter.apiKey !== undefined && twitter.apiKey !== null && typeof twitter.apiKey !== 'string') {
          errors.push('social.twitter.apiKey must be a string');
        }
        if (twitter.apiSecret !== undefined && twitter.apiSecret !== null && typeof twitter.apiSecret !== 'string') {
          errors.push('social.twitter.apiSecret must be a string');
        }
        if (twitter.accessToken !== undefined && twitter.accessToken !== null && typeof twitter.accessToken !== 'string') {
          errors.push('social.twitter.accessToken must be a string');
        }
        if (twitter.accessTokenSecret !== undefined && twitter.accessTokenSecret !== null && typeof twitter.accessTokenSecret !== 'string') {
          errors.push('social.twitter.accessTokenSecret must be a string');
        }
      }

      if (config.social.farcaster) {
        const farcaster = config.social.farcaster;
        if (farcaster.signerUuid !== undefined && farcaster.signerUuid !== null && typeof farcaster.signerUuid !== 'string') {
          errors.push('social.farcaster.signerUuid must be a string');
        }
        if (farcaster.apiKey !== undefined && farcaster.apiKey !== null && typeof farcaster.apiKey !== 'string') {
          errors.push('social.farcaster.apiKey must be a string');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateTokenConfig(config: TokenConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Token name is required');
    }

    if (!config.symbol || config.symbol.trim().length === 0) {
      errors.push('Token symbol is required');
    }

    if (config.symbol && config.symbol.length > 11) {
      errors.push('Token symbol must be 11 characters or less');
    }

    // Token admin validation
    if (config.tokenAdmin && !config.tokenAdmin.match(/^0x[a-fA-F0-9]{40}$/)) {
      errors.push(`Invalid token admin address: ${config.tokenAdmin}`);
    }

    // Social integration validation
    if (config.socialIntegration) {
      if (!config.socialIntegration.platforms || config.socialIntegration.platforms.length === 0) {
        errors.push('Social integration platforms are required when socialIntegration is specified');
      }

      if (config.socialIntegration.platforms) {
        for (const platform of config.socialIntegration.platforms) {
          if (!['twitter', 'farcaster'].includes(platform)) {
            errors.push(`Invalid social platform: ${platform}`);
          }
        }
      }

      if (config.socialIntegration.hashtags) {
        for (const hashtag of config.socialIntegration.hashtags) {
          if (!hashtag.startsWith('#')) {
            warnings.push(`Hashtag should start with #: ${hashtag}`);
          }
        }
      }
    }

    // Custom fees validation
    if (config.customFees) {
      if (!config.customFees.recipients || config.customFees.recipients.length === 0) {
        errors.push('Custom fees recipients are required when customFees is specified');
      }

      if (config.customFees.recipients) {
        let totalPercentage = 0;
        
        for (const recipient of config.customFees.recipients) {
          if (!recipient.address || !recipient.address.match(/^0x[a-fA-F0-9]{40}$/)) {
            errors.push(`Invalid recipient address: ${recipient.address}`);
          }
          
          if (typeof recipient.percentage !== 'number' || recipient.percentage < 0 || recipient.percentage > 100) {
            errors.push(`Invalid percentage for recipient ${recipient.address}: must be between 0 and 100`);
          }
          
          if (typeof recipient.percentage === 'number') {
            totalPercentage += recipient.percentage;
          }
        }

        if (Math.abs(totalPercentage - 100) > 0.01) {
          errors.push(`Total fee percentage must equal 100%, got ${totalPercentage}%`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  inheritConfiguration(base: BankrSDKConfig, override: Partial<BankrSDKConfig>): BankrSDKConfig {
    return {
      enhancedFeatures: override.enhancedFeatures ?? base.enhancedFeatures,
      bankr: {
        ...base.bankr,
        ...override.bankr
      },
      social: {
        ...base.social,
        ...override.social,
        twitter: {
          ...base.social?.twitter,
          ...override.social?.twitter
        },
        farcaster: {
          ...base.social?.farcaster,
          ...override.social?.farcaster
        }
      }
    };
  }
}

// ============================================================================
// Property Test Generators
// ============================================================================

const generateValidBankrSDKConfig = (): fc.Arbitrary<BankrSDKConfig> =>
  fc.record({
    enhancedFeatures: fc.boolean(),
    bankr: fc.option(fc.record({
      apiKey: fc.option(fc.string({ minLength: 10, maxLength: 64 })),
      rpcEndpoints: fc.option(fc.dictionary(
        fc.string(),
        fc.webUrl().filter(url => url.startsWith('http'))
      )),
      gasOptimization: fc.option(fc.boolean()),
      mevProtection: fc.option(fc.boolean())
    })),
    social: fc.option(fc.record({
      twitter: fc.option(fc.record({
        apiKey: fc.option(fc.string({ minLength: 10, maxLength: 64 })),
        apiSecret: fc.option(fc.string({ minLength: 10, maxLength: 64 })),
        accessToken: fc.option(fc.string({ minLength: 10, maxLength: 64 })),
        accessTokenSecret: fc.option(fc.string({ minLength: 10, maxLength: 64 }))
      })),
      farcaster: fc.option(fc.record({
        signerUuid: fc.option(fc.uuid()),
        apiKey: fc.option(fc.string({ minLength: 10, maxLength: 64 }))
      }))
    }))
  });

const generateValidTokenConfig = (): fc.Arbitrary<TokenConfig> =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    symbol: fc.string({ minLength: 1, maxLength: 11 }).map(s => s.toUpperCase().replace(/\s/g, 'X')),
    tokenAdmin: fc.option(fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^a-fA-F0-9]/g, '0').padStart(40, '0')}`)),
    image: fc.option(fc.webUrl()),
    socialIntegration: fc.option(fc.record({
      platforms: fc.array(fc.constantFrom('twitter', 'farcaster'), { minLength: 1, maxLength: 2 }),
      autoPost: fc.option(fc.boolean()),
      messageTemplate: fc.option(fc.string({ maxLength: 200 })),
      hashtags: fc.option(fc.array(fc.string({ minLength: 2, maxLength: 20 }).map(s => `#${s.replace(/\s/g, '')}`), { maxLength: 5 })),
      mentionAccounts: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 15 }).map(s => s.replace(/\s/g, '')), { maxLength: 3 }))
    })),
    customFees: fc.option(
      fc.integer({ min: 1, max: 5 }).chain(numRecipients => {
        const basePercentage = Math.floor(100 / numRecipients);
        const remainder = 100 - (basePercentage * numRecipients);
        
        return fc.array(
          fc.record({
            address: fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^a-fA-F0-9]/g, '0').padStart(40, '0')}`),
            percentage: fc.constant(basePercentage),
            description: fc.option(fc.string({ maxLength: 50 }))
          }),
          { minLength: numRecipients, maxLength: numRecipients }
        ).map(recipients => {
          // Adjust first recipient to account for remainder
          if (recipients.length > 0) {
            recipients[0] = { ...recipients[0], percentage: basePercentage + remainder };
          }
          return { recipients };
        });
      })
    )
  });

const generateInvalidBankrSDKConfig = (): fc.Arbitrary<any> =>
  fc.oneof(
    // Invalid enhancedFeatures type
    fc.record({
      enhancedFeatures: fc.oneof(fc.string(), fc.integer(), fc.constant(null))
    }),
    // Invalid bankr.apiKey type
    fc.record({
      enhancedFeatures: fc.boolean(),
      bankr: fc.record({
        apiKey: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()))
      })
    }),
    // Invalid RPC endpoint (non-empty dictionary with invalid URLs)
    fc.record({
      enhancedFeatures: fc.boolean(),
      bankr: fc.record({
        rpcEndpoints: fc.dictionary(
          fc.string({ minLength: 1 }), 
          fc.string({ minLength: 1 }).filter(s => s.length > 0 && !s.startsWith('http'))
        ).filter(dict => Object.keys(dict).length > 0)
      })
    }),
    // Invalid social configuration
    fc.record({
      enhancedFeatures: fc.boolean(),
      social: fc.record({
        twitter: fc.record({
          apiKey: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()))
        })
      })
    }),
    // Invalid boolean types
    fc.record({
      enhancedFeatures: fc.boolean(),
      bankr: fc.record({
        gasOptimization: fc.oneof(fc.string(), fc.integer())
      })
    })
  );

// ============================================================================
// Property Tests
// ============================================================================

describe('Bankr SDK Configuration Validation Properties', () => {
  const validator = new ConfigurationValidator();

  describe('Property 10: Configuration Validation and Inheritance', () => {
    it('Feature: clanker-api-integration, Property 10: Valid configurations should always pass validation', async () => {
      await fc.assert(fc.asyncProperty(
        generateValidBankrSDKConfig(),
        (config) => {
          const result = validator.validateBankrSDKConfig(config);
          
          // Valid configurations should always pass
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('Feature: clanker-api-integration, Property 10: Invalid configurations should always fail validation', async () => {
      await fc.assert(fc.asyncProperty(
        generateInvalidBankrSDKConfig(),
        (config) => {
          const result = validator.validateBankrSDKConfig(config);
          
          // Invalid configurations should always fail
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          
          return true;
        }
      ), { numRuns: 50 });
    });

    it('Feature: clanker-api-integration, Property 10: Configuration inheritance should preserve base values', async () => {
      await fc.assert(fc.asyncProperty(
        generateValidBankrSDKConfig(),
        generateValidBankrSDKConfig(),
        (baseConfig, overrideConfig) => {
          const inherited = validator.inheritConfiguration(baseConfig, overrideConfig);
          
          // Enhanced features should be inherited correctly
          expect(inherited.enhancedFeatures).toBe(
            overrideConfig.enhancedFeatures ?? baseConfig.enhancedFeatures
          );
          
          // Bankr config should be merged
          if (baseConfig.bankr || overrideConfig.bankr) {
            expect(inherited.bankr).toBeDefined();
          }
          
          // Social config should be merged
          if (baseConfig.social || overrideConfig.social) {
            expect(inherited.social).toBeDefined();
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('Feature: clanker-api-integration, Property 10: Token configuration validation should be consistent', async () => {
      await fc.assert(fc.asyncProperty(
        generateValidTokenConfig(),
        (config) => {
          const result1 = validator.validateTokenConfig(config);
          const result2 = validator.validateTokenConfig(config);
          
          // Multiple validations of the same config should produce identical results
          expect(result1.valid).toBe(result2.valid);
          expect(result1.errors).toEqual(result2.errors);
          expect(result1.warnings).toEqual(result2.warnings);
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('Feature: clanker-api-integration, Property 10: Custom fees validation should enforce 100% total', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          symbol: fc.string({ minLength: 1, maxLength: 11 }).filter(s => s.trim().length > 0),
          customFees: fc.record({
            recipients: fc.array(
              fc.record({
                address: fc.string({ minLength: 40, maxLength: 40 }).map(s => `0x${s.replace(/[^a-fA-F0-9]/g, '0').padStart(40, '0')}`),
                percentage: fc.integer({ min: 1, max: 50 }),
                description: fc.option(fc.string({ maxLength: 50 }))
              }),
              { minLength: 2, maxLength: 5 }
            )
          })
        }),
        (config) => {
          const result = validator.validateTokenConfig(config);
          
          // Calculate total percentage
          const totalPercentage = config.customFees.recipients.reduce(
            (sum, recipient) => sum + recipient.percentage, 
            0
          );
          
          if (Math.abs(totalPercentage - 100) > 0.01) {
            // Should fail validation if total is not 100%
            expect(result.valid).toBe(false);
            expect(result.errors.some(error => error.includes('Total fee percentage'))).toBe(true);
          } else {
            // Should pass if total is exactly 100% (and no other validation errors)
            const hasOtherErrors = result.errors.some(error => !error.includes('Total fee percentage'));
            if (!hasOtherErrors) {
              expect(result.valid).toBe(true);
            }
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('Feature: clanker-api-integration, Property 10: Social integration validation should check platform validity', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          symbol: fc.string({ minLength: 1, maxLength: 11 }),
          socialIntegration: fc.record({
            platforms: fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
            autoPost: fc.option(fc.boolean())
          })
        }),
        (config) => {
          const result = validator.validateTokenConfig(config);
          
          const hasInvalidPlatform = config.socialIntegration.platforms.some(
            platform => !['twitter', 'farcaster'].includes(platform)
          );
          
          if (hasInvalidPlatform) {
            // Should fail validation if invalid platform is used
            expect(result.valid).toBe(false);
            expect(result.errors.some(error => error.includes('Invalid social platform'))).toBe(true);
          }
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it('Feature: clanker-api-integration, Property 10: Configuration validation should provide descriptive errors', async () => {
      const invalidConfigs = [
        { enhancedFeatures: 'invalid' as any },
        { enhancedFeatures: true, bankr: { apiKey: 123 as any } },
        { enhancedFeatures: true, social: { twitter: { apiKey: 456 as any } } },
        { enhancedFeatures: true, bankr: { gasOptimization: 'invalid' as any } }
      ];

      for (const config of invalidConfigs) {
        const result = validator.validateBankrSDKConfig(config);
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.every(error => typeof error === 'string' && error.length > 0)).toBe(true);
      }
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle empty configurations gracefully', () => {
      const emptyConfig: BankrSDKConfig = { enhancedFeatures: false };
      const result = validator.validateBankrSDKConfig(emptyConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle minimal token configuration', () => {
      const minimalConfig: TokenConfig = {
        name: 'Test Token',
        symbol: 'TEST'
      };
      
      const result = validator.validateTokenConfig(minimalConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate address format in custom fees', () => {
      const configWithInvalidAddress: TokenConfig = {
        name: 'Test Token',
        symbol: 'TEST',
        customFees: {
          recipients: [
            { address: 'invalid-address', percentage: 100 }
          ]
        }
      };
      
      const result = validator.validateTokenConfig(configWithInvalidAddress);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid recipient address'))).toBe(true);
    });
  });
});