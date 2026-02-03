/**
 * Spoofing CLI Module
 * 
 * Command-line interface for spoofing operations with specialized commands
 * for automated deployment, reward claiming, and stealth features.
 */

import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { Deployer } from '../deployer/deployer.js';
import { SpoofingService, type SpoofingDeploymentResult } from '../services/spoofing-service.js';
import { SpoofingConfigManager, loadSpoofingConfigFromEnv } from '../config/spoofing-config.js';
import { FeeConfigManager, loadFeeConfigFromEnv } from '../config/fee-config.js';
import type { TokenInfo } from './index.js';

// Spoofing menu options
const SPOOFING_MENU_OPTIONS = [
  { name: `${chalk.red('[1]')} 🎯 Single Spoofed Deploy`, value: 'single_spoof' },
  { name: `${chalk.red('[2]')} 🚀 Batch Spoofed Deploy`, value: 'batch_spoof' },
  { name: `${chalk.yellow('[3]')} 💰 Auto-Claim All Rewards`, value: 'auto_claim' },
  { name: `${chalk.cyan('[4]')} ⚙️  Spoofing Configuration`, value: 'config' },
  { name: `${chalk.magenta('[5]')} 💰 Fee Configuration`, value: 'fees' },
  { name: `${chalk.green('[6]')} 📊 Spoofing Statistics`, value: 'stats' },
  { name: chalk.gray('---'), value: 'separator', disabled: true },
  { name: `${chalk.yellow('[<]')} Back to Main Menu`, value: 'back' },
];

export class SpoofingCLI {
  private spoofingService: SpoofingService;
  private configManager: SpoofingConfigManager;
  private feeConfigManager: FeeConfigManager;
  
  constructor(deployer: Deployer) {
    this.configManager = new SpoofingConfigManager(loadSpoofingConfigFromEnv());
    this.feeConfigManager = new FeeConfigManager(loadFeeConfigFromEnv());
    this.spoofingService = new SpoofingService(deployer, this.configManager);
  }
  
