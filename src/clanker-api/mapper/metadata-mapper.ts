/**
 * Metadata Mapper
 * Specialized mapping for token metadata between SDK and API formats
 */

import type { TokenMetadata } from '../../types/index.js';
import type { ClankerAPITokenRequest } from '../types/api-types.js';

// ============================================================================
// Platform Detection Utilities
// ============================================================================

interface PlatformMapping {
  pattern: RegExp;
  platform: string;
}

const PLATFORM_MAPPINGS: PlatformMapping[] = [
  { pattern: /twitter\.com|x\.com/i, platform: 'twitter' },
  { pattern: /t\.me|telegram/i, platform: 'telegram' },
  { pattern: /discord/i, platform: 'discord' },
  { pattern: /github/i, platform: 'github' },
  { pattern: /reddit/i, platform: 'reddit' },
  { pattern: /youtube/i, platform: 'youtube' },
  { pattern: /instagram/i, platform: 'instagram' },
  { pattern: /tiktok/i, platform: 'tiktok' },
  { pattern: /linkedin/i, platform: 'linkedin' },
  { pattern: /medium/i, platform: 'medium' },
  { pattern: /substack/i, platform: 'substack' },
];

// ============================================================================
// Metadata Mapper Class
// ============================================================================

export class MetadataMapper {
  /**
   * Convert SDK metadata format to API format
   */
  mapToAPI(
    metadata: TokenMetadata | undefined,
    tokenName: string,
    tokenSymbol: string,
    tokenAdmin: string
  ): {
    data: ClankerAPITokenRequest['token'];
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Build base token metadata
    const apiToken: ClankerAPITokenRequest['token'] = {
      name: tokenName,
      symbol: tokenSymbol,
      tokenAdmin: tokenAdmin,
      requestKey: this.generateRequestKey(),
    };

    if (!metadata) {
      return { data: apiToken, errors, warnings };
    }

    // Map optional fields
    if (metadata.image && typeof metadata.image === 'string') {
      if (this.isValidImageUrl(metadata.image)) {
        apiToken.image = metadata.image;
      } else {
        warnings.push('Invalid image URL format - may not display correctly');
        apiToken.image = metadata.image; // Include anyway, let API validate
      }
    }

    if (metadata.description && typeof metadata.description === 'string') {
      if (metadata.description.length > 5000) {
        warnings.push('Description is very long (>5000 characters) - may be truncated');
      }
      apiToken.description = metadata.description;
    }

    // Map social media URLs
    if (metadata.socialMediaUrls && Array.isArray(metadata.socialMediaUrls)) {
      const { socialUrls, urlErrors, urlWarnings } = this.mapSocialMediaUrls(metadata.socialMediaUrls);
      apiToken.socialMediaUrls = socialUrls;
      errors.push(...urlErrors);
      warnings.push(...urlWarnings);
    }

    // Map audit URLs
    if (metadata.auditUrls && Array.isArray(metadata.auditUrls)) {
      const { auditUrls, auditErrors, auditWarnings } = this.mapAuditUrls(metadata.auditUrls);
      apiToken.auditUrls = auditUrls;
      errors.push(...auditErrors);
      warnings.push(...auditWarnings);
    }

    return { data: apiToken, errors, warnings };
  }

  /**
   * Convert API metadata format back to SDK format
   */
  mapFromAPI(
    apiToken: ClankerAPITokenRequest['token']
  ): {
    data: TokenMetadata;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const metadata: TokenMetadata = {};

    // Map optional fields back
    if (apiToken.image) {
      metadata.image = apiToken.image;
    }

    if (apiToken.description) {
      metadata.description = apiToken.description;
    }

    // Map social media URLs back
    if (apiToken.socialMediaUrls) {
      metadata.socialMediaUrls = apiToken.socialMediaUrls.map(social => {
        if (typeof social === 'string') {
          return social;
        }
        return social.url; // Convert back to simple URL format
      });
    }

    // Map audit URLs back
    if (apiToken.auditUrls) {
      metadata.auditUrls = [...apiToken.auditUrls];
    }

    return { data: metadata, errors, warnings };
  }

