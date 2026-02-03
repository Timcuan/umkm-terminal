/**
 * Batch Operations Module
 * Advanced batch coordination and processing
 */

export {
  BatchCoordinator,
  createBatchCoordinator,
  createBatchCoordinatorWithConfig,
  executeBatchDeployment,
} from './batch-coordinator.js';

export type {
  BatchCoordinationConfig,
  BatchProgress,
  BatchItem,
  BatchExecutionResult,
} from './batch-coordinator.js';