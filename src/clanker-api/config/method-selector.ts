/**
 * Method Selector
 * Intelligent selection between direct contract and API methods
 */

import type { 
  ClankerSDKConfig, 
  OperationMethod, 
  MethodSelectionContext 
} from '../types/config-types.js';

// ============================================================================
// Selection Criteria
// ============================================================================

interface SelectionCriteria {
  weight: number;
  evaluate: (context: MethodSelectionContext) => number; // 0-1 score
  description: string;
}

// ============================================================================
// Selection Criteria Definitions
// ============================================================================

const BANKRBOT_AVAILABILITY_CRITERIA: SelectionCriteria = {
  weight: 0.5,
  evaluate: (context) => context.hasBankrbotKey ? 1 : 0,
  description: 'Bankrbot API key availability'
};

const API_AVAILABILITY_CRITERIA: SelectionCriteria = {
  weight: 0.3,
  evaluate: (context) => context.hasApiKey ? 1 : 0,
  description: 'API key availability'
};

const WALLET_AVAILABILITY_CRITERIA: SelectionCriteria = {
  weight: 0.3,
  evaluate: (context) => context.hasWallet ? 1 : 0,
  description: 'Wallet availability'
};

const CHAIN_SUPPORT_CRITERIA: SelectionCriteria = {
  weight: 0.1,
  evaluate: (context) => context.chainSupported ? 1 : 0,
  description: 'Chain support'
};

const OPERATION_TYPE_CRITERIA: SelectionCriteria = {
  weight: 0.1,
  evaluate: (context) => {
    // Some operations might be better suited for specific methods
    switch (context.operationType) {
      case 'deploy':
        return 0.5; // Neutral - both methods work well
      case 'claim':
      case 'update':
      case 'vault':
        return 0.7; // Slightly favor direct for these operations
      default:
        return 0.5;
    }
  },
  description: 'Operation type suitability'
};

const ALL_CRITERIA: SelectionCriteria[] = [
  API_AVAILABILITY_CRITERIA,
  WALLET_AVAILABILITY_CRITERIA,
  CHAIN_SUPPORT_CRITERIA,
  OPERATION_TYPE_CRITERIA,
];

// ============================================================================
// Method Selector Class
// ============================================================================

export class MethodSelector {
  private config: ClankerSDKConfig;

  constructor(config: ClankerSDKConfig) {
    this.config = config;
  }

  /**
   * Select the best method for a given context
   */
  selectMethod(context: Partial<MethodSelectionContext>): OperationMethod {
    const fullContext = this.buildContext(context);
    const configuredMethod = this.config.operationMethod ?? 'direct';

    // If method is explicitly set and available, use it
    if (configuredMethod !== 'auto') {
      if (this.isMethodAvailable(configuredMethod, fullContext)) {
        return configuredMethod;
      } else {
        // Fallback to auto selection if configured method is not available
        return this.selectBestMethod(fullContext);
      }
    }

    // Auto selection
    return this.selectBestMethod(fullContext);
  }

  /**
   * Check if a specific method is available
   */
  isMethodAvailable(method: OperationMethod, context: MethodSelectionContext): boolean {
    switch (method) {
      case 'bankrbot':
        return context.hasBankrbotKey;
      case 'api':
        return context.hasApiKey;
      case 'direct':
        return context.hasWallet && context.chainSupported;
      case 'auto':
        return context.hasBankrbotKey || context.hasApiKey || (context.hasWallet && context.chainSupported);
      default:
        return false;
    }
  }

  /**
   * Get available methods for current configuration
   */
  getAvailableMethods(context: Partial<MethodSelectionContext> = {}): OperationMethod[] {
    const fullContext = this.buildContext(context);
    const methods: OperationMethod[] = [];

    if (this.isMethodAvailable('bankrbot', fullContext)) {
      methods.push('bankrbot');
    }

    if (this.isMethodAvailable('api', fullContext)) {
      methods.push('api');
    }

    if (this.isMethodAvailable('direct', fullContext)) {
      methods.push('direct');
    }

    if (methods.length > 1) {
      methods.push('auto');
    }

    return methods;
  }

