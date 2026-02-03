/**
 * Spoofing Configuration Module
 * 
 * Specialized configuration for spoofing operations with optimized reward distribution,
 * stealth features, and automated deployment strategies.
 */

export interface SpoofingConfig {
  // Reward Distribution (Optimized for Spoofing)
  adminRewardPercentage: number; // Default: 0.01% for minimal admin allocation
  recipientRewardPercentage: number; // Default: 99.99% for recipient
  
  // Stealth Features
  enableStealthMode: boolean; // Hide spoofing indicators
  randomizeDeploymentTiming: boolean; // Random delays between deployments
  useRandomizedMetadata: boolean; // Randomize non-essential metadata
  
  // Automated Features
  autoClaimRewards: boolean; // Automatically claim rewards
  batchOptimization: boolean; // Optimize for batch operations
  gasOptimization: boolean; // Optimize gas usage
  
  // Security Features
  useMultipleWallets: boolean; // Rotate between wallets
  enableProxyDeployment: boolean; // Use proxy contracts
  obfuscateTransactions: boolean; // Add transaction obfuscation
  
  // Performance Features
  maxConcurrentDeployments: number; // Limit concurrent operations
  deploymentInterval: number; // Minimum interval between deployments (ms)
  retryAttempts: number; // Number of retry attempts
}

export const DEFAULT_SPOOFING_CONFIG: SpoofingConfig = {
  // Reward Distribution (Optimized for Spoofing)
  adminRewardPercentage: 0.01, // Admin gets minimal allocation
  recipientRewardPercentage: 99.99, // Recipient gets majority of rewards
  
  // Stealth Features
  enableStealthMode: true, // Enable stealth by default
  randomizeDeploymentTiming: true, // Randomize timing to avoid detection
  useRandomizedMetadata: true, // Randomize metadata for uniqueness
  
  // Automated Features
  autoClaimRewards: true, // Auto-claim for efficiency
  batchOptimization: true, // Optimize for batch operations
  gasOptimization: true, // Minimize gas costs
  
  // Security Features
  useMultipleWallets: false, // Disabled by default (requires setup)
  enableProxyDeployment: false, // Disabled by default (advanced feature)
  obfuscateTransactions: false, // Disabled by default (advanced feature)
  
  // Performance Features
  maxConcurrentDeployments: 5, // Conservative limit
  deploymentInterval: 2000, // 2 second minimum interval
  retryAttempts: 3, // 3 retry attempts
};

export class SpoofingConfigManager {
  private config: SpoofingConfig;
  
  constructor(config?: Partial<SpoofingConfig>) {
    // Filter out undefined values to preserve defaults
    const filteredConfig = config ? Object.fromEntries(
      Object.entries(config).filter(([_, value]) => value !== undefined)
    ) : {};
    
    this.config = { ...DEFAULT_SPOOFING_CONFIG, ...filteredConfig };
  }
  
  /**
   * Get current spoofing configuration
   */
  getConfig(): SpoofingConfig {
    return { ...this.config };
  }
  
  /**
   * Update spoofing configuration
   */
  updateConfig(updates: Partial<SpoofingConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  /**
   * Get optimized reward recipients for spoofing
   */
  getOptimizedRewardRecipients(
    adminAddress: `0x${string}`,
    recipientAddress: `0x${string}`,
    rewardToken: 'Both' | 'Paired' | 'Clanker' = 'Both'
  ) {
    return [
      {
        address: adminAddress,
        allocation: this.config.adminRewardPercentage,
        rewardToken,
      },
      {
        address: recipientAddress,
        allocation: this.config.recipientRewardPercentage,
        rewardToken,
      },
    ];
  }
  
  /**
   * Get randomized deployment delay for stealth
   */
  getRandomizedDelay(): number {
    if (!this.config.randomizeDeploymentTiming) {
      return this.config.deploymentInterval;
    }
    
    const baseInterval = this.config.deploymentInterval;
    const randomFactor = 0.5 + Math.random(); // 0.5x to 1.5x
    return Math.floor(baseInterval * randomFactor);
  }
  
  /**
   * Generate randomized metadata for stealth
   */
  generateRandomizedMetadata(baseMetadata: {
    name: string;
    symbol: string;
    description?: string;
  }) {
    if (!this.config.useRandomizedMetadata) {
      return baseMetadata;
    }
    
    const variations = [
      { suffix: ' Token', symbolSuffix: 'TKN' },
      { suffix: ' Coin', symbolSuffix: 'COIN' },
      { suffix: ' Protocol', symbolSuffix: 'PRTCL' },
      { suffix: ' Network', symbolSuffix: 'NET' },
      { suffix: ' Finance', symbolSuffix: 'FIN' },
    ];
    
    const variation = variations[Math.floor(Math.random() * variations.length)];
    
    return {
      name: baseMetadata.name + variation.suffix,
      symbol: baseMetadata.symbol + variation.symbolSuffix,
      description: baseMetadata.description || `${baseMetadata.name} - A decentralized token on the blockchain`,
    };
  }
  
  /**
   * Check if stealth mode is enabled
   */
  isStealthModeEnabled(): boolean {
    return this.config.enableStealthMode;
  }
  
  /**
   * Get batch optimization settings
   */
  getBatchOptimizationSettings() {
    return {
      maxConcurrent: this.config.maxConcurrentDeployments,
      interval: this.config.deploymentInterval,
      retries: this.config.retryAttempts,
      gasOptimization: this.config.gasOptimization,
    };
  }
}

// Helper function to safely parse number from environment variable
function parseEnvNumber(envValue: string | undefined): number | undefined {
  if (!envValue || envValue.trim() === '') {
    return undefined;
  }
  const parsed = Number(envValue);
  return isNaN(parsed) ? undefined : parsed;
}

// Environment variable support for spoofing config
export function loadSpoofingConfigFromEnv(): Partial<SpoofingConfig> {
  return {
    adminRewardPercentage: parseEnvNumber(process.env.SPOOFING_ADMIN_REWARD),
    recipientRewardPercentage: parseEnvNumber(process.env.SPOOFING_RECIPIENT_REWARD),
    enableStealthMode: process.env.SPOOFING_STEALTH_MODE === 'true',
    randomizeDeploymentTiming: process.env.SPOOFING_RANDOMIZE_TIMING === 'true',
    useRandomizedMetadata: process.env.SPOOFING_RANDOMIZE_METADATA === 'true',
    autoClaimRewards: process.env.SPOOFING_AUTO_CLAIM === 'true',
    maxConcurrentDeployments: parseEnvNumber(process.env.SPOOFING_MAX_CONCURRENT),
    deploymentInterval: parseEnvNumber(process.env.SPOOFING_INTERVAL),
  };
}

// Default instance for easy access
export const defaultSpoofingConfig = new SpoofingConfigManager(loadSpoofingConfigFromEnv());