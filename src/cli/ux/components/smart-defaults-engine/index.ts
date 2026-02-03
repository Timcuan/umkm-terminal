/**
 * Smart Defaults Engine - Component Entry Point
 * 
 * Exports the SmartDefaultsEngine implementation for CLI smart defaults and learning.
 */

export { SmartDefaultsEngine } from './smart-defaults-engine.js';
export { FallbackDefaultsProvider } from './fallback-defaults.js';
export { PreferencePersistenceManager } from './preference-persistence.js';
export type { 
  LearningPattern, 
  ContextualDefault, 
  UsageAnalytics,
  RecommendationScore,
  UserChoice,
  ContextAnalysis,
  DefaultGenerationStrategy,
  LearningConfig,
  PatternMatch,
  SuggestionFeedback
} from './types.js';