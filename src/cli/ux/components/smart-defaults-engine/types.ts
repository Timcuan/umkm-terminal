/**
 * Smart Defaults Engine - Type Definitions
 * 
 * Defines types specific to the smart defaults learning system.
 */

/**
 * Learning pattern for user behavior analysis
 */
export interface LearningPattern {
  context: string;
  frequency: number;
  lastUsed: Date;
  value: any;
  confidence: number;
  weight: number;
  accuracy: number;
  contextTags: string[];
  userSegment: string;
  timeOfDay: number;
  dayOfWeek: number;
}

/**
 * Contextual default with detailed information
 */
export interface ContextualDefault {
  key: string;
  value: any;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    value: any;
    confidence: number;
    reasoning: string;
  }>;
  metadata: {
    basedOnPatterns: number;
    lastUsed: Date;
    successRate: number;
    userSegment: string;
  };
}

/**
 * Usage analytics for smart defaults system
 */
export interface UsageAnalytics {
  totalChoices: number;
  uniqueContexts: number;
  averageConfidence: number;
  topPatterns: LearningPattern[];
  userSegments: Record<string, number>;
  timeDistribution: Record<string, number>;
  contextDistribution: Record<string, number>;
  accuracyTrend: Array<{
    date: Date;
    accuracy: number;
  }>;
}

/**
 * Recommendation score for default suggestions
 */
export interface RecommendationScore {
  value: any;
  score: number;
  factors: {
    frequency: number;
    recency: number;
    context: number;
    success: number;
    userSegment: number;
  };
  explanation: string;
}

/**
 * User choice record for learning
 */
export interface UserChoice {
  context: string;
  choice: any;
  timestamp: Date;
  successful: boolean;
  timeToDecision: number;
  alternatives: any[];
  userAgent: string;
  sessionId: string;
}

/**
 * Context analysis result
 */
export interface ContextAnalysis {
  primaryContext: string;
  subContexts: string[];
  similarity: number;
  relevantPatterns: LearningPattern[];
  userSegment: string;
  timeContext: {
    hour: number;
    dayOfWeek: number;
    isWeekend: boolean;
  };
}

/**
 * Default generation strategy
 */
export interface DefaultGenerationStrategy {
  name: string;
  weight: number;
  generator: (context: string, patterns: LearningPattern[]) => any;
  validator: (value: any, context: string) => boolean;
  confidence: (patterns: LearningPattern[]) => number;
}

/**
 * Learning configuration
 */
export interface LearningConfig {
  minPatterns: number;
  maxPatterns: number;
  decayFactor: number;
  confidenceThreshold: number;
  learningRate: number;
  contextSimilarityThreshold: number;
  enableTimeBasedLearning: boolean;
  enableUserSegmentation: boolean;
  maxStorageSize: number;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  pattern: LearningPattern;
  similarity: number;
  relevance: number;
}

/**
 * Suggestion feedback for learning improvement
 */
export interface SuggestionFeedback {
  suggestionId: string;
  accepted: boolean;
  actualChoice: any;
  timestamp: Date;
  context: string;
  userSegment: string;
}