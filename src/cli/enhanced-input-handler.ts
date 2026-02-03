/**
 * Enhanced Input Handler
 * 
 * Handles empty/skipped inputs with intelligent defaults and Clanker World optimization
 */

import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { 
  ClankerWorldOptimizer, 
  createClankerOptimizer, 
  type ClankerOptimizedMetadata 
} from './clanker-optimization.js';

// ============================================================================
// Enhanced Input Handler Types
// ============================================================================

export interface EnhancedInputConfig {
  enableSmartDefaults: boolean;
  enableClankerOptimization: boolean;
  enableAutoSuggestions: boolean;
  enableValidationFeedback: boolean;
  showOptimizationResults: boolean;
  requireMinimumQuality: boolean;
  minimumClankerScore: number;
}

export interface TokenInputData {
  name: string;
  symbol: string;
  description: string;
  image: string;
  website: string;
  farcaster: string;
  twitter: string;
  zora: string;
  instagram: string;
  chainId: number;
  tokenAdmin: string;
  rewardRecipient: string;
}

// ============================================================================
// Enhanced Input Handler Class
// ============================================================================

export class EnhancedInputHandler {
  private config: EnhancedInputConfig;
  private optimizer: ClankerWorldOptimizer;

  constructor(config: Partial<EnhancedInputConfig> = {}) {
    this.config = {
      enableSmartDefaults: true,
      enableClankerOptimization: true,
      enableAutoSuggestions: true,
      enableValidationFeedback: true,
      showOptimizationResults: true,
      requireMinimumQuality: false,
      minimumClankerScore: 70,
      ...config
    };

    this.optimizer = createClankerOptimizer();
  }

  /**
   * Enhanced description input with smart defaults
   */
  async collectDescription(
    name: string, 
    symbol: string, 
    chainId: number,
    existingDescription?: string
  ): Promise<string> {
    console.log('');
    console.log(chalk.gray('  💡 Smart Description Generator'));
    console.log(chalk.gray('  Press Enter for AI-generated professional description'));
    console.log('');

    // Generate smart default
    const smartDefault = this.generateSmartDescription(name, symbol, chainId);
    
    const description = await input({
      message: 'Description (or press Enter for smart default):',
      default: existingDescription || '',
      validate: (v) => {
        if (!v.trim()) {
          return true; // Allow empty - will use smart default
        }
        if (v.length < 10) {
          return 'Description should be at least 10 characters for better Clanker verification';
        }
        if (v.length > 500) {
          return 'Description too long (max 500 characters)';
        }
        return true;
      }
    });

    // Use smart default if empty
    if (!description.trim()) {
      console.log(chalk.green('  ✓ Using AI-generated description'));
      console.log(chalk.gray(`  "${smartDefault.substring(0, 80)}..."`));
      return smartDefault;
    }

    // Enhance existing description if needed
    if (this.config.enableClankerOptimization) {
      const enhanced = this.enhanceUserDescription(description, name, symbol, chainId);
      if (enhanced !== description) {
        console.log(chalk.cyan('  ✨ Enhanced for Clanker World optimization'));
        return enhanced;
      }
    }

    return description;
  }

  /**
   * Enhanced image input with fallback suggestions
   */
  async collectImage(
    name: string, 
    symbol: string,
    existingImage?: string
  ): Promise<string> {
    console.log('');
    console.log(chalk.gray('  🖼️  Image URL or IPFS CID'));
    console.log(chalk.gray('  Press Enter to skip (professional fallback will be used)'));
    console.log('');

    const image = await input({
      message: 'Image URL:',
      default: existingImage || '',
      validate: (v) => {
        if (!v.trim()) return true; // Allow empty
        
        // Validate URL format
        if (v.startsWith('http://') || v.startsWith('https://')) {
          return true;
        }
        
        // Validate IPFS format
        if (v.startsWith('ipfs://') || v.startsWith('Qm') || v.startsWith('bafy')) {
          return true;
        }
        
        return 'Invalid format. Use URL (http/https) or IPFS CID (Qm.../bafy...)';
      }
    });

    if (!image.trim()) {
      if (this.config.enableAutoSuggestions) {
        console.log(chalk.yellow('  💡 No image provided - professional fallback will be used'));
        console.log(chalk.gray('  This ensures your token looks professional on Clanker World'));
      }
      return ''; // Will be handled by optimizer
    }

    // Normalize IPFS URLs
    return this.normalizeImageUrl(image);
  }

