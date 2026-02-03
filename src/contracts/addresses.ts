/**
 * Contract Addresses - Mainnet Only
 * Clanker V4 deployments across supported mainnet chains
 */

import { arbitrum, base, mainnet, unichain } from 'viem/chains';

const MONAD_CHAIN_ID = 10143;

// ============================================================================
// Types
// ============================================================================

export interface ClankerContracts {
  factory: `0x${string}`;
  locker: `0x${string}`;
  vault: `0x${string}`;
  airdrop: `0x${string}`;
  devbuy: `0x${string}`;
  mevModule: `0x${string}`;
  feeLocker: `0x${string}`;
  feeStaticHook: `0x${string}`;
  feeDynamicHook: `0x${string}`;
}

export interface ChainDeployment {
  chainId: number;
  name: string;
  contracts: ClankerContracts;
}

// ============================================================================
// Mainnet Deployments
// ============================================================================

export const DEPLOYMENTS: Record<number, ChainDeployment> = {
  // Base (Primary Chain)
  [base.id]: {
    chainId: base.id,
    name: 'Base',
    contracts: {
      factory: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
      locker: '0x63D2DfEA64b3433F4071A98665bcD7Ca14d93496',
      vault: '0x8E845EAd15737bF71904A30BdDD3aEE76d6ADF6C',
      airdrop: '0x56Fa0Da89eD94822e46734e736d34Cab72dF344F',
      devbuy: '0x1331f0788F9c08C8F38D52c7a1152250A9dE00be',
      mevModule: '0xFdc013ce003980889cFfd66b0c8329545ae1d1E8',
      feeLocker: '0xF3622742b1E446D92e45E22923Ef11C2fcD55D68',
      feeStaticHook: '0xDd5EeaFf7BD481AD55Db083062b13a3cdf0A68CC',
      feeDynamicHook: '0x34a45c6B61876d739400Bd71228CbcbD4F53E8cC',
    },
  },

  // Ethereum Mainnet
  [mainnet.id]: {
    chainId: mainnet.id,
    name: 'Ethereum',
    contracts: {
      factory: '0x6C8599779B03B00AAaE63C6378830919Abb75473',
      locker: '0x00C4b21889145CF0D99f2e05919103e0c3991974',
      vault: '0xa1da0600Eb4A9F3D4a892feAa2c2caf80A4A2f14',
      airdrop: '0x303470b6b6a35B06A5A05763A7caD776fbf27B71',
      devbuy: '0x70aDdc06fE89a5cF9E533aea8D025dB06795e492',
      mevModule: '0x33e2Eda238edcF470309b8c6D228986A1204c8f9',
      feeLocker: '0xA9C0a423f0092176fC48d7B50a1fCae8cf5BB441',
      feeStaticHook: '0x6C24D0bCC264EF6A740754A11cA579b9d225e8Cc',
      feeDynamicHook: '0x0000000000000000000000000000000000000000',
    },
  },

  // Arbitrum
  [arbitrum.id]: {
    chainId: arbitrum.id,
    name: 'Arbitrum',
    contracts: {
      factory: '0xEb9D2A726Edffc887a574dC7f46b3a3638E8E44f',
      locker: '0xF3622742b1E446D92e45E22923Ef11C2fcD55D68',
      vault: '0xa1da0600Eb4A9F3D4a892feAa2c2caf80A4A2f14',
      airdrop: '0x303470b6b6a35B06A5A05763A7caD776fbf27B71',
      devbuy: '0x70aDdc06fE89a5cF9E533aea8D025dB06795e492',
      mevModule: '0x4E35277306a83D00E13e8C8A4307C672FA31FC99',
      feeLocker: '0x92C0DCbAba17b0F5f3a7537dA82c0F80520e4dF6',
      feeStaticHook: '0xf7aC669593d2D9D01026Fa5B756DD5B4f7aAa8Cc',
      feeDynamicHook: '0xFd213BE7883db36e1049dC42f5BD6A0ec66B68cC',
    },
  },

  // Unichain
  [unichain.id]: {
    chainId: unichain.id,
    name: 'Unichain',
    contracts: {
      factory: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
      locker: '0x691f97752E91feAcD7933F32a1FEdCeDae7bB59c',
      vault: '0xA9C0a423f0092176fC48d7B50a1fCae8cf5BB441',
      airdrop: '0x35bfE89d95F26674bF06bB8bFE55f8D73E9280D2',
      devbuy: '0x267259e36914839Eb584e962558563760AE28862',
      mevModule: '0x42A95190B4088C88Dd904d930c79deC1158bF09D',
      feeLocker: '0x1d5A0F0BD3eA07F78FC14577f053de7A3FEc35B2',
      feeStaticHook: '0xBc6e5aBDa425309c2534Bc2bC92562F5419ce8Cc',
      feeDynamicHook: '0x9b37A43422D7bBD4C8B231be11E50AD1acE828CC',
    },
  },

  // Monad
  [MONAD_CHAIN_ID]: {
    chainId: MONAD_CHAIN_ID,
    name: 'Monad',
    contracts: {
      factory: '0xF9a0C289Eab6B571c6247094a853810987E5B26D',
      locker: '0xDe51a86D3b6EC9ac4756115D3744335Aa2c30144',
      vault: '0xe7D402A5BEd94E5c49Ac0639E80f784D06E2D397',
      airdrop: '0x654E7221fa51d4359ded21D524E3AfF18e93A507',
      devbuy: '0x8790d79283eB941c719b616CfD0Ef116D13C7683',
      mevModule: '0x0000000000000000000000000000000000000000',
      feeLocker: '0x46B77BaCFd712D79131F1AD7611794869483C353',
      feeStaticHook: '0x94F802a9EFE4dd542FdBd77a25D9e69A6dC828Cc',
      feeDynamicHook: '0x0000000000000000000000000000000000000000',
    },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get deployment for a chain
 */
export function getDeployment(chainId: number): ChainDeployment | undefined {
  return DEPLOYMENTS[chainId];
}

/**
 * Get contracts for a chain
 */
export function getContracts(chainId: number): ClankerContracts | undefined {
  return DEPLOYMENTS[chainId]?.contracts;
}

/**
 * Check if chain is supported
 */
export function isChainDeployed(chainId: number): boolean {
  return chainId in DEPLOYMENTS;
}

/**
 * Get all deployed chain IDs
 */
export function getDeployedChainIds(): number[] {
  return Object.keys(DEPLOYMENTS).map(Number);
}
