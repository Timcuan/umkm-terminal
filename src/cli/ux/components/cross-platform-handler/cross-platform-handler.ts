/**
 * Cross-Platform Handler Implementation
 * 
 * Handles platform detection, optimization, and ensures consistent command syntax
 * across Windows, Mac, Linux, WSL, and Termux environments.
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execSync } from 'child_process';
import {
  CrossPlatformHandler as ICrossPlatformHandler,
  Environment,
  PlatformSettings
} from '../../interfaces.js';
import { Platform } from '../../types.js';
import {
  PlatformCapabilities,
  CommandMapping,
  EnvironmentInfo,
  PlatformOptimization,
  TerminalInfo,
  FileSystemInfo,
  NetworkConfig
} from './types.js';

/**
 * Default platform capabilities
 */
const DEFAULT_PLATFORM_CAPABILITIES: Record<Platform, PlatformCapabilities> = {
  [Platform.WINDOWS]: {
    supportsColor: true,
    supportsUnicode: true,
    supportsInteractivity: true,
    supportsSymlinks: false,
    supportsLongPaths: false,
    defaultShell: 'cmd.exe',
    pathSeparator: '\\',
    lineEnding: '\r\n',
    maxPathLength: 260,
    caseSensitiveFileSystem: false
  },
  [Platform.MAC]: {
    supportsColor: true,
    supportsUnicode: true,
    supportsInteractivity: true,
    supportsSymlinks: true,
    supportsLongPaths: true,
    defaultShell: 'zsh',
    pathSeparator: '/',
    lineEnding: '\n',
    maxPathLength: 1024,
    caseSensitiveFileSystem: false
  },
  [Platform.LINUX]: {
    supportsColor: true,
    supportsUnicode: true,
    supportsInteractivity: true,
    supportsSymlinks: true,
    supportsLongPaths: true,
    defaultShell: 'bash',
    pathSeparator: '/',
    lineEnding: '\n',
    maxPathLength: 4096,
    caseSensitiveFileSystem: true
  },
  [Platform.WSL]: {
    supportsColor: true,
    supportsUnicode: true,
    supportsInteractivity: true,
    supportsSymlinks: true,
    supportsLongPaths: true,
    defaultShell: 'bash',
    pathSeparator: '/',
    lineEnding: '\n',
    maxPathLength: 4096,
    caseSensitiveFileSystem: true
  },
  [Platform.TERMUX]: {
    supportsColor: true,
    supportsUnicode: true,
    supportsInteractivity: true,
    supportsSymlinks: true,
    supportsLongPaths: true,
    defaultShell: 'bash',
    pathSeparator: '/',
    lineEnding: '\n',
    maxPathLength: 4096,
    caseSensitiveFileSystem: true
  }
};

/**
 * Common command mappings for cross-platform compatibility
 */
const COMMAND_MAPPINGS: CommandMapping[] = [
  {
    command: 'clear',
    windows: 'cls',
    mac: 'clear',
    linux: 'clear',
    wsl: 'clear',
    termux: 'clear'
  },
  {
    command: 'copy',
    windows: 'copy',
    mac: 'cp',
    linux: 'cp',
    wsl: 'cp',
    termux: 'cp',
    args: {
      [Platform.WINDOWS]: ['/Y'],
      [Platform.MAC]: ['-r'],
      [Platform.LINUX]: ['-r'],
      [Platform.WSL]: ['-r'],
      [Platform.TERMUX]: ['-r']
    }
  },
  {
    command: 'remove',
    windows: 'del',
    mac: 'rm',
    linux: 'rm',
    wsl: 'rm',
    termux: 'rm',
    args: {
      [Platform.WINDOWS]: ['/F', '/Q'],
      [Platform.MAC]: ['-rf'],
      [Platform.LINUX]: ['-rf'],
      [Platform.WSL]: ['-rf'],
      [Platform.TERMUX]: ['-rf']
    }
  },
  {
    command: 'list',
    windows: 'dir',
    mac: 'ls',
    linux: 'ls',
    wsl: 'ls',
    termux: 'ls',
    args: {
      [Platform.WINDOWS]: ['/B'],
      [Platform.MAC]: ['-la'],
      [Platform.LINUX]: ['-la'],
      [Platform.WSL]: ['-la'],
      [Platform.TERMUX]: ['-la']
    }
  }
];

