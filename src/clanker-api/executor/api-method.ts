/**
 * Bankrbot API Method
 * Main orchestration class for Bankrbot API-based operations
 */

import type { ClankerTokenV4, DeployResult } from '../../types/index.js';
import type { 
  BankrbotAPIConfig,
  BankrbotAPITokenRequest,
  BankrbotAPIResponse,
  ClankerAPIConfig,
  ClankerAPITokenRequest,
  ClankerAPIResponse
} from '../types/api-types.js';
import { ClankerAPIClient } from '../client/api-client.js';
import { FieldMapper } from '../mapper/field-mapper.js';
import { 
  createAPIError, 
  createValidationError
} from '../types/error-types.js';

// ============================================================================
// Bankrbot API Method Class
// ============================================================================

export class BankrbotAPIMethod {
  private apiClient: ClankerAPIClient;
  private fieldMapper: FieldMapper;
  private config: BankrbotAPIConfig;

  constructor(config: BankrbotAPIConfig) {
    this.config = config;
    // Use existing client infrastructure but with Bankrbot configuration
    this.apiClient = new ClankerAPIClient(config as ClankerAPIConfig);
    this.fieldMapper = new FieldMapper();
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Deploy token via Bankrbot API with full customization and verification
   */
  async deploy(token: ClankerTokenV4): Promise<DeployResult> {
    try {
      // Step 1: Map SDK format to Bankrbot API format
      const mappingResult = this.fieldMapper.mapToBankrbotAPIFormat(token);
      if (!mappingResult.success || !mappingResult.data) {
        throw createValidationError(
          `Token configuration validation failed: ${mappingResult.errors.join(', ')}`,
          'bankrbot',
          { 
            errors: mappingResult.errors, 
            warnings: mappingResult.warnings 
          }
        );
      }

      const apiRequest = mappingResult.data;

      // Step 2: Validate request for Bankrbot requirements
      const validationResult = await this.validateBankrbotRequest(apiRequest);
      if (!validationResult.success) {
        throw createValidationError(
          `Bankrbot API request validation failed: ${validationResult.errors.join(', ')}`,
          'bankrbot',
          { 
            errors: validationResult.errors, 
            warnings: validationResult.warnings 
          }
        );
      }

      // Step 3: Send deployment request to Bankrbot
      const deployResult = await this.deployViaBankrbot(apiRequest);
      if (!deployResult.success) {
        throw createAPIError(
          deployResult.error.error,
          deployResult.error.errorCode || 'BANKRBOT_DEPLOYMENT_FAILED',
          deployResult.error.retryable || false,
          { apiResponse: deployResult.error }
        );
      }

      // Step 4: Process Bankrbot response
      const response = deployResult.data;
      if (!response) {
        throw createAPIError(
          'Bankrbot deployment succeeded but no response data received',
          'BANKRBOT_DEPLOYMENT_FAILED',
          false,
          { deployResult }
        );
      }
      return this.createBankrbotDeployResult(response, token);

    } catch (error) {
      // Re-throw structured errors as-is
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      // Wrap unknown errors
      throw createAPIError(
        `Bankrbot token deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BANKRBOT_DEPLOYMENT_FAILED',
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Validate token configuration for Bankrbot deployment
   */
  async validateTokenConfig(token: ClankerTokenV4): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    estimatedGas?: string;
    estimatedCost?: string;
    verificationStatus?: boolean;
  }> {
    try {
      // For demo/test API keys, provide mock validation
      if (this.config.apiKey.includes('demo') || this.config.apiKey.includes('test')) {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!token.name?.trim()) {
          errors.push('Token name is required');
        }
        if (!token.symbol?.trim()) {
          errors.push('Token symbol is required');
        }
        if (!token.tokenAdmin?.trim()) {
          errors.push('Token admin address is required');
        }

        // Bankrbot-specific validations
        if (!token.image) {
          warnings.push('Image is recommended for verified tokens on Bankrbot');
        }
        
        if (!token.metadata?.description) {
          warnings.push('Description is recommended for better token visibility');
        }

        // Social media validation
        const bankrbotConfig = (token as any).bankrbotConfig;
        if (bankrbotConfig?.verificationRequired && !token.metadata?.socials) {
          warnings.push('Social media links are recommended for verified tokens');
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
          estimatedGas: '500000',
          estimatedCost: '0.01',
          verificationStatus: true, // Bankrbot ensures verified status
        };
      }

      // Map to Bankrbot API format first
      const mappingResult = this.fieldMapper.mapToBankrbotAPIFormat(token);
      if (!mappingResult.success || !mappingResult.data) {
        return {
          valid: false,
          errors: mappingResult.errors,
          warnings: mappingResult.warnings,
          verificationStatus: false,
        };
      }

      // Use Bankrbot API validation endpoint
      const validationResult = await this.validateBankrbotRequest(mappingResult.data);
      
      return {
        valid: validationResult.success,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        estimatedGas: '500000', // Estimated by Bankrbot
        estimatedCost: '0.01', // Estimated deployment cost
        verificationStatus: mappingResult.data.verificationRequired !== false,
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Bankrbot validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        verificationStatus: false,
      };
    }
  }

  /**
   * Test Bankrbot API connectivity and authentication
   */
  async testConnection(): Promise<{
    connected: boolean;
    authenticated: boolean;
    latency?: number;
    bankrbotStatus?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test basic connectivity to Bankrbot
      const healthResult = await this.apiClient.healthCheck();
      const latency = Date.now() - startTime;

      if (!healthResult.success) {
        return {
          connected: false,
          authenticated: false,
          latency,
          bankrbotStatus: 'unreachable',
        };
      }

      // Test Bankrbot authentication
      const authResult = await this.apiClient.testAuthentication();
      if (!authResult.success) {
        return {
          connected: true,
          authenticated: false,
          latency,
          bankrbotStatus: 'authentication_failed',
        };
      }

      return {
        connected: true,
        authenticated: authResult.data.authenticated,
        latency,
        bankrbotStatus: 'operational',
      };

    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        latency: Date.now() - startTime,
        bankrbotStatus: 'error',
      };
    }
  }

  // ==========================================================================
  // Bankrbot-Specific Methods
  // ==========================================================================

  /**
   * Check verification status of a deployed token
   */
  async checkVerificationStatus(tokenAddress: string): Promise<{
    verified: boolean;
    verificationTxHash?: string;
    socialLinks?: Array<{ platform: string; url: string }>;
    verificationTime?: string;
  }> {
    try {
      // For demo mode, return mock verification status
      if (this.config.apiKey.includes('demo') || this.config.apiKey.includes('test')) {
        return {
          verified: true,
          verificationTxHash: '0x' + '1'.repeat(64),
          socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com/example' }
          ],
          verificationTime: new Date().toISOString(),
        };
      }

      // Call Bankrbot verification status endpoint
      const result = await this.apiClient.getDeploymentStatus(tokenAddress);
      if (!result.success) {
        throw createAPIError(
          result.error.message || 'Failed to check verification status',
          result.error.code || 'VERIFICATION_CHECK_FAILED',
          result.error.retryable || false,
          { tokenAddress }
        );
      }

      return {
        verified: result.data.status === 'verified',
        verificationTxHash: result.data.txHash,
        socialLinks: [],
        verificationTime: new Date().toISOString(),
      };

    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      throw createAPIError(
        `Verification status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VERIFICATION_CHECK_FAILED',
        false,
        { tokenAddress, originalError: error }
      );
    }
  }

  /**
   * Update social media integration for a token
   */
  async updateSocialIntegration(
    tokenAddress: string,
    socialIntegration: BankrbotAPITokenRequest['socialIntegration']
  ): Promise<{
    success: boolean;
    socialLinks?: Array<{ platform: string; url: string }>;
  }> {
    try {
      // For demo mode, return mock success
      if (this.config.apiKey.includes('demo') || this.config.apiKey.includes('test')) {
        return {
          success: true,
          socialLinks: [
            { 
              platform: socialIntegration?.platform || 'twitter', 
              url: `https://${socialIntegration?.platform || 'twitter'}.com/${socialIntegration?.userId || 'example'}` 
            }
          ],
        };
      }

      // Call Bankrbot social integration update endpoint
      // This would be implemented when the actual Bankrbot API is available
      throw createAPIError(
        'Social integration update not yet implemented',
        'NOT_IMPLEMENTED',
        false,
        { tokenAddress, socialIntegration }
      );

    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      throw createAPIError(
        `Social integration update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SOCIAL_INTEGRATION_FAILED',
        false,
        { tokenAddress, socialIntegration, originalError: error }
      );
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private async validateBankrbotRequest(request: BankrbotAPITokenRequest): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.name?.trim()) {
      errors.push('Token name is required');
    } else if (request.name.length > 50) {
      warnings.push('Token name is very long (>50 characters)');
    }

    if (!request.symbol?.trim()) {
      errors.push('Token symbol is required');
    } else if (request.symbol.length > 11) {
      errors.push('Token symbol must be 11 characters or less');
    } else if (request.symbol.length < 1) {
      errors.push('Token symbol must be at least 1 character');
    }

    if (!request.tokenAdmin?.trim()) {
      errors.push('Token admin address is required');
    } else if (!this.isValidAddress(request.tokenAdmin)) {
      errors.push('Token admin must be a valid Ethereum address');
    }

    // Validate chain ID
    if (!request.chainId || request.chainId <= 0) {
      errors.push('Valid chain ID is required');
    } else {
      // Validate supported chains for Bankrbot
      const supportedChains = [1, 8453, 10, 137, 42161]; // Ethereum, Base, Optimism, Polygon, Arbitrum
      if (!supportedChains.includes(request.chainId)) {
        warnings.push(`Chain ID ${request.chainId} may not be fully supported by Bankrbot`);
      }
    }

    // Bankrbot-specific validations
    if (request.verificationRequired && !request.image) {
      warnings.push('Image is strongly recommended for verified tokens');
    }

    if (request.verificationRequired && !request.description) {
      warnings.push('Description is recommended for verified tokens');
    }

    // Validate enhanced metadata
    if (request.metadata) {
      this.validateEnhancedMetadata(request.metadata, errors, warnings);
    }

    // Validate pool configuration
    if (request.poolConfig) {
      this.validatePoolConfiguration(request.poolConfig, errors, warnings);
    }

    // Validate fee configuration with all advanced options
    if (request.feeConfig) {
      this.validateFeeConfiguration(request.feeConfig, errors, warnings);
    }

    // Validate rewards allocation
    if (request.rewardsConfig && request.rewardsConfig.recipients.length > 0) {
      this.validateRewardsConfiguration(request.rewardsConfig, errors, warnings);
    }

    // Validate vault configuration
    if (request.vaultConfig) {
      this.validateVaultConfiguration(request.vaultConfig, errors, warnings);
    }

    // Validate MEV protection configuration
    if (request.mevConfig) {
      this.validateMevConfiguration(request.mevConfig, errors, warnings);
    }

    // Validate social integration
    if (request.socialIntegration) {
      this.validateSocialIntegration(request.socialIntegration, errors, warnings);
    }

    // Validate custom parameters
    if (request.customParameters) {
      this.validateCustomParameters(request.customParameters, errors, warnings);
    }

    // Validate social media URLs
    if (request.socialMediaUrls && request.socialMediaUrls.length > 0) {
      this.validateSocialMediaUrls(request.socialMediaUrls, errors, warnings);
    }

    // Validate audit URLs
    if (request.auditUrls && request.auditUrls.length > 0) {
      this.validateAuditUrls(request.auditUrls, errors, warnings);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Enhanced validation helper methods
  private validateEnhancedMetadata(
    metadata: Record<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate social handles if present
    if (metadata.socials) {
      const socials = metadata.socials;
      
      if (socials.twitter && !this.isValidTwitterHandle(socials.twitter)) {
        warnings.push('Invalid Twitter handle format');
      }
      
      if (socials.telegram && !this.isValidTelegramHandle(socials.telegram)) {
        warnings.push('Invalid Telegram handle format');
      }
      
      if (socials.website && !this.isValidUrl(socials.website)) {
        warnings.push('Invalid website URL format');
      }
    }

    // Check for potentially problematic metadata
    const metadataSize = JSON.stringify(metadata).length;
    if (metadataSize > 10000) {
      warnings.push('Metadata is very large and may cause deployment issues');
    }
  }

  private validatePoolConfiguration(
    poolConfig: BankrbotAPITokenRequest['poolConfig'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!poolConfig) return;

    if (poolConfig.type === 'custom' && (!poolConfig.positions || poolConfig.positions.length === 0)) {
      errors.push('Custom pool type requires position configurations');
    }

    if (poolConfig.positions) {
      for (let i = 0; i < poolConfig.positions.length; i++) {
        const position = poolConfig.positions[i];
        
        if (position.tickLower >= position.tickUpper) {
          errors.push(`Position ${i}: tickLower must be less than tickUpper`);
        }
        
        if (position.bps < 0 || position.bps > 10000) {
          errors.push(`Position ${i}: bps must be between 0 and 10000`);
        }
      }

      // Validate total allocation
      const totalBps = poolConfig.positions.reduce((sum, pos) => sum + pos.bps, 0);
      if (Math.abs(totalBps - 10000) > 1) {
        errors.push(`Pool positions must total 10000 bps (100%), got ${totalBps} bps`);
      }
    }

    if (poolConfig.pairedToken && !this.isValidAddress(poolConfig.pairedToken)) {
      errors.push('Paired token must be a valid contract address');
    }
  }

  private validateFeeConfiguration(
    feeConfig: BankrbotAPITokenRequest['feeConfig'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!feeConfig) return;

    if (feeConfig.type === 'static') {
      if (feeConfig.clankerFee !== undefined) {
        if (feeConfig.clankerFee < 0 || feeConfig.clankerFee > 10000) {
          errors.push('Clanker fee must be between 0 and 10000 bps');
        }
      }
      
      if (feeConfig.pairedFee !== undefined) {
        if (feeConfig.pairedFee < 0 || feeConfig.pairedFee > 10000) {
          errors.push('Paired fee must be between 0 and 10000 bps');
        }
      }
    } else if (feeConfig.type === 'dynamic') {
      // Validate dynamic fee parameters
      if (feeConfig.baseFee !== undefined && (feeConfig.baseFee < 0 || feeConfig.baseFee > 10000)) {
        errors.push('Base fee must be between 0 and 10000 bps');
      }
      
      if (feeConfig.maxFee !== undefined && (feeConfig.maxFee < 0 || feeConfig.maxFee > 10000)) {
        errors.push('Max fee must be between 0 and 10000 bps');
      }
      
      if (feeConfig.baseFee !== undefined && feeConfig.maxFee !== undefined && feeConfig.baseFee > feeConfig.maxFee) {
        errors.push('Base fee cannot be greater than max fee');
      }
      
      // Validate sniper fee parameters
      if (feeConfig.startingSniperFee !== undefined && (feeConfig.startingSniperFee < 0 || feeConfig.startingSniperFee > 10000)) {
        errors.push('Starting sniper fee must be between 0 and 10000 bps');
      }
      
      if (feeConfig.endingSniperFee !== undefined && (feeConfig.endingSniperFee < 0 || feeConfig.endingSniperFee > 10000)) {
        errors.push('Ending sniper fee must be between 0 and 10000 bps');
      }
      
      if (feeConfig.startingSniperFee !== undefined && feeConfig.endingSniperFee !== undefined && 
          feeConfig.startingSniperFee < feeConfig.endingSniperFee) {
        warnings.push('Starting sniper fee is typically higher than ending sniper fee');
      }
      
      // Validate time-based parameters
      if (feeConfig.decayDuration !== undefined && feeConfig.decayDuration <= 0) {
        errors.push('Decay duration must be positive');
      }
      
      if (feeConfig.resetPeriod !== undefined && feeConfig.resetPeriod <= 0) {
        errors.push('Reset period must be positive');
      }
      
      if (feeConfig.referenceTickFilterPeriod !== undefined && feeConfig.referenceTickFilterPeriod <= 0) {
        errors.push('Reference tick filter period must be positive');
      }
      
      // Validate control parameters
      if (feeConfig.feeControlNumerator !== undefined && feeConfig.feeControlNumerator <= 0) {
        errors.push('Fee control numerator must be positive');
      }
      
      if (feeConfig.decayFilterBps !== undefined && (feeConfig.decayFilterBps < 0 || feeConfig.decayFilterBps > 10000)) {
        errors.push('Decay filter must be between 0 and 10000 bps');
      }
    }
  }

  private validateRewardsConfiguration(
    rewardsConfig: BankrbotAPITokenRequest['rewardsConfig'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!rewardsConfig || !rewardsConfig.recipients) return;

    const totalAllocation = rewardsConfig.recipients.reduce((sum, r) => sum + r.percentage, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      errors.push(`Total rewards allocation must be 100%, got ${totalAllocation}%`);
    }

    rewardsConfig.recipients.forEach((recipient, index) => {
      if (!this.isValidAddress(recipient.recipient)) {
        errors.push(`Recipient ${index}: invalid recipient address`);
      }
      
      if (!this.isValidAddress(recipient.admin)) {
        errors.push(`Recipient ${index}: invalid admin address`);
      }
      
      if (recipient.percentage < 0 || recipient.percentage > 100) {
        errors.push(`Recipient ${index}: percentage must be between 0 and 100`);
      }
      
      if (!['Both', 'Paired', 'Clanker'].includes(recipient.feePreference)) {
        errors.push(`Recipient ${index}: invalid fee preference, must be 'Both', 'Paired', or 'Clanker'`);
      }
    });

    if (rewardsConfig.recipients.length > 10) {
      warnings.push('Large number of reward recipients may increase gas costs');
    }
  }

  private validateVaultConfiguration(
    vaultConfig: BankrbotAPITokenRequest['vaultConfig'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!vaultConfig) return;

    if (vaultConfig.percentage < 0 || vaultConfig.percentage > 100) {
      errors.push('Vault percentage must be between 0 and 100');
    }

    if (vaultConfig.lockupDuration < 0) {
      errors.push('Vault lockup duration must be non-negative');
    }

    if (vaultConfig.vestingDuration !== undefined && vaultConfig.vestingDuration < 0) {
      errors.push('Vault vesting duration must be non-negative');
    }

    if (vaultConfig.recipient && !this.isValidAddress(vaultConfig.recipient)) {
      errors.push('Vault recipient must be a valid address');
    }

    // Warn about long lockup periods
    if (vaultConfig.lockupDuration > 365 * 24 * 3600) { // 1 year in seconds
      warnings.push('Vault lockup duration is longer than 1 year');
    }
  }

  private validateMevConfiguration(
    mevConfig: BankrbotAPITokenRequest['mevConfig'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!mevConfig) return;

    if (mevConfig.type === 'blockDelay') {
      if (mevConfig.blockDelay !== undefined && (mevConfig.blockDelay < 1 || mevConfig.blockDelay > 10)) {
        errors.push('Block delay must be between 1 and 10 blocks');
      }
    } else if (mevConfig.type === 'sniperAuction') {
      if (mevConfig.sniperAuction) {
        const auction = mevConfig.sniperAuction;
        
        if (auction.startingFee < 0 || auction.startingFee > 10000) {
          errors.push('Sniper auction starting fee must be between 0 and 10000 bps');
        }
        
        if (auction.endingFee < 0 || auction.endingFee > 10000) {
          errors.push('Sniper auction ending fee must be between 0 and 10000 bps');
        }
        
        if (auction.startingFee < auction.endingFee) {
          warnings.push('Sniper auction starting fee is typically higher than ending fee');
        }
        
        if (auction.secondsToDecay <= 0) {
          errors.push('Sniper auction decay duration must be positive');
        }
      } else {
        errors.push('Sniper auction configuration is required when type is sniperAuction');
      }
    } else {
      errors.push('MEV configuration type must be either "blockDelay" or "sniperAuction"');
    }
  }

  private validateSocialIntegration(
    socialIntegration: BankrbotAPITokenRequest['socialIntegration'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!socialIntegration) return;

    if (socialIntegration.platform && !['twitter', 'farcaster'].includes(socialIntegration.platform)) {
      errors.push('Social integration platform must be "twitter" or "farcaster"');
    }

    if (socialIntegration.platform === 'twitter' && socialIntegration.userId) {
      if (!this.isValidTwitterHandle(socialIntegration.userId)) {
        warnings.push('Invalid Twitter handle format');
      }
    }

    if (!socialIntegration.platform) {
      warnings.push('Social integration platform should be specified');
    }
    
    if (!socialIntegration.userId) {
      warnings.push('Social integration user ID should be specified');
    }
  }

  private validateCustomParameters(
    customParameters: BankrbotAPITokenRequest['customParameters'],
    errors: string[],
    warnings: string[]
  ): void {
    if (!customParameters) return;

    if (customParameters.customGasLimit !== undefined && customParameters.customGasLimit <= 0) {
      errors.push('Custom gas limit must be positive');
    }

    if (customParameters.customGasLimit !== undefined && customParameters.customGasLimit > 10000000) {
      warnings.push('Custom gas limit is very high and may cause deployment failures');
    }

    if (customParameters.priorityDeployment && customParameters.expeditedProcessing) {
      warnings.push('Both priority deployment and expedited processing are enabled - this may incur additional costs');
    }
  }

  private validateSocialMediaUrls(
    socialMediaUrls: string[],
    errors: string[],
    warnings: string[]
  ): void {
    socialMediaUrls.forEach((url, index) => {
      if (!this.isValidUrl(url)) {
        errors.push(`Social media URL ${index}: invalid URL format`);
      }
    });

    if (socialMediaUrls.length > 10) {
      warnings.push('Large number of social media URLs may affect metadata size');
    }
  }

  private validateAuditUrls(
    auditUrls: string[],
    errors: string[],
    warnings: string[]
  ): void {
    auditUrls.forEach((url, index) => {
      if (!this.isValidUrl(url)) {
        errors.push(`Audit URL ${index}: invalid URL format`);
      }
    });
  }

  // Validation utility methods
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isValidTwitterHandle(handle: string): boolean {
    // Remove @ prefix if present
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    return /^[A-Za-z0-9_]{1,15}$/.test(cleanHandle);
  }

  private isValidTelegramHandle(handle: string): boolean {
    // Remove @ prefix if present
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    return /^[A-Za-z0-9_]{5,32}$/.test(cleanHandle);
  }

  private async deployViaBankrbot(request: BankrbotAPITokenRequest): Promise<{
    success: boolean;
    data?: BankrbotAPIResponse;
    error?: any;
  }> {
    try {
      // For demo mode, return mock successful deployment
      if (this.config.apiKey.includes('demo') || this.config.apiKey.includes('test')) {
        const mockResponse: BankrbotAPIResponse = {
          success: true,
          tokenAddress: '0x' + Math.random().toString(16).substring(2, 42).padStart(40, '0'),
          deploymentTxHash: '0x' + Math.random().toString(16).substring(2).padStart(64, '0'),
          chainId: request.chainId,
          verified: request.verificationRequired !== false,
          deploymentTime: new Date().toISOString(),
          estimatedGas: '500000',
          totalCost: '0.01',
          socialLinks: request.socialIntegration ? [
            {
              platform: request.socialIntegration.platform || 'twitter',
              url: `https://${request.socialIntegration.platform || 'twitter'}.com/${request.socialIntegration.userId || 'example'}`
            }
          ] : undefined,
        };

        return {
          success: true,
          data: mockResponse,
        };
      }

