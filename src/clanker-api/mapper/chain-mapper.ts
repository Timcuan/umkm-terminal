/**
 * Chain Mapper
 * Handles mapping between different chain identifier formats and configurations
 */

import { CHAIN_IDS } from '../../chains/index.js';

// ============================================================================
// Chain Mapping Types
// ============================================================================

interface ChainInfo {
  id: number;
  name: string;
  apiSupported: boolean;
  directSupported: boolean;
  nativeCurrency: string;
  blockExplorer: string;
  rpcUrls: string[];
}

// ============================================================================
// Chain Configuration Map
// ============================================================================

const CHAIN_CONFIG_MAP: Record<number, ChainInfo> = {
  [CHAIN_IDS.BASE]: {
    id: CHAIN_IDS.BASE,
    name: 'Base',
    apiSupported: true,
    directSupported: true,
    nativeCurrency: 'ETH',
    blockExplorer: 'https://basescan.org',
    rpcUrls: ['https://mainnet.base.org'],
  },
  [CHAIN_IDS.ETHEREUM]: {
    id: CHAIN_IDS.ETHEREUM,
    name: 'Ethereum',
    apiSupported: true,
    directSupported: true,
    nativeCurrency: 'ETH',
    blockExplorer: 'https://etherscan.io',
    rpcUrls: ['https://eth.llamarpc.com'],
  },
  [CHAIN_IDS.ARBITRUM]: {
    id: CHAIN_IDS.ARBITRUM,
    name: 'Arbitrum',
    apiSupported: true,
    directSupported: true,
    nativeCurrency: 'ETH',
    blockExplorer: 'https://arbiscan.io',
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
  },
  [CHAIN_IDS.UNICHAIN]: {
    id: CHAIN_IDS.UNICHAIN,
    name: 'Unichain',
    apiSupported: true,
    directSupported: true,
    nativeCurrency: 'ETH',
    blockExplorer: 'https://unichain-sepolia.blockscout.com',
    rpcUrls: ['https://sepolia.unichain.org'],
  },
  [CHAIN_IDS.MONAD]: {
    id: CHAIN_IDS.MONAD,
    name: 'Monad',
    apiSupported: false, // API may not support all chains initially
    directSupported: true,
    nativeCurrency: 'MON',
    blockExplorer: 'https://monad.explorer',
    rpcUrls: ['https://rpc.monad.xyz'],
  },
};

// Additional chains that might be supported by API but not direct
const API_ONLY_CHAINS: Record<number, ChainInfo> = {
  137: { // Polygon
    id: 137,
    name: 'Polygon',
    apiSupported: true,
    directSupported: false,
    nativeCurrency: 'MATIC',
    blockExplorer: 'https://polygonscan.com',
    rpcUrls: ['https://polygon-rpc.com'],
  },
  // Solana would be here but it uses different addressing
};

// ============================================================================
// Chain Mapper Class
// ============================================================================

export class ChainMapper {
  /**
   * Get chain information by ID
   */
  getChainInfo(chainId: number): ChainInfo | undefined {
    return CHAIN_CONFIG_MAP[chainId] || API_ONLY_CHAINS[chainId];
  }

  /**
   * Check if chain is supported by API method
   */
  isAPISupportedChain(chainId: number): boolean {
    const info = this.getChainInfo(chainId);
    return info?.apiSupported ?? false;
  }

  /**
   * Check if chain is supported by direct method
   */
  isDirectSupportedChain(chainId: number): boolean {
    const info = this.getChainInfo(chainId);
    return info?.directSupported ?? false;
  }

  /**
   * Get all chains supported by API method
   */
  getAPISupportedChains(): ChainInfo[] {
    const allChains = { ...CHAIN_CONFIG_MAP, ...API_ONLY_CHAINS };
    return Object.values(allChains).filter(chain => chain.apiSupported);
  }

  /**
   * Get all chains supported by direct method
   */
  getDirectSupportedChains(): ChainInfo[] {
    return Object.values(CHAIN_CONFIG_MAP).filter(chain => chain.directSupported);
  }

  /**
   * Map chain ID to API format
   */
  mapChainIdToAPI(chainId: number): {
    chainId: number;
    supported: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const info = this.getChainInfo(chainId);

    if (!info) {
      warnings.push(`Unknown chain ID: ${chainId} - may not be supported`);
      return { chainId, supported: false, warnings };
    }

    if (!info.apiSupported) {
      warnings.push(`Chain ${info.name} (${chainId}) may not be supported by API method`);
      return { chainId, supported: false, warnings };
    }

    return { chainId, supported: true, warnings };
  }

  /**
   * Map chain ID from API format
   */
  mapChainIdFromAPI(chainId: number): {
    chainId: number;
    supported: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const info = this.getChainInfo(chainId);

    if (!info) {
      warnings.push(`Unknown chain ID from API: ${chainId}`);
      return { chainId, supported: false, warnings };
    }

    return { chainId, supported: true, warnings };
  }