  /**
   * Show spoofing main menu
   */
  async showSpoofingMenu(): Promise<void> {
    let running = true;
    
    while (running) {
      console.log('');
      console.log(chalk.red.bold('  🎯 SPOOFING OPERATIONS'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      console.log(chalk.yellow('  ⚠️  Advanced features for experienced users'));
      console.log('');
      
      const action = await select({
        message: 'Select spoofing operation:',
        choices: SPOOFING_MENU_OPTIONS.filter((o) => o.value !== 'separator'),
      });
      
      switch (action) {
        case 'single_spoof':
          await this.handleSingleSpoofedDeploy();
          break;
        case 'batch_spoof':
          await this.handleBatchSpoofedDeploy();
          break;
        case 'auto_claim':
          await this.handleAutoClaimRewards();
          break;
        case 'config':
          await this.handleSpoofingConfiguration();
          break;
        case 'fees':
          await this.handleFeeConfiguration();
          break;
        case 'stats':
          await this.handleSpoofingStatistics();
          break;
        case 'back':
          running = false;
          break;
      }
    }
  }
  
  /**
   * Handle single spoofed deployment
   */
  private async handleSingleSpoofedDeploy(): Promise<void> {
    console.log('');
    console.log(chalk.red.bold('  🎯 SINGLE SPOOFED DEPLOY'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(chalk.yellow('  Optimized for maximum reward extraction'));
    console.log('');
    
    // Collect basic token info
    const tokenInfo = await this.collectSpoofedTokenInfo();
    if (!tokenInfo) return;
    
    // Show spoofing configuration
    this.showSpoofingConfig();
    
    // Confirm deployment
    const confirmed = await confirm({
      message: chalk.red('Deploy spoofed token? (99.9% rewards to admin)'),
      default: false,
    });
    
    if (!confirmed) {
      console.log(chalk.yellow('\n  [!] Deployment cancelled\n'));
      return;
    }
    
    // Deploy with spoofing optimization
    console.log('');
    console.log(chalk.cyan('  🚀 Deploying spoofed token...'));
    
    try {
      const result = await this.spoofingService.deploySpoofedToken(tokenInfo);
      
      if (result.success) {
        this.showSpoofedDeploymentSuccess(result);
      } else {
        this.showSpoofedDeploymentError(result.error || 'Unknown error');
      }
    } catch (error) {
      this.showSpoofedDeploymentError(error instanceof Error ? error.message : String(error));
    }
    
    await input({ message: 'Press Enter to continue...' });
  }
  
  /**
   * Handle batch spoofed deployment
   */
  private async handleBatchSpoofedDeploy(): Promise<void> {
    console.log('');
    console.log(chalk.red.bold('  🚀 BATCH SPOOFED DEPLOY'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(chalk.yellow('  Deploy multiple tokens with spoofing optimization'));
    console.log('');
    
    // Get number of tokens
    const countInput = await input({
      message: 'Number of tokens to deploy:',
      default: '5',
      validate: (v) => {
        const n = Number(v);
        return (n >= 1 && n <= 100) || 'Must be 1-100 tokens';
      },
    });
    
    const tokenCount = Number(countInput);
    
    // Collect base token info
    const baseTokenInfo = await this.collectSpoofedTokenInfo();
    if (!baseTokenInfo) return;
    
    // Generate variations
    const tokens: TokenInfo[] = [];
    for (let i = 0; i < tokenCount; i++) {
      tokens.push({
        ...baseTokenInfo,
        name: `${baseTokenInfo.name} #${i + 1}`,
        symbol: `${baseTokenInfo.symbol}${i + 1}`,
      });
    }
    
    // Show batch configuration
    console.log('');
    console.log(chalk.cyan('  BATCH CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Tokens:')}           ${tokenCount}`);
    console.log(`  ${chalk.gray('Reward Split:')}     99.9% Admin / 0.1% Recipient`);
    console.log(`  ${chalk.gray('Stealth Mode:')}     ${this.configManager.isStealthModeEnabled() ? 'Enabled' : 'Disabled'}`);
    console.log(`  ${chalk.gray('Auto-Claim:')}       ${this.configManager.getConfig().autoClaimRewards ? 'Enabled' : 'Disabled'}`);
    console.log('');
    
    // Confirm batch deployment
    const confirmed = await confirm({
      message: chalk.red(`Deploy ${tokenCount} spoofed tokens?`),
      default: false,
    });
    
    if (!confirmed) {
      console.log(chalk.yellow('\n  [!] Batch deployment cancelled\n'));
      return;
    }
    
    // Deploy batch with progress
    console.log('');
    console.log(chalk.cyan('  🚀 Deploying batch...'));
    console.log('');
    
    try {
      const result = await this.spoofingService.deployBatchSpoofed(tokens, {
        onProgress: (completed, total) => {
          const percentage = Math.round((completed / total) * 100);
          process.stdout.write(`\r  Progress: ${completed}/${total} (${percentage}%)`);
        },
      });
      
      console.log('\n');
      this.showBatchSpoofingResults(result);
      
    } catch (error) {
      console.log('\n');
      this.showSpoofedDeploymentError(error instanceof Error ? error.message : String(error));
    }
    
    await input({ message: 'Press Enter to continue...' });
  }
  
  /**
   * Handle auto-claim rewards
   */
  private async handleAutoClaimRewards(): Promise<void> {
    console.log('');
    console.log(chalk.yellow.bold('  💰 AUTO-CLAIM REWARDS'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const stats = this.spoofingService.getSpoofingStats();
    
    if (stats.totalDeployedTokens === 0) {
      console.log(chalk.yellow('  No deployed tokens found for reward claiming.'));
      console.log(chalk.gray('  Deploy some tokens first using spoofed deployment.\n'));
      await input({ message: 'Press Enter to continue...' });
      return;
    }
    
    console.log(`  ${chalk.gray('Deployed Tokens:')} ${stats.totalDeployedTokens}`);
    console.log('');
    
    const confirmed = await confirm({
      message: `Claim rewards from ${stats.totalDeployedTokens} tokens?`,
      default: true,
    });
    
    if (!confirmed) {
      console.log(chalk.yellow('\n  [!] Auto-claim cancelled\n'));
      return;
    }
    
    console.log('');
    console.log(chalk.cyan('  💰 Claiming rewards...'));
    
    try {
      const result = await this.spoofingService.autoClaimAllRewards();
      
      console.log('');
      console.log(chalk.green.bold('  ✅ REWARDS CLAIMED'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      console.log(`  ${chalk.gray('Successful Claims:')} ${chalk.green(result.successfulClaims)}`);
      console.log(`  ${chalk.gray('Failed Claims:')}     ${chalk.red(result.failedClaims)}`);
      console.log(`  ${chalk.gray('Total Claimed:')}     ${chalk.green('Check wallet for amounts')}`);
      console.log('');
      
    } catch (error) {
      this.showSpoofedDeploymentError(error instanceof Error ? error.message : String(error));
    }
    
    await input({ message: 'Press Enter to continue...' });
  }
  
  /**
   * Handle spoofing configuration
   */
  private async handleSpoofingConfiguration(): Promise<void> {
    console.log('');
    console.log(chalk.cyan.bold('  ⚙️  SPOOFING CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const config = this.configManager.getConfig();
    
    // Show current configuration
    console.log(chalk.cyan('  CURRENT CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Admin Reward:')}        ${config.adminRewardPercentage}%`);
    console.log(`  ${chalk.gray('Recipient Reward:')}    ${config.recipientRewardPercentage}%`);
    console.log(`  ${chalk.gray('Stealth Mode:')}        ${config.enableStealthMode ? 'Enabled' : 'Disabled'}`);
    console.log(`  ${chalk.gray('Randomize Timing:')}    ${config.randomizeDeploymentTiming ? 'Enabled' : 'Disabled'}`);
    console.log(`  ${chalk.gray('Randomize Metadata:')}  ${config.useRandomizedMetadata ? 'Enabled' : 'Disabled'}`);
    console.log(`  ${chalk.gray('Auto-Claim:')}          ${config.autoClaimRewards ? 'Enabled' : 'Disabled'}`);
    console.log(`  ${chalk.gray('Max Concurrent:')}      ${config.maxConcurrentDeployments}`);
    console.log(`  ${chalk.gray('Deployment Interval:')} ${config.deploymentInterval}ms`);
    console.log('');
    
    // Configuration options
    const configAction = await select({
      message: 'Configuration option:',
      choices: [
        { name: 'Modify Reward Distribution', value: 'rewards' },
        { name: 'Toggle Stealth Features', value: 'stealth' },
        { name: 'Adjust Performance Settings', value: 'performance' },
        { name: 'Reset to Defaults', value: 'reset' },
        { name: 'Back', value: 'back' },
      ],
    });
    
    switch (configAction) {
      case 'rewards':
        await this.configureRewardDistribution();
        break;
      case 'stealth':
        await this.configureStealthFeatures();
        break;
      case 'performance':
        await this.configurePerformanceSettings();
        break;
      case 'reset':
        await this.resetConfiguration();
        break;
    }
  }
  
  /**
   * Handle spoofing statistics
   */
  private async handleSpoofingStatistics(): Promise<void> {
    console.log('');
    console.log(chalk.green.bold('  📊 SPOOFING STATISTICS'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const stats = this.spoofingService.getSpoofingStats();
    
    console.log(chalk.cyan('  DEPLOYMENT STATISTICS'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Total Deployed:')}      ${stats.totalDeployedTokens}`);
    console.log(`  ${chalk.gray('Stealth Mode:')}        ${stats.stealthModeEnabled ? 'Active' : 'Inactive'}`);
    console.log('');
    
    if (stats.deployedTokenAddresses.length > 0) {
      console.log(chalk.cyan('  DEPLOYED TOKENS'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      
      stats.deployedTokenAddresses.slice(0, 10).forEach((address, i) => {
        console.log(`  ${chalk.gray(`[${i + 1}]`)} ${address}`);
      });
      
      if (stats.deployedTokenAddresses.length > 10) {
        console.log(`  ${chalk.gray('...')} and ${stats.deployedTokenAddresses.length - 10} more`);
      }
      console.log('');
    }
    
    console.log(chalk.cyan('  CONFIGURATION SUMMARY'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Admin Reward:')}        ${stats.currentConfig.adminRewardPercentage}%`);
    console.log(`  ${chalk.gray('Auto-Claim:')}          ${stats.currentConfig.autoClaimRewards ? 'Enabled' : 'Disabled'}`);
    console.log(`  ${chalk.gray('Batch Optimization:')}  ${stats.currentConfig.batchOptimization ? 'Enabled' : 'Disabled'}`);
    console.log('');
    
    await input({ message: 'Press Enter to continue...' });
  }
  
  /**
   * Configure reward distribution
   */
  private async configureRewardDistribution(): Promise<void> {
    console.log('');
    console.log(chalk.yellow.bold('  💰 REWARD DISTRIBUTION CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const config = this.configManager.getConfig();
    
    console.log(chalk.yellow('  Current Distribution:'));
    console.log(`  ${chalk.gray('Admin Token:')}         ${config.adminRewardPercentage}%`);
    console.log(`  ${chalk.gray('Reward Recipient:')}    ${config.recipientRewardPercentage}%`);
    console.log('');
    
    const distributionChoice = await select({
      message: 'Select reward distribution strategy:',
      choices: [
        { 
          name: `${chalk.green('✅')} Standard (Admin: 0.1%, Recipient: 99.9%)`, 
          value: 'standard',
          description: 'Recommended for most operations'
        },
        { 
          name: `${chalk.blue('⚖️')} Balanced (Admin: 50%, Recipient: 50%)`, 
          value: 'balanced',
          description: 'Equal distribution'
        },
        { 
          name: `${chalk.red('🎯')} Admin Focused (Admin: 99.9%, Recipient: 0.1%)`, 
          value: 'admin_focused',
          description: 'Maximum admin rewards'
        },
        { 
          name: `${chalk.cyan('⚙️')} Custom Distribution`, 
          value: 'custom',
          description: 'Set custom percentages'
        },
        { 
          name: chalk.gray('Back'), 
          value: 'back' 
        },
      ],
    });
    
    let adminReward = config.adminRewardPercentage;
    let recipientReward = config.recipientRewardPercentage;
    
    switch (distributionChoice) {
      case 'standard':
        adminReward = 0.1;
        recipientReward = 99.9;
        break;
      case 'balanced':
        adminReward = 50;
        recipientReward = 50;
        break;
      case 'admin_focused':
        adminReward = 99.9;
        recipientReward = 0.1;
        break;
      case 'custom':
        const adminInput = await input({
          message: 'Enter admin reward percentage (0-100):',
          default: config.adminRewardPercentage.toString(),
          validate: (value) => {
            const num = Number(value);
            if (isNaN(num) || num < 0 || num > 100) {
              return 'Please enter a valid percentage between 0 and 100';
            }
            return true;
          },
        });
        
        adminReward = Number(adminInput);
        recipientReward = 100 - adminReward;
        
        console.log('');
        console.log(chalk.yellow('  Calculated Distribution:'));
        console.log(`  ${chalk.gray('Admin Token:')}         ${adminReward}%`);
        console.log(`  ${chalk.gray('Reward Recipient:')}    ${recipientReward}%`);
        console.log('');
        
        const confirmCustom = await confirm({
          message: 'Confirm this distribution?',
          default: true,
        });
        
        if (!confirmCustom) {
          return;
        }
        break;
      case 'back':
        return;
    }
    
    // Update configuration
    this.configManager.updateConfig({
      adminRewardPercentage: adminReward,
      recipientRewardPercentage: recipientReward,
    });
    
    console.log('');
    console.log(chalk.green('  ✅ Reward distribution updated successfully!'));
    console.log('');
    console.log(chalk.cyan('  New Distribution:'));
    console.log(`  ${chalk.gray('Admin Token:')}         ${adminReward}%`);
    console.log(`  ${chalk.gray('Reward Recipient:')}    ${recipientReward}%`);
    console.log('');
    
    // Save to environment variables (optional)
    const saveToEnv = await confirm({
      message: 'Save configuration to .env file?',
      default: false,
    });
    
    if (saveToEnv) {
      await this.saveConfigurationToEnv();
    }
    
    await input({ message: 'Press Enter to continue...' });
  }
  
  /**
   * Configure stealth features
   */
  private async configureStealthFeatures(): Promise<void> {
    console.log('');
    console.log(chalk.magenta.bold('  🥷 STEALTH FEATURES CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const config = this.configManager.getConfig();
    
    const stealthMode = await confirm({
      message: 'Enable stealth mode?',
      default: config.enableStealthMode,
    });
    
    const randomizeTiming = await confirm({
      message: 'Randomize deployment timing?',
      default: config.randomizeDeploymentTiming,
    });
    
    const randomizeMetadata = await confirm({
      message: 'Randomize metadata?',
      default: config.useRandomizedMetadata,
    });
    
    const autoClaimRewards = await confirm({
      message: 'Auto-claim rewards?',
      default: config.autoClaimRewards,
    });
    
    // Update configuration
    this.configManager.updateConfig({
      enableStealthMode: stealthMode,
      randomizeDeploymentTiming: randomizeTiming,
      useRandomizedMetadata: randomizeMetadata,
      autoClaimRewards: autoClaimRewards,
    });
    
    console.log('');
    console.log(chalk.green('  ✅ Stealth features updated successfully!'));
    console.log('');
    
    await input({ message: 'Press Enter to continue...' });
  }
  
  /**
   * Configure performance settings
   */
  private async configurePerformanceSettings(): Promise<void> {
    console.log('');
    console.log(chalk.blue.bold('  ⚡ PERFORMANCE SETTINGS'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const config = this.configManager.getConfig();
    
    const maxConcurrent = await input({
      message: 'Maximum concurrent deployments:',
      default: config.maxConcurrentDeployments.toString(),
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 20) {
          return 'Please enter a number between 1 and 20';
        }
        return true;
      },
    });
    
    const deploymentInterval = await input({
      message: 'Deployment interval (milliseconds):',
      default: config.deploymentInterval.toString(),
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 100) {
          return 'Please enter a number greater than 100';
        }
        return true;
      },
    });
    
    const retryAttempts = await input({
      message: 'Retry attempts:',
      default: config.retryAttempts.toString(),
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 10) {
          return 'Please enter a number between 1 and 10';
        }
        return true;
      },
    });
    
    // Update configuration
    this.configManager.updateConfig({
      maxConcurrentDeployments: Number(maxConcurrent),
      deploymentInterval: Number(deploymentInterval),
      retryAttempts: Number(retryAttempts),
    });
    
    console.log('');
    console.log(chalk.green('  ✅ Performance settings updated successfully!'));
    console.log('');
    
    await input({ message: 'Press Enter to continue...' });
  }
  
  /**
   * Reset configuration to defaults
   */
  private async resetConfiguration(): Promise<void> {
    console.log('');
    console.log(chalk.red.bold('  🔄 RESET CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const confirmReset = await confirm({
      message: 'Reset all spoofing configuration to defaults?',
      default: false,
    });
    
    if (confirmReset) {
      this.configManager = new SpoofingConfigManager();
      
      console.log('');
      console.log(chalk.green('  ✅ Configuration reset to defaults!'));
      console.log('');
      
      // Show new configuration
      const config = this.configManager.getConfig();
      console.log(chalk.cyan('  Default Configuration:'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      console.log(`  ${chalk.gray('Admin Reward:')}        ${config.adminRewardPercentage}%`);
      console.log(`  ${chalk.gray('Recipient Reward:')}    ${config.recipientRewardPercentage}%`);
      console.log(`  ${chalk.gray('Stealth Mode:')}        ${config.enableStealthMode ? 'Enabled' : 'Disabled'}`);
      console.log('');
    }
    
    await input({ message: 'Press Enter to continue...' });
  }
  
  /**
   * Save configuration to .env file
   */
  private async saveConfigurationToEnv(): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      const envPath = '.env';
      
      // Read existing .env file
      let envContent = '';
      try {
        envContent = fs.readFileSync(envPath, 'utf8');
      } catch (error) {
        // File doesn't exist, create new
      }
      
      // Update or add spoofing configuration
      const spoofingVars = [
        `SPOOFING_ADMIN_REWARD=${config.adminRewardPercentage}`,
        `SPOOFING_RECIPIENT_REWARD=${config.recipientRewardPercentage}`,
        `SPOOFING_STEALTH_MODE=${config.enableStealthMode}`,
        `SPOOFING_RANDOMIZE_TIMING=${config.randomizeDeploymentTiming}`,
        `SPOOFING_RANDOMIZE_METADATA=${config.useRandomizedMetadata}`,
        `SPOOFING_AUTO_CLAIM=${config.autoClaimRewards}`,
        `SPOOFING_MAX_CONCURRENT=${config.maxConcurrentDeployments}`,
        `SPOOFING_INTERVAL=${config.deploymentInterval}`,
      ];
      
      // Remove existing spoofing variables
      const lines = envContent.split('\n');
      const filteredLines = lines.filter(line => 
        !line.startsWith('SPOOFING_') || line.trim() === ''
      );
      
      // Add updated spoofing variables
      const updatedContent = [
        ...filteredLines,
        '',
        '# Spoofing Configuration (Updated via CLI)',
        ...spoofingVars,
        ''
      ].join('\n');
      
      fs.writeFileSync(envPath, updatedContent);
      
      console.log(chalk.green('  ✅ Configuration saved to .env file!'));
    } catch (error) {
      console.log(chalk.red('  ❌ Failed to save configuration to .env file'));
      console.log(chalk.gray(`     Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  /**
   * Handle fee configuration
   */
  private async handleFeeConfiguration(): Promise<void> {
    console.log('');
    console.log(chalk.magenta.bold('  💰 FEE CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const feeConfig = this.feeConfigManager.getConfig();
    
    // Show current fee configuration
    console.log(chalk.magenta('  CURRENT FEE CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Fee Strategy:')}       ${chalk.cyan(feeConfig.feeType.toUpperCase())}`);
    console.log(`  ${chalk.gray('Description:')}        ${this.feeConfigManager.getFeeStrategyDescription()}`);
    
    const currentFees = this.feeConfigManager.getCurrentFees();
    console.log(`  ${chalk.gray('Current Token Fee:')}    ${chalk.yellow(currentFees.tokenFee + '%')}`);
    console.log(`  ${chalk.gray('Current WETH Fee:')}     ${chalk.yellow(currentFees.pairedFee + '%')} (same as token)`);
    console.log('');
    
    // Fee preview
    const preview = this.feeConfigManager.getFeePreview(1000);
    console.log(chalk.magenta('  FEE PREVIEW (for $1,000 trading volume)'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Token Fee:')}           $${preview.tokenAmount.toFixed(2)} (${preview.tokenFee}%)`);
    console.log(`  ${chalk.gray('WETH Fee:')}            $${preview.pairedAmount.toFixed(2)} (${preview.pairedFee}%)`);
    console.log(`  ${chalk.gray('Total Fees:')}          $${preview.totalFees.toFixed(2)}`);
    console.log(`  ${chalk.gray('Note:')}                Both Token and WETH use the same fee percentage`);
    console.log('');
    
    // Configuration options
    const feeAction = await select({
      message: 'Fee configuration option:',
      choices: [
        { name: '🔄 Change Fee Strategy', value: 'strategy' },
        { name: '⚙️ Configure Dynamic Fees', value: 'dynamic' },
        { name: '📊 Configure Flat Fee', value: 'flat' },
        { name: '🎯 Configure Custom Fee', value: 'custom' },
        { name: '📈 Fee Preview Calculator', value: 'preview' },
        { name: '🔄 Reset to Defaults', value: 'reset' },
        { name: 'Back', value: 'back' },
      ],
    });
    
    switch (feeAction) {
      case 'strategy':
        await this.configureFeeStrategy();
        break;
      case 'dynamic':
        await this.configureDynamicFees();
        break;
      case 'flat':
        await this.configureFlatFee();
        break;
      case 'custom':
        await this.configureCustomFee();
        break;
      case 'preview':
        await this.showFeePreviewCalculator();
        break;
      case 'reset':
        await this.resetFeeConfiguration();
        break;
    }
  }

  /**
   * Configure fee strategy
   */
  private async configureFeeStrategy(): Promise<void> {
    console.log('');
    console.log(chalk.yellow.bold('  🔄 FEE STRATEGY CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const strategyChoice = await select({
      message: 'Select fee strategy:',
      choices: [
        { 
          name: `${chalk.green('📈')} Dynamic Fees (1-5% based on volatility)`, 
          value: 'dynamic',
          description: 'Same percentage for both Token and WETH'
        },
        { 
          name: `${chalk.blue('📊')} Flat Fee (3% fixed)`, 
          value: 'flat',
          description: 'Same percentage for both Token and WETH'
        },
        { 
          name: `${chalk.cyan('🎯')} Custom Fee (1-99% manual)`, 
          value: 'custom',
          description: 'Same percentage for both Token and WETH'
        },
        { 
          name: chalk.gray('Back'), 
          value: 'back' 
        },
      ],
    });
    
    if (strategyChoice === 'back') return;
    
    this.feeConfigManager.updateConfig({
      feeType: strategyChoice as 'dynamic' | 'flat' | 'custom',
    });
    
    console.log('');
    console.log(chalk.green(`  ✅ Fee strategy updated to: ${strategyChoice.toUpperCase()}`));
    console.log(`  ${chalk.gray('Description:')} ${this.feeConfigManager.getFeeStrategyDescription()}`);
    console.log('');
    
    // Show new fees
    const newFees = this.feeConfigManager.getCurrentFees();
    console.log(chalk.cyan('  New Fee Structure:'));
    console.log(`  ${chalk.gray('Token Fee:')}  ${chalk.yellow(newFees.tokenFee + '%')}`);
    console.log(`  ${chalk.gray('WETH Fee:')}   ${chalk.yellow(newFees.pairedFee + '%')} (same as token)`);
    console.log('');
    
    await this.promptSaveFeeConfig();
    await input({ message: 'Press Enter to continue...' });
  }

  /**
   * Configure dynamic fees
   */
  private async configureDynamicFees(): Promise<void> {
    console.log('');
    console.log(chalk.green.bold('  📈 DYNAMIC FEES CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const config = this.feeConfigManager.getConfig();
    
    const baseFee = await input({
      message: 'Base fee percentage (minimum, 0.1-10%):',
      default: config.dynamicBaseFee.toString(),
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 0.1 || num > 10) {
          return 'Please enter a valid percentage between 0.1 and 10';
        }
        return true;
      },
    });
    
    const maxFee = await input({
      message: 'Maximum fee percentage (0.1-20%):',
      default: config.dynamicMaxFee.toString(),
      validate: (value) => {
        const num = Number(value);
        const baseNum = Number(baseFee);
        if (isNaN(num) || num < baseNum || num > 20) {
          return `Please enter a valid percentage between ${baseNum} and 20`;
        }
        return true;
      },
    });
    
    const volatilityThreshold = await input({
      message: 'Volatility threshold (0.01-1.0):',
      default: config.volatilityThreshold.toString(),
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 0.01 || num > 1.0) {
          return 'Please enter a valid threshold between 0.01 and 1.0';
        }
        return true;
      },
    });
    
    // Update configuration
    this.feeConfigManager.updateConfig({
      feeType: 'dynamic',
      dynamicBaseFee: Number(baseFee),
      dynamicMaxFee: Number(maxFee),
      volatilityThreshold: Number(volatilityThreshold),
    });
    
    console.log('');
    console.log(chalk.green('  ✅ Dynamic fees configuration updated!'));
    console.log('');
    console.log(chalk.cyan('  New Dynamic Fee Settings:'));
    console.log(`  ${chalk.gray('Base Fee:')}            ${baseFee}%`);
    console.log(`  ${chalk.gray('Maximum Fee:')}         ${maxFee}%`);
    console.log(`  ${chalk.gray('Volatility Threshold:')} ${volatilityThreshold}`);
    console.log('');
    
    await this.promptSaveFeeConfig();
    await input({ message: 'Press Enter to continue...' });
  }

  /**
   * Configure flat fee
   */
  private async configureFlatFee(): Promise<void> {
    console.log('');
    console.log(chalk.blue.bold('  📊 FLAT FEE CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const config = this.feeConfigManager.getConfig();
    
    const flatFee = await input({
      message: 'Flat fee percentage (0.1-50%):',
      default: config.flatFeePercentage.toString(),
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 0.1 || num > 50) {
          return 'Please enter a valid percentage between 0.1 and 50';
        }
        return true;
      },
    });
    
    // Update configuration
    this.feeConfigManager.updateConfig({
      feeType: 'flat',
      flatFeePercentage: Number(flatFee),
    });
    
    console.log('');
    console.log(chalk.green('  ✅ Flat fee configuration updated!'));
    console.log('');
    console.log(chalk.cyan('  New Flat Fee Settings:'));
    console.log(`  ${chalk.gray('Fee Percentage:')} ${flatFee}% (applies to both Token and WETH)`);
    console.log('');
    
    await this.promptSaveFeeConfig();
    await input({ message: 'Press Enter to continue...' });
  }

  /**
   * Configure custom fee (same for both tokens)
   */
  private async configureCustomFee(): Promise<void> {
    console.log('');
    console.log(chalk.cyan.bold('  🎯 CUSTOM FEE CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const config = this.feeConfigManager.getConfig();
    
    console.log(chalk.cyan('  Current Custom Fee:'));
    console.log(`  ${chalk.gray('Fee Percentage:')} ${config.customFeePercentage}% (applies to both Token and WETH)`);
    console.log('');
    
    const customFee = await input({
      message: 'Fee percentage for both Token and WETH (1-99%):',
      default: config.customFeePercentage.toString(),
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 99) {
          return 'Please enter a valid percentage between 1 and 99';
        }
        return true;
      },
    });
    
    // Update configuration
    this.feeConfigManager.updateConfig({
      feeType: 'custom',
      customFeePercentage: Number(customFee),
    });
    
    console.log('');
    console.log(chalk.green('  ✅ Custom fee configuration updated!'));
    console.log('');
    console.log(chalk.cyan('  New Custom Fee Settings:'));
    console.log(`  ${chalk.gray('Token Fee:')}  ${customFee}%`);
    console.log(`  ${chalk.gray('WETH Fee:')}   ${customFee}% (same as token)`);
    console.log(`  ${chalk.gray('Note:')}       Both tokens use the same fee percentage`);
    console.log('');
    
    await this.promptSaveFeeConfig();
    await input({ message: 'Press Enter to continue...' });
  }

  /**
   * Show fee preview calculator
   */
  private async showFeePreviewCalculator(): Promise<void> {
    console.log('');
    console.log(chalk.magenta.bold('  📈 FEE PREVIEW CALCULATOR'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const amount = await input({
      message: 'Enter trading volume amount ($):',
      default: '1000',
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a valid positive number';
        }
        return true;
      },
    });
    
    const preview = this.feeConfigManager.getFeePreview(Number(amount));
    
    console.log('');
    console.log(chalk.cyan('  FEE CALCULATION RESULTS'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Trading Volume:')}      $${Number(amount).toLocaleString()}`);
    console.log(`  ${chalk.gray('Fee Strategy:')}        ${preview.strategy.toUpperCase()}`);
    console.log('');
    console.log(chalk.yellow('  Fee Breakdown:'));
    console.log(`  ${chalk.gray('Token Fee:')}          $${preview.tokenAmount.toFixed(2)} (${preview.tokenFee}%)`);
    console.log(`  ${chalk.gray('WETH Fee:')}           $${preview.pairedAmount.toFixed(2)} (${preview.pairedFee}%)`);
    console.log(`  ${chalk.gray('Total Fees:')}         $${preview.totalFees.toFixed(2)}`);
    console.log(`  ${chalk.gray('Remaining Amount:')}   $${(Number(amount) - preview.totalFees).toFixed(2)}`);
    console.log(`  ${chalk.gray('Note:')}               Both tokens use the same fee percentage`);
    console.log('');
    
    const calculateAnother = await confirm({
      message: 'Calculate fees for another amount?',
      default: false,
    });
    
    if (calculateAnother) {
      await this.showFeePreviewCalculator();
    } else {
      await input({ message: 'Press Enter to continue...' });
    }
  }

  /**
   * Reset fee configuration to defaults
   */
  private async resetFeeConfiguration(): Promise<void> {
    console.log('');
    console.log(chalk.red.bold('  🔄 RESET FEE CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log('');
    
    const confirmReset = await confirm({
      message: 'Reset all fee configuration to defaults?',
      default: false,
    });
    
    if (confirmReset) {
      this.feeConfigManager = new FeeConfigManager();
      
      console.log('');
      console.log(chalk.green('  ✅ Fee configuration reset to defaults!'));
      console.log('');
      
      // Show new configuration
      const config = this.feeConfigManager.getConfig();
      console.log(chalk.cyan('  Default Fee Configuration:'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      console.log(`  ${chalk.gray('Fee Strategy:')}       ${config.feeType.toUpperCase()}`);
      console.log(`  ${chalk.gray('Description:')}        ${this.feeConfigManager.getFeeStrategyDescription()}`);
      
      const fees = this.feeConfigManager.getCurrentFees();
      console.log(`  ${chalk.gray('Token Fee:')}         ${fees.tokenFee}%`);
      console.log(`  ${chalk.gray('WETH Fee:')}          ${fees.pairedFee}% (same as token)`);
      console.log('');
    }
    
    await input({ message: 'Press Enter to continue...' });
  }

  /**
   * Prompt to save fee configuration to .env
   */
  private async promptSaveFeeConfig(): Promise<void> {
    const saveToEnv = await confirm({
      message: 'Save fee configuration to .env file?',
      default: false,
    });
    
    if (saveToEnv) {
      await this.saveFeeConfigurationToEnv();
    }
  }

  /**
   * Save fee configuration to .env file
   */
  private async saveFeeConfigurationToEnv(): Promise<void> {
    try {
      const config = this.feeConfigManager.getConfig();
      const envPath = '.env';
      
      // Read existing .env file
      let envContent = '';
      try {
        envContent = fs.readFileSync(envPath, 'utf8');
      } catch (error) {
        // File doesn't exist, create new
      }
      
      // Update or add fee configuration
      const feeVars = [
        `FEE_TYPE=${config.feeType}`,
        `DYNAMIC_BASE_FEE=${config.dynamicBaseFee}`,
        `DYNAMIC_MAX_FEE=${config.dynamicMaxFee}`,
        `FLAT_FEE_PERCENTAGE=${config.flatFeePercentage}`,
        `CUSTOM_FEE_PERCENTAGE=${config.customFeePercentage}`,
        `VOLATILITY_THRESHOLD=${config.volatilityThreshold}`,
        `MINIMUM_FEE_AMOUNT=${config.minimumFeeAmount}`,
      ];
      
      // Remove existing fee variables
      const lines = envContent.split('\n');
      const filteredLines = lines.filter(line => 
        !line.startsWith('FEE_TYPE=') &&
        !line.startsWith('DYNAMIC_BASE_FEE=') &&
        !line.startsWith('DYNAMIC_MAX_FEE=') &&
        !line.startsWith('FLAT_FEE_PERCENTAGE=') &&
        !line.startsWith('CUSTOM_FEE_PERCENTAGE=') &&
        !line.startsWith('CUSTOM_CLANKER_FEE=') &&
        !line.startsWith('CUSTOM_PAIRED_FEE=') &&
        !line.startsWith('VOLATILITY_THRESHOLD=') &&
        !line.startsWith('MINIMUM_FEE_AMOUNT=') ||
        line.trim() === ''
      );
      
      // Add updated fee variables
      const updatedContent = [
        ...filteredLines,
        '',
        '# Fee Configuration (Updated via CLI)',
        ...feeVars,
        ''
      ].join('\n');
      
      fs.writeFileSync(envPath, updatedContent);
      
      console.log(chalk.green('  ✅ Fee configuration saved to .env file!'));
    } catch (error) {
      console.log(chalk.red('  ❌ Failed to save fee configuration to .env file'));
      console.log(chalk.gray(`     Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  /**
   * Collect spoofed token information
  private async collectSpoofedTokenInfo(): Promise<TokenInfo | null> {
    // Basic token info with spoofing-friendly defaults
    const name = await input({
      message: 'Token Name:',
      default: 'SpoofToken',
      validate: (v) => v.trim().length > 0 || 'Required',
    });
    
    const symbol = await input({
      message: 'Token Symbol:',
      default: 'SPOOF',
      validate: (v) => v.trim().length > 0 || 'Required',
    });
    
    const description = await input({
      message: 'Description:',
      default: `${name} - Optimized for maximum reward extraction`,
    });
    
    // Use environment defaults for other settings
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log(chalk.red('\n  Error: PRIVATE_KEY not set in environment\n'));
      return null;
    }
    
    return {
      name,
      symbol,
      description,
      image: '',
      chainId: Number(process.env.CHAIN_ID) || 8453,
      privateKey,
      website: '',
      farcaster: '',
      twitter: '',
      zora: '',
      instagram: '',
      tokenAdmin: '', // Will use deployer
      rewardRecipient: '', // Will use admin
      rewardToken: 'Both' as const,
      feeType: 'static' as const,
      clankerFee: 5,
      pairedFee: 5,
      mevBlockDelay: 8,
      interfaceName: 'UMKM Terminal',
      platformName: 'Clanker',
      vanityMode: 'off' as const,
    };
  }
  
  /**
   * Show spoofing configuration
   */
  private showSpoofingConfig(): void {
    const config = this.configManager.getConfig();
    
    console.log('');
    console.log(chalk.red.bold('  🎯 SPOOFING CONFIGURATION'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Admin Token:')}         ${chalk.yellow(config.adminRewardPercentage + '%')} (You)`);
    console.log(`  ${chalk.gray('Reward Recipient:')}    ${chalk.red(config.recipientRewardPercentage + '%')} (Target)`);
    console.log(`  ${chalk.gray('Stealth Mode:')}        ${config.enableStealthMode ? chalk.green('Enabled') : chalk.red('Disabled')}`);
    console.log(`  ${chalk.gray('Auto-Claim:')}          ${config.autoClaimRewards ? chalk.green('Enabled') : chalk.red('Disabled')}`);
    console.log('');
  }
  
  /**
   * Show spoofed deployment success
   */
  private showSpoofedDeploymentSuccess(result: SpoofingDeploymentResult): void {
    console.log('');
    console.log(chalk.green.bold('  ✅ SPOOFED TOKEN DEPLOYED'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Token Address:')}   ${chalk.green(result.tokenAddress)}`);
    console.log(`  ${chalk.gray('Transaction:')}     ${chalk.cyan(result.txHash)}`);
    console.log(`  ${chalk.gray('Rewards Claimed:')} ${result.rewardsClaimed ? chalk.green('Yes') : chalk.yellow('No')}`);
    console.log(`  ${chalk.gray('Deploy Time:')}     ${result.deploymentTime}ms`);
    console.log('');
    console.log(chalk.red('  🎯 99.9% of trading fees will go to reward recipient address!'));
    console.log('');
  }
  
  /**
   * Show spoofed deployment error
   */
  private showSpoofedDeploymentError(error: string): void {
    console.log('');
    console.log(chalk.red.bold('  ❌ SPOOFED DEPLOYMENT FAILED'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.red('Error:')} ${error}`);
    console.log('');
  }
  
  /**
   * Show batch spoofing results
   */
  private showBatchSpoofingResults(result: any): void {
    console.log(chalk.green.bold('  ✅ BATCH SPOOFING COMPLETE'));
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(`  ${chalk.gray('Total Deployments:')}    ${result.totalDeployments}`);
    console.log(`  ${chalk.gray('Successful:')}           ${chalk.green(result.successfulDeployments)}`);
    console.log(`  ${chalk.gray('Failed:')}               ${chalk.red(result.failedDeployments)}`);
    console.log(`  ${chalk.gray('Average Deploy Time:')}  ${Math.round(result.averageDeploymentTime)}ms`);
    console.log('');
    console.log(chalk.red('  🎯 All successful tokens configured for 99.9% admin rewards!'));
    console.log('');
  }
}