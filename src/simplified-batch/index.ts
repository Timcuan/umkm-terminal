/**
 * Simplified Batch Deployment System
 * 
 * A streamlined, user-focused batch deployment system that replaces the complex
 * multi-layered architecture with clear separation of concerns and intelligent defaults.
 * 
 * Key Features:
 * - Single wallet deployment by default
 * - Proactive balance validation
 * - Real-time progress tracking
 * - Intelligent error handling
 * - Session management with pause/resume
 * - Template-free deployments
 * - Automatic gas management
 */

// Export core types
export type * from './types/core.js';

// Export interfaces
export type * from './interfaces/index.js';

// Export constants and defaults
export * from './constants/index.js';

// Export utilities
export * from './utils/index.js';

// Export validation components
export * from './validation/index.js';

// Main system components will be exported here once implemented
// export { DeploymentController } from './components/deployment-controller.js';
// export { BalanceChecker } from './components/balance-checker.js';
// export { SimpleDeployer } from './components/simple-deployer.js';
// export { ProgressTracker } from './components/progress-tracker.js';
// export { ErrorHandler } from './components/error-handler.js';
// export { SessionManager } from './components/session-manager.js';
// export { GasEstimator } from './components/gas-estimator.js';
// export { Storage } from './components/storage.js';
// export { ComponentFactory } from './components/factory.js';

// Export simplified API facade
// export { SimplifiedBatchDeployer } from './simplified-batch-deployer.js';

/**
 * Version information
 */
export const SIMPLIFIED_BATCH_VERSION = '1.0.0';

/**
 * System information
 */
export const SYSTEM_INFO = {
  name: 'Simplified Batch Deployment System',
  version: SIMPLIFIED_BATCH_VERSION,
  description: 'Streamlined batch token deployment with intelligent defaults',
  features: [
    'Single wallet deployment',
    'Proactive balance validation', 
    'Real-time progress tracking',
    'Intelligent error handling',
    'Session management',
    'Template-free deployments',
    'Automatic gas management'
  ]
} as const;