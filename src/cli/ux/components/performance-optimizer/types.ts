/**
 * Performance Optimizer - Types and Interfaces
 * 
 * Defines types specific to the performance optimization component.
 */

/**
 * Performance metrics for monitoring system performance
 */
export interface PerformanceMetrics {
  startupTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  averageResponseTime: number;
  moduleLoadTime: number;
  lazyLoadedModules: number;
  totalModules: number;
  cacheSize: number;
}

/**
 * Cache entry for performance optimization
 */
export interface CacheEntry {
  key: string;
  value: any;
  timestamp: Date;
  expiresAt: Date;
  accessCount: number;
  size: number;
}

/**
 * Lazy module definition
 */
export interface LazyModule {
  name: string;
  path: string;
  loaded: boolean;
  loadTime?: number;
  size?: number;
  dependencies?: string[];
}

/**
 * Conditional import configuration
 */
export interface ConditionalImportConfig {
  condition: () => boolean;
  modulePath: string;
  fallback?: any;
  priority: number;
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

/**
 * Performance optimization configuration
 */
export interface OptimizationConfig {
  enableConditionalImports: boolean;
  enableLazyLoading: boolean;
  enableCaching: boolean;
  cacheMaxSize: number;
  cacheTTL: number;
  memoryThreshold: number;
  startupTimeout: number;
}