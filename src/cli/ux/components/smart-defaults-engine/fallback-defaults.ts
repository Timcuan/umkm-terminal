/**
 * Fallback Defaults System
 * 
 * Provides sensible system defaults for new users and fallback values
 * when smart defaults cannot provide confident recommendations.
 */

import { Platform, UXMode, FeeStrategy, DeployMode, ValidationLevel } from '../../types.js';
import { DefaultValues, DeploymentContext } from '../../types.js';

/**
 * System-wide fallback defaults
 */
export const SYSTEM_FALLBACK_DEFAULTS = {
  // Fee configuration
  'fee-percentage': 3.0,
  'fee-strategy': FeeStrategy.DYNAMIC,
  'fee-applies-to': ['TOKEN', 'WETH'],
  
  // Deployment configuration
  'deployment-mode': DeployMode.QUICK,
  'validation-level': ValidationLevel.STANDARD,
  'clanker-integration': true,
  
  // Token configuration
  'token-name': 'My Token',
  'token-symbol': 'TOKEN',
  'token-description': 'A new token created with UMKM Terminal',
  
  // Spoofing configuration
  'admin-allocation': 0.1,
  'recipient-allocation': 99.9,
  'real-time-updates': true,
  'integration-mode': 'standard',
  
  // UX configuration
  'ux-mode': UXMode.NORMAL,
  'confirmation-required': true,
  'show-detailed-prompts': true,
  'enable-smart-defaults': true,
  'minimize-output': false,
  
  // Batch configuration
  'batch-size': 10,
  'max-concurrency': 5,
  'retry-attempts': 3,
  'timeout-seconds': 30,
  
  // Platform configuration
  'preferred-shell': 'auto',
  'color-support': true,
  'unicode-support': true,
  'interactive-mode': true
};

/**
 * Context-specific fallback defaults
 */
export const CONTEXT_FALLBACK_DEFAULTS: Record<string, Record<string, any>> = {
  'new-user': {
    'ux-mode': UXMode.NORMAL,
    'deployment-mode': DeployMode.QUICK,
    'fee-percentage': 3.0,
    'validation-level': ValidationLevel.STANDARD,
    'confirmation-required': true,
    'show-detailed-prompts': true
  },
  
  'experienced-user': {
    'ux-mode': UXMode.FAST,
    'deployment-mode': DeployMode.ADVANCED,
    'fee-percentage': 2.5,
    'validation-level': ValidationLevel.MINIMAL,
    'confirmation-required': false,
    'show-detailed-prompts': false
  },
  
  'power-user': {
    'ux-mode': UXMode.EXPERT,
    'deployment-mode': DeployMode.ADVANCED,
    'fee-percentage': 2.0,
    'validation-level': ValidationLevel.MINIMAL,
    'confirmation-required': false,
    'minimize-output': true
  },
  
  'batch-deployment': {
    'deployment-mode': DeployMode.QUICK,
    'validation-level': ValidationLevel.MINIMAL,
    'batch-size': 20,
    'max-concurrency': 10,
    'confirmation-required': false
  },
  
  'single-deployment': {
    'deployment-mode': DeployMode.ADVANCED,
    'validation-level': ValidationLevel.STANDARD,
    'confirmation-required': true,
    'show-detailed-prompts': true
  },
  
  'ci-environment': {
    'ux-mode': UXMode.ULTRA,
    'deployment-mode': DeployMode.QUICK,
    'validation-level': ValidationLevel.MINIMAL,
    'confirmation-required': false,
    'interactive-mode': false,
    'color-support': false
  }
};

/**
 * Platform-specific fallback defaults
 */
