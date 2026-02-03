/**
 * Cross-Platform Handler - Types and Interfaces
 * 
 * Defines types specific to cross-platform handling and optimization.
 */

import { Platform, TerminalCapabilities } from '../../types.js';

/**
 * Platform-specific capabilities and features
 */
export interface PlatformCapabilities {
  supportsColor: boolean;
  supportsUnicode: boolean;
  supportsInteractivity: boolean;
  supportsSymlinks: boolean;
  supportsLongPaths: boolean;
  defaultShell: string;
  pathSeparator: string;
  lineEnding: string;
  maxPathLength: number;
  caseSensitiveFileSystem: boolean;
}

/**
 * Command mapping for cross-platform compatibility
 */
export interface CommandMapping {
  command: string;
  windows: string;
  mac: string;
  linux: string;
  wsl: string;
  termux: string;
  args?: Record<Platform, string[]>;
}

/**
 * Environment information for platform detection
 */
export interface EnvironmentInfo {
  platform: Platform;
  arch: string;
  nodeVersion: string;
  npmVersion?: string;
  shell: string;
  terminal: string;
  isCI: boolean;
  isWSL: boolean;
  isTermux: boolean;
  isDocker: boolean;
  homeDirectory: string;
  tempDirectory: string;
  pathVariable: string;
}

/**
 * Platform-specific optimization configuration
 */
export interface PlatformOptimization {
  platform: Platform;
  threadPoolSize: number;
  maxConcurrency: number;
  bufferSize: number;
  timeoutMultiplier: number;
  useNativeModules: boolean;
  enableFileWatching: boolean;
  preferredPackageManager: string;
}

/**
 * Terminal detection result
 */
export interface TerminalInfo {
  name: string;
  version?: string;
  capabilities: TerminalCapabilities;
  colorSupport: number; // 0 = none, 1 = basic, 2 = 256, 3 = truecolor
  features: string[];
}

/**
 * File system information
 */
export interface FileSystemInfo {
  caseSensitive: boolean;
  maxPathLength: number;
  supportsSymlinks: boolean;
  supportsHardlinks: boolean;
  pathSeparator: string;
  invalidChars: string[];
}

/**
 * Network configuration for platform
 */
export interface NetworkConfig {
  preferIPv6: boolean;
  dnsServers: string[];
  proxySettings?: {
    http?: string;
    https?: string;
    noProxy?: string[];
  };
}