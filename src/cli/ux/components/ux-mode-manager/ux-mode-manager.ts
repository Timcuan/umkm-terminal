/**
 * UX Mode Manager Implementation
 * 
 * Manages different user experience modes and their associated interaction patterns.
 * Provides mode persistence, confirmation level management, and prompt filtering.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  UXMode,
  ConfirmationLevel,
  PromptType,
  UXModeManager as IUXModeManager,
  Result,
  createSuccessResult,
  createErrorResult,
  DEFAULT_CONFIRMATION_LEVELS,
  DEFAULT_UX_MODE
} from '../../index.js';

/**
 * Configuration file path for UX mode persistence
 */
const UX_MODE_CONFIG_PATH = path.join(os.homedir(), '.umkm-terminal-ux.json');

/**
 * UX Mode configuration interface
 */
interface UXModeConfig {
  currentMode: UXMode;
  lastUpdated: string;
  sessionOverride?: UXMode;
  environmentOverride?: UXMode;
}

/**
 * Default UX mode configuration
 */
const DEFAULT_UX_MODE_CONFIG: UXModeConfig = {
  currentMode: DEFAULT_UX_MODE,
  lastUpdated: new Date().toISOString()
};

/**
 * UX Mode Manager implementation
 * 
 * Handles UX mode selection, persistence, and interaction pattern management.
 * Supports environment variable overrides and session-specific modes.
 */
export class UXModeManager implements IUXModeManager {
  private currentMode: UXMode;
  private config: UXModeConfig;
  private confirmationLevels: Record<UXMode, ConfirmationLevel>;

  constructor() {
    this.currentMode = DEFAULT_UX_MODE;
    this.config = { ...DEFAULT_UX_MODE_CONFIG };
    this.confirmationLevels = { ...DEFAULT_CONFIRMATION_LEVELS } as Record<UXMode, ConfirmationLevel>;
    
    // Initialize with environment overrides
    this.initializeFromEnvironment();
  }

  /**
   * Initialize UX mode from environment variables and persisted config
   */
  private initializeFromEnvironment(): void {
    // Check for environment variable overrides
    const envMode = process.env.UX_MODE as UXMode;
    const envFastMode = process.env.FAST_MODE === 'true' || process.env.FAST_MODE === '1';
    const envAutoConfirm = process.env.AUTO_CONFIRM_TRANSACTIONS === 'true' || process.env.AUTO_CONFIRM_TRANSACTIONS === '1';
    const envExpertMode = process.env.EXPERT_MODE === 'true' || process.env.EXPERT_MODE === '1';

    // Log deprecation warnings for old parameters
    if (envFastMode && !envMode) {
      console.warn('[DEPRECATED] FAST_MODE is deprecated. Use UX_MODE=fast instead.');
    }
    if (envAutoConfirm && !envMode) {
      console.warn('[DEPRECATED] AUTO_CONFIRM_TRANSACTIONS is deprecated. Use UX_MODE=ultra instead.');
    }
    if (envExpertMode && !envMode) {
      console.warn('[DEPRECATED] EXPERT_MODE is deprecated. Use UX_MODE=expert instead.');
    }

    // Priority: UX_MODE > AUTO_CONFIRM_TRANSACTIONS > EXPERT_MODE > FAST_MODE
    if (envMode && this.isValidUXMode(envMode)) {
      this.config.environmentOverride = envMode;
      this.currentMode = envMode;
    } else if (envAutoConfirm) {
      this.config.environmentOverride = UXMode.ULTRA;
      this.currentMode = UXMode.ULTRA;
    } else if (envExpertMode) {
      this.config.environmentOverride = UXMode.EXPERT;
      this.currentMode = UXMode.EXPERT;
    } else if (envFastMode) {
      this.config.environmentOverride = UXMode.FAST;
      this.currentMode = UXMode.FAST;
    }
  }

  /**
   * Get the current UX mode
   */
  getCurrentMode(): UXMode {
    return this.currentMode;
  }