export const PLATFORM_FALLBACK_DEFAULTS: Record<Platform, Record<string, any>> = {
  [Platform.WINDOWS]: {
    'preferred-shell': 'cmd',
    'path-separator': '\\',
    'line-ending': '\r\n',
    'max-path-length': 260,
    'case-sensitive': false,
    'supports-symlinks': false,
    'thread-pool-size': 8,
    'timeout-multiplier': 1.5
  },
  
  [Platform.MAC]: {
    'preferred-shell': 'zsh',
    'path-separator': '/',
    'line-ending': '\n',
    'max-path-length': 1024,
    'case-sensitive': false,
    'supports-symlinks': true,
    'thread-pool-size': 6,
    'timeout-multiplier': 1.0
  },
  
  [Platform.LINUX]: {
    'preferred-shell': 'bash',
    'path-separator': '/',
    'line-ending': '\n',
    'max-path-length': 4096,
    'case-sensitive': true,
    'supports-symlinks': true,
    'thread-pool-size': 4,
    'timeout-multiplier': 0.8
  },
  
  [Platform.WSL]: {
    'preferred-shell': 'bash',
    'path-separator': '/',
    'line-ending': '\n',
    'max-path-length': 4096,
    'case-sensitive': true,
    'supports-symlinks': true,
    'thread-pool-size': 4,
    'timeout-multiplier': 1.2,
    'enable-file-watching': false
  },
  
  [Platform.TERMUX]: {
    'preferred-shell': 'bash',
    'path-separator': '/',
    'line-ending': '\n',
    'max-path-length': 4096,
    'case-sensitive': true,
    'supports-symlinks': true,
    'thread-pool-size': 2,
    'timeout-multiplier': 2.0,
    'use-native-modules': false
  }
};

/**
 * Fallback Defaults Provider
 */
export class FallbackDefaultsProvider {
  /**
   * Get fallback default for a specific key
   */
  static getFallbackDefault(key: string, context?: string): any {
    // Try context-specific defaults first
    if (context && CONTEXT_FALLBACK_DEFAULTS[context]) {
      const contextDefaults = CONTEXT_FALLBACK_DEFAULTS[context];
      if (key in contextDefaults) {
        return contextDefaults[key];
      }
    }
    
    // Try system defaults
    if (key in SYSTEM_FALLBACK_DEFAULTS) {
      return SYSTEM_FALLBACK_DEFAULTS[key as keyof typeof SYSTEM_FALLBACK_DEFAULTS];
    }
    
    // Try to infer from key name
    return this.inferDefaultFromKey(key);
  }
  
  /**
   * Get platform-specific fallback default
   */
  static getPlatformDefault(key: string, platform: Platform): any {
    const platformDefaults = PLATFORM_FALLBACK_DEFAULTS[platform];
    if (platformDefaults && key in platformDefaults) {
      return platformDefaults[key];
    }
    
    return this.getFallbackDefault(key);
  }
  
  /**
   * Get contextual defaults for deployment
   */
  static getDeploymentDefaults(context: DeploymentContext): DefaultValues {
    const userSegment = this.determineUserSegment(context);
    const contextKey = context.mode === DeployMode.QUICK ? 'single-deployment' : 'batch-deployment';
    
    return {
      feePercentage: this.getFallbackDefault('fee-percentage', userSegment),
      deploymentMode: this.getFallbackDefault('deployment-mode', contextKey),
      validationLevel: this.getFallbackDefault('validation-level', userSegment),
      platformOptimizations: {
        pathSeparator: this.getPlatformDefault('path-separator', context.platform),
        commandPrefix: this.getPlatformDefault('preferred-shell', context.platform) === 'cmd' ? 'cmd /c' : '',
        environmentVariables: this.getPlatformEnvironmentDefaults(context.platform),
        terminalCapabilities: {
          supportsColor: this.getPlatformDefault('color-support', context.platform) ?? true,
          supportsUnicode: this.getPlatformDefault('unicode-support', context.platform) ?? true,
          supportsInteractivity: this.getPlatformDefault('interactive-mode', context.platform) ?? true,
          maxWidth: 80,
          maxHeight: 24
        }
      }
    };
  }
  
  /**
   * Get defaults for new users
   */
  static getNewUserDefaults(): Record<string, any> {
    return {
      ...SYSTEM_FALLBACK_DEFAULTS,
      ...CONTEXT_FALLBACK_DEFAULTS['new-user']
    };
  }
  
  /**
   * Get defaults based on user experience level
   */
  static getUserExperienceDefaults(totalChoices: number): Record<string, any> {
    let userSegment: string;
    
    if (totalChoices < 10) {
      userSegment = 'new-user';
    } else if (totalChoices < 50) {
      userSegment = 'experienced-user';
    } else {
      userSegment = 'power-user';
    }
    
    return {
      ...SYSTEM_FALLBACK_DEFAULTS,
      ...CONTEXT_FALLBACK_DEFAULTS[userSegment]
    };
  }
  
