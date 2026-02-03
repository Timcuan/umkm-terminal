/**
 * Migration Utility
 * Helps users migrate from original Clanker SDK to enhanced version
 */

import type { ClankerTokenV4 } from '../../types/index.js';
import type { ClankerSDKConfig, OperationMethod } from '../types/config-types.js';
import { createEnhancedClanker, type EnhancedClankerConfig } from '../compatibility/enhanced-clanker.js';
import { validateTokenConfig, validateSDKConfig } from '../validation/index.js';

// ============================================================================
// Migration Analysis Types
// ============================================================================

export interface MigrationAnalysis {
  currentVersion: 'v1' | 'v2' | 'v3' | 'v4';
  compatibility: {
    fullyCompatible: boolean;
    requiresUpdates: boolean;
    breakingChanges: string[];
    recommendations: string[];
  };
  tokenConfig: {
    valid: boolean;
    missingFields: string[];
    deprecatedFields: string[];
    suggestions: string[];
  };
  sdkConfig: {
    valid: boolean;
    availableMethods: OperationMethod[];
    recommendedMethod: OperationMethod;
    missingConfig: string[];
  };
  migrationPath: 'no-changes' | 'enhanced-compatible' | 'api-integration' | 'hybrid';
  estimatedEffort: 'minimal' | 'low' | 'medium' | 'high';
}

export interface MigrationOptions {
  preferredMethod?: OperationMethod;
  enableAPIFeatures?: boolean;
  maintainBackwardCompatibility?: boolean;
  optimizeForPerformance?: boolean;
}

export interface MigrationResult {
  success: boolean;
  analysis: MigrationAnalysis;
  migratedConfig: ClankerSDKConfig;
  migratedTokens: ClankerTokenV4[];
  codeExamples: {
    before: string;
    after: string;
    explanation: string;
  }[];
  nextSteps: string[];
}

// ============================================================================
// Migration Utility Class
// ============================================================================

export class MigrationUtility {
  /**
   * Analyze existing configuration and tokens for migration
   */
  static analyzeForMigration(
    existingConfig: any,
    existingTokens: any[],
    options: MigrationOptions = {}
  ): MigrationAnalysis {
    const tokenAnalysis = this.analyzeTokenConfigurations(existingTokens);
    const configAnalysis = this.analyzeSDKConfiguration(existingConfig);
    const compatibility = this.analyzeCompatibility(existingConfig, existingTokens);
    
    const migrationPath = this.determineMigrationPath(
      compatibility,
      configAnalysis,
      options
    );

    const estimatedEffort = this.estimateMigrationEffort(
      compatibility,
      tokenAnalysis,
      configAnalysis
    );

    return {
      currentVersion: this.detectCurrentVersion(existingTokens),
      compatibility,
      tokenConfig: tokenAnalysis,
      sdkConfig: configAnalysis,
      migrationPath,
      estimatedEffort,
    };
  }

