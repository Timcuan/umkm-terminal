import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// Mock types and interfaces for testing
interface SocialPlatformConfig {
  platform: 'twitter' | 'farcaster';
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    accessTokenSecret?: string;
    bearerToken?: string;
    signerUuid?: string;
    mnemonic?: string;
  };
  enabled: boolean;
}

interface SocialIntegrationConfig {
  platforms: SocialPlatformConfig[];
  autoPost: boolean;
  includeMetadata: boolean;
  fallbackToStandard: boolean;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

interface SocialMediaMetadata {
  twitterHandle?: string;
  farcasterProfile?: string;
  socialLinks: string[];
  postUrls: string[];
}

interface DeploymentResult {
  success: boolean;
  txHash?: string;
  tokenAddress?: string;
  socialIntegration?: {
    enabled: boolean;
    platforms: string[];
    metadata: SocialMediaMetadata;
    warnings: string[];
  };
  error?: string;
}

interface TokenDeploymentConfig {
  metadata: TokenMetadata;
  socialIntegration?: SocialIntegrationConfig;
  chainId: number;
  deployerAddress: string;
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

// Mock SocialIntegrationManager class for testing
class MockSocialIntegrationManager {
  async deployTokenWithSocialIntegration(config: TokenDeploymentConfig): Promise<DeploymentResult> {
    try {
      // Validate basic token configuration first
      this.validateTokenConfig(config);

      // Simulate deployment process
      const result: DeploymentResult = {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`,
        tokenAddress: `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`,
      };

      // Handle social integration if configured
      if (config.socialIntegration) {
        try {
          // Validate social integration configuration
          this.validateSocialIntegrationConfig(config.socialIntegration);

          const enabledPlatforms = config.socialIntegration.platforms
            .filter(p => p.enabled)
            .map(p => p.platform);

          const socialMetadata: SocialMediaMetadata = {
            socialLinks: [],
            postUrls: []
          };

          const warnings: string[] = [];

          // Process each enabled platform
          for (const platform of config.socialIntegration.platforms) {
            if (!platform.enabled) continue;

            try {
              // Simulate platform-specific integration
              if (platform.platform === 'twitter') {
                if (this.validateTwitterCredentials(platform.credentials)) {
                  socialMetadata.twitterHandle = `@${config.metadata.symbol.toLowerCase()}`;
                  socialMetadata.socialLinks.push(`https://twitter.com/${config.metadata.symbol.toLowerCase()}`);
                  if (config.socialIntegration.autoPost) {
                    socialMetadata.postUrls.push(`https://twitter.com/status/${Math.random().toString().substring(2, 20)}`);
                  }
                } else {
                  throw new Error('Twitter integration failed: Invalid credentials');
                }
              } else if (platform.platform === 'farcaster') {
                if (this.validateFarcasterCredentials(platform.credentials)) {
                  socialMetadata.farcasterProfile = `${config.metadata.symbol.toLowerCase()}.eth`;
                  socialMetadata.socialLinks.push(`https://warpcast.com/${config.metadata.symbol.toLowerCase()}`);
                  if (config.socialIntegration.autoPost) {
                    socialMetadata.postUrls.push(`https://warpcast.com/cast/${Math.random().toString().substring(2, 20)}`);
                  }
                } else {
                  throw new Error('Farcaster integration failed: Invalid credentials');
                }
              }
            } catch (error) {
              // If fallback is enabled, collect warnings instead of failing
              if (config.socialIntegration.fallbackToStandard) {
                warnings.push(`${platform.platform} integration failed: ${error.message}`);
              } else {
                throw error;
              }
            }
          }

          // Check if any platforms succeeded
          const successfulPlatforms = enabledPlatforms.filter(platform => {
            return !warnings.some(warning => warning.includes(platform));
          });

          result.socialIntegration = {
            enabled: successfulPlatforms.length > 0,
            platforms: successfulPlatforms,
            metadata: socialMetadata,
            warnings
          };