  /**
   * Get selection reasoning for debugging
   */
  getSelectionReasoning(context: Partial<MethodSelectionContext>): {
    selectedMethod: OperationMethod;
    scores: { method: OperationMethod; score: number; available: boolean }[];
    reasoning: string[];
  } {
    const fullContext = this.buildContext(context);
    const apiScore = this.calculateMethodScore('api', fullContext);
    const directScore = this.calculateMethodScore('direct', fullContext);
    
    const scores = [
      { 
        method: 'api' as OperationMethod, 
        score: apiScore, 
        available: this.isMethodAvailable('api', fullContext) 
      },
      { 
        method: 'direct' as OperationMethod, 
        score: directScore, 
        available: this.isMethodAvailable('direct', fullContext) 
      },
    ];

    const selectedMethod = this.selectMethod(context);
    const reasoning: string[] = [];

    // Generate reasoning
    if (!fullContext.hasApiKey && !fullContext.hasWallet) {
      reasoning.push('No API key or wallet configured');
    } else if (!fullContext.hasApiKey) {
      reasoning.push('No API key configured - using direct method');
    } else if (!fullContext.hasWallet) {
      reasoning.push('No wallet configured - using API method');
    } else if (apiScore > directScore) {
      reasoning.push(`API method scored higher (${apiScore.toFixed(2)} vs ${directScore.toFixed(2)})`);
    } else if (directScore > apiScore) {
      reasoning.push(`Direct method scored higher (${directScore.toFixed(2)} vs ${apiScore.toFixed(2)})`);
    } else {
      reasoning.push('Methods scored equally - using configured preference');
    }

    return { selectedMethod, scores, reasoning };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private buildContext(partial: Partial<MethodSelectionContext>): MethodSelectionContext {
    return {
      operationType: partial.operationType ?? 'deploy',
      hasBankrbotKey: partial.hasBankrbotKey ?? !!(this.config.bankrbot?.apiKey),
      hasApiKey: partial.hasApiKey ?? !!(this.config.api?.apiKey),
      hasWallet: partial.hasWallet ?? !!(this.config.wallet),
      chainSupported: partial.chainSupported ?? true, // Assume supported unless specified
      userPreference: partial.userPreference ?? this.config.operationMethod,
    };
  }

  private selectBestMethod(context: MethodSelectionContext): OperationMethod {
    // Check user preference first
    if (context.userPreference && context.userPreference !== 'auto') {
      if (this.isMethodAvailable(context.userPreference, context)) {
        return context.userPreference;
      }
    }

    // Priority order: Bankrbot > API > Direct
    // Bankrbot provides verified tokens and programmatic deployment
    const bankrbotAvailable = this.isMethodAvailable('bankrbot', context);
    const apiAvailable = this.isMethodAvailable('api', context);
    const directAvailable = this.isMethodAvailable('direct', context);

    // Priority: Bankrbot first (verified tokens), then API, then Direct
    if (bankrbotAvailable) {
      return 'bankrbot';
    }

    // If only one method is available, use it
    if (apiAvailable && !directAvailable) {
      return 'api';
    }
    if (directAvailable && !apiAvailable) {
      return 'direct';
    }
    if (!apiAvailable && !directAvailable) {
      // No methods available - fallback to direct (will error later with proper message)
      return 'direct';
    }

    // Both API and direct methods available - calculate scores
    const apiScore = this.calculateMethodScore('api', context);
    const directScore = this.calculateMethodScore('direct', context);

    // Use scores to decide
    return apiScore >= directScore ? 'api' : 'direct';
  }

  private calculateMethodScore(method: OperationMethod, context: MethodSelectionContext): number {
    if (!this.isMethodAvailable(method, context)) {
      return 0;
    }

    // Bankrbot gets highest priority for verified tokens
    if (method === 'bankrbot') {
      return 1.0;
    }

    let totalScore = 0;
    let totalWeight = 0;

    for (const criteria of ALL_CRITERIA) {
      let score = criteria.evaluate(context);
      
      // Invert score for direct method where appropriate
      if (method === 'direct' && criteria === API_AVAILABILITY_CRITERIA) {
        score = 1 - score; // Direct method benefits from NOT having API dependency
      }
      if (method === 'api' && criteria === WALLET_AVAILABILITY_CRITERIA) {
        score = 1 - score; // API method benefits from NOT needing wallet
      }

      totalScore += score * criteria.weight;
      totalWeight += criteria.weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick method selection for common use cases
 */
export function selectMethodForOperation(
  config: ClankerSDKConfig,
  operationType: MethodSelectionContext['operationType']
): OperationMethod {
  const selector = new MethodSelector(config);
  return selector.selectMethod({ operationType });
}

/**
 * Check if configuration supports a specific method
 */
export function supportsMethod(
  config: ClankerSDKConfig,
  method: OperationMethod
): boolean {
  const selector = new MethodSelector(config);
  return selector.isMethodAvailable(method, {
    operationType: 'deploy',
    hasApiKey: !!(config.api?.apiKey),
    hasBankrbotKey: !!(config.bankrbot?.apiKey),
    hasWallet: !!(config.wallet),
    chainSupported: true,
  });
}