/**
 * Cross-Platform Handler implementation
 * 
 * Provides platform detection, optimization, and command compatibility
 * across different operating systems and environments.
 */
export class CrossPlatformHandler implements ICrossPlatformHandler {
  private currentPlatform: Platform;
  private environmentInfo: EnvironmentInfo;
  private platformCapabilities: PlatformCapabilities;
  private commandMappings: Map<string, CommandMapping>;
  private optimizations: PlatformOptimization;

  constructor() {
    this.currentPlatform = this.detectPlatform();
    this.environmentInfo = this.gatherEnvironmentInfo();
    this.platformCapabilities = this.getPlatformCapabilities();
    this.commandMappings = new Map();
    this.optimizations = this.getDefaultOptimizations();

    this.initializeCommandMappings();
    this.applyPlatformOptimizations(this.currentPlatform);
  }

  /**
   * Detect the current platform
   */
  detectPlatform(): Platform {
    const platform = os.platform();
    
    // Check for WSL
    if (this.isWSL()) {
      return Platform.WSL;
    }
    
    // Check for Termux
    if (this.isTermux()) {
      return Platform.TERMUX;
    }
    
    // Map Node.js platform to our Platform enum
    switch (platform) {
      case 'win32':
        return Platform.WINDOWS;
      case 'darwin':
        return Platform.MAC;
      case 'linux':
        return Platform.LINUX;
      default:
        console.warn(`Unknown platform: ${platform}, defaulting to Linux`);
        return Platform.LINUX;
    }
  }

  /**
   * Apply platform-specific optimizations
   */
  applyPlatformOptimizations(platform: Platform): void {
    const optimization = this.getOptimizationForPlatform(platform);
    
    // Apply thread pool size
    process.env.UV_THREADPOOL_SIZE = optimization.threadPoolSize.toString();
    
    // Apply platform-specific environment variables
    switch (platform) {
      case Platform.WINDOWS:
        this.applyWindowsOptimizations();
        break;
      case Platform.MAC:
        this.applyMacOptimizations();
        break;
      case Platform.LINUX:
        this.applyLinuxOptimizations();
        break;
      case Platform.WSL:
        this.applyWSLOptimizations();
        break;
      case Platform.TERMUX:
        this.applyTermuxOptimizations();
        break;
    }
    
    console.debug(`Applied optimizations for ${platform}`);
  }

  /**
   * Handle platform-specific behaviors
   */
  handlePlatformSpecificBehaviors(): void {
    // Handle path separators
    this.normalizePaths();
    
    // Handle line endings
    this.normalizeLineEndings();
    
    // Handle file permissions
    this.handleFilePermissions();
    
    // Handle terminal capabilities
    this.configureTerminalCapabilities();
  }

  /**
   * Ensure command compatibility across platforms
   */
  ensureCommandCompatibility(): void {
    // Set up command aliases
    this.setupCommandAliases();
    
    // Configure shell environment
    this.configureShellEnvironment();
    
    // Set up PATH normalization
    this.normalizePathEnvironment();
  }

  /**
   * Optimize for specific environment
   */
  optimizeForEnvironment(environment: Environment): void {
    // Apply CI-specific optimizations
    if (environment.isCI) {
      this.applyCIOptimizations();
    }
    
    // Apply terminal-specific optimizations
    this.applyTerminalOptimizations(environment.terminalType);
    
    // Apply shell-specific optimizations
    this.applyShellOptimizations(environment.shellType);
    
    // Apply Node.js version-specific optimizations
    this.applyNodeOptimizations(environment.nodeVersion);
  }

  /**
   * Get platform settings
   */
  getPlatformSettings(platform: Platform): PlatformSettings {
    const capabilities = DEFAULT_PLATFORM_CAPABILITIES[platform];
    
    return {
      pathSeparator: capabilities.pathSeparator,
      commandPrefix: this.getCommandPrefix(platform),
      environmentVariables: this.getEnvironmentVariables(platform),
      terminalCapabilities: {
        supportsColor: capabilities.supportsColor,
        supportsUnicode: capabilities.supportsUnicode,
        supportsInteractivity: capabilities.supportsInteractivity,
        maxWidth: this.getTerminalWidth(),
        maxHeight: this.getTerminalHeight()
      }
    };
  }