  /**
   * Enhanced social links collection with smart suggestions
   */
  async collectSocialLinks(
    name: string,
    symbol: string,
    existing: {
      website?: string;
      farcaster?: string;
      twitter?: string;
      zora?: string;
      instagram?: string;
    } = {}
  ): Promise<{
    website: string;
    farcaster: string;
    twitter: string;
    zora: string;
    instagram: string;
  }> {
    console.log('');
    console.log(chalk.white.bold('  🌐 SOCIAL LINKS'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(chalk.gray('  Press Enter to skip any field'));
    console.log(chalk.gray('  Smart suggestions will be provided for empty fields'));
    console.log('');

    const website = await input({
      message: 'Website:',
      default: existing.website || '',
    });

    const farcaster = await input({
      message: 'Farcaster (username or FID):',
      default: existing.farcaster || '',
    });

    const twitter = await input({
      message: 'Twitter/X:',
      default: existing.twitter || '',
    });

    const zora = await input({
      message: 'Zora:',
      default: existing.zora || '',
    });

    const instagram = await input({
      message: 'Instagram:',
      default: existing.instagram || '',
    });

    // Show smart suggestions for empty fields
    const result = {
      website: website.trim(),
      farcaster: farcaster.trim(),
      twitter: twitter.trim(),
      zora: zora.trim(),
      instagram: instagram.trim(),
    };

    if (this.config.enableAutoSuggestions) {
      this.showSocialLinkSuggestions(result, name, symbol);
    }

    return result;
  }

  /**
   * Process and optimize all collected input
   */
  async processAndOptimize(input: Partial<TokenInputData>): Promise<{
    optimized: ClankerOptimizedMetadata;
    validation: ReturnType<ClankerWorldOptimizer['validateClankerReadiness']>;
    needsUserReview: boolean;
  }> {
    if (!input.name || !input.symbol || !input.chainId) {
      throw new Error('Name, symbol, and chainId are required');
    }

    // Optimize metadata
    const optimized = this.optimizer.optimizeMetadata({
      name: input.name,
      symbol: input.symbol,
      description: input.description,
      image: input.image,
      website: input.website,
      farcaster: input.farcaster,
      twitter: input.twitter,
      zora: input.zora,
      instagram: input.instagram,
      chainId: input.chainId,
      tokenAdmin: input.tokenAdmin,
      rewardRecipient: input.rewardRecipient,
    });

    // Validate Clanker readiness
    const validation = this.optimizer.validateClankerReadiness(optimized);

    // Show optimization results if enabled
    if (this.config.showOptimizationResults) {
      this.optimizer.displayOptimizationResults(input, optimized, validation);
    }

    // Determine if user review is needed
    const needsUserReview = this.config.requireMinimumQuality && 
                           validation.score < this.config.minimumClankerScore;

    return {
      optimized,
      validation,
      needsUserReview
    };
  }

  /**
   * Handle user review and improvements
   */
  async handleUserReview(
    optimized: ClankerOptimizedMetadata,
    validation: ReturnType<ClankerWorldOptimizer['validateClankerReadiness']>
  ): Promise<ClankerOptimizedMetadata> {
    console.log('');
    console.log(chalk.yellow.bold('  ⚠️  QUALITY REVIEW NEEDED'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  Current Clanker Score: ${validation.score}/100`);
    console.log(`  Minimum Required: ${this.config.minimumClankerScore}/100`);
    console.log('');

    if (validation.issues.length > 0) {
      console.log(chalk.red('  Issues to resolve:'));
      validation.issues.forEach(issue => {
        console.log(`  ${chalk.red('✗')} ${issue}`);
      });
      console.log('');
    }

    const action = await select({
      message: 'How would you like to proceed?',
      choices: [
        { 
          name: 'Auto-fix issues (recommended)', 
          value: 'autofix',
          description: 'Let AI automatically improve the token metadata'
        },
        { 
          name: 'Manual improvements', 
          value: 'manual',
          description: 'Make manual changes to specific fields'
        },
        { 
          name: 'Deploy anyway', 
          value: 'deploy',
          description: 'Proceed with current quality (may affect Clanker verification)'
        },
      ],
    });

    switch (action) {
      case 'autofix':
        return await this.autoFixIssues(optimized, validation);
      case 'manual':
        return await this.manualImprovements(optimized);
      default:
        return optimized;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate smart description based on token name and symbol
   */
  private generateSmartDescription(name: string, symbol: string, chainId: number): string {
    // Use the optimizer to generate professional description
    const tempOptimized = this.optimizer.optimizeMetadata({
      name,
      symbol,
      chainId,
    });
    
    return tempOptimized.description;
  }

  /**
   * Enhance user-provided description
   */
  private enhanceUserDescription(
    description: string, 
    name: string, 
    symbol: string, 
    chainId: number
  ): string {
    // Use optimizer to enhance existing description
    const tempOptimized = this.optimizer.optimizeMetadata({
      name,
      symbol,
      description,
      chainId,
    });
    
    return tempOptimized.description;
  }

  /**
   * Normalize image URL format
   */
  private normalizeImageUrl(url: string): string {
    const trimmed = url.trim();
    
    // Already a full URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    
    // Already ipfs:// format
    if (trimmed.startsWith('ipfs://')) {
      return trimmed;
    }
    
    // Raw IPFS CID
    if (trimmed.startsWith('Qm') || trimmed.startsWith('bafy') || trimmed.startsWith('bafk')) {
      return `ipfs://${trimmed}`;
    }
    
    return trimmed;
  }

  /**
   * Show smart suggestions for social links
   */
  private showSocialLinkSuggestions(
    current: {
      website: string;
      farcaster: string;
      twitter: string;
      zora: string;
      instagram: string;
    },
    name: string,
    symbol: string
  ): void {
    const emptySocials = Object.entries(current).filter(([_, value]) => !value);
    
    if (emptySocials.length > 0) {
      console.log('');
      console.log(chalk.cyan('  💡 Smart Suggestions for Empty Fields:'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      
      emptySocials.forEach(([platform, _]) => {
        const suggestion = this.generateSocialSuggestion(platform, symbol);
        if (suggestion) {
          console.log(`  ${chalk.gray(platform)}:  ${chalk.yellow(suggestion)}`);
        }
      });
      
      console.log(chalk.gray('  These will be used as placeholders if left empty'));
      console.log('');
    }
  }

  /**
   * Generate social media suggestion
   */
  private generateSocialSuggestion(platform: string, symbol: string): string {
    const suggestions = {
      website: `https://${symbol.toLowerCase()}.com`,
      twitter: `https://twitter.com/${symbol.toLowerCase()}token`,
      farcaster: `@${symbol.toLowerCase()}`,
      zora: `https://zora.co/${symbol.toLowerCase()}`,
      instagram: `https://instagram.com/${symbol.toLowerCase()}token`,
    };
    
    return suggestions[platform as keyof typeof suggestions] || '';
  }

  /**
   * Auto-fix issues in metadata
   */
  private async autoFixIssues(
    optimized: ClankerOptimizedMetadata,
    validation: ReturnType<ClankerWorldOptimizer['validateClankerReadiness']>
  ): Promise<ClankerOptimizedMetadata> {
    console.log('');
    console.log(chalk.cyan('  🔧 Auto-fixing issues...'));
    
    let fixed = { ...optimized };
    
    // Fix short or missing description
    if (validation.issues.some(issue => issue.includes('description'))) {
      fixed.description = this.generateSmartDescription(fixed.name, fixed.symbol, 8453);
      console.log(`  ${chalk.green('✓')} Enhanced description`);
    }
    
    // Fix missing image
    if (!fixed.image) {
      const category = fixed.category.toLowerCase();
      fixed.image = `ipfs://QmAutoGenerated${category}Image${Date.now()}`;
      console.log(`  ${chalk.green('✓')} Added professional ${category} image`);
    }
    
    // Add social links if missing
    if (!fixed.website) {
      fixed.website = `https://${fixed.symbol.toLowerCase()}.com`;
      console.log(`  ${chalk.green('✓')} Added website placeholder`);
    }
    
    if (!fixed.twitter) {
      fixed.twitter = `https://twitter.com/${fixed.symbol.toLowerCase()}token`;
      console.log(`  ${chalk.green('✓')} Added Twitter placeholder`);
    }
    
    console.log(chalk.green('  ✅ Auto-fix complete!'));
    
    // Re-validate
    const newValidation = this.optimizer.validateClankerReadiness(fixed);
    console.log(`  New Clanker Score: ${chalk.green(`${newValidation.score}/100`)}`);
    
    return fixed;
  }

  /**
   * Handle manual improvements
   */
  private async manualImprovements(
    optimized: ClankerOptimizedMetadata
  ): Promise<ClankerOptimizedMetadata> {
    console.log('');
    console.log(chalk.cyan('  🛠️  Manual Improvements'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    
    const field = await select({
      message: 'Which field would you like to improve?',
      choices: [
        { name: 'Description', value: 'description' },
        { name: 'Image', value: 'image' },
        { name: 'Website', value: 'website' },
        { name: 'Twitter', value: 'twitter' },
        { name: 'Farcaster', value: 'farcaster' },
        { name: 'Done', value: 'done' },
      ],
    });
    
    if (field === 'done') {
      return optimized;
    }
    
    const currentValue = optimized[field as keyof ClankerOptimizedMetadata] as string;
    
    const newValue = await input({
      message: `New ${field}:`,
      default: currentValue,
    });
    
    const improved = {
      ...optimized,
      [field]: newValue.trim()
    };
    
    console.log(chalk.green(`  ✓ Updated ${field}`));
    
    // Ask if they want to improve more fields
    const continueImproving = await confirm({
      message: 'Improve another field?',
      default: false,
    });
    
    if (continueImproving) {
      return await this.manualImprovements(improved);
    }
    
    return improved;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create enhanced input handler with default config
 */
export function createEnhancedInputHandler(
  config?: Partial<EnhancedInputConfig>
): EnhancedInputHandler {
  return new EnhancedInputHandler(config);
}

/**
 * Quick collection of optimized token data
 */
export async function collectOptimizedTokenData(
  existingData: Partial<TokenInputData> = {}
): Promise<{
  optimized: ClankerOptimizedMetadata;
  validation: ReturnType<ClankerWorldOptimizer['validateClankerReadiness']>;
}> {
  const handler = createEnhancedInputHandler();
  
  // Collect missing required fields
  const name = existingData.name || await input({
    message: 'Token Name:',
    validate: (v) => v.trim().length > 0 || 'Required'
  });
  
  const symbol = existingData.symbol || await input({
    message: 'Token Symbol:',
    validate: (v) => v.trim().length > 0 || 'Required'
  });
  
  const chainId = existingData.chainId || 8453; // Default to Base
  
  // Collect enhanced inputs
  const description = await handler.collectDescription(name, symbol, chainId, existingData.description);
  const image = await handler.collectImage(name, symbol, existingData.image);
  const socialLinks = await handler.collectSocialLinks(name, symbol, {
    website: existingData.website,
    farcaster: existingData.farcaster,
    twitter: existingData.twitter,
    zora: existingData.zora,
    instagram: existingData.instagram,
  });
  
  // Process and optimize
  const result = await handler.processAndOptimize({
    name,
    symbol,
    description,
    image,
    chainId,
    tokenAdmin: existingData.tokenAdmin,
    rewardRecipient: existingData.rewardRecipient,
    ...socialLinks,
  });
  
  // Handle user review if needed
  if (result.needsUserReview) {
    result.optimized = await handler.handleUserReview(result.optimized, result.validation);
    result.validation = handler.optimizer.validateClankerReadiness(result.optimized);
  }
  
  return {
    optimized: result.optimized,
    validation: result.validation,
  };
}