/**
 * Fee Configuration Menu
 * 
 * Interactive menu for fee strategy selection with real-time preview and
 * integration with UX mode manager for appropriate interaction levels.
 */

import { 
  UXMode, 
  FeeStrategy, 
  FeeConfiguration,
  MenuItem,
  MenuResult
} from '../../types';

import {
  UnifiedFeeManager,
  FeeConfigurationMenuOptions,
  FeeMenuItem,
  FeeConfigurationMenuResult,
  FormattedFeePreview,
  FeeStrategyConfig
} from './index';

/**
 * Interactive Fee Configuration Menu
 */
export class FeeConfigurationMenu {
  private feeManager: UnifiedFeeManager;
  private uxMode: UXMode;
  private currentPreview: FormattedFeePreview | null = null;

  constructor(feeManager: UnifiedFeeManager, uxMode: UXMode = UXMode.NORMAL) {
    this.feeManager = feeManager;
    this.uxMode = uxMode;
    
    // Subscribe to fee preview updates
    this.feeManager.onFeePreview((preview) => {
      this.currentPreview = preview;
    });
  }

  /**
   * Display interactive fee configuration menu
   */
  async displayMenu(options: Partial<FeeConfigurationMenuOptions> = {}): Promise<FeeConfigurationMenuResult> {
    const menuOptions: FeeConfigurationMenuOptions = {
      title: 'Fee Configuration',
      showPreview: true,
      allowStrategyChange: true,
      allowPercentageChange: true,
      showAdvancedOptions: false,
      ...options
    };

    console.log('\n' + '='.repeat(60));
    console.log(`🎯 ${menuOptions.title}`);
    console.log('='.repeat(60));

    // Show current configuration
    await this.displayCurrentConfiguration();

    // Show strategy selection based on UX mode
    const result = await this.handleStrategySelection(menuOptions);
    
    if (result.cancelled) {
      console.log('\n❌ Fee configuration cancelled.');
      return result;
    }

    // Show percentage configuration if allowed and needed
    if (menuOptions.allowPercentageChange && result.selectedStrategy === FeeStrategy.CUSTOM) {
      const percentageResult = await this.handlePercentageConfiguration(result.selectedStrategy);
      if (percentageResult.cancelled) {
        console.log('\n❌ Fee configuration cancelled.');
        return { ...result, cancelled: true };
      }
      result.selectedPercentage = percentageResult.percentage;
    }

    // Apply configuration
    try {
      const configuration = await this.feeManager.configureFee(
        result.selectedPercentage,
        result.selectedStrategy
      );
      
      result.configuration = configuration;
      result.userConfirmed = true;

      // Show final confirmation
      await this.displayFinalConfiguration(configuration);
      
      return result;

    } catch (error) {
      console.log(`\n❌ Failed to apply fee configuration: ${error instanceof Error ? error.message : String(error)}`);
      return { ...result, cancelled: true };
    }
  }

  /**
   * Display current fee configuration
   */
  private async displayCurrentConfiguration(): Promise<void> {
    const currentConfig = this.feeManager.getCurrentConfiguration();
    const strategyConfig = this.feeManager.getStrategyConfig(currentConfig.strategy);
    
    console.log('\n📊 Current Configuration:');
    console.log(`   Strategy: ${strategyConfig?.name || currentConfig.strategy} (${currentConfig.percentage}%)`);
    console.log(`   Applies to: ${currentConfig.appliesTo.join(', ')}`);
    console.log(`   Last modified: ${currentConfig.lastModified.toLocaleString()}`);

    // Generate and show preview
    if (this.uxMode !== UXMode.ULTRA) {
      const preview = await this.feeManager.generatePreview();
      this.displayPreview(preview);
    }
  }

