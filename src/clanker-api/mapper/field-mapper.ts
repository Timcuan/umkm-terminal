/**
 * Core Field Mapper
 * Handles bidirectional conversion between SDK format and Bankrbot API format
 */

import type { ClankerTokenV4 } from '../../types/index.js';
import type { 
  BankrbotAPITokenRequest, 
  BankrbotAPIResponse,
  ClankerAPITokenRequest, 
  ClankerAPIResponse 
} from '../types/api-types.js';
import type {
  IFieldMapper,
  FieldMappingResult,
  MappingContext,
  MappingOptions
} from '../types/mapper-types.js';
import { createValidationError } from '../types/error-types.js';
import { ensureRequestKey } from '../utils/index.js';

// ============================================================================
// Default Mapping Context
// ============================================================================

const DEFAULT_MAPPING_CONTEXT: MappingContext = {
  chainId: 8453, // Base
  operationMethod: 'api',
  preserveDefaults: true,
  validateRequired: true,
};

// ============================================================================
// Field Mapper Implementation
// ============================================================================

export class FieldMapper implements IFieldMapper {
  private context: MappingContext;

  constructor(context: Partial<MappingContext> = {}) {
    this.context = { ...DEFAULT_MAPPING_CONTEXT, ...context };
  }

  // ==========================================================================
  // Public Interface Methods
  // ==========================================================================

