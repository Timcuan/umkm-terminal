/**
 * Performance Optimizer Implementation
 * 
 * Implements conditional imports, lazy loading, and caching for CLI performance optimization.
 * Provides startup time optimization, memory management, and runtime efficiency improvements.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  PerformanceOptimizer as IPerformanceOptimizer,
  PerformanceMetrics
} from '../../interfaces.js';
import {
  PerformanceMetrics as LocalPerformanceMetrics,
  CacheEntry,
  LazyModule,
  ConditionalImportConfig,
  MemoryStats,
  OptimizationConfig
} from './types.js';

/**
 * Default optimization configuration
 */
const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  enableConditionalImports: true,
  enableLazyLoading: true,
  enableCaching: true,
  cacheMaxSize: 100 * 1024 * 1024, // 100MB
  cacheTTL: 300000, // 5 minutes
  memoryThreshold: 512 * 1024 * 1024, // 512MB
  startupTimeout: 5000 // 5 seconds
};

/**
 * Performance Optimizer implementation
 * 
 * Handles conditional imports, lazy loading, memory optimization, and caching
 * to improve CLI startup time and runtime performance.
 */
export class PerformanceOptimizer implements IPerformanceOptimizer {
  private config: OptimizationConfig;
  private cache: Map<string, CacheEntry>;
  private lazyModules: Map<string, LazyModule>;
  private conditionalImports: Map<string, ConditionalImportConfig>;
  private startTime: number;
  private metrics: LocalPerformanceMetrics;
  private memoryMonitorInterval?: NodeJS.Timeout;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
    this.cache = new Map();
    this.lazyModules = new Map();
    this.conditionalImports = new Map();
    this.startTime = Date.now();
    
    this.metrics = {
      startupTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      moduleLoadTime: 0,
      lazyLoadedModules: 0,
      totalModules: 0,
      cacheSize: 0
    };