  /**
   * Handle strategy selection based on UX mode
   */
  private async handleStrategySelection(options: FeeConfigurationMenuOptions): Promise<FeeConfigurationMenuResult> {
    const strategies = this.feeManager.getAvailableStrategies();
    const currentConfig = this.feeManager.getCurrentConfiguration();

    // Create result object
    const result: FeeConfigurationMenuResult = {
      selectedStrategy: currentConfig.strategy,
      selectedPercentage: currentConfig.percentage,
      configuration: currentConfig,
      userConfirmed: false,
      cancelled: false
    };

    // Handle different UX modes
    switch (this.uxMode) {
      case UXMode.ULTRA:
        // Auto-select current strategy in ultra mode
        console.log(`\n⚡ Ultra mode: Using current strategy (${currentConfig.strategy})`);
        return result;

      case UXMode.FAST:
        // Quick selection with minimal prompts
        return await this.handleFastModeSelection(strategies, result);

      case UXMode.NORMAL:
        // Standard interactive selection
        return await this.handleNormalModeSelection(strategies, result, options);

      case UXMode.EXPERT:
        // Advanced selection with all options
        return await this.handleExpertModeSelection(strategies, result, options);

      default:
        return await this.handleNormalModeSelection(strategies, result, options);
    }
  }

  /**
   * Handle fast mode strategy selection
   */
  private async handleFastModeSelection(
    strategies: FeeStrategyConfig[], 
    result: FeeConfigurationMenuResult
  ): Promise<FeeConfigurationMenuResult> {
    console.log('\n🚀 Fast Mode - Quick Strategy Selection:');
    
    strategies.forEach((strategy, index) => {
      const isRecommended = strategy.strategy === FeeStrategy.FLAT;
      const marker = isRecommended ? '⭐' : '  ';
      console.log(`${marker} ${index + 1}. ${strategy.name} - ${strategy.description}`);
    });

    const choice = await this.promptForChoice(
      '\nSelect strategy (1-3) or press Enter for recommended',
      strategies.length,
      2 // Default to Flat (index 1, display 2)
    );

    if (choice === null) {
      result.cancelled = true;
      return result;
    }

    const selectedStrategy = strategies[choice - 1];
    result.selectedStrategy = selectedStrategy.strategy;
    result.selectedPercentage = selectedStrategy.defaultPercentage;

    console.log(`\n✅ Selected: ${selectedStrategy.name} (${selectedStrategy.defaultPercentage}%)`);
    
    return result;
  }

  /**
   * Handle normal mode strategy selection
   */
  private async handleNormalModeSelection(
    strategies: FeeStrategyConfig[], 
    result: FeeConfigurationMenuResult,
    options: FeeConfigurationMenuOptions
  ): Promise<FeeConfigurationMenuResult> {
    console.log('\n📋 Strategy Selection:');
    
    // Display strategies with detailed information
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const isRecommended = strategy.strategy === FeeStrategy.FLAT;
      const marker = isRecommended ? '⭐' : '  ';
      
      console.log(`${marker} ${i + 1}. ${strategy.name}`);
      console.log(`     ${strategy.description}`);
      console.log(`     Range: ${strategy.percentageRange.min}%-${strategy.percentageRange.max}%`);
      
      // Show preview for each strategy if enabled
      if (options.showPreview && this.uxMode !== UXMode.FAST) {
        const preview = await this.generateStrategyPreview(strategy);
        console.log(`     Preview: ${preview.formattedTotalFees} total fees`);
      }
      
      console.log('');
    }

    const choice = await this.promptForChoice(
      'Select fee strategy (1-3)',
      strategies.length
    );

    if (choice === null) {
      result.cancelled = true;
      return result;
    }

    const selectedStrategy = strategies[choice - 1];
    result.selectedStrategy = selectedStrategy.strategy;
    result.selectedPercentage = selectedStrategy.defaultPercentage;

    console.log(`\n✅ Selected: ${selectedStrategy.name}`);
    