  /**
   * Check if running in WSL
   */
  private isWSL(): boolean {
    try {
      const release = os.release();
      return release.includes('Microsoft') || release.includes('WSL');
    } catch {
      return false;
    }
  }

  /**
   * Check if running in Termux
   */
  private isTermux(): boolean {
    return process.env.PREFIX === '/data/data/com.termux/files/usr' ||
           !!process.env.TERMUX_VERSION;
  }

  /**
   * Gather comprehensive environment information
   */
  private gatherEnvironmentInfo(): EnvironmentInfo {
    return {
      platform: this.currentPlatform,
      arch: os.arch(),
      nodeVersion: process.version,
      npmVersion: this.getNpmVersion(),
      shell: this.detectShell(),
      terminal: this.detectTerminal(),
      isCI: this.isCI(),
      isWSL: this.isWSL(),
      isTermux: this.isTermux(),
      isDocker: this.isDocker(),
      homeDirectory: os.homedir(),
      tempDirectory: os.tmpdir(),
      pathVariable: process.env.PATH || ''
    };
  }

  /**
   * Get platform capabilities
   */
  private getPlatformCapabilities(): PlatformCapabilities {
    const defaultCapabilities = DEFAULT_PLATFORM_CAPABILITIES[this.currentPlatform];
    
    // Override with runtime detection
    return {
      ...defaultCapabilities,
      supportsColor: this.detectColorSupport(),
      supportsUnicode: this.detectUnicodeSupport(),
      supportsInteractivity: this.detectInteractivitySupport()
    };
  }

  /**
   * Initialize command mappings
   */
  private initializeCommandMappings(): void {
    COMMAND_MAPPINGS.forEach(mapping => {
      this.commandMappings.set(mapping.command, mapping);
    });
  }

  /**
   * Get default optimizations for current platform
   */
  private getDefaultOptimizations(): PlatformOptimization {
    return this.getOptimizationForPlatform(this.currentPlatform);
  }

  /**
   * Get optimization configuration for specific platform
   */
  private getOptimizationForPlatform(platform: Platform): PlatformOptimization {
    const baseConfig = {
      platform,
      threadPoolSize: 4,
      maxConcurrency: 10,
      bufferSize: 64 * 1024,
      timeoutMultiplier: 1.0,
      useNativeModules: true,
      enableFileWatching: true,
      preferredPackageManager: 'npm'
    };

    switch (platform) {
      case Platform.WINDOWS:
        return {
          ...baseConfig,
          threadPoolSize: 8,
          maxConcurrency: 6,
          timeoutMultiplier: 1.5,
          preferredPackageManager: 'npm'
        };
      case Platform.MAC:
        return {
          ...baseConfig,
          threadPoolSize: 6,
          maxConcurrency: 8,
          timeoutMultiplier: 1.0,
          preferredPackageManager: 'npm'
        };
      case Platform.LINUX:
        return {
          ...baseConfig,
          threadPoolSize: 4,
          maxConcurrency: 12,
          timeoutMultiplier: 0.8,
          preferredPackageManager: 'npm'
        };
      case Platform.WSL:
        return {
          ...baseConfig,
          threadPoolSize: 4,
          maxConcurrency: 8,
          timeoutMultiplier: 1.2,
          enableFileWatching: false, // WSL file watching can be problematic
          preferredPackageManager: 'npm'
        };
      case Platform.TERMUX:
        return {
          ...baseConfig,
          threadPoolSize: 2,
          maxConcurrency: 4,
          bufferSize: 32 * 1024,
          timeoutMultiplier: 2.0,
          useNativeModules: false,
          preferredPackageManager: 'npm'
        };
      default:
        return baseConfig;
    }
  }

  /**
   * Apply Windows-specific optimizations
   */
  private applyWindowsOptimizations(): void {
    // Enable long path support if available
    process.env.NODE_OPTIONS = [
      process.env.NODE_OPTIONS,
      '--max-old-space-size=4096'
    ].filter(Boolean).join(' ');
    
    // Set Windows-specific environment
    process.env.FORCE_COLOR = '1';
  }