  /**
   * Convert SDK format to Bankrbot API format
   */
  mapToBankrbotAPIFormat(
    token: ClankerTokenV4,
    context?: Partial<MappingContext>
  ): FieldMappingResult<BankrbotAPITokenRequest> {
    const mappingContext = { ...this.context, ...context };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      const validation = this.validateRequiredFields(token);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // Build Bankrbot API request
      const apiRequest: BankrbotAPITokenRequest = {
        // Core token fields
        name: token.name,
        symbol: token.symbol,
        tokenAdmin: token.tokenAdmin,
        image: token.image,
        
        // Metadata
        description: token.metadata?.description,
        socialMediaUrls: this.mapSocialMediaUrls(token.metadata?.socialMediaUrls, errors, warnings),
        auditUrls: this.mapAuditUrls(token.metadata, errors, warnings),
        
        // Enhanced metadata
        metadata: this.mapEnhancedMetadata(token.metadata, errors, warnings),
        
        // Pool configuration
        poolConfig: this.mapPoolConfigToBankrbot(token, errors, warnings),
        
        // Fee configuration
        feeConfig: this.mapFeeConfigToBankrbot(token.fees, errors, warnings),
        
        // Rewards configuration (convert basis points to percentages)
        rewardsConfig: this.mapRewardsConfigToBankrbot(token.rewards, errors, warnings),
        
        // Vault configuration
        vaultConfig: this.mapVaultConfigToBankrbot(token.vault, errors, warnings),
        
        // MEV protection configuration
        mevConfig: this.mapMevConfigToBankrbot(token.mev, errors, warnings),
        
        // Chain configuration
        chainId: token.chainId || mappingContext.chainId,
        
        // Bankrbot-specific configuration
        verificationRequired: this.extractVerificationRequired(token),
        socialIntegration: this.extractSocialIntegration(token),
        customParameters: this.extractCustomParameters(token),
        
        // Context for tracking
        context: {
          interface: 'Bankrbot SDK Integration',
          version: '4.25.0',
          timestamp: new Date().toISOString(),
        },
      };

      return {
        success: true,
        data: apiRequest,
        errors,
        warnings,
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Bankrbot mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Convert Bankrbot API response back to SDK format
   */
  mapFromBankrbotAPIResponse(
    apiResponse: BankrbotAPIResponse,
    originalToken: ClankerTokenV4,
    context?: Partial<MappingContext>
  ): FieldMappingResult<{
    address: string;
    txHash: string;
    poolAddress?: string;
    liquidityTxHash?: string;
    verified?: boolean;
    socialLinks?: Array<{ platform: string; url: string }>;
    deploymentTime?: string;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!apiResponse.success) {
        return {
          success: false,
          errors: [`Bankrbot API request failed: ${apiResponse.error || 'Unknown error'}`],
          warnings,
        };
      }

      if (!apiResponse.tokenAddress) {
        return {
          success: false,
          errors: ['Bankrbot API response missing token address'],
          warnings,
        };
      }

      const result = {
        address: apiResponse.tokenAddress,
        txHash: apiResponse.deploymentTxHash,
        poolAddress: apiResponse.poolAddress,
        liquidityTxHash: apiResponse.liquidityTxHash,
        
        // Bankrbot-specific response data
        verified: apiResponse.verified,
        socialLinks: apiResponse.socialLinks,
        deploymentTime: apiResponse.deploymentTime,
      };

      return {
        success: true,
        data: result,
        errors,
        warnings,
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Bankrbot response mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Convert SDK format to Clanker API format (legacy support)
   */
  mapToAPIFormat(
    token: ClankerTokenV4,
    context?: Partial<MappingContext>
  ): FieldMappingResult<ClankerAPITokenRequest> {
    const mappingContext = { ...this.context, ...context };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      const validation = this.validateRequiredFields(token);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // Build API request
      const apiRequest: ClankerAPITokenRequest = {
        token: this.mapTokenMetadata(token, errors, warnings),
        rewards: this.mapRewardsToAPI(token.rewards, errors, warnings),
        pool: this.mapPoolConfig(token, errors, warnings),
        fees: this.mapFeesConfig(token.fees, errors, warnings),
        vault: this.mapVaultConfig(token.vault, errors, warnings),
        airdrop: this.mapAirdropConfig(token, errors, warnings),
        chainId: token.chainId ?? mappingContext.chainId,
      };

      return {
        success: true,
        data: apiRequest,
        errors,
        warnings,
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Convert Clanker API response back to SDK format
   */
  mapFromAPIResponse(
    apiResponse: ClankerAPIResponse,
    originalToken: ClankerTokenV4,
    context?: Partial<MappingContext>
  ): FieldMappingResult<{
    address: string;
    txHash: string;
    poolAddress?: string;
    liquidityTxHash?: string;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!apiResponse.success) {
        return {
          success: false,
          errors: [`API request failed: ${apiResponse.error || 'Unknown error'}`],
          warnings,
        };
      }

      if (!apiResponse.expectedAddress) {
        return {
          success: false,
          errors: ['API response missing expected token address'],
          warnings,
        };
      }

      const result = {
        address: apiResponse.expectedAddress,
        txHash: apiResponse.deploymentTxHash || '',
        poolAddress: apiResponse.poolAddress,
        liquidityTxHash: apiResponse.liquidityTxHash,
      };

      return {
        success: true,
        data: result,
        errors,
        warnings,
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Response mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
      };
    }
  }

  /**
   * Validate mapping compatibility
   */
  validateMapping(
    token: ClankerTokenV4,
    context?: Partial<MappingContext>
  ): FieldMappingResult<boolean> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    const requiredValidation = this.validateRequiredFields(token);
    errors.push(...requiredValidation.errors);
    warnings.push(...requiredValidation.warnings);

    // Check field compatibility
    this.validateFieldCompatibility(token, errors, warnings);

    return {
      success: errors.length === 0,
      data: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Private Bankrbot Mapping Methods
  // ==========================================================================

  private mapSocialMediaUrls(
    socialMediaUrls: any,
    errors: string[],
    warnings: string[]
  ): string[] | undefined {
    if (!socialMediaUrls || !Array.isArray(socialMediaUrls)) {
      return undefined;
    }

    return socialMediaUrls.map((url: any) => {
      if (typeof url === 'string') {
        return url;
      }
      if (typeof url === 'object' && url.url) {
        return url.url;
      }
      warnings.push('Invalid social media URL format detected');
      return '';
    }).filter(url => url.length > 0);
  }

  private mapAuditUrls(
    metadata: ClankerTokenV4['metadata'],
    errors: string[],
    warnings: string[]
  ): string[] {
    if (!metadata) return [];
    
    // Extract audit URLs from metadata
    const auditUrls: string[] = [];
    
    // Check for direct auditUrls property
    if (metadata.auditUrls && Array.isArray(metadata.auditUrls)) {
      auditUrls.push(...metadata.auditUrls);
    }
    
    // Check for audit-related URLs in custom metadata
    Object.entries(metadata).forEach(([key, value]) => {
      if (key.toLowerCase().includes('audit') && typeof value === 'string' && value.startsWith('http')) {
        auditUrls.push(value);
      }
    });
    
    return auditUrls;
  }

  private mapEnhancedMetadata(
    metadata: ClankerTokenV4['metadata'],
    errors: string[],
    warnings: string[]
  ): Record<string, any> | undefined {
    if (!metadata) return undefined;
    
    const enhancedMetadata: Record<string, any> = {};
    
    // Map social links with proper formatting
    if (metadata.socials) {
      enhancedMetadata.socials = {
        twitter: this.formatSocialHandle(metadata.socials.twitter, 'twitter'),
        telegram: this.formatSocialHandle(metadata.socials.telegram, 'telegram'),
        discord: this.formatSocialHandle(metadata.socials.discord, 'discord'),
        website: this.validateUrl(metadata.socials.website),
      };
      
      // Remove undefined values
      Object.keys(enhancedMetadata.socials).forEach(key => {
        if (enhancedMetadata.socials[key] === undefined) {
          delete enhancedMetadata.socials[key];
        }
      });
    }
    
    // Include custom metadata fields (excluding known fields)
    const knownFields = ['description', 'socials', 'auditUrls'];
    Object.entries(metadata).forEach(([key, value]) => {
      if (!knownFields.includes(key) && value !== undefined) {
        enhancedMetadata[key] = value;
      }
    });
    
    return Object.keys(enhancedMetadata).length > 0 ? enhancedMetadata : undefined;
  }

  private formatSocialHandle(handle: string | undefined, platform: string): string | undefined {
    if (!handle) return undefined;
    
    // Remove @ prefix if present
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    
    // Validate handle format based on platform
    switch (platform) {
      case 'twitter':
        return /^[A-Za-z0-9_]{1,15}$/.test(cleanHandle) ? cleanHandle : undefined;
      case 'telegram':
        return /^[A-Za-z0-9_]{5,32}$/.test(cleanHandle) ? cleanHandle : undefined;
      case 'discord':
        return cleanHandle; // Discord handles are more flexible
      default:
        return cleanHandle;
    }
  }

  private validateUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:' ? url : undefined;
    } catch {
      return undefined;
    }
  }

  private mapPoolConfigToBankrbot(
    token: ClankerTokenV4,
    errors: string[],
    warnings: string[]
  ): BankrbotAPITokenRequest['poolConfig'] | undefined {
    if (!token.pairedToken && !token.poolPositions) {
      return undefined;
    }

    // Determine pool type based on configuration
    const poolType = token.poolPositions && token.poolPositions.length > 0 ? 'custom' : 'standard';

    return {
      type: poolType,
      pairedToken: token.pairedToken,
      initialLiquidity: token.poolPositions,
      // Add additional pool configuration options
      positions: token.poolPositions?.map(pos => ({
        tickLower: pos.tickLower,
        tickUpper: pos.tickUpper,
        bps: pos.bps,
      })),
    };
  }

  private mapFeeConfigToBankrbot(
    fees: ClankerTokenV4['fees'],
    errors: string[],
    warnings: string[]
  ): BankrbotAPITokenRequest['feeConfig'] | undefined {
    if (!fees) {
      return undefined;
    }

    if (fees.type === 'static') {
      return {
        type: 'static',
        clankerFee: fees.clankerFee || 100,
        pairedFee: fees.pairedFee || 100,
      };
    } else if (fees.type === 'dynamic') {
      // Map dynamic fee configuration with all advanced options
      return {
        type: 'dynamic',
        clankerFee: fees.clankerFee || 100,
        baseFee: fees.baseFee || 100,
        maxFee: fees.maxFee || 1000,
        startingSniperFee: fees.startingSniperFee || 5000,
        endingSniperFee: fees.endingSniperFee || 100,
        referenceTickFilterPeriod: fees.referenceTickFilterPeriod || 300,
        resetPeriod: fees.resetPeriod || 3600,
        resetTickFilter: fees.resetTickFilter || 100,
        feeControlNumerator: fees.feeControlNumerator || 1000,
        decayFilterBps: fees.decayFilterBps || 50,
        decayDuration: fees.decayDuration || 1800,
      };
    }

    // Fallback to static configuration
    warnings.push('Unknown fee type, defaulting to static configuration');
    return {
      type: 'static',
      clankerFee: 100,
      pairedFee: 100,
    };
  }

  private mapRewardsConfigToBankrbot(
    rewards: ClankerTokenV4['rewards'],
    errors: string[],
    warnings: string[]
  ): BankrbotAPITokenRequest['rewardsConfig'] | undefined {
    if (!rewards?.recipients || rewards.recipients.length === 0) {
      return undefined;
    }

    return {
      recipients: rewards.recipients.map(recipient => ({
        recipient: recipient.recipient,
        admin: recipient.admin,
        // Convert basis points to percentages for Bankrbot API
        percentage: recipient.bps / 100,
        feePreference: recipient.feePreference || 'Both',
      }))
    };
  }

  private mapVaultConfigToBankrbot(
    vault: ClankerTokenV4['vault'],
    errors: string[],
    warnings: string[]
  ): BankrbotAPITokenRequest['vaultConfig'] | undefined {
    if (!vault || vault.percentage === 0) {
      return undefined;
    }

    return {
      percentage: vault.percentage,
      lockupDuration: vault.lockupDuration,
      vestingDuration: vault.vestingDuration,
      recipient: vault.recipient,
    };
  }

  private mapMevConfigToBankrbot(
    mev: ClankerTokenV4['mev'],
    errors: string[],
    warnings: string[]
  ): BankrbotAPITokenRequest['mevConfig'] | undefined {
    if (!mev || mev.type === 'none') {
      return undefined;
    }

    if (mev.type === 'blockDelay') {
      return {
        type: 'blockDelay',
        blockDelay: mev.blockDelay || 1,
      };
    } else if (mev.type === 'sniperAuction') {
      return {
        type: 'sniperAuction',
        sniperAuction: {
          startingFee: mev.sniperAuction?.startingFee || 5000,
          endingFee: mev.sniperAuction?.endingFee || 100,
          secondsToDecay: mev.sniperAuction?.secondsToDecay || 1800,
        },
      };
    }

    warnings.push('Unknown MEV protection type, skipping MEV configuration');
    return undefined;
  }

  private extractVerificationRequired(token: ClankerTokenV4): boolean {
    // Check if token has bankrbot-specific config
    const bankrbotConfig = (token as any).bankrbotConfig;
    if (bankrbotConfig?.verificationRequired !== undefined) {
      return bankrbotConfig.verificationRequired;
    }
    
    // Default to true for verified status
    return true;
  }

  private extractSocialIntegration(token: ClankerTokenV4): BankrbotAPITokenRequest['socialIntegration'] | undefined {
    const bankrbotConfig = (token as any).bankrbotConfig;
    if (bankrbotConfig?.socialIntegration) {
      return bankrbotConfig.socialIntegration;
    }
    
    // Try to extract from existing social media URLs
    if (token.metadata?.socialMediaUrls && Array.isArray(token.metadata.socialMediaUrls)) {
      const twitterUrl = token.metadata.socialMediaUrls.find((url: any) => {
        const urlStr = typeof url === 'string' ? url : url.url;
        return urlStr && (urlStr.includes('twitter.com') || urlStr.includes('x.com'));
      });
      
      if (twitterUrl) {
        return {
          platform: 'twitter',
          userId: this.extractTwitterUserId(typeof twitterUrl === 'string' ? twitterUrl : twitterUrl.url),
        };
      }
    }
    
    return undefined;
  }

  private extractCustomParameters(token: ClankerTokenV4): BankrbotAPITokenRequest['customParameters'] | undefined {
    const bankrbotConfig = (token as any).bankrbotConfig;
    if (bankrbotConfig?.customParameters) {
      return bankrbotConfig.customParameters;
    }
    
    // Extract from existing token configuration
    const customParams: BankrbotAPITokenRequest['customParameters'] = {};
    
    // Check for priority deployment indicators
    if (token.mev && token.mev.type !== 'none') {
      customParams.priorityDeployment = true;
    }
    
    // Check for custom gas limit
    if ((token as any).gasLimit) {
      customParams.customGasLimit = (token as any).gasLimit;
    }
    
    return Object.keys(customParams).length > 0 ? customParams : undefined;
  }

  private extractTwitterUserId(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length > 0) {
        return pathParts[0]; // First part after domain is usually the username
      }
    } catch (error) {
      // Invalid URL, ignore
    }
    return undefined;
  }

