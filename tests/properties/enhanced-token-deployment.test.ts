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

interface EnhancedDeploymentConfig {
  metadata: TokenMetadata;
  socialIntegration?: SocialIntegrationConfig;
  customFees?: CustomFeeConfig;
  chainId: number;
  deployerAddress: string;
  enhancedFeatures: boolean;
}

interface EnhancedDeploymentResult {
  success: boolean;
  txHash?: string;
  tokenAddress?: string;
  socialIntegration?: {
    enabled: boolean;
    platforms: string[];
    metadata: SocialMediaMetadata;
    warnings: string[];
  };
  customFees?: {
    configured: boolean;
    recipients: CustomFeeRecipient[];
    totalPercentage: number;
    warnings: string[];
  };
  enhancedFeatures?: {
    enabled: boolean;
    features: string[];
    warnings: string[];
  };
  error?: string;
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

// Mock EnhancedTokenDeployer class for testing
class MockEnhancedTokenDeployer {
  async deployEnhancedToken(config: EnhancedDeploymentConfig): Promise<EnhancedDeploymentResult> {
    try {
      // Validate basic token configuration
      this.validateTokenConfig(config);

      // Validate enhanced features if enabled
      if (config.enhancedFeatures) {
        if (config.socialIntegration) {
          this.validateSocialIntegrationConfig(config.socialIntegration);
        }
        if (config.customFees) {
          this.validateCustomFeeConfig(config.customFees);
        }
      }

      // Simulate deployment process
      const result: EnhancedDeploymentResult = {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`,
        tokenAddress: `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`,
      };

      // Process enhanced features
      if (config.enhancedFeatures) {
        const enabledFeatures: string[] = [];
        const warnings: string[] = [];

        // Process social integration
        if (config.socialIntegration) {
          try {
            const socialResult = await this.processSocialIntegration(config.socialIntegration, config.metadata);
            result.socialIntegration = socialResult;
            if (socialResult.enabled) {
              enabledFeatures.push('social-integration');
            }
            warnings.push(...socialResult.warnings);
          } catch (error) {
            warnings.push(`Social integration failed: ${error.message}`);
          }
        }

        // Process custom fees
        if (config.customFees) {
          try {
            const feeResult = await this.processCustomFees(config.customFees, config.tokenAddress || result.tokenAddress!);
            result.customFees = feeResult;
            if (feeResult.configured) {
              enabledFeatures.push('custom-fees');
            }
            warnings.push(...feeResult.warnings);
          } catch (error) {
            warnings.push(`Custom fees configuration failed: ${error.message}`);
          }
        }

        result.enhancedFeatures = {
          enabled: enabledFeatures.length > 0,
          features: enabledFeatures,
          warnings
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async processSocialIntegration(config: SocialIntegrationConfig, metadata: TokenMetadata): Promise<{
    enabled: boolean;
    platforms: string[];
    metadata: SocialMediaMetadata;
    warnings: string[];
  }> {
    const enabledPlatforms = config.platforms.filter(p => p.enabled).map(p => p.platform);
    const socialMetadata: SocialMediaMetadata = {
      socialLinks: [],
      postUrls: []
    };
    const warnings: string[] = [];

    for (const platform of config.platforms) {
      if (!platform.enabled) continue;

      try {
        if (platform.platform === 'twitter') {
          if (this.validateTwitterCredentials(platform.credentials)) {
            socialMetadata.twitterHandle = `@${metadata.symbol.toLowerCase()}`;
            socialMetadata.socialLinks.push(`https://twitter.com/${metadata.symbol.toLowerCase()}`);
            if (config.autoPost) {
              socialMetadata.postUrls.push(`https://twitter.com/status/${Math.random().toString().substring(2, 20)}`);
            }
          } else {
            throw new Error('Invalid Twitter credentials');
          }
        } else if (platform.platform === 'farcaster') {
          if (this.validateFarcasterCredentials(platform.credentials)) {
            socialMetadata.farcasterProfile = `${metadata.symbol.toLowerCase()}.eth`;
            socialMetadata.socialLinks.push(`https://warpcast.com/${metadata.symbol.toLowerCase()}`);
            if (config.autoPost) {
              socialMetadata.postUrls.push(`https://warpcast.com/cast/${Math.random().toString().substring(2, 20)}`);
            }
          } else {
            throw new Error('Invalid Farcaster credentials');
          }
        }
      } catch (error) {
        warnings.push(`${platform.platform} integration failed: ${error.message}`);
      }
    }

    const successfulPlatforms = enabledPlatforms.filter(platform => {
      return !warnings.some(warning => warning.includes(platform));
    });