  /**
   * Apply macOS-specific optimizations
   */
  private applyMacOptimizations(): void {
    // macOS-specific optimizations
    process.env.NODE_OPTIONS = [
      process.env.NODE_OPTIONS,
      '--max-old-space-size=8192'
    ].filter(Boolean).join(' ');
  }

  /**
   * Apply Linux-specific optimizations
   */
  private applyLinuxOptimizations(): void {
    // Linux-specific optimizations
    process.env.NODE_OPTIONS = [
      process.env.NODE_OPTIONS,
      '--max-old-space-size=4096'
    ].filter(Boolean).join(' ');
  }

  /**
   * Apply WSL-specific optimizations
   */
  private applyWSLOptimizations(): void {
    // WSL-specific optimizations
    process.env.NODE_OPTIONS = [
      process.env.NODE_OPTIONS,
      '--max-old-space-size=2048'
    ].filter(Boolean).join(' ');
    
    // Disable file watching in WSL due to performance issues
    process.env.CHOKIDAR_USEPOLLING = 'true';
  }

  /**
   * Apply Termux-specific optimizations
   */
  private applyTermuxOptimizations(): void {
    // Termux-specific optimizations
    process.env.NODE_OPTIONS = [
      process.env.NODE_OPTIONS,
      '--max-old-space-size=1024'
    ].filter(Boolean).join(' ');
    
    // Termux has limited resources
    process.env.UV_THREADPOOL_SIZE = '2';
  }

  /**
   * Detect shell type
   */
  private detectShell(): string {
    return process.env.SHELL || 
           process.env.ComSpec || 
           DEFAULT_PLATFORM_CAPABILITIES[this.currentPlatform].defaultShell;
  }

  /**
   * Detect terminal type
   */
  private detectTerminal(): string {
    return process.env.TERM_PROGRAM || 
           process.env.TERMINAL_EMULATOR || 
           process.env.TERM || 
           'unknown';
  }

