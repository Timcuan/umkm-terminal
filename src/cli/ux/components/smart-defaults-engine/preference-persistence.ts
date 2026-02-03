/**
 * Preference Persistence System
 * 
 * Handles persistent storage and retrieval of user preferences,
 * with support for multiple profiles and automatic backup.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { UserPreferences, ConfigurationProfile, UXMode, FeeStrategy, DeployMode } from '../../types.js';
import { LearningPattern, UsageAnalytics } from './types.js';

/**
 * Storage paths
 */
const PREFERENCES_DIR = path.join(os.homedir(), '.umkm-terminal');
const PREFERENCES_FILE = path.join(PREFERENCES_DIR, 'preferences.json');
const PROFILES_FILE = path.join(PREFERENCES_DIR, 'profiles.json');
const BACKUP_DIR = path.join(PREFERENCES_DIR, 'backups');

/**
 * Preference storage structure
 */
interface PreferenceStorage {
  version: string;
  lastUpdated: Date;
  activeProfile: string;
  preferences: UserPreferences;
  patterns: Record<string, LearningPattern[]>;
  analytics: UsageAnalytics;
  metadata: {
    totalSessions: number;
    firstUsed: Date;
    lastBackup: Date;
    migrationVersion: number;
  };
}

/**
 * Profile storage structure
 */
interface ProfileStorage {
  version: string;
  profiles: ConfigurationProfile[];
  activeProfileId: string;
  lastUpdated: Date;
}

/**
 * Preference Persistence Manager
 */
export class PreferencePersistenceManager {
  private static instance: PreferencePersistenceManager;
  private storage: PreferenceStorage | null = null;
  private profiles: ProfileStorage | null = null;
  private autoSaveInterval?: NodeJS.Timeout;

