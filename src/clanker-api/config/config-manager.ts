/**
 * Configuration Manager for Clanker API Integration
 * Handles configuration loading, validation, and environment variable support
 */

import type { 
  ClankerSDKConfig, 
  OperationMethod, 
  ConfigValidationResult,
  ConfigValidationOptions 
} from '../types/config-types.js';
import type { BankrbotAPIConfig, ClankerAPIConfig } from '../types/api-types.js';
import { createConfigError } from '../types/error-types.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_BANKRBOT_CONFIG: Partial<BankrbotAPIConfig> = {
  baseUrl: 'https://api.bankrbot.com', // Default Bankrbot API endpoint
  timeout: 30000, // 30 seconds
  retries: 3,
};

const DEFAULT_API_CONFIG: Partial<ClankerAPIConfig> = {
  baseUrl: 'https://www.clanker.world/api',
  timeout: 30000, // 30 seconds
  retries: 3,
};

const DEFAULT_SDK_CONFIG: Partial<ClankerSDKConfig> = {
  operationMethod: 'direct', // Maintain backward compatibility
};

// ============================================================================
// Configuration Manager Class
// ============================================================================

export class ConfigManager {
  private config: ClankerSDKConfig;

  constructor(config: ClankerSDKConfig = {}) {
    this.config = this.mergeWithDefaults(config);
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Get the current configuration
   */
  getConfig(): ClankerSDKConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ClankerSDKConfig>): void {
    this.config = this.mergeWithDefaults({ ...this.config, ...updates });
  }

  /**
   * Get operation method with intelligent fallback
   */
  getOperationMethod(): OperationMethod {
    return this.config.operationMethod ?? 'direct';
  }

  /**
   * Get Bankrbot API configuration
   */
  getBankrbotConfig(): BankrbotAPIConfig | undefined {
    return this.config.bankrbot;
  }

  /**
   * Get API configuration (legacy)
   */
  getAPIConfig(): ClankerAPIConfig | undefined {
    return this.config.api;
  }

  /**
   * Check if Bankrbot method is available
   */
  isBankrbotAvailable(): boolean {
    return !!(this.config.bankrbot?.apiKey);
  }

  /**
   * Check if API method is available (legacy)
   */
  isAPIAvailable(): boolean {
    return !!(this.config.api?.apiKey);
  }

  /**
   * Check if direct method is available
   */
  isDirectAvailable(): boolean {
    return !!(this.config.wallet && this.config.publicClient);
  }

  /**
   * Validate current configuration
   */
  validate(options: ConfigValidationOptions = {}): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const method = this.getOperationMethod();