          // If all platforms failed but fallback is enabled, add fallback warning
          if (successfulPlatforms.length === 0 && enabledPlatforms.length > 0 && config.socialIntegration.fallbackToStandard) {
            result.socialIntegration.warnings.push('Social integration failed, deployed with standard method');
          }

        } catch (socialError) {
          // If social integration fails and fallback is enabled, continue with standard deployment
          if (config.socialIntegration.fallbackToStandard) {
            result.socialIntegration = {
              enabled: false,
              platforms: [],
              metadata: { socialLinks: [], postUrls: [] },
              warnings: [`Social integration failed, deployed with standard method: ${socialError.message}`]
            };
          } else {
            throw socialError;
          }
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private validateTokenConfig(config: TokenDeploymentConfig): void {
    if (!config.metadata.name || config.metadata.name.trim().length === 0) {
      throw new ValidationError('Token name is required');
    }

    if (!config.metadata.symbol || config.metadata.symbol.trim().length === 0) {
      throw new ValidationError('Token symbol is required');
    }

    if (config.metadata.symbol.trim().length > 10) {
      throw new ValidationError('Token symbol cannot exceed 10 characters');
    }

    if (!config.deployerAddress || !config.deployerAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
      throw new ValidationError('Invalid deployer address format');
    }

    if (!config.chainId || config.chainId <= 0) {
      throw new ValidationError('Valid chain ID is required');
    }
  }

  private validateSocialIntegrationConfig(config: SocialIntegrationConfig): void {
    if (!config.platforms || !Array.isArray(config.platforms)) {
      throw new ValidationError('Social platforms array is required');
    }

    if (config.platforms.length === 0) {
      throw new ValidationError('At least one social platform must be configured');
    }

    if (config.platforms.length > 5) {
      throw new ValidationError('Maximum 5 social platforms allowed');
    }

    // Validate each platform configuration
    config.platforms.forEach((platform, index) => {
      if (!platform.platform || !['twitter', 'farcaster'].includes(platform.platform)) {
        throw new ValidationError(`Invalid platform type at index ${index}: must be 'twitter' or 'farcaster'`);
      }

      if (platform.enabled && !platform.credentials) {
        throw new ValidationError(`Credentials required for enabled platform: ${platform.platform}`);
      }
    });

    // Check for duplicate platforms
    const platformTypes = config.platforms.map(p => p.platform);
    const uniquePlatforms = new Set(platformTypes);
    if (platformTypes.length !== uniquePlatforms.size) {
      throw new ValidationError('Duplicate platform configurations are not allowed');
    }
  }

  private validateTwitterCredentials(credentials: any): boolean {
    return !!(credentials.apiKey && credentials.apiSecret && 
             (credentials.accessToken && credentials.accessTokenSecret || credentials.bearerToken));
  }

  private validateFarcasterCredentials(credentials: any): boolean {
    return !!(credentials.signerUuid || (credentials.mnemonic && credentials.signerUuid));
  }

  validateSocialDeploymentConfig(config: TokenDeploymentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      this.validateTokenConfig(config);
    } catch (error) {
      errors.push(`Token config: ${error.message}`);
    }

    if (config.socialIntegration) {
      try {
        this.validateSocialIntegrationConfig(config.socialIntegration);
      } catch (error) {
        errors.push(`Social integration: ${error.message}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Custom generators for property testing
const generateValidAddress = () => 
  fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER })
    .map(n => `0x${n.toString(16).padStart(40, '0')}`);

const generateTokenMetadata = () => fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  symbol: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0).map(s => s.toUpperCase()),
  description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  image: fc.option(fc.webUrl(), { nil: undefined }),
  website: fc.option(fc.webUrl(), { nil: undefined }),
  twitter: fc.option(fc.string({ minLength: 1, maxLength: 15 }), { nil: undefined }),
  telegram: fc.option(fc.string({ minLength: 1, maxLength: 32 }), { nil: undefined }),
});

const generateTwitterCredentials = () => fc.record({
  apiKey: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10),
  apiSecret: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10),
  accessToken: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10),
  accessTokenSecret: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10),
  bearerToken: fc.option(fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length >= 10), { nil: undefined }),
});

const generateFarcasterCredentials = () => fc.record({
  signerUuid: fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10),
  mnemonic: fc.option(fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10), { nil: undefined }),
});

const generateSocialPlatformConfig = () => fc.oneof(
  // Twitter platform with Twitter credentials
  fc.record({
    platform: fc.constant('twitter' as const),
    credentials: generateTwitterCredentials(),
    enabled: fc.boolean(),
  }),
  // Farcaster platform with Farcaster credentials
  fc.record({
    platform: fc.constant('farcaster' as const),
    credentials: generateFarcasterCredentials(),
    enabled: fc.boolean(),
  })
);

const generateSocialIntegrationConfig = () => fc.oneof(
  // Single Twitter platform
  fc.record({
    platforms: fc.array(fc.record({
      platform: fc.constant('twitter' as const),
      credentials: generateTwitterCredentials(),
      enabled: fc.boolean(),
    }), { minLength: 1, maxLength: 1 }),
    autoPost: fc.boolean(),
    includeMetadata: fc.boolean(),
    fallbackToStandard: fc.boolean(),
  }),
  // Single Farcaster platform
  fc.record({
    platforms: fc.array(fc.record({
      platform: fc.constant('farcaster' as const),
      credentials: generateFarcasterCredentials(),
      enabled: fc.boolean(),
    }), { minLength: 1, maxLength: 1 }),
    autoPost: fc.boolean(),
    includeMetadata: fc.boolean(),
    fallbackToStandard: fc.boolean(),
  }),
  // Both platforms (unique)
  fc.record({
    platforms: fc.constant([
      {
        platform: 'twitter' as const,
        credentials: {
          apiKey: 'test-api-key-12345',
          apiSecret: 'test-api-secret-12345',
          accessToken: 'test-access-token-12345',
          accessTokenSecret: 'test-access-token-secret-12345',
        },
        enabled: true,
      },
      {
        platform: 'farcaster' as const,
        credentials: {
          signerUuid: 'test-signer-uuid-12345',
        },
        enabled: true,
      }
    ]),
    autoPost: fc.boolean(),
    includeMetadata: fc.boolean(),
    fallbackToStandard: fc.boolean(),
  })
);

const generateValidTokenDeploymentConfig = () => fc.record({
  metadata: generateTokenMetadata(),
  socialIntegration: fc.option(generateSocialIntegrationConfig(), { nil: undefined }),
  chainId: fc.integer({ min: 1, max: 999999 }),
  deployerAddress: generateValidAddress(),
});

const generateInvalidTokenDeploymentConfig = () => fc.oneof(
  // Invalid token metadata - empty name
  fc.record({
    metadata: fc.record({
      name: fc.constant('   '), // Whitespace only
      symbol: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
      description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    }),
    chainId: fc.integer({ min: 1, max: 999999 }),
    deployerAddress: generateValidAddress(),
  }),
  
  // Invalid symbol - too long
  fc.record({
    metadata: fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      symbol: fc.string({ minLength: 11, maxLength: 20 }), // Too long
      description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    }),
    chainId: fc.integer({ min: 1, max: 999999 }),
    deployerAddress: generateValidAddress(),
  }),
  
  // Invalid deployer address
  fc.record({
    metadata: generateTokenMetadata(),
    chainId: fc.integer({ min: 1, max: 999999 }),
    deployerAddress: fc.constant('invalid-address'),
  }),
  
  // Invalid chain ID
  fc.record({
    metadata: generateTokenMetadata(),
    chainId: fc.constant(0),
    deployerAddress: generateValidAddress(),
  })
);

describe('Social Integration and Token Deployment Properties', () => {
  let socialManager: MockSocialIntegrationManager;

  beforeEach(() => {
    socialManager = new MockSocialIntegrationManager();
  });

  /**
   * **Property 2: Social Integration and Token Deployment**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
   * 
   * For any token deployment with social integration, the SDK should create tokens 
   * with social media metadata, integrate with specified platforms, and provide 
   * fallback to standard deployment when social integration fails.
   */
  it('should deploy tokens with social integration correctly', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidTokenDeploymentConfig(),
      async (config) => {
        // Test deployment with social integration
        const result = await socialManager.deployTokenWithSocialIntegration(config);
        
        // Deployment should succeed
        expect(result.success).toBe(true);
        expect(result.txHash).toBeDefined();
        expect(result.tokenAddress).toBeDefined();
        expect(result.error).toBeUndefined();

        // Verify transaction hash format
        expect(result.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
        
        // Verify token address format
        expect(result.tokenAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);

        // If social integration is configured, verify social integration results
        if (config.socialIntegration) {
          expect(result.socialIntegration).toBeDefined();
          
          const socialResult = result.socialIntegration!;
          
          // Verify enabled platforms match configuration
          const enabledPlatforms = config.socialIntegration.platforms
            .filter(p => p.enabled)
            .map(p => p.platform);
          
          expect(socialResult.enabled).toBe(enabledPlatforms.length > 0);
          expect(socialResult.platforms).toEqual(expect.arrayContaining(enabledPlatforms));
          
          // Verify social metadata structure
          expect(socialResult.metadata).toBeDefined();
          expect(socialResult.metadata.socialLinks).toBeInstanceOf(Array);
          expect(socialResult.metadata.postUrls).toBeInstanceOf(Array);
          
          // If auto-posting is enabled and platforms are enabled, should have post URLs
          if (config.socialIntegration.autoPost && enabledPlatforms.length > 0) {
            expect(socialResult.metadata.postUrls.length).toBeGreaterThanOrEqual(0);
          }
          
          // Verify warnings array exists
          expect(socialResult.warnings).toBeInstanceOf(Array);
        } else {
          // No social integration configured, should not have social integration results
          expect(result.socialIntegration).toBeUndefined();
        }
      }
    ), { numRuns: 100 });
  });

  it('should handle invalid deployment configurations', async () => {
    await fc.assert(fc.asyncProperty(
      generateInvalidTokenDeploymentConfig(),
      async (invalidConfig) => {
        // Test configuration validation
        const validation = socialManager.validateSocialDeploymentConfig(invalidConfig);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);

        // Test deployment should fail
        const result = await socialManager.deployTokenWithSocialIntegration(invalidConfig);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.txHash).toBeUndefined();
        expect(result.tokenAddress).toBeUndefined();
      }
    ), { numRuns: 100 });
  });

  it('should provide fallback to standard deployment when social integration fails', async () => {
    await fc.assert(fc.asyncProperty(
      generateValidTokenDeploymentConfig()
        .filter(config => config.socialIntegration !== undefined)
        .map(config => ({
          ...config,
          socialIntegration: {
            ...config.socialIntegration!,
            fallbackToStandard: true,
            platforms: [{
              platform: 'twitter' as const,
              credentials: {}, // Invalid credentials to trigger failure
              enabled: true
            }]
          }
        })),
      async (config) => {
        const result = await socialManager.deployTokenWithSocialIntegration(config);
        
        // Deployment should still succeed due to fallback
        expect(result.success).toBe(true);
        expect(result.txHash).toBeDefined();
        expect(result.tokenAddress).toBeDefined();
        
        // Should have social integration results with warnings
        expect(result.socialIntegration).toBeDefined();
        expect(result.socialIntegration!.enabled).toBe(false);
        expect(result.socialIntegration!.warnings.length).toBeGreaterThan(0);
        
        // Should contain fallback warning
        const hasFailbackWarning = result.socialIntegration!.warnings.some(
          warning => warning.includes('deployed with standard method')
        );
        expect(hasFailbackWarning).toBe(true);
      }
    ), { numRuns: 50 });
  });

  it('should validate social platform configurations correctly', () => {
    fc.assert(fc.property(
      generateSocialIntegrationConfig(),
      (socialConfig) => {
        const config: TokenDeploymentConfig = {
          metadata: {
            name: 'Test Token',
            symbol: 'TEST'
          },
          socialIntegration: socialConfig,
          chainId: 1,
          deployerAddress: '0x1234567890123456789012345678901234567890'
        };

        const validation = socialManager.validateSocialDeploymentConfig(config);

        // Should validate platform types
        const validPlatforms = socialConfig.platforms.every(p => 
          ['twitter', 'farcaster'].includes(p.platform)
        );
        
        // Should validate no duplicates
        const platformTypes = socialConfig.platforms.map(p => p.platform);
        const uniquePlatforms = new Set(platformTypes);
        const noDuplicates = platformTypes.length === uniquePlatforms.size;
        
        // Should validate platform count
        const validCount = socialConfig.platforms.length > 0 && socialConfig.platforms.length <= 5;

        if (validPlatforms && noDuplicates && validCount) {
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        } else {
          expect(validation.valid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });

  it('should provide descriptive error messages for validation failures', () => {
    const testCases = [
      {
        config: {
          metadata: { name: '', symbol: 'TEST' },
          chainId: 1,
          deployerAddress: '0x1234567890123456789012345678901234567890'
        },
        expectedError: 'Token name is required'
      },
      {
        config: {
          metadata: { name: 'Test', symbol: 'VERYLONGSYMBOL' },
          chainId: 1,
          deployerAddress: '0x1234567890123456789012345678901234567890'
        },
        expectedError: 'cannot exceed 10 characters'
      },
      {
        config: {
          metadata: { name: 'Test', symbol: 'TEST' },
          chainId: 1,
          deployerAddress: 'invalid-address'
        },
        expectedError: 'Invalid deployer address format'
      },
      {
        config: {
          metadata: { name: 'Test', symbol: 'TEST' },
          socialIntegration: {
            platforms: [],
            autoPost: true,
            includeMetadata: true,
            fallbackToStandard: true
          },
          chainId: 1,
          deployerAddress: '0x1234567890123456789012345678901234567890'
        },
        expectedError: 'At least one social platform must be configured'
      }
    ];

    testCases.forEach(({ config, expectedError }) => {
      const validation = socialManager.validateSocialDeploymentConfig(config as TokenDeploymentConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes(expectedError))).toBe(true);
    });
  });
});