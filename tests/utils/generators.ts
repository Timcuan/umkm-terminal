/**
 * Property-based test generators for UMKM Terminal
 * These generators create valid test data for property-based testing
 */

import * as fc from 'fast-check';
import type { SimpleDeployConfig } from '../../src/deployer/index.js';
import type { BatchToken, BatchTemplate, BatchDefaults } from '../../src/batch/index.js';

// ============================================================================
// Basic Generators
// ============================================================================

/**
 * Generate valid Ethereum addresses
 */
export const ethereumAddress = (): fc.Arbitrary<`0x${string}`> =>
  fc.string({ minLength: 40, maxLength: 40 })
    .filter(s => /^[0-9a-fA-F]+$/.test(s))
    .map(hex => `0x${hex.toLowerCase()}` as `0x${string}`);

/**
 * Generate valid addresses (alias for ethereumAddress)
 */
export const generateAddress = ethereumAddress;

/**
 * Generate valid private keys
 */
export const privateKey = (): fc.Arbitrary<`0x${string}`> =>
  fc.string({ minLength: 64, maxLength: 64 })
    .filter(s => /^[0-9a-fA-F]+$/.test(s))
    .map(hex => `0x${hex}` as `0x${string}`);

/**
 * Generate valid transaction hashes
 */
export const txHash = (): fc.Arbitrary<`0x${string}`> =>
  fc.string({ minLength: 64, maxLength: 64 })
    .filter(s => /^[0-9a-fA-F]+$/.test(s))
    .map(hex => `0x${hex}` as `0x${string}`);

/**
 * Generate valid token names
 */
export const tokenName = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 50 }).filter(name => name.trim().length > 0);

/**
 * Generate valid token symbols
 */
export const tokenSymbol = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 10 })
    .filter(symbol => /^[A-Z0-9]+$/.test(symbol.toUpperCase()))
    .map(symbol => symbol.toUpperCase());

/**
 * Generate valid IPFS URLs
 */
export const ipfsUrl = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant(''),
    fc.string({ minLength: 46, maxLength: 46 }).map(hash => `ipfs://Qm${hash.slice(2)}`),
    fc.string({ minLength: 59, maxLength: 59 }).map(hash => `ipfs://bafy${hash.slice(4)}`)
  );

/**
 * Generate supported chain IDs
 */
export const chainId = (): fc.Arbitrary<number> =>
  fc.constantFrom(8453, 1, 42161, 130, 10143); // Base, Ethereum, Arbitrum, Unichain, Monad

/**
 * Generate valid percentages (1-100)
 */
export const percentage = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1, max: 100 });

/**
 * Generate valid fee percentages (1-80)
 */
export const feePercentage = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1, max: 80 });

// ============================================================================
// Complex Object Generators
// ============================================================================

/**
 * Generate reward recipient configurations
 */
export const rewardRecipient = (): fc.Arbitrary<{ address: `0x${string}`; allocation: number }> =>
  fc.record({
    address: ethereumAddress(),
    allocation: percentage()
  });

/**
 * Generate arrays of reward recipients that sum to 100%
 */
export const rewardRecipients = (): fc.Arbitrary<Array<{ address: `0x${string}`; allocation: number }>> =>
  fc.integer({ min: 1, max: 7 }).chain(count => {
    if (count === 1) {
      return fc.tuple(ethereumAddress()).map(([address]) => [{ address, allocation: 100 }]);
    }
    
    return fc.tuple(...Array(count).fill(ethereumAddress())).map(addresses => {
      const baseAllocation = Math.floor(100 / count);
      const remainder = 100 - (baseAllocation * count);
      
      return addresses.map((address, index) => ({
        address,
        allocation: index === 0 ? baseAllocation + remainder : baseAllocation
      }));
    });
  });

/**
 * Generate social media configurations
 */
