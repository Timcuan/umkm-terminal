/**
 * Migration Module
 * Utilities and documentation for migrating to enhanced Clanker SDK
 */

// Export migration utility
export * from './migration-utility.js';

// Export types
export type {
  MigrationAnalysis,
  MigrationOptions,
  MigrationResult,
} from './migration-utility.js';

// Export convenience functions
export {
  analyzeMigration,
  performMigration,
  generateMigrationReport,
  createMigratedClanker,
} from './migration-utility.js';