  // ==========================================================================
  // Private Legacy Mapping Methods
  // ==========================================================================

  private mapTokenMetadata(
    token: ClankerTokenV4,
    errors: string[],
    warnings: string[]
  ): ClankerAPITokenRequest['token'] {
    // Check if requestKey is provided in token config
    const existingRequestKey = (token as any).requestKey;
    
    const metadata: ClankerAPITokenRequest['token'] = {
      name: token.name,
      symbol: token.symbol,
      tokenAdmin: token.tokenAdmin,
      // Use existing requestKey if provided, otherwise generate new one
      requestKey: existingRequestKey ? ensureRequestKey(existingRequestKey) : ensureRequestKey(),
    };

    // Optional fields
    if (token.image) {
      metadata.image = token.image;
    }

    if (token.metadata?.description) {
      metadata.description = token.metadata.description;
    }

    // Map social media URLs
    if (token.metadata?.socialMediaUrls && Array.isArray(token.metadata.socialMediaUrls)) {
      metadata.socialMediaUrls = token.metadata.socialMediaUrls.map((url: any) => {
        if (typeof url === 'string') {
          // Convert string URLs to platform objects
          return {
            platform: this.detectPlatform(url),
            url: url,
          };
        }
        return url;
      });
    }

    // Map audit URLs
    if (token.metadata?.auditUrls && Array.isArray(token.metadata.auditUrls)) {
      metadata.auditUrls = token.metadata.auditUrls;
    } else {
      metadata.auditUrls = [];
    }

    return metadata;
  }