export const socials = (): fc.Arbitrary<{
  twitter?: string;
  telegram?: string;
  discord?: string;
  website?: string;
}> =>
  fc.record({
    twitter: fc.option(fc.webUrl(), { nil: undefined }),
    telegram: fc.option(fc.webUrl(), { nil: undefined }),
    discord: fc.option(fc.webUrl(), { nil: undefined }),
    website: fc.option(fc.webUrl(), { nil: undefined })
  });

/**
 * Generate fee configurations
 */
export const feeConfig = (): fc.Arbitrary<{
  type: 'static' | 'dynamic';
  clankerFee?: number;
  pairedFee?: number;
  baseFee?: number;
  maxLpFee?: number;
}> =>
  fc.oneof(
    // Static fees
    fc.record({
      type: fc.constant('static' as const),
      clankerFee: feePercentage(),
      pairedFee: feePercentage()
    }),
    // Dynamic fees
    fc.record({
      type: fc.constant('dynamic' as const),
      baseFee: fc.integer({ min: 1, max: 5 }),
      maxLpFee: fc.integer({ min: 1, max: 5 })
    })
  );

/**
 * Generate vault configurations
 */
export const vaultConfig = (): fc.Arbitrary<{
  enabled: boolean;
  percentage?: number;
  lockupDays?: number;
  vestingDays?: number;
}> =>
  fc.record({
    enabled: fc.boolean(),
    percentage: fc.option(fc.integer({ min: 1, max: 90 }), { nil: undefined }),
    lockupDays: fc.option(fc.integer({ min: 7, max: 365 }), { nil: undefined }),
    vestingDays: fc.option(fc.integer({ min: 0, max: 365 }), { nil: undefined })
  });

// ============================================================================
// Configuration Generators
// ============================================================================

/**
 * Generate minimal SimpleDeployConfig
 */
export const minimalDeployConfig = (): fc.Arbitrary<SimpleDeployConfig> =>
  fc.record({
    name: tokenName(),
    symbol: tokenSymbol()
  });

/**
 * Generate full SimpleDeployConfig with all optional fields
 */
export const fullDeployConfig = (): fc.Arbitrary<SimpleDeployConfig> =>
  fc.record({
    name: tokenName(),
    symbol: tokenSymbol(),
    image: fc.option(ipfsUrl(), { nil: undefined }),
    description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    socials: fc.option(socials(), { nil: undefined }),
    chainId: fc.option(chainId(), { nil: undefined }),
    tokenAdmin: fc.option(ethereumAddress(), { nil: undefined }),
    rewardRecipients: fc.option(rewardRecipients(), { nil: undefined }),
    fees: fc.option(feeConfig(), { nil: undefined }),
    mev: fc.option(fc.oneof(fc.boolean(), fc.integer({ min: 0, max: 20 })), { nil: undefined }),
    vault: fc.option(vaultConfig(), { nil: undefined })
  });

/**
 * Generate BatchToken configurations
 */
export const batchToken = (): fc.Arbitrary<BatchToken> =>
  fc.record({
    name: tokenName(),
    symbol: tokenSymbol(),
    image: fc.option(ipfsUrl(), { nil: undefined }),
    description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    socials: fc.option(socials(), { nil: undefined }),
    tokenAdmin: fc.option(ethereumAddress(), { nil: undefined }),
    rewardRecipients: fc.option(rewardRecipients(), { nil: undefined }),
    chainId: fc.option(chainId(), { nil: undefined }),
    fees: fc.option(feeConfig(), { nil: undefined }),
    mev: fc.option(fc.oneof(fc.boolean(), fc.integer({ min: 0, max: 20 })), { nil: undefined }),
    vault: fc.option(vaultConfig(), { nil: undefined })
  });

/**
 * Generate BatchDefaults configurations
 */
export const batchDefaults = (): fc.Arbitrary<BatchDefaults> =>
  fc.record({
    chainId: fc.option(chainId(), { nil: undefined }),
    image: fc.option(ipfsUrl(), { nil: undefined }),
    description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tokenAdmin: fc.option(ethereumAddress(), { nil: undefined }),
    rewardRecipients: fc.option(rewardRecipients(), { nil: undefined }),
    fees: fc.option(feeConfig(), { nil: undefined }),
    mev: fc.option(fc.oneof(fc.boolean(), fc.integer({ min: 0, max: 20 })), { nil: undefined }),
    vault: fc.option(vaultConfig(), { nil: undefined })
  });