    return result;
  }

  /**
   * Handle expert mode strategy selection
   */
  private async handleExpertModeSelection(
    strategies: FeeStrategyConfig[], 
    result: FeeConfigurationMenuResult,
    options: FeeConfigurationMenuOptions
  ): Promise<FeeConfigurationMenuResult> {
    console.log('\n🎓 Expert Mode - Advanced Strategy Selection:');
    
    // Show detailed comparison
    console.log('\n📊 Strategy Comparison (based on $1000 sample):');
    console.log('Strategy'.padEnd(12) + 'Range'.padEnd(12) + 'Sample Fee'.padEnd(15) + 'Description');
    console.log('-'.repeat(70));
    
    for (const strategy of strategies) {
      const preview = await this.generateStrategyPreview(strategy);
      const range = `${strategy.percentageRange.min}-${strategy.percentageRange.max}%`;
      
      console.log(
        strategy.name.padEnd(12) + 
        range.padEnd(12) + 
        preview.formattedTotalFees.padEnd(15) + 
        strategy.description
      );
    }

    // Show current configuration comparison
    const currentConfig = this.feeManager.getCurrentConfiguration();
    const currentStrategy = strategies.find(s => s.strategy === currentConfig.strategy);
    if (currentStrategy) {
      console.log(`\n📌 Current: ${currentStrategy.name} (${currentConfig.percentage}%)`);
    }

    // Allow direct strategy input or selection
    console.log('\nOptions:');
    strategies.forEach((strategy, index) => {
      console.log(`  ${index + 1}. ${strategy.name}`);
    });
    console.log('  c. Compare strategies');
    console.log('  r. Reset to defaults');

    const input = await this.promptForInput('Enter choice (1-3, c, r)');
    
    if (!input) {
      result.cancelled = true;
      return result;
    }

    // Handle special commands
    if (input.toLowerCase() === 'c') {
      await this.displayStrategyComparison(strategies);
      return await this.handleExpertModeSelection(strategies, result, options);
    }

    if (input.toLowerCase() === 'r') {
      const defaultConfig = this.feeManager.resetToDefaults();
      result.selectedStrategy = defaultConfig.strategy;
      result.selectedPercentage = defaultConfig.percentage;
      console.log('\n✅ Reset to default configuration');
      return result;
    }

    // Handle numeric selection
    const choice = parseInt(input);
    if (isNaN(choice) || choice < 1 || choice > strategies.length) {
      console.log('❌ Invalid selection. Please try again.');
      return await this.handleExpertModeSelection(strategies, result, options);
    }

    const selectedStrategy = strategies[choice - 1];
    result.selectedStrategy = selectedStrategy.strategy;
    result.selectedPercentage = selectedStrategy.defaultPercentage;

    console.log(`\n✅ Selected: ${selectedStrategy.name}`);
    
    return result;
  }

  /**
   * Handle percentage configuration for custom strategy
   */
  private async handlePercentageConfiguration(strategy: FeeStrategy): Promise<{ percentage: number; cancelled: boolean }> {
    console.log('\n🎛️  Custom Percentage Configuration:');
    
    const strategyConfig = this.feeManager.getStrategyConfig(strategy);
    if (strategyConfig) {
      console.log(`Range: ${strategyConfig.percentageRange.min}%-${strategyConfig.percentageRange.max}%`);
    }

    while (true) {
      const input = await this.promptForInput('Enter fee percentage (1-99)');
      
      if (!input) {
        return { percentage: 0, cancelled: true };
      }

      const percentage = parseFloat(input);
      
      if (isNaN(percentage)) {
        console.log('❌ Please enter a valid number.');
        continue;
      }

      // Validate percentage
      const validation = this.feeManager.validatePercentage(percentage, strategy);
      
      if (!validation.isValid) {
        console.log(`❌ ${validation.errors.join(', ')}`);
        if (validation.suggestions.length > 0) {
          console.log(`💡 Suggestions: ${validation.suggestions.join(', ')}`);
        }
        continue;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.log(`⚠️  ${validation.warnings.join(', ')}`);
      }

      // Show preview with new percentage
      const preview = await this.feeManager.generatePreview(1000, 1000);
      console.log(`\n📊 Preview with ${percentage}%:`);
      this.displayPreview(preview);

      // Confirm in normal/expert modes
      if (this.uxMode === UXMode.NORMAL || this.uxMode === UXMode.EXPERT) {
        const confirm = await this.promptForConfirmation('Use this percentage?');
        if (!confirm) {
          continue;
        }
      }

      return { percentage, cancelled: false };
    }
  }

  /**
   * Display fee preview
   */
  private displayPreview(preview: FormattedFeePreview): void {
    console.log('\n💰 Fee Preview (sample $1000 each):');
    console.log(`   Token Fee:  ${preview.formattedTokenFee}`);
    console.log(`   Paired Fee: ${preview.formattedPairedFee}`);
    console.log(`   Total Fees: ${preview.formattedTotalFees} (${preview.percentageDisplay})`);
    console.log(`   Strategy:   ${preview.strategyDisplay}`);
  }

  /**
   * Display final configuration
   */
  private async displayFinalConfiguration(configuration: FeeConfiguration): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Fee Configuration Applied Successfully!');
    console.log('='.repeat(60));
    
    const strategyConfig = this.feeManager.getStrategyConfig(configuration.strategy);
    console.log(`Strategy: ${strategyConfig?.name || configuration.strategy}`);
    console.log(`Percentage: ${configuration.percentage}%`);
    console.log(`Applies to: ${configuration.appliesTo.join(', ')}`);
    
    // Show final preview
    const preview = await this.feeManager.generatePreview();
    this.displayPreview(preview);
    
    console.log('\n🎉 Configuration is now active for all deployments.');
  }

  /**
   * Generate preview for a specific strategy
   */
  private async generateStrategyPreview(strategy: FeeStrategyConfig): Promise<FormattedFeePreview> {
    const tempManager = new UnifiedFeeManager();
    await tempManager.configureFee(strategy.defaultPercentage, strategy.strategy);
    return await tempManager.generatePreview(1000, 1000);
  }

  /**
   * Display strategy comparison
   */
  private async displayStrategyComparison(strategies: FeeStrategyConfig[]): Promise<void> {
    console.log('\n📊 Detailed Strategy Comparison:');
    console.log('='.repeat(80));
    
    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const comparison = this.feeManager.compareStrategies(
          strategies[i].strategy,
          strategies[i].defaultPercentage,
          strategies[j].strategy,
          strategies[j].defaultPercentage
        );
        
        console.log(`\n${strategies[i].name} vs ${strategies[j].name}:`);
        console.log(`  ${comparison.reasoning}`);
        console.log(`  Difference: $${Math.abs(comparison.difference).toFixed(2)}`);
        console.log(`  Recommendation: ${comparison.recommendation === 'strategy1' ? strategies[i].name : 
                                        comparison.recommendation === 'strategy2' ? strategies[j].name : 
                                        'Both are equivalent'}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    await this.promptForInput('Press Enter to continue');
  }

  /**
   * Prompt for user choice
   */
  private async promptForChoice(message: string, maxChoice: number, defaultChoice?: number): Promise<number | null> {
    const defaultText = defaultChoice ? ` (default: ${defaultChoice})` : '';
    const input = await this.promptForInput(`${message}${defaultText}`);
    
    if (!input && defaultChoice) {
      return defaultChoice;
    }
    
    if (!input) {
      return null;
    }

    const choice = parseInt(input);
    if (isNaN(choice) || choice < 1 || choice > maxChoice) {
      console.log(`❌ Please enter a number between 1 and ${maxChoice}.`);
      return await this.promptForChoice(message, maxChoice, defaultChoice);
    }

    return choice;
  }

  /**
   * Prompt for user input
   */
  private async promptForInput(message: string): Promise<string | null> {
    // In a real implementation, this would use a proper input library like inquirer
    // For now, we'll simulate the interaction
    console.log(`\n${message}: `);
    
    // Simulate user input based on UX mode
    switch (this.uxMode) {
      case UXMode.ULTRA:
        return ''; // Auto-confirm
      case UXMode.FAST:
        return '2'; // Default to option 2 (Flat strategy)
      default:
        return '2'; // Simulate user selecting option 2
    }
  }

  /**
   * Prompt for confirmation
   */
  private async promptForConfirmation(message: string): Promise<boolean> {
    const input = await this.promptForInput(`${message} (y/N)`);
    return input?.toLowerCase().startsWith('y') || false;
  }

  /**
   * Update UX mode
   */
  setUXMode(mode: UXMode): void {
    this.uxMode = mode;
  }

  /**
   * Get current UX mode
   */
  getUXMode(): UXMode {
    return this.uxMode;
  }
}