    this.initialize();
  }

  /**
   * Initialize the performance optimizer
   */
  private initialize(): void {
    if (this.config.enableCaching) {
      this.setupCacheCleanup();
    }
    
    this.startMemoryMonitoring();
    this.setupProcessOptimizations();
  }

  /**
   * Enable conditional imports for faster startup
   */
  enableConditionalImports(): void {
    if (!this.config.enableConditionalImports) {
      return;
    }

    // Register common conditional imports
    this.registerConditionalImport('fs-extra', {
      condition: () => process.env.NODE_ENV !== 'production',
      modulePath: 'fs-extra',
      priority: 1
    });

    this.registerConditionalImport('chalk', {
      condition: () => process.stdout.isTTY && !process.env.NO_COLOR,
      modulePath: 'chalk',
      fallback: { 
        red: (str: string) => str,
        green: (str: string) => str,
        yellow: (str: string) => str,
        blue: (str: string) => str,
        cyan: (str: string) => str,
        magenta: (str: string) => str
      },
      priority: 2
    });

    this.registerConditionalImport('inquirer', {
      condition: () => process.stdin.isTTY,
      modulePath: 'inquirer',
      priority: 3
    });

    console.debug('Conditional imports enabled');
  }

  /**
   * Setup lazy loading for non-essential components
   */
  setupLazyLoading(): void {
    if (!this.config.enableLazyLoading) {
      return;
    }

    // Register lazy-loadable modules
    this.registerLazyModule('enhanced-error-handler', {
      name: 'EnhancedErrorHandler',
      path: '../enhanced-error-handler/enhanced-error-handler.js',
      loaded: false,
      dependencies: ['chalk', 'fs-extra']
    });

    this.registerLazyModule('smart-defaults-engine', {
      name: 'SmartDefaultsEngine',
      path: '../smart-defaults-engine/smart-defaults-engine.js',
      loaded: false,
      dependencies: ['fs-extra']
    });

    this.registerLazyModule('interactive-menu-system', {
      name: 'InteractiveMenuSystem',
      path: '../interactive-menu-system/interactive-menu-system.js',
      loaded: false,
      dependencies: ['inquirer', 'chalk']
    });

    console.debug('Lazy loading enabled');
  }

  /**
   * Optimize memory usage
   */
  optimizeMemoryUsage(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear expired cache entries
    this.clearExpiredCache();

    // Optimize V8 heap
    this.optimizeV8Heap();

    // Monitor memory usage
    const memStats = this.getMemoryStats();
    this.metrics.memoryUsage = memStats.heapUsed;

    console.debug(`Memory optimized: ${Math.round(memStats.heapUsed / 1024 / 1024)}MB used`);
  }

  /**
   * Cache frequently used data
   */
  cacheFrequentlyUsedData(): void {
    if (!this.config.enableCaching) {
      return;
    }

    // Cache system information
    this.setCacheEntry('system-info', {
      platform: os.platform(),
      arch: os.arch(),
      version: os.version(),
      homedir: os.homedir(),
      tmpdir: os.tmpdir()
    });

    // Cache environment variables
    this.setCacheEntry('env-vars', {
      nodeEnv: process.env.NODE_ENV,
      path: process.env.PATH,
      home: process.env.HOME,
      user: process.env.USER
    });

    // Cache package.json data
    this.cachePackageInfo();

    console.debug('Frequently used data cached');
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return {
      startupTime: this.metrics.startupTime,
      memoryUsage: this.metrics.memoryUsage,
      cacheHitRate: this.metrics.cacheHitRate,
      averageResponseTime: this.metrics.averageResponseTime
    };
  }

  /**
   * Register a conditional import
   */
  private registerConditionalImport(name: string, config: ConditionalImportConfig): void {
    this.conditionalImports.set(name, config);
  }

  /**
   * Register a lazy module
   */
  private registerLazyModule(name: string, module: LazyModule): void {
    this.lazyModules.set(name, module);
    this.metrics.totalModules++;
  }

  /**
   * Load a module conditionally
   */
  async loadConditionalModule(name: string): Promise<any> {
    const config = this.conditionalImports.get(name);
    if (!config) {
      throw new Error(`Conditional import '${name}' not registered`);
    }

    if (!config.condition()) {
      return config.fallback || null;
    }

    try {
      const startTime = Date.now();
      const module = await import(config.modulePath);
      const loadTime = Date.now() - startTime;
      
      this.metrics.moduleLoadTime += loadTime;
      console.debug(`Conditionally loaded ${name} in ${loadTime}ms`);
      
      return module;
    } catch (error) {
      console.warn(`Failed to load conditional module ${name}:`, error);
      return config.fallback || null;
    }
  }

  /**
   * Load a module lazily
   */
  async loadLazyModule(name: string): Promise<any> {
    const moduleInfo = this.lazyModules.get(name);
    if (!moduleInfo) {
      throw new Error(`Lazy module '${name}' not registered`);
    }

    if (moduleInfo.loaded) {
      return this.getCacheEntry(`lazy-module-${name}`);
    }

    try {
      const startTime = Date.now();
      
      // Load dependencies first
      if (moduleInfo.dependencies) {
        await Promise.all(
          moduleInfo.dependencies.map(dep => this.loadConditionalModule(dep))
        );
      }

      const module = await import(moduleInfo.path);
      const loadTime = Date.now() - startTime;
      
      // Update module info
      moduleInfo.loaded = true;
      moduleInfo.loadTime = loadTime;
      
      // Cache the module
      this.setCacheEntry(`lazy-module-${name}`, module);
      
      this.metrics.lazyLoadedModules++;
      this.metrics.moduleLoadTime += loadTime;
      
      console.debug(`Lazy loaded ${name} in ${loadTime}ms`);
      
      return module;
    } catch (error) {
      console.error(`Failed to lazy load module ${name}:`, error);
      throw error;
    }
  }

  /**
   * Set cache entry
   */
  private setCacheEntry(key: string, value: any, ttl?: number): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.config.cacheTTL));
    
    const entry: CacheEntry = {
      key,
      value,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      size: this.estimateSize(value)
    };

    this.cache.set(key, entry);
    this.metrics.cacheSize += entry.size;

    // Check cache size limit
    this.enforceMemoryLimit();
  }

  /**
   * Get cache entry
   */
  private getCacheEntry(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.metrics.cacheSize -= entry.size;
      return null;
    }

    entry.accessCount++;
    return entry.value;
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = new Date();
    let clearedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        clearedSize += entry.size;
      }
    }

    this.metrics.cacheSize -= clearedSize;
    console.debug(`Cleared ${clearedSize} bytes of expired cache`);
  }

  /**
   * Enforce memory limit for cache
   */
  private enforceMemoryLimit(): void {
    if (this.metrics.cacheSize <= this.config.cacheMaxSize) {
      return;
    }

    // Sort entries by access count and age
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const scoreA = a[1].accessCount / (Date.now() - a[1].timestamp.getTime());
      const scoreB = b[1].accessCount / (Date.now() - b[1].timestamp.getTime());
      return scoreA - scoreB;
    });

    // Remove least used entries
    let removedSize = 0;
    const targetSize = this.config.cacheMaxSize * 0.8; // Remove to 80% of limit

    for (const [key, entry] of entries) {
      if (this.metrics.cacheSize - removedSize <= targetSize) {
        break;
      }

      this.cache.delete(key);
      removedSize += entry.size;
    }

    this.metrics.cacheSize -= removedSize;
    console.debug(`Enforced memory limit: removed ${removedSize} bytes`);
  }

  /**
   * Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  }

  /**
   * Get memory statistics
   */
  private getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0
    };
  }

  /**
   * Optimize V8 heap
   */
  private optimizeV8Heap(): void {
    // Set V8 flags for optimization
    if (process.env.NODE_ENV === 'production') {
      process.env.NODE_OPTIONS = [
        process.env.NODE_OPTIONS,
        '--optimize-for-size',
        '--max-old-space-size=512'
      ].filter(Boolean).join(' ');
    }
  }

  /**
   * Setup cache cleanup interval
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      this.clearExpiredCache();
    }, 60000); // Clean every minute
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(() => {
      const memStats = this.getMemoryStats();
      this.metrics.memoryUsage = memStats.heapUsed;

      // Trigger optimization if memory usage is high
      if (memStats.heapUsed > this.config.memoryThreshold) {
        console.warn('High memory usage detected, optimizing...');
        this.optimizeMemoryUsage();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Setup process optimizations
   */
  private setupProcessOptimizations(): void {
    // Optimize process priority
    try {
      process.setMaxListeners(20);
    } catch (error) {
      console.debug('Could not set max listeners:', error);
    }

    // Handle process cleanup
    process.on('exit', () => {
      this.cleanup();
    });

    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Cache package.json information
   */
  private async cachePackageInfo(): Promise<void> {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageData = await fs.readFile(packagePath, 'utf8');
      const packageInfo = JSON.parse(packageData);
      
      this.setCacheEntry('package-info', {
        name: packageInfo.name,
        version: packageInfo.version,
        dependencies: Object.keys(packageInfo.dependencies || {}),
        devDependencies: Object.keys(packageInfo.devDependencies || {})
      });
    } catch (error) {
      console.debug('Could not cache package info:', error);
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    this.metrics.startupTime = Date.now() - this.startTime;
    
    // Calculate cache hit rate
    const totalAccess = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    const cacheHits = this.cache.size;
    this.metrics.cacheHitRate = totalAccess > 0 ? (cacheHits / totalAccess) * 100 : 0;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.cache.clear();
    this.metrics.cacheSize = 0;
    
    console.debug('Performance optimizer cleaned up');
  }

  /**
   * Get detailed performance report
   */
  getDetailedMetrics(): LocalPerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Preload essential modules
   */
  async preloadEssentialModules(): Promise<void> {
    const essentialModules = ['chalk', 'fs-extra'];
    
    await Promise.all(
      essentialModules.map(async (moduleName) => {
        try {
          await this.loadConditionalModule(moduleName);
        } catch (error) {
          console.debug(`Could not preload ${moduleName}:`, error);
        }
      })
    );
  }

  /**
   * Optimize for specific platform
   */
  optimizeForPlatform(platform: string): void {
    switch (platform) {
      case 'win32':
        // Windows-specific optimizations
        process.env.UV_THREADPOOL_SIZE = '8';
        break;
      case 'darwin':
        // macOS-specific optimizations
        process.env.UV_THREADPOOL_SIZE = '6';
        break;
      case 'linux':
        // Linux-specific optimizations
        process.env.UV_THREADPOOL_SIZE = '4';
        break;
    }
    
    console.debug(`Optimized for platform: ${platform}`);
  }
}