  private constructor() {
    this.initializeStorage();
    this.setupAutoSave();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PreferencePersistenceManager {
    if (!PreferencePersistenceManager.instance) {
      PreferencePersistenceManager.instance = new PreferencePersistenceManager();
    }
    return PreferencePersistenceManager.instance;
  }

  /**
   * Initialize storage directories and files
   */
  private async initializeStorage(): Promise<void> {
    try {
      // Create directories
      await fs.mkdir(PREFERENCES_DIR, { recursive: true });
      await fs.mkdir(BACKUP_DIR, { recursive: true });

      // Load existing storage or create default
      await this.loadStorage();
      await this.loadProfiles();
    } catch (error) {
      console.warn('Failed to initialize preference storage:', error);
    }
  }

  /**
   * Load preferences from storage
   */
  private async loadStorage(): Promise<void> {
    try {
      const data = await fs.readFile(PREFERENCES_FILE, 'utf8');
      this.storage = JSON.parse(data, (key, value) => {
        // Parse dates
        if (key.endsWith('Date') || key === 'lastUsed' || key === 'timestamp' || key === 'lastUpdated') {
          return new Date(value);
        }
        return value;
      });
    } catch (error) {
      // Create default storage
      this.storage = this.createDefaultStorage();
    }
  }

  /**
   * Load profiles from storage
   */
  private async loadProfiles(): Promise<void> {
    try {
      const data = await fs.readFile(PROFILES_FILE, 'utf8');
      this.profiles = JSON.parse(data, (key, value) => {
        if (key.endsWith('Date') || key === 'lastUsed' || key === 'createdAt' || key === 'lastUpdated') {
          return new Date(value);
        }
        return value;
      });
    } catch (error) {
      // Create default profiles
      this.profiles = this.createDefaultProfiles();
    }
  }

  /**
   * Save preferences to storage
   */
  async savePreferences(preferences: UserPreferences): Promise<void> {
    if (!this.storage) {
      this.storage = this.createDefaultStorage();
    }

    this.storage.preferences = preferences;
    this.storage.lastUpdated = new Date();
    this.storage.metadata.totalSessions++;

    await this.persistStorage();
    console.debug('Preferences saved to storage');
  }

  /**
   * Load preferences from storage
   */
  async loadPreferences(): Promise<UserPreferences | null> {
    if (!this.storage) {
      await this.loadStorage();
    }

    return this.storage?.preferences || null;
  }

  /**
   * Save learning patterns
   */
  async savePatterns(patterns: Record<string, LearningPattern[]>): Promise<void> {
    if (!this.storage) {
      this.storage = this.createDefaultStorage();
    }

    this.storage.patterns = patterns;
    this.storage.lastUpdated = new Date();

    await this.persistStorage();
    console.debug('Learning patterns saved to storage');
  }

  /**
   * Load learning patterns
   */
  async loadPatterns(): Promise<Record<string, LearningPattern[]>> {
    if (!this.storage) {
      await this.loadStorage();
    }

    return this.storage?.patterns || {};
  }

  /**
   * Save analytics data
   */
  async saveAnalytics(analytics: UsageAnalytics): Promise<void> {
    if (!this.storage) {
      this.storage = this.createDefaultStorage();
    }

    this.storage.analytics = analytics;
    this.storage.lastUpdated = new Date();

    await this.persistStorage();
    console.debug('Analytics saved to storage');
  }

  /**
   * Load analytics data
   */
  async loadAnalytics(): Promise<UsageAnalytics | null> {
    if (!this.storage) {
      await this.loadStorage();
    }

    return this.storage?.analytics || null;
  }

  /**
   * Create a new profile
   */
  async createProfile(name: string, description: string, preferences: UserPreferences): Promise<string> {
    if (!this.profiles) {
      this.profiles = this.createDefaultProfiles();
    }

    const profileId = `profile-${Date.now()}`;
    const profile: ConfigurationProfile = {
      id: profileId,
      name,
      description,
      configuration: { userProfiles: [{ 
        id: preferences.userId,
        name: preferences.userId,
        preferences,
        configurations: [],
        createdAt: new Date(),
        lastActive: new Date()
      }] } as any,
      isActive: false,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.profiles.profiles.push(profile);
    this.profiles.lastUpdated = new Date();

    await this.persistProfiles();
    console.debug(`Created profile: ${name} (${profileId})`);

    return profileId;
  }

  /**
   * Switch to a different profile
   */
  async switchProfile(profileId: string): Promise<boolean> {
    if (!this.profiles) {
      await this.loadProfiles();
    }

    const profile = this.profiles?.profiles.find(p => p.id === profileId);
    if (!profile) {
      return false;
    }

    // Deactivate current profile
    if (this.profiles) {
      this.profiles.profiles.forEach(p => p.isActive = false);
      
      // Activate new profile
      profile.isActive = true;
      profile.lastUsed = new Date();
      this.profiles.activeProfileId = profileId;
      this.profiles.lastUpdated = new Date();

      await this.persistProfiles();
      console.debug(`Switched to profile: ${profile.name} (${profileId})`);
    }

    return true;
  }

  /**
   * Get all profiles
   */
  async getProfiles(): Promise<ConfigurationProfile[]> {
    if (!this.profiles) {
      await this.loadProfiles();
    }

    return this.profiles?.profiles || [];
  }

  /**
   * Get active profile
   */
  async getActiveProfile(): Promise<ConfigurationProfile | null> {
    const profiles = await this.getProfiles();
    return profiles.find(p => p.isActive) || null;
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    if (!this.profiles) {
      await this.loadProfiles();
    }

    const index = this.profiles?.profiles.findIndex(p => p.id === profileId);
    if (index === undefined || index === -1) {
      return false;
    }

    this.profiles!.profiles.splice(index, 1);
    this.profiles!.lastUpdated = new Date();

    await this.persistProfiles();
    console.debug(`Deleted profile: ${profileId}`);

    return true;
  }

  /**
   * Export preferences to file
   */
  async exportPreferences(filePath: string): Promise<void> {
    if (!this.storage) {
      await this.loadStorage();
    }

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date(),
      preferences: this.storage?.preferences,
      patterns: this.storage?.patterns,
      analytics: this.storage?.analytics,
      profiles: this.profiles?.profiles
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    console.debug(`Preferences exported to: ${filePath}`);
  }

  /**
   * Import preferences from file
   */
  async importPreferences(filePath: string): Promise<void> {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(data, (key, value) => {
        if (key.endsWith('Date') || key === 'lastUsed' || key === 'timestamp' || key === 'lastUpdated') {
          return new Date(value);
        }
        return value;
      });

      // Create backup before import
      await this.createBackup();

      // Import data
      if (importData.preferences) {
        await this.savePreferences(importData.preferences);
      }

      if (importData.patterns) {
        await this.savePatterns(importData.patterns);
      }

      if (importData.analytics) {
        await this.saveAnalytics(importData.analytics);
      }

      if (importData.profiles && this.profiles) {
        this.profiles.profiles = importData.profiles;
        await this.persistProfiles();
      }

      console.debug(`Preferences imported from: ${filePath}`);
    } catch (error) {
      console.error('Failed to import preferences:', error);
      throw error;
    }
  }

  /**
   * Create backup of current preferences
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);

    await this.exportPreferences(backupFile);

    // Update backup metadata
    if (this.storage) {
      this.storage.metadata.lastBackup = new Date();
      await this.persistStorage();
    }

    console.debug(`Backup created: ${backupFile}`);
    return backupFile;
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      return files
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      return [];
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupFileName: string): Promise<void> {
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    await this.importPreferences(backupPath);
    console.debug(`Restored from backup: ${backupFileName}`);
  }

  /**
   * Clear all preferences
   */
  async clearAllPreferences(): Promise<void> {
    // Create backup before clearing
    await this.createBackup();

    this.storage = this.createDefaultStorage();
    this.profiles = this.createDefaultProfiles();

    await this.persistStorage();
    await this.persistProfiles();

    console.debug('All preferences cleared');
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    preferencesSize: number;
    patternsCount: number;
    profilesCount: number;
    backupsCount: number;
    lastUpdated: Date;
    totalSessions: number;
  }> {
    const preferencesStats = await this.getFileStats(PREFERENCES_FILE);
    const profilesStats = await this.getFileStats(PROFILES_FILE);
    const backups = await this.listBackups();

    return {
      totalSize: preferencesStats.size + profilesStats.size,
      preferencesSize: preferencesStats.size,
      patternsCount: Object.keys(this.storage?.patterns || {}).length,
      profilesCount: this.profiles?.profiles.length || 0,
      backupsCount: backups.length,
      lastUpdated: this.storage?.lastUpdated || new Date(),
      totalSessions: this.storage?.metadata.totalSessions || 0
    };
  }

  /**
   * Setup automatic saving
   */
  private setupAutoSave(): void {
    // Auto-save every 5 minutes
    this.autoSaveInterval = setInterval(async () => {
      if (this.storage) {
        await this.persistStorage();
      }
    }, 5 * 60 * 1000);

    // Cleanup on process exit
    process.on('exit', () => {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
      }
    });
  }