  /**
   * Get CI environment defaults
   */
  static getCIDefaults(): Record<string, any> {
    return {
      ...SYSTEM_FALLBACK_DEFAULTS,
      ...CONTEXT_FALLBACK_DEFAULTS['ci-environment']
    };
  }
  
  /**
   * Infer default value from key name
   */
  private static inferDefaultFromKey(key: string): any {
    const lowerKey = key.toLowerCase().trim();
    
    // Handle empty or whitespace-only keys
    if (!lowerKey || lowerKey.length === 0) {
      return 'default';
    }
    
    // Boolean defaults
    if (lowerKey.includes('enable') || lowerKey.includes('support') || lowerKey.includes('allow')) {
      return true;
    }
    
    if (lowerKey.includes('disable') || lowerKey.includes('prevent') || lowerKey.includes('block')) {
      return false;
    }
    
    // Numeric defaults
    if (lowerKey.includes('percentage') || lowerKey.includes('percent')) {
      return 3.0;
    }
    
    if (lowerKey.includes('size') || lowerKey.includes('limit') || lowerKey.includes('max')) {
      return 10;
    }
    
    if (lowerKey.includes('timeout') || lowerKey.includes('delay')) {
      return 30;
    }
    
    // String defaults
    if (lowerKey.includes('mode')) {
      return 'standard';
    }
    
    if (lowerKey.includes('level')) {
      return 'standard';
    }
    
    if (lowerKey.includes('strategy')) {
      return 'dynamic';
    }
    
    // Default fallback for unknown keys
    return 'default';
  }
  
  /**
   * Determine user segment from deployment context
   */
  private static determineUserSegment(context: DeploymentContext): string {
    const deploymentCount = context.previousDeployments.length;
    
    if (deploymentCount === 0) return 'new-user';
    if (deploymentCount < 10) return 'experienced-user';
    return 'power-user';
  }
  
  /**
   * Get platform-specific environment defaults
   */
  private static getPlatformEnvironmentDefaults(platform: Platform): Record<string, string> {
    const common = {
      CLI_PLATFORM: platform,
      NODE_ENV: process.env.NODE_ENV || 'development'
    };
    
    switch (platform) {
      case Platform.WINDOWS:
        return {
          ...common,
          PATHEXT: '.COM;.EXE;.BAT;.CMD',
          CLI_SHELL: 'cmd'
        };
      case Platform.MAC:
        return {
          ...common,
          CLI_SHELL: 'zsh',
          COLORTERM: 'truecolor'
        };
      case Platform.LINUX:
        return {
          ...common,
          CLI_SHELL: 'bash'
        };
      case Platform.WSL:
        return {
          ...common,
          CLI_SHELL: 'bash',
          WSL_DISTRO_NAME: process.env.WSL_DISTRO_NAME || 'Ubuntu'
        };
      case Platform.TERMUX:
        return {
          ...common,
          CLI_SHELL: 'bash',
          PREFIX: '/data/data/com.termux/files/usr'
        };
      default:
        return common;
    }
  }
  
  /**
   * Validate default value
   */
  static validateDefault(key: string, value: any): boolean {
    // Type validation based on key patterns
    if (key.includes('percentage') && typeof value === 'number') {
      return value >= 0.1 && value <= 99.9;
    }
    
    if (key.includes('size') && typeof value === 'number') {
      return value > 0 && value <= 1000;
    }
    
    if (key.includes('timeout') && typeof value === 'number') {
      return value > 0 && value <= 300;
    }
    
    if (key.includes('mode') && typeof value === 'string') {
      return value.length > 0;
    }
    
    // Basic validation
    return value !== null && value !== undefined;
  }
  
  /**
   * Get all available contexts
   */
  static getAvailableContexts(): string[] {
    return Object.keys(CONTEXT_FALLBACK_DEFAULTS);
  }
  
  /**
   * Get all system defaults
   */
  static getAllSystemDefaults(): Record<string, any> {
    return { ...SYSTEM_FALLBACK_DEFAULTS };
  }
}