    // Validate based on operation method
    switch (method) {
      case 'bankrbot':
        this.validateBankrbotConfig(errors, warnings, options);
        break;
      case 'api':
        this.validateAPIConfig(errors, warnings, options);
        break;
      case 'direct':
        this.validateDirectConfig(errors, warnings, options);
        break;
      case 'auto':
        this.validateAutoConfig(errors, warnings, options);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      method,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private mergeWithDefaults(config: ClankerSDKConfig): ClankerSDKConfig {
    const merged: ClankerSDKConfig = {
      ...DEFAULT_SDK_CONFIG,
      ...config,
    };

    // Merge Bankrbot config with defaults
    if (config.bankrbot) {
      merged.bankrbot = {
        ...DEFAULT_BANKRBOT_CONFIG,
        ...config.bankrbot,
      };
    }

    // Merge API config with defaults (legacy)
    if (config.api) {
      merged.api = {
        ...DEFAULT_API_CONFIG,
        ...config.api,
      };
    }

    return merged;
  }

  private validateBankrbotConfig(
    errors: string[], 
    warnings: string[], 
    options: ConfigValidationOptions
  ): void {
    if (!this.config.bankrbot) {
      errors.push('Bankrbot configuration is required when operationMethod is "bankrbot"');
      return;
    }

    // Validate API key
    if (!this.config.bankrbot.apiKey) {
      errors.push('Bankrbot API key is required for Bankrbot operations');
    } else if (this.config.bankrbot.apiKey.length < 32) {
      warnings.push('Bankrbot API key appears to be too short (expected 32+ characters)');
    }

    // Validate base URL
    if (this.config.bankrbot.baseUrl) {
      try {
        new URL(this.config.bankrbot.baseUrl);
      } catch {
        errors.push('Invalid Bankrbot base URL format');
      }
    }

    // Validate timeout
    if (this.config.bankrbot.timeout && this.config.bankrbot.timeout < 1000) {
      warnings.push('Bankrbot API timeout is very low (< 1 second)');
    }

    // Validate retries
    if (this.config.bankrbot.retries && this.config.bankrbot.retries > 10) {
      warnings.push('High Bankrbot retry count may cause long delays');
    }
  }

  private validateAPIConfig(
    errors: string[], 
    warnings: string[], 
    options: ConfigValidationOptions
  ): void {
    if (!this.config.api) {
      errors.push('API configuration is required when operationMethod is "api"');
      return;
    }

    // Validate API key
    if (!this.config.api.apiKey) {
      errors.push('API key is required for API operations');
    } else if (this.config.api.apiKey.length < 32) {
      warnings.push('API key appears to be too short (expected 32+ characters)');
    }

    // Validate base URL
    if (this.config.api.baseUrl) {
      try {
        new URL(this.config.api.baseUrl);
      } catch {
        errors.push('Invalid base URL format');
      }
    }

    // Validate timeout
    if (this.config.api.timeout && this.config.api.timeout < 1000) {
      warnings.push('API timeout is very low (< 1 second)');
    }

    // Validate retries
    if (this.config.api.retries && this.config.api.retries > 10) {
      warnings.push('High retry count may cause long delays');
    }
  }

  private validateDirectConfig(
    errors: string[], 
    warnings: string[], 
    options: ConfigValidationOptions
  ): void {
    if (!this.config.wallet) {
      errors.push('Wallet client is required for direct contract operations');
    }

    if (!this.config.publicClient) {
      errors.push('Public client is required for direct contract operations');
    }

    // Check chain compatibility
    if (this.config.wallet && this.config.publicClient) {
      const walletChain = this.config.wallet.chain?.id;
      const publicChain = this.config.publicClient.chain?.id;
      
      if (walletChain && publicChain && walletChain !== publicChain) {
        errors.push(`Chain mismatch: wallet (${walletChain}) != publicClient (${publicChain})`);
      }
    }
  }

  private validateAutoConfig(
    errors: string[], 
    warnings: string[], 
    options: ConfigValidationOptions
  ): void {
    const hasAPI = this.isAPIAvailable();
    const hasDirect = this.isDirectAvailable();

    if (!hasAPI && !hasDirect) {
      errors.push('Auto mode requires either API configuration or direct contract configuration');
    }

    if (!hasAPI) {
      warnings.push('API configuration missing - will fallback to direct contract method');
    }

    if (!hasDirect) {
      warnings.push('Direct contract configuration missing - will fallback to API method');
    }

    // Validate both configurations if present
    if (hasAPI) {
      this.validateAPIConfig(errors, warnings, options);
    }
    if (hasDirect) {
      this.validateDirectConfig(errors, warnings, options);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create configuration manager from environment variables
 */
export function createConfigFromEnv(): ClankerSDKConfig {
  const config: ClankerSDKConfig = {};

  // Load operation method
  const operationMethod = process.env.CLANKER_OPERATION_METHOD as OperationMethod;
  if (operationMethod) {
    config.operationMethod = operationMethod;
  }

  // Load API configuration
  const apiKey = process.env.CLANKER_API_KEY;
  if (apiKey) {
    config.api = {
      apiKey,
      baseUrl: process.env.CLANKER_API_BASE_URL,
      timeout: process.env.CLANKER_API_TIMEOUT ? parseInt(process.env.CLANKER_API_TIMEOUT) : undefined,
      retries: process.env.CLANKER_API_RETRIES ? parseInt(process.env.CLANKER_API_RETRIES) : undefined,
    };
  }

  return config;
}

/**
 * Validate configuration and throw if invalid
 */
export function validateConfigOrThrow(
  config: ClankerSDKConfig, 
  options: ConfigValidationOptions = {}
): ConfigManager {
  const manager = new ConfigManager(config);
  const result = manager.validate(options);

  if (!result.valid) {
    throw createConfigError(
      `Configuration validation failed: ${result.errors.join(', ')}`,
      result.method,
      { errors: result.errors, warnings: result.warnings }
    );
  }

  return manager;
}

// ============================================================================
// Configuration Inheritance System
// ============================================================================

/**
 * Configuration inheritance manager
 * Handles merging configurations from multiple sources with proper precedence
 */
export class ConfigInheritanceManager {
  private static readonly INHERITANCE_ORDER = [
    'defaults',
    'environment',
    'user',
    'runtime'
  ] as const;

  /**
   * Merge configurations with proper inheritance
   */
  static mergeConfigurations(configs: {
    defaults?: Partial<ClankerSDKConfig>;
    environment?: Partial<ClankerSDKConfig>;
    user?: Partial<ClankerSDKConfig>;
    runtime?: Partial<ClankerSDKConfig>;
  }): ClankerSDKConfig {
    let merged: ClankerSDKConfig = {};

    // Apply configurations in order of precedence (lowest to highest)
    for (const source of this.INHERITANCE_ORDER) {
      const config = configs[source];
      if (config) {
        merged = this.deepMergeConfigs(merged, config);
      }
    }

    return merged;
  }

  /**
   * Deep merge two configurations with special handling for nested objects
   */
  private static deepMergeConfigs(
    base: ClankerSDKConfig, 
    override: Partial<ClankerSDKConfig>
  ): ClankerSDKConfig {
    const result: ClankerSDKConfig = { ...base };

    // Handle top-level properties
    if (override.operationMethod !== undefined) {
      result.operationMethod = override.operationMethod;
    }

    if (override.publicClient !== undefined) {
      result.publicClient = override.publicClient;
    }

    if (override.wallet !== undefined) {
      result.wallet = override.wallet;
    }

    if (override.chain !== undefined) {
      result.chain = override.chain;
    }

    if (override.chains !== undefined) {
      result.chains = override.chains;
    }

    // Handle API configuration with deep merge
    if (override.api !== undefined) {
      result.api = this.mergeAPIConfig(base.api, override.api);
    }

    return result;
  }

  /**
   * Merge API configurations with proper precedence
   */
  private static mergeAPIConfig(
    base: ClankerAPIConfig | undefined,
    override: Partial<ClankerAPIConfig>
  ): ClankerAPIConfig {
    // Ensure we have an API key from either base or override
    const apiKey = override.apiKey || base?.apiKey;
    if (!apiKey) {
      throw createConfigError(
        'API key is required when API configuration is provided',
        'api',
        { base, override }
      );
    }

    const merged: ClankerAPIConfig = {
      apiKey,
      ...DEFAULT_API_CONFIG,
      ...base,
      ...override,
    };

    return merged;
  }

  /**
   * Create configuration from multiple sources
   */
  static createFromSources(sources: {
    envFile?: string;
    userConfig?: Partial<ClankerSDKConfig>;
    runtimeOverrides?: Partial<ClankerSDKConfig>;
  }): ClankerSDKConfig {
    const configs: Parameters<typeof this.mergeConfigurations>[0] = {
      defaults: DEFAULT_SDK_CONFIG,
    };

    // Load environment configuration
    try {
      configs.environment = createConfigFromEnv();
    } catch (error) {
      // Environment config is optional
      console.warn('Failed to load environment configuration:', error);
    }

    // Add user configuration
    if (sources.userConfig) {
      configs.user = sources.userConfig;
    }

    // Add runtime overrides
    if (sources.runtimeOverrides) {
      configs.runtime = sources.runtimeOverrides;
    }

    return this.mergeConfigurations(configs);
  }

  /**
   * Get configuration source information for debugging
   */
  static getConfigurationSources(config: ClankerSDKConfig): {
    operationMethod: { value: OperationMethod; source: string };
    apiKey: { value: string | undefined; source: string };
    baseUrl: { value: string | undefined; source: string };
    hasWallet: { value: boolean; source: string };
    hasPublicClient: { value: boolean; source: string };
  } {
    // This is a simplified version - in a real implementation,
    // you'd track sources during the merge process
    return {
      operationMethod: {
        value: config.operationMethod ?? 'direct',
        source: config.operationMethod ? 'user' : 'default'
      },
      apiKey: {
        value: config.api?.apiKey,
        source: config.api?.apiKey ? 'user' : 'none'
      },
      baseUrl: {
        value: config.api?.baseUrl,
        source: config.api?.baseUrl ? 'user' : 'default'
      },
      hasWallet: {
        value: !!config.wallet,
        source: config.wallet ? 'user' : 'none'
      },
      hasPublicClient: {
        value: !!config.publicClient,
        source: config.publicClient ? 'user' : 'none'
      }
    };
  }
}

// ============================================================================
// Enhanced Factory Functions
// ============================================================================

/**
 * Create configuration with full inheritance support
 */
export function createConfigWithInheritance(
  userConfig: Partial<ClankerSDKConfig> = {},
  options: {
    loadFromEnv?: boolean;
    envPrefix?: string;
    validateConfig?: boolean;
  } = {}
): ConfigManager {
  const { loadFromEnv = true, validateConfig = true } = options;

  // Build configuration sources
  const sources: Parameters<typeof ConfigInheritanceManager.createFromSources>[0] = {
    userConfig,
  };

  // Load environment if requested
  if (loadFromEnv) {
    try {
      sources.userConfig = {
        ...createConfigFromEnv(),
        ...userConfig, // User config takes precedence over env
      };
    } catch (error) {
      console.warn('Failed to load environment configuration:', error);
    }
  }

  // Create merged configuration
  const finalConfig = ConfigInheritanceManager.createFromSources(sources);

  // Create and validate manager
  const manager = new ConfigManager(finalConfig);

  if (validateConfig) {
    const validation = manager.validate();
    if (!validation.valid) {
      throw createConfigError(
        `Configuration validation failed: ${validation.errors.join(', ')}`,
        validation.method,
        { 
          errors: validation.errors, 
          warnings: validation.warnings,
          sources: ConfigInheritanceManager.getConfigurationSources(finalConfig)
        }
      );
    }
  }

  return manager;
}

/**
 * Create configuration from environment with custom prefix
 */
export function createConfigFromEnvWithPrefix(prefix: string = 'CLANKER'): ClankerSDKConfig {
  const config: ClankerSDKConfig = {};

  // Load operation method
  const operationMethodKey = `${prefix}_OPERATION_METHOD`;
  const operationMethod = process.env[operationMethodKey] as OperationMethod;
  if (operationMethod) {
    config.operationMethod = operationMethod;
  }

  // Load API configuration
  const apiKeyKey = `${prefix}_API_KEY`;
  const apiKey = process.env[apiKeyKey];
  if (apiKey) {
    config.api = {
      apiKey,
      baseUrl: process.env[`${prefix}_API_BASE_URL`],
      timeout: process.env[`${prefix}_API_TIMEOUT`] ? 
        parseInt(process.env[`${prefix}_API_TIMEOUT`]!) : undefined,
      retries: process.env[`${prefix}_API_RETRIES`] ? 
        parseInt(process.env[`${prefix}_API_RETRIES`]!) : undefined,
    };
  }

  return config;
}