  /**
   * Persist storage to file
   */
  private async persistStorage(): Promise<void> {
    if (!this.storage) return;

    try {
      await fs.writeFile(PREFERENCES_FILE, JSON.stringify(this.storage, null, 2), 'utf8');
    } catch (error) {
      console.warn('Failed to persist preferences:', error);
    }
  }

  /**
   * Persist profiles to file
   */
  private async persistProfiles(): Promise<void> {
    if (!this.profiles) return;

    try {
      await fs.writeFile(PROFILES_FILE, JSON.stringify(this.profiles, null, 2), 'utf8');
    } catch (error) {
      console.warn('Failed to persist profiles:', error);
    }
  }

  /**
   * Create default storage structure
   */
  private createDefaultStorage(): PreferenceStorage {
    return {
      version: '1.0.0',
      lastUpdated: new Date(),
      activeProfile: 'default',
      preferences: {
        userId: 'default-user',
        uxMode: UXMode.NORMAL,
        defaultFeeStrategy: FeeStrategy.DYNAMIC,
        preferredDeployMode: DeployMode.QUICK,
        smartDefaultsEnabled: true,
        platformOptimizations: {
          pathSeparator: '/',
          commandPrefix: '',
          environmentVariables: {},
          terminalCapabilities: {
            supportsColor: true,
            supportsUnicode: true,
            supportsInteractivity: true,
            maxWidth: 80,
            maxHeight: 24
          }
        },
        usageHistory: [],
        lastUpdated: new Date()
      },
      patterns: {},
      analytics: {
        totalChoices: 0,
        uniqueContexts: 0,
        averageConfidence: 0,
        topPatterns: [],
        userSegments: {},
        timeDistribution: {},
        contextDistribution: {},
        accuracyTrend: []
      },
      metadata: {
        totalSessions: 0,
        firstUsed: new Date(),
        lastBackup: new Date(),
        migrationVersion: 1
      }
    };
  }

  /**
   * Create default profiles structure
   */
  private createDefaultProfiles(): ProfileStorage {
    return {
      version: '1.0.0',
      profiles: [],
      activeProfileId: 'default',
      lastUpdated: new Date()
    };
  }

  /**
   * Get file statistics
   */
  private async getFileStats(filePath: string): Promise<{ size: number; modified: Date }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        size: 0,
        modified: new Date()
      };
    }
  }
}