  private mapRewardsToAPI(
    rewards: ClankerTokenV4['rewards'],
    errors: string[],
    warnings: string[]
  ): ClankerAPITokenRequest['rewards'] {
    if (!rewards?.recipients || rewards.recipients.length === 0) {
      // Default to 100% to token admin - but we need tokenAdmin from context
      warnings.push('No rewards configuration provided - will use API defaults');
      return [];
    }

    return rewards.recipients.map(recipient => ({
      admin: recipient.admin,
      recipient: recipient.recipient,
      // Convert basis points to percentage
      allocation: recipient.bps / 100,
      rewardsToken: recipient.feePreference === 'Both' ? 'Both' :
                   recipient.feePreference === 'Paired' ? 'Paired' : 'Clanker',
    }));
  }

  private mapPoolConfig(
    token: ClankerTokenV4,
    errors: string[],
    warnings: string[]
  ): ClankerAPITokenRequest['pool'] | undefined {
    // Pool config is optional in API
    if (!token.pairedToken && !token.poolPositions) {
      return undefined;
    }

    return {
      type: 'standard', // Default type
      pairedToken: token.pairedToken,
      initialMarketCap: 10, // Default market cap
    };
  }

  private mapFeesConfig(
    fees: ClankerTokenV4['fees'],
    errors: string[],
    warnings: string[]
  ): ClankerAPITokenRequest['fees'] | undefined {
    if (!fees) {
      return undefined;
    }

    const apiFeesConfig: ClankerAPITokenRequest['fees'] = {
      type: fees.type,
    };

    if (fees.type === 'static') {
      apiFeesConfig.clankerFee = fees.clankerFee;
      apiFeesConfig.pairedFee = fees.pairedFee;
    } else if (fees.type === 'dynamic') {
      apiFeesConfig.baseFee = fees.baseFee;
      apiFeesConfig.maxFee = fees.maxFee;
      apiFeesConfig.referenceTickFilterPeriod = fees.referenceTickFilterPeriod;
      apiFeesConfig.resetPeriod = fees.resetPeriod;
      apiFeesConfig.resetTickFilter = fees.resetTickFilter;
      apiFeesConfig.feeControlNumerator = fees.feeControlNumerator;
      apiFeesConfig.decayFilterBps = fees.decayFilterBps;
    }

    return apiFeesConfig;
  }