/**
 * Generate BatchTemplate configurations
 */
export const batchTemplate = (): fc.Arbitrary<BatchTemplate> =>
  fc.record({
    version: fc.constant('1.0'),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    author: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    tags: fc.option(fc.array(fc.string({ maxLength: 20 }), { maxLength: 10 }), { nil: undefined }),
    defaults: batchDefaults(),
    tokens: fc.array(batchToken(), { minLength: 1, maxLength: 100 })
  });

// ============================================================================
// Validation Generators
// ============================================================================

/**
 * Generate invalid private keys for negative testing
 */
export const invalidPrivateKey = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant('invalid-key'),
    fc.string({ maxLength: 10 }), // too short
    fc.string({ minLength: 100 }), // too long
    fc.string({ minLength: 64, maxLength: 64 }).filter(s => /^[0-9a-fA-F]+$/.test(s)), // missing 0x prefix
    fc.string({ minLength: 66, maxLength: 66 }).filter(s => !s.startsWith('0x')), // wrong format
    fc.string({ minLength: 66, maxLength: 66 }).map(s => `0x${s.slice(2).replace(/[0-9a-f]/g, 'G')}`) // invalid hex
  );

/**
 * Generate invalid addresses for negative testing
 */
export const invalidAddress = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant('invalid-address'),
    fc.string({ maxLength: 10 }), // too short
    fc.string({ minLength: 40, maxLength: 40 }).filter(s => /^[0-9a-fA-F]+$/.test(s)), // missing 0x prefix
    fc.string({ minLength: 42, maxLength: 42 }).filter(s => !s.startsWith('0x')), // wrong format
    fc.string({ minLength: 42, maxLength: 42 }).map(s => `0x${s.slice(2).replace(/[0-9a-f]/g, 'G')}`) // invalid hex
  );

/**
 * Generate invalid token configurations for negative testing
 */
export const invalidTokenConfig = (): fc.Arbitrary<Partial<SimpleDeployConfig>> =>
  fc.oneof(
    fc.record({ name: fc.constant(''), symbol: tokenSymbol() }), // empty name
    fc.record({ name: tokenName(), symbol: fc.constant('') }), // empty symbol
    fc.record({ name: tokenName(), symbol: tokenSymbol(), chainId: fc.constant(99999) }), // invalid chain
    fc.record({ 
      name: tokenName(), 
      symbol: tokenSymbol(), 
      rewardRecipients: fc.array(fc.record({
        address: ethereumAddress(),
        allocation: fc.integer({ min: 101, max: 200 }) // invalid allocation > 100
      }), { minLength: 1, maxLength: 3 })
    })
  );

// ============================================================================
// Reward Recipient Generators
// ============================================================================

/**
 * Generate reward recipient configuration
 */
export const generateRewardRecipientConfig = (): fc.Arbitrary<{
  address: string;
  allocation?: number;
  percentage?: number;
  rewardToken?: 'Both' | 'Paired' | 'Clanker';
}> =>
  fc.record({
    address: ethereumAddress(),
    allocation: fc.option(percentage(), { nil: undefined }),
    percentage: fc.option(percentage(), { nil: undefined }),
    rewardToken: fc.option(fc.constantFrom('Both', 'Paired', 'Clanker'), { nil: undefined })
  });

/**
 * Generate arrays of reward recipient configurations
 */
export const generateRewardRecipientConfigs = (options: {
  minLength?: number;
  maxLength?: number;
} = {}): fc.Arbitrary<Array<{
  address: string;
  allocation?: number;
  percentage?: number;
  rewardToken?: 'Both' | 'Paired' | 'Clanker';
}>> =>
  fc.array(
    generateRewardRecipientConfig(),
    { 
      minLength: options.minLength || 1, 
      maxLength: options.maxLength || 7 
    }
  );