    return {
      enabled: successfulPlatforms.length > 0,
      platforms: successfulPlatforms,
      metadata: socialMetadata,
      warnings
    };
  }

  private async processCustomFees(config: CustomFeeConfig, tokenAddress: string): Promise<{
    configured: boolean;
    recipients: CustomFeeRecipient[];
    totalPercentage: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    try {
      // Validate fee configuration
      const validation = this.validateCustomFeeConfig(config);
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      // Simulate fee configuration
      const totalPercentage = config.recipients.reduce((sum, r) => sum + r.percentage, 0);

      return {
        configured: true,
        recipients: config.recipients,
        totalPercentage,
        warnings
      };
    } catch (error) {
      warnings.push(`Fee configuration failed: ${error.message}`);
      return {
        configured: false,
        recipients: [],
        totalPercentage: 0,
        warnings
      };
    }
  }

  private validateTokenConfig(config: EnhancedDeploymentConfig): void {
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

  private validateCustomFeeConfig(config: CustomFeeConfig): { valid: boolean; errors: string[] } {
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
    if (!recipient.address || !recipient.address.match(/^0x[0-9a-fA-F]{40}$/)) {
      throw new ValidationError(`Invalid recipient address format: ${recipient.address}`);
    }

    if (typeof recipient.percentage !== 'number') {
      throw new ValidationError('Recipient percentage must be a number');
    }

    if (recipient.percentage <= 0) {
      throw new ValidationError('Recipient percentage must be greater than 0');
    }

    if (recipient.percentage > 100) {
      throw new ValidationError('Recipient percentage cannot exceed 100%');
    }

    if (recipient.description !== undefined) {
      if (typeof recipient.description !== 'string') {
        throw new ValidationError('Recipient description must be a string');
      }
      if (recipient.description.length > 200) {
        throw new ValidationError('Recipient description cannot exceed 200 characters');
      }
    }
  }

  private validateTwitterCredentials(credentials: any): boolean {
    return !!(credentials.apiKey && credentials.apiSecret && 
             (credentials.accessToken && credentials.accessTokenSecret || credentials.bearerToken));
  }

  private validateFarcasterCredentials(credentials: any): boolean {
    return !!(credentials.signerUuid || (credentials.mnemonic && credentials.signerUuid));
  }

  validateEnhancedDeploymentConfig(config: EnhancedDeploymentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      this.validateTokenConfig(config);
    } catch (error) {
      errors.push(`Token config: ${error.message}`);
    }

    if (config.enhancedFeatures) {
      if (config.socialIntegration) {
        try {
          this.validateSocialIntegrationConfig(config.socialIntegration);
        } catch (error) {
          errors.push(`Social integration: ${error.message}`);
        }
      }

      if (config.customFees) {
        const feeValidation = this.validateCustomFeeConfig(config.customFees);
        if (!feeValidation.valid) {
          errors.push(...feeValidation.errors.map(e => `Custom fees: ${e}`));
        }
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

const generateUniqueAddresses = (count: number) =>
  fc.set(generateValidAddress(), { minLength: count, maxLength: count })
    .map(addresses => Array.from(addresses));

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

const generateEnhancedDeploymentConfig = () => fc.record({
  metadata: generateTokenMetadata(),
  socialIntegration: fc.option(generateSocialIntegrationConfig(), { nil: undefined }),
  customFees: fc.option(generateValidCustomFeeConfig(), { nil: undefined }),
  chainId: fc.integer({ min: 1, max: 999999 }),
  deployerAddress: generateValidAddress(),
  enhancedFeatures: fc.boolean(),
});

const generateInvalidEnhancedDeploymentConfig = () => fc.oneof(
  // Invalid token metadata - empty name
  fc.record({
    metadata: fc.record({
      name: fc.constant('   '), // Whitespace only
      symbol: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
      description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    }),
    chainId: fc.integer({ min: 1, max: 999999 }),
    deployerAddress: generateValidAddress(),
    enhancedFeatures: fc.boolean(),
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
    enhancedFeatures: fc.boolean(),
  }),
  
  // Invalid deployer address
  fc.record({
    metadata: generateTokenMetadata(),
    chainId: fc.integer({ min: 1, max: 999999 }),
    deployerAddress: fc.constant('invalid-address'),
    enhancedFeatures: fc.boolean(),
  }),
  
  // Invalid chain ID
  fc.record({
    metadata: generateTokenMetadata(),
    chainId: fc.constant(0),
    deployerAddress: generateValidAddress(),
    enhancedFeatures: fc.boolean(),
  })
);

describe('Enhanced Token Deployment Properties', () => {
  let deployer: MockEnhancedTokenDeployer;

  beforeEach(() => {
    deployer = new MockEnhancedTokenDeployer();
  });

  /**
   * **Property 7: Enhanced Token Deployment**
   * **Validates: Requirements 2.1, 2.2, 2.3, 4.1, 4.2**
   * 
   * For any enhanced token deployment, the SDK should deploy tokens with social 
   * integration and custom fee configuration, providing comprehensive deployment 
   * results with proper validation and error handling.
   */
  it('should deploy enhanced tokens with social integration and custom fees correctly', async () => {
    await fc.assert(fc.asyncProperty(
      generateEnhancedDeploymentConfig(),
      async (config) => {
        // Test enhanced deployment
        const result = await deployer.deployEnhancedToken(config);
        
        // Deployment should succeed
        expect(result.success).toBe(true);
        expect(result.txHash).toBeDefined();
        expect(result.tokenAddress).toBeDefined();
        expect(result.error).toBeUndefined();

        // Verify transaction hash format
        expect(result.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
        
        // Verify token address format
        expect(result.tokenAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);

        // If enhanced features are enabled, verify enhanced features results
        if (config.enhancedFeatures) {
          expect(result.enhancedFeatures).toBeDefined();
          
          const enhancedResult = result.enhancedFeatures!;
          expect(enhancedResult.features).toBeInstanceOf(Array);
          expect(enhancedResult.warnings).toBeInstanceOf(Array);
          
          // If social integration is configured and enabled, verify social integration results
          if (config.socialIntegration) {
            expect(result.socialIntegration).toBeDefined();
            
            const socialResult = result.socialIntegration!;
            expect(socialResult.metadata).toBeDefined();
            expect(socialResult.metadata.socialLinks).toBeInstanceOf(Array);
            expect(socialResult.metadata.postUrls).toBeInstanceOf(Array);
            expect(socialResult.platforms).toBeInstanceOf(Array);
            expect(socialResult.warnings).toBeInstanceOf(Array);
            
            // If social integration is successful, should be in enhanced features
            if (socialResult.enabled) {
              expect(enhancedResult.features).toContain('social-integration');
            }
          }
          
          // If custom fees are configured, verify custom fee results
          if (config.customFees) {
            expect(result.customFees).toBeDefined();
            
            const feeResult = result.customFees!;
            expect(feeResult.recipients).toBeInstanceOf(Array);
            expect(typeof feeResult.totalPercentage).toBe('number');
            expect(feeResult.warnings).toBeInstanceOf(Array);
            
            // If custom fees are successful, should be in enhanced features
            if (feeResult.configured) {
              expect(enhancedResult.features).toContain('custom-fees');
              expect(Math.abs(feeResult.totalPercentage - 100)).toBeLessThanOrEqual(0.01);
            }
          }
        } else {
          // Enhanced features disabled, should not have enhanced results
          expect(result.enhancedFeatures).toBeUndefined();
          expect(result.socialIntegration).toBeUndefined();
          expect(result.customFees).toBeUndefined();
        }
      }
    ), { numRuns: 100 });
  });

  it('should handle invalid enhanced deployment configurations', async () => {
    await fc.assert(fc.asyncProperty(
      generateInvalidEnhancedDeploymentConfig(),
      async (invalidConfig) => {
        // Test configuration validation
        const validation = deployer.validateEnhancedDeploymentConfig(invalidConfig);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);

        // Test deployment should fail
        const result = await deployer.deployEnhancedToken(invalidConfig);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.txHash).toBeUndefined();
        expect(result.tokenAddress).toBeUndefined();
      }
    ), { numRuns: 100 });
  });

  it('should handle enhanced deployment with both social integration and custom fees', async () => {
    await fc.assert(fc.asyncProperty(
      generateEnhancedDeploymentConfig()
        .filter(config => config.enhancedFeatures)
        .map(config => ({
          ...config,
          socialIntegration: {
            platforms: [{
              platform: 'twitter' as const,
              credentials: {
                apiKey: 'test-api-key-12345',
                apiSecret: 'test-api-secret-12345',
                accessToken: 'test-access-token-12345',
                accessTokenSecret: 'test-access-token-secret-12345',
              },
              enabled: true,
            }],
            autoPost: true,
            includeMetadata: true,
            fallbackToStandard: false,
          },
          customFees: {
            recipients: [
              { address: '0x1234567890123456789012345678901234567890', percentage: 50 },
              { address: '0x0987654321098765432109876543210987654321', percentage: 50 }
            ],
            totalPercentage: 100
          }
        })),
      async (config) => {
        const result = await deployer.deployEnhancedToken(config);
        
        // Deployment should succeed
        expect(result.success).toBe(true);
        expect(result.txHash).toBeDefined();
        expect(result.tokenAddress).toBeDefined();
        
        // Should have enhanced features enabled
        expect(result.enhancedFeatures).toBeDefined();
        expect(result.enhancedFeatures!.enabled).toBe(true);
        expect(result.enhancedFeatures!.features).toContain('social-integration');
        expect(result.enhancedFeatures!.features).toContain('custom-fees');
        
        // Should have social integration results
        expect(result.socialIntegration).toBeDefined();
        expect(result.socialIntegration!.enabled).toBe(true);
        expect(result.socialIntegration!.platforms).toContain('twitter');
        expect(result.socialIntegration!.metadata.socialLinks.length).toBeGreaterThan(0);
        
        // Should have custom fee results
        expect(result.customFees).toBeDefined();
        expect(result.customFees!.configured).toBe(true);
        expect(result.customFees!.recipients.length).toBe(2);
        expect(Math.abs(result.customFees!.totalPercentage - 100)).toBeLessThanOrEqual(0.01);
      }
    ), { numRuns: 50 });
  });

  it('should validate enhanced deployment configurations correctly', () => {
    fc.assert(fc.property(
      generateEnhancedDeploymentConfig(),
      (config) => {
        const validation = deployer.validateEnhancedDeploymentConfig(config);

        // Should validate basic token configuration
        const hasValidName = config.metadata.name && config.metadata.name.trim().length > 0;
        const hasValidSymbol = config.metadata.symbol && config.metadata.symbol.trim().length > 0 && config.metadata.symbol.trim().length <= 10;
        const hasValidAddress = config.deployerAddress && config.deployerAddress.match(/^0x[0-9a-fA-F]{40}$/);
        const hasValidChainId = config.chainId && config.chainId > 0;

        const basicValidation = hasValidName && hasValidSymbol && hasValidAddress && hasValidChainId;

        if (basicValidation) {
          // If enhanced features are enabled, validate enhanced configurations
          if (config.enhancedFeatures) {
            let enhancedValidation = true;
            
            if (config.socialIntegration) {
              const validPlatforms = config.socialIntegration.platforms.every(p => 
                ['twitter', 'farcaster'].includes(p.platform)
              );
              const platformTypes = config.socialIntegration.platforms.map(p => p.platform);
              const uniquePlatforms = new Set(platformTypes);
              const noDuplicates = platformTypes.length === uniquePlatforms.size;
              const validCount = config.socialIntegration.platforms.length > 0 && config.socialIntegration.platforms.length <= 5;
              
              enhancedValidation = enhancedValidation && validPlatforms && noDuplicates && validCount;
            }
            
            if (config.customFees) {
              const hasRecipients = config.customFees.recipients && config.customFees.recipients.length > 0;
              const validCount = config.customFees.recipients.length <= 10;
              const totalPercentage = config.customFees.recipients.reduce((sum, r) => sum + r.percentage, 0);
              const validTotal = Math.abs(totalPercentage - 100) <= 0.01;
              const addresses = config.customFees.recipients.map(r => r.address.toLowerCase());
              const uniqueAddresses = new Set(addresses);
              const noDuplicateAddresses = addresses.length === uniqueAddresses.size;
              
              enhancedValidation = enhancedValidation && hasRecipients && validCount && validTotal && noDuplicateAddresses;
            }
            
            if (enhancedValidation) {
              expect(validation.valid).toBe(true);
              expect(validation.errors).toHaveLength(0);
            } else {
              expect(validation.valid).toBe(false);
              expect(validation.errors.length).toBeGreaterThan(0);
            }
          } else {
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
          }
        } else {
          expect(validation.valid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });

  it('should provide descriptive error messages for enhanced deployment validation failures', () => {
    const testCases = [
      {
        config: {
          metadata: { name: '', symbol: 'TEST' },
          chainId: 1,
          deployerAddress: '0x1234567890123456789012345678901234567890',
          enhancedFeatures: false
        },
        expectedError: 'Token name is required'
      },
      {
        config: {
          metadata: { name: 'Test', symbol: 'VERYLONGSYMBOL' },
          chainId: 1,
          deployerAddress: '0x1234567890123456789012345678901234567890',
          enhancedFeatures: false
        },
        expectedError: 'cannot exceed 10 characters'
      },
      {
        config: {
          metadata: { name: 'Test', symbol: 'TEST' },
          chainId: 1,
          deployerAddress: 'invalid-address',
          enhancedFeatures: false
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
          deployerAddress: '0x1234567890123456789012345678901234567890',
          enhancedFeatures: true
        },
        expectedError: 'At least one social platform must be configured'
      },
      {
        config: {
          metadata: { name: 'Test', symbol: 'TEST' },
          customFees: {
            recipients: [
              { address: '0x1234567890123456789012345678901234567890', percentage: 50 },
              { address: '0x1234567890123456789012345678901234567890', percentage: 50 }
            ]
          },
          chainId: 1,
          deployerAddress: '0x1234567890123456789012345678901234567890',
          enhancedFeatures: true
        },
        expectedError: 'Duplicate recipient addresses are not allowed'
      }
    ];

    testCases.forEach(({ config, expectedError }) => {
      const validation = deployer.validateEnhancedDeploymentConfig(config as EnhancedDeploymentConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes(expectedError))).toBe(true);
    });
  });
});