  private mapVaultConfig(
    vault: ClankerTokenV4['vault'],
    errors: string[],
    warnings: string[]
  ): ClankerAPITokenRequest['vault'] | undefined {
    if (!vault || vault.percentage === 0) {
      return undefined;
    }

    return {
      percentage: vault.percentage,
      lockupDuration: vault.lockupDuration,
      vestingDuration: vault.vestingDuration,
      recipient: vault.recipient,
    };
  }

  private mapAirdropConfig(
    token: ClankerTokenV4,
    errors: string[],
    warnings: string[]
  ): ClankerAPITokenRequest['airdrop'] | undefined {
    // Airdrop is not directly supported in current SDK format
    // This would need to be added as an extension
    return undefined;
  }

  // ==========================================================================
  // Validation Methods
  // ==========================================================================

  private validateRequiredFields(token: ClankerTokenV4): FieldMappingResult<boolean> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields for API
    if (!token.name || token.name.trim() === '') {
      errors.push('Token name is required');
    }

    if (!token.symbol || token.symbol.trim() === '') {
      errors.push('Token symbol is required');
    }

    if (!token.tokenAdmin || token.tokenAdmin.trim() === '') {
      errors.push('Token admin address is required');
    }

    // Validate address format
    if (token.tokenAdmin && !this.isValidAddress(token.tokenAdmin)) {
      errors.push('Token admin must be a valid Ethereum address');
    }