  /**
   * Perform automatic migration with recommendations
   */
  static performMigration(
    existingConfig: any,
    existingTokens: any[],
    options: MigrationOptions = {}
  ): MigrationResult {
    const analysis = this.analyzeForMigration(existingConfig, existingTokens, options);
    
    try {
      const migratedConfig = this.migrateSDKConfiguration(existingConfig, analysis, options);
      const migratedTokens = this.migrateTokenConfigurations(existingTokens, analysis);
      const codeExamples = this.generateCodeExamples(existingConfig, migratedConfig, analysis);
      const nextSteps = this.generateNextSteps(analysis, options);

      return {
        success: true,
        analysis,
        migratedConfig,
        migratedTokens,
        codeExamples,
        nextSteps,
      };
    } catch (error) {
      return {
        success: false,
        analysis,
        migratedConfig: existingConfig,
        migratedTokens: existingTokens,
        codeExamples: [],
        nextSteps: [
          'Migration failed. Please review the analysis and fix issues manually.',
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Generate migration report
   */
  static generateMigrationReport(migrationResult: MigrationResult): string {
    const { analysis, success, codeExamples, nextSteps } = migrationResult;
    
    let report = '# Clanker SDK Migration Report\n\n';
    
    // Executive Summary
    report += '## Executive Summary\n\n';
    report += `- **Migration Status**: ${success ? '✅ Successful' : '❌ Failed'}\n`;
    report += `- **Current Version**: ${analysis.currentVersion}\n`;
    report += `- **Migration Path**: ${analysis.migrationPath}\n`;
    report += `- **Estimated Effort**: ${analysis.estimatedEffort}\n`;
    report += `- **Recommended Method**: ${analysis.sdkConfig.recommendedMethod}\n\n`;

    // Compatibility Analysis
    report += '## Compatibility Analysis\n\n';
    report += `- **Fully Compatible**: ${analysis.compatibility.fullyCompatible ? '✅ Yes' : '❌ No'}\n`;
    report += `- **Requires Updates**: ${analysis.compatibility.requiresUpdates ? '⚠️ Yes' : '✅ No'}\n\n`;

    if (analysis.compatibility.breakingChanges.length > 0) {
      report += '### Breaking Changes\n';
      analysis.compatibility.breakingChanges.forEach(change => {
        report += `- ❌ ${change}\n`;
      });
      report += '\n';
    }

    if (analysis.compatibility.recommendations.length > 0) {
      report += '### Recommendations\n';
      analysis.compatibility.recommendations.forEach(rec => {
        report += `- 💡 ${rec}\n`;
      });
      report += '\n';
    }

    // Token Configuration Analysis
    report += '## Token Configuration Analysis\n\n';
    report += `- **Valid Configuration**: ${analysis.tokenConfig.valid ? '✅ Yes' : '❌ No'}\n\n`;

    if (analysis.tokenConfig.missingFields.length > 0) {
      report += '### Missing Required Fields\n';
      analysis.tokenConfig.missingFields.forEach(field => {
        report += `- ❌ ${field}\n`;
      });
      report += '\n';
    }

    if (analysis.tokenConfig.deprecatedFields.length > 0) {
      report += '### Deprecated Fields\n';
      analysis.tokenConfig.deprecatedFields.forEach(field => {
        report += `- ⚠️ ${field}\n`;
      });
      report += '\n';
    }

    if (analysis.tokenConfig.suggestions.length > 0) {
      report += '### Suggestions\n';
      analysis.tokenConfig.suggestions.forEach(suggestion => {
        report += `- 💡 ${suggestion}\n`;
      });
      report += '\n';
    }

    // SDK Configuration Analysis
    report += '## SDK Configuration Analysis\n\n';
    report += `- **Valid Configuration**: ${analysis.sdkConfig.valid ? '✅ Yes' : '❌ No'}\n`;
    report += `- **Available Methods**: ${analysis.sdkConfig.availableMethods.join(', ')}\n`;
    report += `- **Recommended Method**: ${analysis.sdkConfig.recommendedMethod}\n\n`;

    if (analysis.sdkConfig.missingConfig.length > 0) {
      report += '### Missing Configuration\n';
      analysis.sdkConfig.missingConfig.forEach(config => {
        report += `- ❌ ${config}\n`;
      });
      report += '\n';
    }

    // Code Examples
    if (codeExamples.length > 0) {
      report += '## Code Migration Examples\n\n';
      codeExamples.forEach((example, index) => {
        report += `### Example ${index + 1}: ${example.explanation}\n\n`;
        report += '**Before:**\n```typescript\n';
        report += example.before;
        report += '\n```\n\n';
        report += '**After:**\n```typescript\n';
        report += example.after;
        report += '\n```\n\n';
      });
    }

    // Next Steps
    if (nextSteps.length > 0) {
      report += '## Next Steps\n\n';
      nextSteps.forEach((step, index) => {
        report += `${index + 1}. ${step}\n`;
      });
      report += '\n';
    }

    // Footer
    report += '---\n';
    report += '*Generated by Clanker SDK Migration Utility*\n';
    report += `*Report generated on: ${new Date().toISOString()}*\n`;

    return report;
  }

  // ==========================================================================
  // Private Analysis Methods
  // ==========================================================================

  private static analyzeTokenConfigurations(tokens: any[]): {
    valid: boolean;
    missingFields: string[];
    deprecatedFields: string[];
    suggestions: string[];
  } {
    const missingFields = new Set<string>();
    const deprecatedFields = new Set<string>();
    const suggestions = new Set<string>();

    for (const token of tokens) {
      // Check for required V4 fields
      if (!token.chainId) {
        missingFields.add('chainId - Required in V4');
      }
      if (!token.image) {
        missingFields.add('image - Required in V4');
      }

      // Check for deprecated direct social fields
      if (token.twitter) {
        deprecatedFields.add('twitter - Use metadata.socials.twitter instead');
      }
      if (token.telegram) {
        deprecatedFields.add('telegram - Use metadata.socials.telegram instead');
      }
      if (token.website) {
        deprecatedFields.add('website - Use metadata.socials.website instead');
      }
      if (token.description) {
        deprecatedFields.add('description - Use metadata.description instead');
      }

      // Suggestions
      if (!token.metadata?.description) {
        suggestions.add('Add description in metadata for better discoverability');
      }
      if (!token.metadata?.socials) {
        suggestions.add('Add social links in metadata for community building');
      }
    }

    return {
      valid: missingFields.size === 0,
      missingFields: Array.from(missingFields),
      deprecatedFields: Array.from(deprecatedFields),
      suggestions: Array.from(suggestions),
    };
  }

  private static analyzeSDKConfiguration(config: any): {
    valid: boolean;
    availableMethods: OperationMethod[];
    recommendedMethod: OperationMethod;
    missingConfig: string[];
  } {
    const availableMethods: OperationMethod[] = [];
    const missingConfig: string[] = [];

    // Check for direct method availability
    if (config.wallet && config.publicClient) {
      availableMethods.push('direct');
    } else {
      if (!config.wallet) {
        missingConfig.push('wallet - Required for direct method');
      }
      if (!config.publicClient) {
        missingConfig.push('publicClient - Required for direct method');
      }
    }

    // Check for API method availability
    if (config.api?.apiKey) {
      availableMethods.push('api');
    } else {
      missingConfig.push('api.apiKey - Required for API method');
    }

    // Add auto if both methods available
    if (availableMethods.length > 1) {
      availableMethods.push('auto');
    }

    // Determine recommended method
    let recommendedMethod: OperationMethod = 'direct';
    if (availableMethods.includes('auto')) {
      recommendedMethod = 'auto';
    } else if (availableMethods.includes('api')) {
      recommendedMethod = 'api';
    }

    return {
      valid: availableMethods.length > 0,
      availableMethods,
      recommendedMethod,
      missingConfig,
    };
  }

  private static analyzeCompatibility(config: any, tokens: any[]): {
    fullyCompatible: boolean;
    requiresUpdates: boolean;
    breakingChanges: string[];
    recommendations: string[];
  } {
    const breakingChanges: string[] = [];
    const recommendations: string[] = [];

    // Check for breaking changes in tokens
    for (const token of tokens) {
      if (!token.chainId) {
        breakingChanges.push(`Token "${token.name}" missing required chainId field`);
      }
      if (!token.image) {
        breakingChanges.push(`Token "${token.name}" missing required image field`);
      }
    }

    // Check for configuration issues
    if (!config.wallet && !config.publicClient && !config.api?.apiKey) {
      breakingChanges.push('No valid configuration method available (need wallet/publicClient or API key)');
    }

    // Generate recommendations
    if (config.wallet && config.publicClient && !config.api?.apiKey) {
      recommendations.push('Consider adding API key for enhanced features and auto method selection');
    }

    if (!config.operationMethod) {
      recommendations.push('Specify operationMethod for explicit control over deployment method');
    }

    const fullyCompatible = breakingChanges.length === 0;
    const requiresUpdates = breakingChanges.length > 0 || recommendations.length > 0;

    return {
      fullyCompatible,
      requiresUpdates,
      breakingChanges,
      recommendations,
    };
  }

  private static determineMigrationPath(
    compatibility: any,
    configAnalysis: any,
    options: MigrationOptions
  ): 'no-changes' | 'enhanced-compatible' | 'api-integration' | 'hybrid' {
    if (compatibility.fullyCompatible && !options.enableAPIFeatures) {
      return 'no-changes';
    }

    if (options.preferredMethod === 'api' || options.enableAPIFeatures) {
      if (configAnalysis.availableMethods.includes('auto')) {
        return 'hybrid';
      }
      return 'api-integration';
    }

    if (compatibility.requiresUpdates) {
      return 'enhanced-compatible';
    }

    return 'no-changes';
  }

  private static estimateMigrationEffort(
    compatibility: any,
    tokenAnalysis: any,
    configAnalysis: any
  ): 'minimal' | 'low' | 'medium' | 'high' {
    let score = 0;

    // Breaking changes add significant effort
    score += compatibility.breakingChanges.length * 3;

    // Missing fields add moderate effort
    score += tokenAnalysis.missingFields.length * 2;

    // Configuration issues add effort
    score += configAnalysis.missingConfig.length * 1;

    if (score === 0) return 'minimal';
    if (score <= 3) return 'low';
    if (score <= 8) return 'medium';
    return 'high';
  }

  private static detectCurrentVersion(tokens: any[]): 'v1' | 'v2' | 'v3' | 'v4' {
    if (tokens.length === 0) return 'v4';

    const token = tokens[0];

    // V4 has metadata structure
    if (token.metadata) return 'v4';

    // V3 has social fields and description
    if (token.description || token.twitter || token.telegram || token.website) return 'v3';

    // V2 has chainId
    if (token.chainId) return 'v2';

    // V1 has only basic fields
    return 'v1';
  }

  // ==========================================================================
  // Private Migration Methods
  // ==========================================================================

  private static migrateSDKConfiguration(
    existingConfig: any,
    analysis: MigrationAnalysis,
    options: MigrationOptions
  ): ClankerSDKConfig {
    const migratedConfig: ClankerSDKConfig = {
      ...existingConfig,
    };

    // Set operation method based on analysis and options
    if (options.preferredMethod) {
      migratedConfig.operationMethod = options.preferredMethod;
    } else {
      migratedConfig.operationMethod = analysis.sdkConfig.recommendedMethod;
    }

    // Add API configuration if needed
    if (options.enableAPIFeatures && !existingConfig.api?.apiKey) {
      migratedConfig.api = {
        apiKey: 'YOUR_API_KEY_HERE', // Placeholder
        timeout: 30000,
        retries: 3,
      };
    }

    return migratedConfig;
  }

  private static migrateTokenConfigurations(
    existingTokens: any[],
    analysis: MigrationAnalysis
  ): ClankerTokenV4[] {
    return existingTokens.map(token => {
      const migratedToken: ClankerTokenV4 = {
        name: token.name,
        symbol: token.symbol,
        tokenAdmin: token.tokenAdmin,
        chainId: token.chainId || 8453, // Default to Base
        image: token.image || 'https://example.com/token.png', // Placeholder
      };

      // Migrate metadata
      if (token.description || token.twitter || token.telegram || token.website) {
        migratedToken.metadata = {
          description: token.description,
          socials: {},
        };

        if (token.twitter) {
          migratedToken.metadata.socials!.twitter = token.twitter;
        }
        if (token.telegram) {
          migratedToken.metadata.socials!.telegram = token.telegram;
        }
        if (token.website) {
          migratedToken.metadata.socials!.website = token.website;
        }
      }

      // Copy other V4 fields if they exist
      if (token.metadata) {
        migratedToken.metadata = { ...migratedToken.metadata, ...token.metadata };
      }
      if (token.poolPositions) {
        migratedToken.poolPositions = token.poolPositions;
      }
      if (token.fees) {
        migratedToken.fees = token.fees;
      }
      if (token.vault) {
        migratedToken.vault = token.vault;
      }
      if (token.mev) {
        migratedToken.mev = token.mev;
      }
      if (token.rewards) {
        migratedToken.rewards = token.rewards;
      }

      return migratedToken;
    });
  }

  private static generateCodeExamples(
    existingConfig: any,
    migratedConfig: ClankerSDKConfig,
    analysis: MigrationAnalysis
  ): Array<{ before: string; after: string; explanation: string }> {
    const examples: Array<{ before: string; after: string; explanation: string }> = [];

    // Basic migration example
    examples.push({
      explanation: 'Basic SDK initialization',
      before: `import { Clanker } from 'clanker-sdk';

const clanker = new Clanker({
  wallet: walletClient,
  publicClient: publicClient,
});`,
      after: `import { createEnhancedClanker } from 'clanker-sdk';

const clanker = createEnhancedClanker({
  wallet: walletClient,
  publicClient: publicClient,
  operationMethod: '${migratedConfig.operationMethod}',
});`,
    });

    // Token configuration example
    if (analysis.tokenConfig.missingFields.length > 0) {
      examples.push({
        explanation: 'Token configuration with required V4 fields',
        before: `const token = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
};`,
        after: `const token: ClankerTokenV4 = {
  name: 'My Token',
  symbol: 'MTK',
  tokenAdmin: '0x...',
  chainId: 8453,
  image: 'https://example.com/token.png',
  metadata: {
    description: 'My awesome token',
    socials: {
      twitter: '@mytoken',
      website: 'https://mytoken.com',
    },
  },
};`,
      });
    }

    // API integration example
    if (migratedConfig.api) {
      examples.push({
        explanation: 'API integration with enhanced features',
        before: `const result = await clanker.deploy(token);`,
        after: `// Validate before deployment
const validation = await clanker.validateTokenConfig(token);
if (!validation.valid) {
  throw new Error(\`Invalid token: \${validation.errors.join(', ')}\`);
}

// Deploy with enhanced error handling
const result = await clanker.deploy(token);`,
      });
    }

    return examples;
  }

  private static generateNextSteps(
    analysis: MigrationAnalysis,
    options: MigrationOptions
  ): string[] {
    const steps: string[] = [];

    if (analysis.compatibility.breakingChanges.length > 0) {
      steps.push('Fix breaking changes identified in the analysis');
    }

    if (analysis.tokenConfig.missingFields.length > 0) {
      steps.push('Add missing required fields to token configurations');
    }

    if (analysis.sdkConfig.missingConfig.length > 0) {
      steps.push('Complete SDK configuration for desired operation method');
    }

    if (options.enableAPIFeatures) {
      steps.push('Obtain Clanker API key and update configuration');
    }

    steps.push('Test migration in development environment');
    steps.push('Update error handling to use new error types');
    steps.push('Consider using new features like validation and batch operations');
    steps.push('Update CI/CD pipelines with new environment variables');
    steps.push('Deploy to staging and verify functionality');
    steps.push('Monitor deployment success rates and performance');

    return steps;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick migration analysis
 */
export function analyzeMigration(
  existingConfig: any,
  existingTokens: any[],
  options?: MigrationOptions
): MigrationAnalysis {
  return MigrationUtility.analyzeForMigration(existingConfig, existingTokens, options);
}

/**
 * Perform automatic migration
 */
export function performMigration(
  existingConfig: any,
  existingTokens: any[],
  options?: MigrationOptions
): MigrationResult {
  return MigrationUtility.performMigration(existingConfig, existingTokens, options);
}

/**
 * Generate migration report
 */
export function generateMigrationReport(migrationResult: MigrationResult): string {
  return MigrationUtility.generateMigrationReport(migrationResult);
}

/**
 * Create migrated Clanker instance
 */
export function createMigratedClanker(
  existingConfig: any,
  options?: MigrationOptions
) {
  const migrationResult = performMigration(existingConfig, [], options);
  
  if (!migrationResult.success) {
    throw new Error(`Migration failed: ${migrationResult.nextSteps.join(', ')}`);
  }

  return createEnhancedClanker(migrationResult.migratedConfig as EnhancedClankerConfig);
}