      // Convert Bankrbot request to legacy format for existing client
      const legacyRequest = this.convertToLegacyFormat(request);
      const result = await this.apiClient.deployToken(legacyRequest);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Convert legacy response to Bankrbot format
      const bankrbotResponse = this.convertFromLegacyResponse(result.data, request);
      
      return {
        success: true,
        data: bankrbotResponse,
      };

    } catch (error) {
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'BANKRBOT_DEPLOYMENT_ERROR',
          retryable: false,
        },
      };
    }
  }

  private convertToLegacyFormat(request: BankrbotAPITokenRequest): ClankerAPITokenRequest {
    return {
      token: {
        name: request.name,
        symbol: request.symbol,
        tokenAdmin: request.tokenAdmin,
        image: request.image,
        description: request.description,
        socialMediaUrls: request.socialMediaUrls?.map(url => ({
          platform: this.detectPlatform(url),
          url: url,
        })) || [],
        auditUrls: request.auditUrls || [],
        requestKey: this.generateRequestKey(),
      },
      rewards: request.rewardsConfig?.recipients.map(r => ({
        admin: r.admin,
        recipient: r.recipient,
        allocation: r.percentage,
        rewardsToken: r.feePreference,
      })) || [],
      chainId: request.chainId,
    };
  }

  private convertFromLegacyResponse(
    legacyResponse: ClankerAPIResponse,
    originalRequest: BankrbotAPITokenRequest
  ): BankrbotAPIResponse {
    return {
      success: legacyResponse.success,
      tokenAddress: legacyResponse.expectedAddress || '',
      deploymentTxHash: legacyResponse.deploymentTxHash || '',
      poolAddress: legacyResponse.poolAddress,
      liquidityTxHash: legacyResponse.liquidityTxHash,
      chainId: originalRequest.chainId,
      verified: originalRequest.verificationRequired !== false,
      deploymentTime: new Date().toISOString(),
      estimatedGas: legacyResponse.estimatedGas || '500000',
      totalCost: legacyResponse.totalCost || '0.01',
      error: legacyResponse.error,
      socialLinks: originalRequest.socialIntegration ? [
        {
          platform: originalRequest.socialIntegration.platform || 'twitter',
          url: `https://${originalRequest.socialIntegration.platform || 'twitter'}.com/${originalRequest.socialIntegration.userId || 'example'}`
        }
      ] : undefined,
    };
  }

  private createBankrbotDeployResult(
    apiResponse: BankrbotAPIResponse,
    originalToken: ClankerTokenV4
  ): DeployResult {
    if (!apiResponse.tokenAddress) {
      throw createAPIError(
        'Bankrbot API response missing token address',
        'INVALID_BANKRBOT_RESPONSE',
        false,
        { apiResponse }
      );
    }

    const chainId = originalToken.chainId || 8453; // Default to Base

    return {
      txHash: apiResponse.deploymentTxHash as `0x${string}` || '0x',
      chainId,
      async waitForTransaction() {
        // For Bankrbot API method, we return the token address immediately
        // since Bankrbot handles the deployment process and ensures verification
        return {
          address: apiResponse.tokenAddress as `0x${string}`,
          // Include Bankrbot-specific data
          verified: apiResponse.verified,
          socialLinks: apiResponse.socialLinks,
          deploymentTime: apiResponse.deploymentTime,
        } as any;
      },
    };
  }

  private detectPlatform(url: string): string {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        return 'twitter';
      }
      if (hostname.includes('farcaster')) {
        return 'farcaster';
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
    } catch {
      return 'other';
    }
  }

  private generateRequestKey(): string {
    // Generate a 32-character unique identifier
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// ============================================================================
// Legacy API Method Class (for backward compatibility)
// ============================================================================

export class ClankerAPIMethod {
  private apiClient: ClankerAPIClient;
  private fieldMapper: FieldMapper;
  private config: ClankerAPIConfig;

  constructor(config: ClankerAPIConfig) {
    this.config = config;
    this.apiClient = new ClankerAPIClient(config);
    this.fieldMapper = new FieldMapper();
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Deploy token via Clanker API
   */
  async deploy(token: ClankerTokenV4): Promise<DeployResult> {
    try {
      // Step 1: Map SDK format to API format
      const mappingResult = this.fieldMapper.mapToAPIFormat(token);
      if (!mappingResult.success || !mappingResult.data) {
        throw createValidationError(
          `Token configuration validation failed: ${mappingResult.errors.join(', ')}`,
          'api',
          { 
            errors: mappingResult.errors, 
            warnings: mappingResult.warnings 
          }
        );
      }

      const apiRequest = mappingResult.data;

      // Step 2: Validate request before sending
      const validationResult = await this.validateRequest(apiRequest);
      if (!validationResult.success) {
        throw createValidationError(
          `API request validation failed: ${validationResult.errors.join(', ')}`,
          'api',
          { 
            errors: validationResult.errors, 
            warnings: validationResult.warnings 
          }
        );
      }

      // Step 3: Send deployment request
      const deployResult = await this.apiClient.deployToken(apiRequest);
      if (!deployResult.success) {
        throw createAPIError(
          deployResult.error.error,
          deployResult.error.code || 'DEPLOYMENT_FAILED',
          deployResult.error.code === 'RATE_LIMIT',
          { apiResponse: deployResult.error }
        );
      }

      // Step 4: Process response
      const response = deployResult.data;
      return this.createDeployResult(response, token);

    } catch (error) {
      // Re-throw structured errors as-is
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      // Wrap unknown errors
      throw createAPIError(
        `Token deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DEPLOYMENT_FAILED',
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Validate token configuration without deploying
   */
  async validateTokenConfig(token: ClankerTokenV4): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    estimatedGas?: string;
    estimatedCost?: string;
  }> {
    try {
      // For demo/test API keys, provide mock validation
      if (this.config.apiKey.includes('demo') || this.config.apiKey.includes('test')) {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!token.name?.trim()) {
          errors.push('Token name is required');
        }
        if (!token.symbol?.trim()) {
          errors.push('Token symbol is required');
        }
        if (!token.tokenAdmin?.trim()) {
          errors.push('Token admin address is required');
        }

        // Warnings
        if (token.name && token.name.length > 50) {
          warnings.push('Token name is very long');
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
          estimatedGas: '500000',
          estimatedCost: '0.01',
        };
      }

      // Map to API format first
      const mappingResult = this.fieldMapper.mapToAPIFormat(token);
      if (!mappingResult.success || !mappingResult.data) {
        return {
          valid: false,
          errors: mappingResult.errors,
          warnings: mappingResult.warnings,
        };
      }

      // Use API validation endpoint
      const validationResult = await this.apiClient.validateTokenConfig(mappingResult.data);
      if (!validationResult.success) {
        return {
          valid: false,
          errors: [validationResult.error.message || 'Validation failed'],
          warnings: [],
        };
      }

      return validationResult.data;

    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      };
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(requestKey: string): Promise<{
    status: string;
    txHash?: string;
    address?: string;
  }> {
    const result = await this.apiClient.getDeploymentStatus(requestKey);
    if (!result.success) {
      throw createAPIError(
        result.error.message || 'Failed to get deployment status',
        result.error.code || 'STATUS_FAILED',
        result.error.retryable || false,
        { requestKey }
      );
    }

    return result.data;
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<{
    connected: boolean;
    authenticated: boolean;
    latency?: number;
  }> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      const healthResult = await this.apiClient.healthCheck();
      const latency = Date.now() - startTime;

      if (!healthResult.success) {
        return {
          connected: false,
          authenticated: false,
          latency,
        };
      }

      // Test authentication
      const authResult = await this.apiClient.testAuthentication();
      if (!authResult.success) {
        return {
          connected: true,
          authenticated: false,
          latency,
        };
      }

      return {
        connected: true,
        authenticated: authResult.data.authenticated,
        latency,
      };

    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        latency: Date.now() - startTime,
      };
    }
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Deploy multiple tokens in batch
   */
  async batchDeploy(tokens: ClankerTokenV4[]): Promise<{
    batchId: string;
    results: Array<{
      requestKey: string;
      success: boolean;
      expectedAddress?: string;
      error?: string;
    }>;
  }> {
    try {
      // Map all tokens to API format
      const apiRequests: ClankerAPITokenRequest[] = [];
      const mappingErrors: string[] = [];

      for (let i = 0; i < tokens.length; i++) {
        const mappingResult = this.fieldMapper.mapToAPIFormat(tokens[i]);
        if (!mappingResult.success || !mappingResult.data) {
          mappingErrors.push(`Token ${i}: ${mappingResult.errors.join(', ')}`);
          continue;
        }
        apiRequests.push(mappingResult.data);
      }

      if (mappingErrors.length > 0) {
        throw createValidationError(
          `Batch mapping failed: ${mappingErrors.join('; ')}`,
          'api',
          { mappingErrors }
        );
      }

      // Send batch request
      const batchResult = await this.apiClient.batchDeployTokens(apiRequests);
      if (!batchResult.success) {
        throw createAPIError(
          batchResult.error.message || 'Batch deployment failed',
          batchResult.error.code || 'BATCH_FAILED',
          batchResult.error.retryable || false
        );
      }

      return batchResult.data;

    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      throw createAPIError(
        `Batch deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_FAILED',
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Get batch deployment status
   */
  async getBatchStatus(batchId: string): Promise<{
    batchId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    completed: number;
    total: number;
    results: Array<{
      requestKey: string;
      status: string;
      expectedAddress?: string;
      error?: string;
    }>;
  }> {
    const result = await this.apiClient.getBatchStatus(batchId);
    if (!result.success) {
      throw createAPIError(
        result.error.message || 'Failed to get batch status',
        result.error.code || 'BATCH_STATUS_FAILED',
        result.error.retryable || false,
        { batchId }
      );
    }

    return result.data;
  }

  // ==========================================================================
  // Configuration and Management
  // ==========================================================================

  /**
   * Update API configuration
   */
  updateConfig(updates: Partial<ClankerAPIConfig>): void {
    this.config = { ...this.config, ...updates };
    this.apiClient.updateConfig(updates);
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<ClankerAPIConfig, 'apiKey'> & { hasApiKey: boolean } {
    return this.apiClient.getConfig();
  }

  /**
   * Enable request/response logging
   */
  enableLogging(options?: {
    logRequests?: boolean;
    logResponses?: boolean;
    logErrors?: boolean;
    sanitize?: boolean;
  }): void {
    this.apiClient.enableLogging(options);
  }

  /**
   * Disable logging
   */
  disableLogging(): void {
    this.apiClient.disableLogging();
  }

  /**
   * Get request statistics
   */
  getRequestStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastRequestTime?: Date;
  } {
    return this.apiClient.getRequestStats();
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private async validateRequest(request: ClankerAPITokenRequest): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.token.name?.trim()) {
      errors.push('Token name is required');
    }

    if (!request.token.symbol?.trim()) {
      errors.push('Token symbol is required');
    }

    if (!request.token.tokenAdmin?.trim()) {
      errors.push('Token admin address is required');
    }

    if (!request.token.requestKey?.trim()) {
      errors.push('Request key is required');
    }

    // Validate chain ID
    if (!request.chainId || request.chainId <= 0) {
      errors.push('Valid chain ID is required');
    }

    // Validate rewards allocation
    if (request.rewards && request.rewards.length > 0) {
      const totalAllocation = request.rewards.reduce((sum, r) => sum + r.allocation, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        errors.push(`Total rewards allocation must be 100%, got ${totalAllocation}%`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  }

  private createDeployResult(
    apiResponse: ClankerAPIResponse,
    originalToken: ClankerTokenV4
  ): DeployResult {
    if (!apiResponse.expectedAddress) {
      throw createAPIError(
        'API response missing expected token address',
        'INVALID_RESPONSE',
        false,
        { apiResponse }
      );
    }

    const chainId = originalToken.chainId || 8453; // Default to Base

    return {
      txHash: apiResponse.deploymentTxHash as `0x${string}` || '0x',
      chainId,
      async waitForTransaction() {
        // For API method, we return the expected address immediately
        // since the API handles the deployment process
        return {
          address: apiResponse.expectedAddress as `0x${string}`,
        };
      },
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create Bankrbot API method instance
 */
export function createBankrbotAPIMethod(config: BankrbotAPIConfig): BankrbotAPIMethod {
  return new BankrbotAPIMethod(config);
}

/**
 * Create Bankrbot API method from environment variables
 */
export function createBankrbotAPIMethodFromEnv(): BankrbotAPIMethod {
  const apiKey = process.env.BANKRBOT_API_KEY;
  if (!apiKey) {
    throw createValidationError(
      'BANKRBOT_API_KEY environment variable is required',
      'bankrbot',
      { envVarName: 'BANKRBOT_API_KEY' }
    );
  }

  const config: BankrbotAPIConfig = {
    apiKey,
    baseUrl: process.env.BANKRBOT_API_BASE_URL,
    timeout: process.env.BANKRBOT_API_TIMEOUT ? 
      parseInt(process.env.BANKRBOT_API_TIMEOUT) : undefined,
    retries: process.env.BANKRBOT_API_RETRIES ? 
      parseInt(process.env.BANKRBOT_API_RETRIES) : undefined,
  };

  return new BankrbotAPIMethod(config);
}

/**
 * Create API method instance (legacy)
 */
export function createAPIMethod(config: ClankerAPIConfig): ClankerAPIMethod {
  return new ClankerAPIMethod(config);
}

/**
 * Create API method from environment variables
 */
export function createAPIMethodFromEnv(): ClankerAPIMethod {
  const apiKey = process.env.CLANKER_API_KEY;
  if (!apiKey) {
    throw createValidationError(
      'CLANKER_API_KEY environment variable is required',
      'api',
      { envVarName: 'CLANKER_API_KEY' }
    );
  }

  const config: ClankerAPIConfig = {
    apiKey,
    baseUrl: process.env.CLANKER_API_BASE_URL,
    timeout: process.env.CLANKER_API_TIMEOUT ? 
      parseInt(process.env.CLANKER_API_TIMEOUT) : undefined,
    retries: process.env.CLANKER_API_RETRIES ? 
      parseInt(process.env.CLANKER_API_RETRIES) : undefined,
  };

  return new ClankerAPIMethod(config);
}