  /**
   * Check if running in CI environment
   */
  private isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.CIRCLECI ||
      process.env.TRAVIS
    );
  }

  /**
   * Check if running in Docker
   */
  private isDocker(): boolean {
    try {
      return require('fs').existsSync('/.dockerenv');
    } catch {
      return false;
    }
  }

  /**
   * Get npm version
   */
  private getNpmVersion(): string | undefined {
    try {
      return execSync('npm --version', { encoding: 'utf8' }).trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Detect color support
   */
  private detectColorSupport(): boolean {
    return !!(
      process.stdout.isTTY &&
      !process.env.NO_COLOR &&
      (process.env.FORCE_COLOR || process.env.COLORTERM || process.env.TERM_PROGRAM)
    );
  }

  /**
   * Detect Unicode support
   */
  private detectUnicodeSupport(): boolean {
    const encoding = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '';
    return encoding.toLowerCase().includes('utf');
  }

  /**
   * Detect interactivity support
   */
  private detectInteractivitySupport(): boolean {
    return process.stdin.isTTY && process.stdout.isTTY;
  }

  /**
   * Get command prefix for platform
   */
  private getCommandPrefix(platform: Platform): string {
    switch (platform) {
      case Platform.WINDOWS:
        return 'cmd /c';
      default:
        return '';
    }
  }

  /**
   * Get environment variables for platform
   */
  private getEnvironmentVariables(platform: Platform): Record<string, string> {
    const common = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      CLI_PLATFORM: platform
    };

    switch (platform) {
      case Platform.WINDOWS:
        return {
          ...common,
          PATHEXT: process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD'
        };
      default:
        return common;
    }
  }

  /**
   * Get terminal width
   */
  private getTerminalWidth(): number {
    return process.stdout.columns || 80;
  }

  /**
   * Get terminal height
   */
  private getTerminalHeight(): number {
    return process.stdout.rows || 24;
  }

  /**
   * Normalize paths for current platform
   */
  private normalizePaths(): void {
    // Set path separator
    process.env.CLI_PATH_SEPARATOR = this.platformCapabilities.pathSeparator;
  }

  /**
   * Normalize line endings
   */
  private normalizeLineEndings(): void {
    process.env.CLI_LINE_ENDING = this.platformCapabilities.lineEnding;
  }

  /**
   * Handle file permissions
   */
  private handleFilePermissions(): void {
    if (this.currentPlatform !== Platform.WINDOWS) {
      // Set default file permissions for Unix-like systems
      process.umask(0o022);
    }
  }

  /**
   * Configure terminal capabilities
   */
  private configureTerminalCapabilities(): void {
    if (this.platformCapabilities.supportsColor) {
      process.env.FORCE_COLOR = '1';
    }
    
    if (this.platformCapabilities.supportsUnicode) {
      process.env.CLI_UNICODE_SUPPORT = 'true';
    }
  }

  /**
   * Setup command aliases
   */
  private setupCommandAliases(): void {
    // This would set up shell aliases in a real implementation
    console.debug('Command aliases configured');
  }

  /**
   * Configure shell environment
   */
  private configureShellEnvironment(): void {
    const shell = this.detectShell();
    process.env.CLI_SHELL = shell;
    console.debug(`Shell environment configured: ${shell}`);
  }

  /**
   * Normalize PATH environment
   */
  private normalizePathEnvironment(): void {
    const pathSeparator = this.currentPlatform === Platform.WINDOWS ? ';' : ':';
    process.env.CLI_PATH_SEPARATOR_ENV = pathSeparator;
  }

  /**
   * Apply CI-specific optimizations
   */
  private applyCIOptimizations(): void {
    // Disable interactive features in CI
    process.env.CI = 'true';
    process.env.NO_INTERACTIVE = 'true';
    console.debug('CI optimizations applied');
  }

  /**
   * Apply terminal-specific optimizations
   */
  private applyTerminalOptimizations(terminalType: string): void {
    switch (terminalType.toLowerCase()) {
      case 'vscode':
        process.env.TERM_PROGRAM = 'vscode';
        break;
      case 'iterm':
        process.env.COLORTERM = 'truecolor';
        break;
    }
  }

  /**
   * Apply shell-specific optimizations
   */
  private applyShellOptimizations(shellType: string): void {
    process.env.CLI_SHELL_TYPE = shellType;
  }

  /**
   * Apply Node.js version-specific optimizations
   */
  private applyNodeOptimizations(nodeVersion: string): void {
    const majorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
    
    if (majorVersion >= 18) {
      // Use newer Node.js features
      process.env.NODE_OPTIONS = [
        process.env.NODE_OPTIONS,
        '--enable-source-maps'
      ].filter(Boolean).join(' ');
    }
  }

  /**
   * Get cross-platform command
   */
  getCommand(command: string): { cmd: string; args: string[] } {
    const mapping = this.commandMappings.get(command);
    if (!mapping) {
      return { cmd: command, args: [] };
    }

    const platformCommand = mapping[this.currentPlatform];
    const platformArgs = mapping.args?.[this.currentPlatform] || [];

    return {
      cmd: platformCommand,
      args: platformArgs
    };
  }

  /**
   * Get current environment information
   */
  getEnvironmentInfo(): EnvironmentInfo {
    return { ...this.environmentInfo };
  }

  /**
   * Get platform capabilities
   */
  getCurrentPlatformCapabilities(): PlatformCapabilities {
    return { ...this.platformCapabilities };
  }

  /**
   * Get file system information
   */
  getFileSystemInfo(): FileSystemInfo {
    return {
      caseSensitive: this.platformCapabilities.caseSensitiveFileSystem,
      maxPathLength: this.platformCapabilities.maxPathLength,
      supportsSymlinks: this.platformCapabilities.supportsSymlinks,
      supportsHardlinks: this.currentPlatform !== Platform.WINDOWS,
      pathSeparator: this.platformCapabilities.pathSeparator,
      invalidChars: this.getInvalidFileChars()
    };
  }

  /**
   * Get invalid file characters for current platform
   */
  private getInvalidFileChars(): string[] {
    switch (this.currentPlatform) {
      case Platform.WINDOWS:
        return ['<', '>', ':', '"', '|', '?', '*'];
      default:
        return ['\0'];
    }
  }
}