  /**
   * Validate metadata
   */
  validateMetadata(metadata: TokenMetadata | undefined): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata) {
      return { valid: true, errors, warnings };
    }

    // Validate image URL
    if (metadata.image && typeof metadata.image === 'string' && !this.isValidImageUrl(metadata.image)) {
      warnings.push('Image URL may not be valid or accessible');
    }

    // Validate description
    if (metadata.description && typeof metadata.description === 'string') {
      if (metadata.description.length === 0) {
        warnings.push('Empty description provided');
      } else if (metadata.description.length > 5000) {
        warnings.push('Description is very long (>5000 characters)');
      }
    }

    // Validate social media URLs
    if (metadata.socialMediaUrls && Array.isArray(metadata.socialMediaUrls)) {
      metadata.socialMediaUrls.forEach((url: any, index: number) => {
        const urlString = typeof url === 'string' ? url : url.url;
        if (!this.isValidUrl(urlString)) {
          errors.push(`Invalid social media URL at index ${index}: ${urlString}`);
        }
      });
    }

    // Validate audit URLs
    if (metadata.auditUrls && Array.isArray(metadata.auditUrls)) {
      metadata.auditUrls.forEach((url: any, index: number) => {
        if (!this.isValidUrl(url)) {
          errors.push(`Invalid audit URL at index ${index}: ${url}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private mapSocialMediaUrls(
    socialUrls: any[]
  ): {
    socialUrls: ClankerAPITokenRequest['token']['socialMediaUrls'];
    urlErrors: string[];
    urlWarnings: string[];
  } {
    const urlErrors: string[] = [];
    const urlWarnings: string[] = [];

    if (!socialUrls || socialUrls.length === 0) {
      return { socialUrls: undefined, urlErrors, urlWarnings };
    }

    const mappedUrls = socialUrls.map((url: any, index: number) => {
      const urlString = typeof url === 'string' ? url : url.url;
      const platform = typeof url === 'string' ? this.detectPlatform(url) : url.platform;

      // Validate URL
      if (!this.isValidUrl(urlString)) {
        urlErrors.push(`Invalid social media URL at index ${index}: ${urlString}`);
      }

      return {
        platform: platform || 'other',
        url: urlString,
      };
    });

    // Check for duplicate platforms
    const platforms = mappedUrls.map(u => u.platform);
    const uniquePlatforms = new Set(platforms);
    if (uniquePlatforms.size !== platforms.length) {
      urlWarnings.push('Duplicate social media platforms detected');
    }

    return {
      socialUrls: mappedUrls,
      urlErrors,
      urlWarnings,
    };
  }

  private mapAuditUrls(
    auditUrls: string[]
  ): {
    auditUrls: string[];
    auditErrors: string[];
    auditWarnings: string[];
  } {
    const auditErrors: string[] = [];
    const auditWarnings: string[] = [];

    const validUrls = auditUrls.filter((url, index) => {
      if (!this.isValidUrl(url)) {
        auditErrors.push(`Invalid audit URL at index ${index}: ${url}`);
        return false;
      }
      return true;
    });

    if (validUrls.length > 10) {
      auditWarnings.push('Many audit URLs provided (>10) - some may not be displayed');
    }

    return {
      auditUrls: validUrls,
      auditErrors,
      auditWarnings,
    };
  }

  private detectPlatform(url: string): string {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      for (const mapping of PLATFORM_MAPPINGS) {
        if (mapping.pattern.test(hostname)) {
          return mapping.platform;
        }
      }
      
      return 'other';
    } catch {
      return 'other';
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isValidImageUrl(url: string): boolean {
    if (!this.isValidUrl(url)) {
      return false;
    }

    // Check for common image extensions or known image hosting patterns
    const imageExtensions = /\.(jpg|jpeg|png|gif|svg|webp)$/i;
    const imageHosts = /^https?:\/\/(.*\.)?(imgur|cloudinary|ipfs|arweave)/i;
    
    return imageExtensions.test(url) || imageHosts.test(url) || url.includes('ipfs://');
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
// Factory Functions
// ============================================================================

/**
 * Create metadata mapper
 */
export function createMetadataMapper(): MetadataMapper {
  return new MetadataMapper();
}

/**
 * Quick metadata mapping to API format
 */
export function mapMetadataToAPI(
  metadata: TokenMetadata | undefined,
  tokenName: string,
  tokenSymbol: string,
  tokenAdmin: string
): {
  data: ClankerAPITokenRequest['token'];
  errors: string[];
  warnings: string[];
} {
  const mapper = createMetadataMapper();
  return mapper.mapToAPI(metadata, tokenName, tokenSymbol, tokenAdmin);
}

/**
 * Quick metadata mapping from API format
 */
export function mapMetadataFromAPI(
  apiToken: ClankerAPITokenRequest['token']
): {
  data: TokenMetadata;
  errors: string[];
  warnings: string[];
} {
  const mapper = createMetadataMapper();
  return mapper.mapFromAPI(apiToken);
}