    // Validate symbol format
    if (token.symbol && (token.symbol.length < 1 || token.symbol.length > 11)) {
      warnings.push('Token symbol should be 1-11 characters');
    }

    // Validate name length - allow longer names, only warn for very long names
    if (token.name && token.name.length > 200) {
      warnings.push('Token name is very long (>200 characters)');
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateFieldCompatibility(
    token: ClankerTokenV4,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for unsupported features
    if (token.mev && token.mev.type !== 'none') {
      warnings.push('MEV protection configuration may not be fully supported via API');
    }

    if (token.context) {
      warnings.push('Custom context may be overridden by API');
    }

    if (token.salt) {
      warnings.push('Custom salt may be ignored by API (API generates its own)');
    }

    // Check rewards total allocation
    if (token.rewards?.recipients) {
      const totalBps = token.rewards.recipients.reduce((sum, r) => sum + r.bps, 0);
      if (totalBps !== 10000) {
        errors.push(`Rewards allocation must total 100% (10000 bps), got ${totalBps} bps`);
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private detectPlatform(url: string): string {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    }
    if (hostname.includes('telegram')) {
      return 'telegram';
    }
    if (hostname.includes('discord')) {
      return 'discord';
    }
    if (hostname.includes('github')) {
      return 'github';
    }
    
    return 'other';
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a field mapper with default configuration
 */
export function createFieldMapper(context?: Partial<MappingContext>): FieldMapper {
  return new FieldMapper(context);
}

/**
 * Quick Bankrbot mapping function for common use cases
 */
export function mapTokenToBankrbotAPI(
  token: ClankerTokenV4,
  options?: MappingOptions
): FieldMappingResult<BankrbotAPITokenRequest> {
  const mapper = createFieldMapper();
  return mapper.mapToBankrbotAPIFormat(token);
}

/**
 * Quick Bankrbot response mapping function
 */
export function mapBankrbotAPIResponse(
  response: BankrbotAPIResponse,
  originalToken: ClankerTokenV4
): FieldMappingResult<{ 
  address: string; 
  txHash: string; 
  poolAddress?: string; 
  liquidityTxHash?: string;
  verified?: boolean;
  socialLinks?: Array<{ platform: string; url: string }>;
  deploymentTime?: string;
}> {
  const mapper = createFieldMapper();
  return mapper.mapFromBankrbotAPIResponse(response, originalToken);
}

/**
 * Quick mapping function for common use cases (legacy)
 */
export function mapTokenToAPI(
  token: ClankerTokenV4,
  options?: MappingOptions
): FieldMappingResult<ClankerAPITokenRequest> {
  const mapper = createFieldMapper();
  return mapper.mapToAPIFormat(token);
}

/**
 * Quick response mapping function
 */
export function mapAPIResponse(
  response: ClankerAPIResponse,
  originalToken: ClankerTokenV4
): FieldMappingResult<{ address: string; txHash: string; poolAddress?: string; liquidityTxHash?: string }> {
  const mapper = createFieldMapper();
  return mapper.mapFromAPIResponse(response, originalToken);
}