  /**
   * Set the UX mode with persistence
   */
  async setMode(mode: UXMode): Promise<void> {
    if (!this.isValidUXMode(mode)) {
      throw new Error(`Invalid UX mode: ${mode}`);
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;
    
    // Update configuration
    this.config.currentMode = mode;
    this.config.lastUpdated = new Date().toISOString();
    
    // Apply mode settings immediately
    this.applyModeSettings(mode);
    
    // Persist the configuration
    try {
      await this.persistMode(mode);
    } catch (error) {
      // Rollback on persistence failure
      this.currentMode = previousMode;
      this.config.currentMode = previousMode;
      throw new Error(`Failed to persist UX mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Switch mode with immediate application (Task 2.3)
   * This method provides real-time mode switching with immediate effect
   */
  async switchModeImmediate(mode: UXMode): Promise<void> {
    if (!this.isValidUXMode(mode)) {
      throw new Error(`Invalid UX mode: ${mode}`);
    }

    // Check if transition is allowed
    const canTransition = this.canTransitionTo(mode);
    if (!canTransition.success) {
      throw new Error(canTransition.error.message);
    }

    const previousMode = this.currentMode;
    
    // Immediately apply the new mode
    this.currentMode = mode;
    this.applyModeSettings(mode);
    
    // Update configuration with immediate effect
    this.config.currentMode = mode;
    this.config.lastUpdated = new Date().toISOString();
    
    // Emit mode change event for real-time updates
    this.emitModeChangeEvent(previousMode, mode);
    
    // Persist asynchronously (don't block the immediate switch)
    this.persistMode(mode).catch(error => {
      console.warn(`Warning: Failed to persist mode change: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't rollback since the mode change was already applied
    });
  }

  /**
   * Emit mode change event for real-time updates
   */
  private emitModeChangeEvent(previousMode: UXMode, newMode: UXMode): void {
    // This would integrate with an event system in a real implementation
    // For now, we'll use environment variables to signal the change
    process.env.CLI_UX_MODE_CHANGED = 'true';
    process.env.CLI_UX_PREVIOUS_MODE = previousMode;
    process.env.CLI_UX_CURRENT_MODE = newMode;
    process.env.CLI_UX_MODE_CHANGE_TIMESTAMP = new Date().toISOString();
  }

  /**
   * Get confirmation level for current mode
   */
  getConfirmationLevel(): ConfirmationLevel {
    return this.confirmationLevels[this.currentMode];
  }

  /**
   * Determine if a prompt should be shown based on current mode and prompt type
   */
  shouldShowPrompt(promptType: PromptType): boolean {
    const confirmationLevel = this.getConfirmationLevel();

    switch (promptType) {
      case PromptType.CONFIRMATION:
        return confirmationLevel.requiresConfirmation;
      
      case PromptType.OPTIONAL:
        return confirmationLevel.showDetailedPrompts;
      
      case PromptType.TRANSACTION:
        // Transaction prompts are always shown unless in ULTRA mode
        return this.currentMode !== UXMode.ULTRA;
      
      case PromptType.SAFETY:
        // Safety prompts are always shown except in ULTRA mode
        return this.currentMode !== UXMode.ULTRA;
      
      case PromptType.INFORMATION:
        return !confirmationLevel.minimizeOutput;
      
      default:
        return true;
    }
  }

  /**
   * Apply mode-specific settings
   */
  applyModeSettings(mode: UXMode): void {
    // Update confirmation levels if needed
    if (!this.confirmationLevels[mode]) {
      this.confirmationLevels[mode] = this.getDefaultConfirmationLevel(mode);
    }

    // Apply mode-specific environment settings immediately
    this.applyEnvironmentSettings(mode);
    
    // Apply interaction pattern changes immediately
    this.applyInteractionPatterns(mode);
  }

  /**
   * Apply environment settings for the mode
   */
  private applyEnvironmentSettings(mode: UXMode): void {
    switch (mode) {
      case UXMode.NORMAL:
        // Standard behavior - no special settings
        delete process.env.CLI_ANIMATION_SPEED;
        delete process.env.CLI_MINIMAL_OUTPUT;
        delete process.env.CLI_EXPERT_MODE;
        delete process.env.CLI_SHOW_ADVANCED;
        break;
      
      case UXMode.FAST:
        // Reduce delays and enable smart defaults
        process.env.CLI_ANIMATION_SPEED = 'fast';
        delete process.env.CLI_MINIMAL_OUTPUT;
        delete process.env.CLI_EXPERT_MODE;
        delete process.env.CLI_SHOW_ADVANCED;
        break;
      
      case UXMode.ULTRA:
        // Minimize all output and maximize speed
        process.env.CLI_ANIMATION_SPEED = 'off';
        process.env.CLI_MINIMAL_OUTPUT = 'true';
        delete process.env.CLI_EXPERT_MODE;
        delete process.env.CLI_SHOW_ADVANCED;
        break;
      
      case UXMode.EXPERT:
        // Direct access with minimal interface
        process.env.CLI_EXPERT_MODE = 'true';
        process.env.CLI_SHOW_ADVANCED = 'true';
        process.env.CLI_ANIMATION_SPEED = 'fast';
        process.env.CLI_MINIMAL_OUTPUT = 'true';
        break;
    }
  }

  /**
   * Apply interaction patterns immediately based on mode
   */
  private applyInteractionPatterns(mode: UXMode): void {
    const confirmationLevel = this.confirmationLevels[mode];
    
    // Set global interaction flags for immediate effect
    process.env.CLI_REQUIRES_CONFIRMATION = confirmationLevel.requiresConfirmation.toString();
    process.env.CLI_SHOW_DETAILED_PROMPTS = confirmationLevel.showDetailedPrompts.toString();
    process.env.CLI_ENABLE_SMART_DEFAULTS = confirmationLevel.enableSmartDefaults.toString();
    process.env.CLI_MINIMIZE_OUTPUT = confirmationLevel.minimizeOutput.toString();
    
    // Apply mode-specific interaction behaviors
    switch (mode) {
      case UXMode.NORMAL:
        process.env.CLI_INTERACTION_STYLE = 'standard';
        process.env.CLI_PROMPT_TIMEOUT = '30000'; // 30 seconds
        break;
        
      case UXMode.FAST:
        process.env.CLI_INTERACTION_STYLE = 'streamlined';
        process.env.CLI_PROMPT_TIMEOUT = '15000'; // 15 seconds
        process.env.CLI_AUTO_PROCEED = 'optional'; // Auto-proceed on optional prompts
        break;
        
      case UXMode.ULTRA:
        process.env.CLI_INTERACTION_STYLE = 'minimal';
        process.env.CLI_PROMPT_TIMEOUT = '5000'; // 5 seconds
        process.env.CLI_AUTO_PROCEED = 'all'; // Auto-proceed on all prompts
        break;
        
      case UXMode.EXPERT:
        process.env.CLI_INTERACTION_STYLE = 'direct';
        process.env.CLI_PROMPT_TIMEOUT = '60000'; // 60 seconds for complex operations
        process.env.CLI_SHOW_TECHNICAL_DETAILS = 'true';
        break;
    }
  }

  /**
   * Persist UX mode to configuration file
   */
  async persistMode(mode: UXMode): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(UX_MODE_CONFIG_PATH, configData, 'utf8');
    } catch (error) {
      throw new Error(`Failed to persist UX mode configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load persisted UX mode from configuration file
   */
  async loadPersistedMode(): Promise<UXMode> {
    try {
      // Check if environment override is active
      if (this.config.environmentOverride) {
        return this.config.environmentOverride;
      }

      // Try to load from file
      const configData = await fs.readFile(UX_MODE_CONFIG_PATH, 'utf8');
      const loadedConfig: UXModeConfig = JSON.parse(configData);
      
      // Validate loaded configuration
      if (loadedConfig.currentMode && this.isValidUXMode(loadedConfig.currentMode)) {
        this.config = { ...this.config, ...loadedConfig };
        this.currentMode = loadedConfig.currentMode;
        this.applyModeSettings(this.currentMode);
        return this.currentMode;
      }
    } catch (error) {
      // File doesn't exist or is corrupted - use default
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.warn(`Warning: Failed to load UX mode configuration: ${error.message}`);
      }
    }

    // Return default mode
    return DEFAULT_UX_MODE;
  }

  /**
   * Get default confirmation level for a mode
   */
  private getDefaultConfirmationLevel(mode: UXMode): ConfirmationLevel {
    return DEFAULT_CONFIRMATION_LEVELS[mode] || DEFAULT_CONFIRMATION_LEVELS[DEFAULT_UX_MODE];
  }

  /**
   * Validate if a value is a valid UX mode
   */
  private isValidUXMode(value: any): value is UXMode {
    return Object.values(UXMode).includes(value);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): UXModeConfig {
    return { ...this.config };
  }

  /**
   * Update confirmation level for a specific mode
   */
  updateConfirmationLevel(mode: UXMode, level: Partial<ConfirmationLevel>): void {
    if (!this.isValidUXMode(mode)) {
      throw new Error(`Invalid UX mode: ${mode}`);
    }

    this.confirmationLevels[mode] = {
      ...this.confirmationLevels[mode],
      ...level
    };
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.currentMode = DEFAULT_UX_MODE;
    this.config = { ...DEFAULT_UX_MODE_CONFIG };
    this.confirmationLevels = { ...DEFAULT_CONFIRMATION_LEVELS };
    
    // Re-initialize from environment
    this.initializeFromEnvironment();
    
    // Persist the reset configuration
    await this.persistMode(this.currentMode);
  }

  /**
   * Get mode statistics
   */
  getModeStatistics(): {
    currentMode: UXMode;
    lastUpdated: string;
    hasEnvironmentOverride: boolean;
    hasSessionOverride: boolean;
    confirmationLevel: ConfirmationLevel;
  } {
    return {
      currentMode: this.currentMode,
      lastUpdated: this.config.lastUpdated,
      hasEnvironmentOverride: !!this.config.environmentOverride,
      hasSessionOverride: !!this.config.sessionOverride,
      confirmationLevel: this.getConfirmationLevel()
    };
  }

  /**
   * Set session-specific mode override (temporary)
   */
  setSessionMode(mode: UXMode): void {
    if (!this.isValidUXMode(mode)) {
      throw new Error(`Invalid UX mode: ${mode}`);
    }

    this.config.sessionOverride = mode;
    this.currentMode = mode;
    this.applyModeSettings(mode);
  }

  /**
   * Clear session mode override
   */
  clearSessionMode(): void {
    delete this.config.sessionOverride;
    
    // Revert to environment override or persisted mode
    if (this.config.environmentOverride) {
      this.currentMode = this.config.environmentOverride;
    } else {
      this.currentMode = this.config.currentMode;
    }
    
    this.applyModeSettings(this.currentMode);
  }

  /**
   * Check if current mode allows a specific operation
   */
  allowsOperation(operation: string): boolean {
    const confirmationLevel = this.getConfirmationLevel();

    // Define operation requirements
    const operationRequirements: Record<string, (level: ConfirmationLevel) => boolean> = {
      'deploy': () => true, // Always allowed
      'batch-deploy': () => true, // Always allowed
      'dangerous-operation': (level) => level.requiresConfirmation || this.currentMode === UXMode.EXPERT,
      'experimental-feature': (level) => !level.minimizeOutput || this.currentMode === UXMode.EXPERT,
      'verbose-output': (level) => !level.minimizeOutput,
      'detailed-prompts': (level) => level.showDetailedPrompts
    };

    const requirement = operationRequirements[operation];
    return requirement ? requirement(confirmationLevel) : true;
  }

  /**
   * Get recommended mode for a specific context
   */
  getRecommendedMode(context: {
    isAutomated?: boolean;
    isBatchOperation?: boolean;
    isExperienced?: boolean;
    timeConstrained?: boolean;
  }): UXMode {
    if (context.isAutomated) {
      return UXMode.ULTRA;
    }

    if (context.timeConstrained && context.isBatchOperation) {
      return UXMode.FAST;
    }

    if (context.isExperienced) {
      return UXMode.EXPERT;
    }

    return UXMode.NORMAL;
  }

  /**
   * Validate mode transition
   */
  canTransitionTo(targetMode: UXMode): Result<boolean> {
    if (!this.isValidUXMode(targetMode)) {
      return createErrorResult(new Error(`Invalid target mode: ${targetMode}`));
    }

    // Check if environment override prevents transition
    if (this.config.environmentOverride && this.config.environmentOverride !== targetMode) {
      return createErrorResult(new Error(`Cannot transition to ${targetMode}: environment override is active (${this.config.environmentOverride})`));
    }

    // All transitions are allowed if no environment override
    return createSuccessResult(true);
  }

  /**
   * Get mode description
   */
  getModeDescription(mode: UXMode): string {
    const descriptions: Record<UXMode, string> = {
      [UXMode.NORMAL]: 'Standard prompts and confirmations for safe operation',
      [UXMode.FAST]: 'Reduced confirmations with smart defaults for faster workflow',
      [UXMode.ULTRA]: 'Minimal prompts with auto-confirmation for maximum speed',
      [UXMode.EXPERT]: 'Direct access to advanced features with minimal interface'
    };

    return descriptions[mode] || 'Unknown mode';
  }

  /**
   * Check if mode switching was applied immediately
   */
  isModeAppliedImmediately(): boolean {
    const currentModeEnv = process.env.CLI_UX_CURRENT_MODE as UXMode;
    return currentModeEnv === this.currentMode;
  }

  /**
   * Get current interaction patterns
   */
  getCurrentInteractionPatterns(): {
    style: string;
    timeout: number;
    autoProceed: string;
    showTechnicalDetails: boolean;
  } {
    return {
      style: process.env.CLI_INTERACTION_STYLE || 'standard',
      timeout: parseInt(process.env.CLI_PROMPT_TIMEOUT || '30000'),
      autoProceed: process.env.CLI_AUTO_PROCEED || 'none',
      showTechnicalDetails: process.env.CLI_SHOW_TECHNICAL_DETAILS === 'true'
    };
  }

  /**
   * Verify that mode settings are applied correctly
   */
  verifyModeApplication(mode: UXMode): boolean {
    const confirmationLevel = this.confirmationLevels[mode];
    
    // Check environment variables match expected values
    const envMatches = 
      process.env.CLI_REQUIRES_CONFIRMATION === confirmationLevel.requiresConfirmation.toString() &&
      process.env.CLI_SHOW_DETAILED_PROMPTS === confirmationLevel.showDetailedPrompts.toString() &&
      process.env.CLI_ENABLE_SMART_DEFAULTS === confirmationLevel.enableSmartDefaults.toString() &&
      process.env.CLI_MINIMIZE_OUTPUT === confirmationLevel.minimizeOutput.toString();
    
    // Check mode-specific settings
    let modeSpecificMatches = true;
    switch (mode) {
      case UXMode.NORMAL:
        modeSpecificMatches = process.env.CLI_INTERACTION_STYLE === 'standard';
        break;
      case UXMode.FAST:
        modeSpecificMatches = 
          process.env.CLI_INTERACTION_STYLE === 'streamlined' &&
          process.env.CLI_ANIMATION_SPEED === 'fast';
        break;
      case UXMode.ULTRA:
        modeSpecificMatches = 
          process.env.CLI_INTERACTION_STYLE === 'minimal' &&
          process.env.CLI_ANIMATION_SPEED === 'off' &&
          process.env.CLI_MINIMAL_OUTPUT === 'true';
        break;
      case UXMode.EXPERT:
        modeSpecificMatches = 
          process.env.CLI_INTERACTION_STYLE === 'direct' &&
          process.env.CLI_EXPERT_MODE === 'true' &&
          process.env.CLI_SHOW_ADVANCED === 'true';
        break;
    }
    
    return envMatches && modeSpecificMatches;
  }
}