  /**
   * Get recommended method for chain
   */
  getRecommendedMethod(chainId: number): {
    method: 'api' | 'direct' | 'both' | 'none';
    reasoning: string;
  } {
    const info = this.getChainInfo(chainId);

    if (!info) {
      return {
        method: 'none',
        reasoning: `Chain ${chainId} is not recognized`,
      };
    }

    if (info.apiSupported && info.directSupported) {
      return {
        method: 'both',
        reasoning: `Chain ${info.name} supports both API and direct methods`,
      };
    }

    if (info.apiSupported) {
      return {
        method: 'api',
        reasoning: `Chain ${info.name} only supports API method`,
      };
    }

    if (info.directSupported) {
      return {
        method: 'direct',
        reasoning: `Chain ${info.name} only supports direct method`,
      };
    }

    return {
      method: 'none',
      reasoning: `Chain ${info.name} is not supported by either method`,
    };
  }

  /**
   * Validate chain compatibility for operation method
   */
  validateChainCompatibility(
    chainId: number,
    operationMethod: 'api' | 'direct' | 'auto' | 'bankrbot'
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestedMethod?: 'api' | 'direct' | 'bankrbot';
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info = this.getChainInfo(chainId);

    if (!info) {
      errors.push(`Chain ${chainId} is not recognized`);
      return { valid: false, errors, warnings };
    }

    switch (operationMethod) {
      case 'api':
        if (!info.apiSupported) {
          errors.push(`Chain ${info.name} (${chainId}) does not support API method`);
          if (info.directSupported) {
            return {
              valid: false,
              errors,
              warnings,
              suggestedMethod: 'direct',
            };
          }
        }
        break;

      case 'bankrbot':
        // Bankrbot supports the same chains as API method
        if (!info.apiSupported) {
          errors.push(`Chain ${info.name} (${chainId}) does not support Bankrbot method`);
          if (info.directSupported) {
            return {
              valid: false,
              errors,
              warnings,
              suggestedMethod: 'direct',
            };
          }
        }
        break;

      case 'direct':
        if (!info.directSupported) {
          errors.push(`Chain ${info.name} (${chainId}) does not support direct method`);
          if (info.apiSupported) {
            return {
              valid: false,
              errors,
              warnings,
              suggestedMethod: 'api',
            };
          }
        }
        break;

      case 'auto':
        if (!info.apiSupported && !info.directSupported) {
          errors.push(`Chain ${info.name} (${chainId}) is not supported by any method`);
        } else if (!info.apiSupported) {
          warnings.push(`Chain ${info.name} only supports direct method`);
        } else if (!info.directSupported) {
          warnings.push(`Chain ${info.name} only supports API method`);
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get chain-specific configuration differences
   */
  getChainSpecificConfig(chainId: number): {
    hasFeeDynamicHook: boolean;
    hasMevModule: boolean;
    defaultPairedToken: string;
    specialConsiderations: string[];
  } {
    const info = this.getChainInfo(chainId);
    const considerations: string[] = [];

    // Default configuration
    let config = {
      hasFeeDynamicHook: true,
      hasMevModule: true,
      defaultPairedToken: '0x4200000000000000000000000000000000000006', // WETH on Base
      specialConsiderations: considerations,
    };

    if (!info) {
      considerations.push('Unknown chain - using default configuration');
      return config;
    }

    // Chain-specific overrides
    switch (chainId) {
      case CHAIN_IDS.ETHEREUM:
        config.hasFeeDynamicHook = false; // Ethereum doesn't have dynamic fee hook
        considerations.push('Dynamic fees not available on Ethereum');
        config.defaultPairedToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH on Ethereum
        break;

      case CHAIN_IDS.MONAD:
        config.hasMevModule = false; // Monad doesn't have MEV module deployed
        considerations.push('MEV protection not available on Monad');
        config.defaultPairedToken = '0x0000000000000000000000000000000000000000'; // No WETH equivalent yet
        considerations.push('Paired token configuration may need adjustment');
        break;

      case CHAIN_IDS.ARBITRUM:
        config.defaultPairedToken = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'; // WETH on Arbitrum
        break;

      case 137: // Polygon
        config.defaultPairedToken = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'; // WETH on Polygon
        config.hasMevModule = false; // May not be deployed
        considerations.push('MEV protection may not be available on Polygon');
        break;
    }

    return config;
  }
}

// ============================================================================
// Factory Functions and Utilities
// ============================================================================

/**
 * Create chain mapper instance
 */
export function createChainMapper(): ChainMapper {
  return new ChainMapper();
}

/**
 * Quick chain validation
 */
export function validateChainForMethod(
  chainId: number,
  method: 'api' | 'direct' | 'auto' | 'bankrbot'
): boolean {
  const mapper = createChainMapper();
  const result = mapper.validateChainCompatibility(chainId, method);
  return result.valid;
}

/**
 * Get supported chains for method
 */
export function getSupportedChainsForMethod(method: 'api' | 'direct'): ChainInfo[] {
  const mapper = createChainMapper();
  return method === 'api' 
    ? mapper.getAPISupportedChains()
    : mapper.getDirectSupportedChains();
}

/**
 * Check if chain needs special handling
 */
export function chainNeedsSpecialHandling(chainId: number): boolean {
  const mapper = createChainMapper();
  const config = mapper.getChainSpecificConfig(chainId);
  return config.specialConsiderations.length > 0;
}