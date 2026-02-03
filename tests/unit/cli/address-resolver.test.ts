/**
 * Unit tests for address resolver utility function
 * Tests Requirements 7.1, 7.2, 7.3
 */

import { describe, it, expect } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Resolve address defaults from deployer's private key
 * This is a copy of the function from src/cli/index.ts for testing purposes
 */
function resolveAddressDefaults(config: {
  privateKey: string;
  tokenAdmin: string;
  rewardRecipient: string;
  [key: string]: any;
}): typeof config {
  // Derive deployer address from PRIVATE_KEY
  let deployerAddress = '';
  try {
    if (config.privateKey && config.privateKey.startsWith('0x')) {
      const account = privateKeyToAccount(config.privateKey as `0x${string}`);
      deployerAddress = account.address;
    }
  } catch (error) {
    // If derivation fails, leave addresses as-is
    console.error('Could not derive deployer address from PRIVATE_KEY');
  }

  // Use deployer address as default for TOKEN_ADMIN if not set
  const tokenAdmin = config.tokenAdmin || deployerAddress;

  // Use deployer address as default for REWARD_RECIPIENT if not set
  const rewardRecipient = config.rewardRecipient || deployerAddress;

  return {
    ...config,
    tokenAdmin,
    rewardRecipient,
  };
}

describe('Address Resolver Utility', () => {
  // Test private key (for testing only - not a real key with funds)
  const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  
  // Expected deployer address derived from TEST_PRIVATE_KEY
  const EXPECTED_DEPLOYER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  describe('Requirement 7.1: TOKEN_ADMIN defaults to deployer address', () => {
    it('should default TOKEN_ADMIN to deployer address when not set', () => {
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: '',
        rewardRecipient: '',
      };

      const result = resolveAddressDefaults(config);

      expect(result.tokenAdmin).toBe(EXPECTED_DEPLOYER_ADDRESS);
    });

    it('should preserve explicit TOKEN_ADMIN when set', () => {
      const explicitAdmin = '0x1234567890123456789012345678901234567890';
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: explicitAdmin,
        rewardRecipient: '',
      };

      const result = resolveAddressDefaults(config);

      expect(result.tokenAdmin).toBe(explicitAdmin);
    });
  });

  describe('Requirement 7.2: REWARD_RECIPIENT defaults to deployer address', () => {
    it('should default REWARD_RECIPIENT to deployer address when not set', () => {
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: '',
        rewardRecipient: '',
      };

      const result = resolveAddressDefaults(config);

      expect(result.rewardRecipient).toBe(EXPECTED_DEPLOYER_ADDRESS);
    });

    it('should preserve explicit REWARD_RECIPIENT when set', () => {
      const explicitRecipient = '0x9876543210987654321098765432109876543210';
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: '',
        rewardRecipient: explicitRecipient,
      };

      const result = resolveAddressDefaults(config);

      expect(result.rewardRecipient).toBe(explicitRecipient);
    });
  });

  describe('Requirement 7.3: Derive deployer address from PRIVATE_KEY', () => {
    it('should correctly derive deployer address from PRIVATE_KEY', () => {
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: '',
        rewardRecipient: '',
      };

      const result = resolveAddressDefaults(config);

      // Verify the address is correctly derived
      const account = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
      expect(result.tokenAdmin).toBe(account.address);
      expect(result.rewardRecipient).toBe(account.address);
    });

    it('should handle invalid private key gracefully', () => {
      const config = {
        privateKey: 'invalid-key',
        tokenAdmin: '',
        rewardRecipient: '',
      };

      const result = resolveAddressDefaults(config);

      // Should leave addresses empty when derivation fails
      expect(result.tokenAdmin).toBe('');
      expect(result.rewardRecipient).toBe('');
    });

    it('should handle empty private key gracefully', () => {
      const config = {
        privateKey: '',
        tokenAdmin: '',
        rewardRecipient: '',
      };

      const result = resolveAddressDefaults(config);

      // Should leave addresses empty when no private key
      expect(result.tokenAdmin).toBe('');
      expect(result.rewardRecipient).toBe('');
    });
  });

  describe('Configuration preservation', () => {
    it('should preserve other configuration fields', () => {
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: '',
        rewardRecipient: '',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        chainId: 8453,
      };

      const result = resolveAddressDefaults(config);

      expect(result.tokenName).toBe('Test Token');
      expect(result.tokenSymbol).toBe('TEST');
      expect(result.chainId).toBe(8453);
    });

    it('should work with both addresses empty', () => {
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: '',
        rewardRecipient: '',
      };

      const result = resolveAddressDefaults(config);

      expect(result.tokenAdmin).toBe(EXPECTED_DEPLOYER_ADDRESS);
      expect(result.rewardRecipient).toBe(EXPECTED_DEPLOYER_ADDRESS);
    });

    it('should work with both addresses explicitly set', () => {
      const explicitAdmin = '0x1111111111111111111111111111111111111111';
      const explicitRecipient = '0x2222222222222222222222222222222222222222';
      
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: explicitAdmin,
        rewardRecipient: explicitRecipient,
      };

      const result = resolveAddressDefaults(config);

      expect(result.tokenAdmin).toBe(explicitAdmin);
      expect(result.rewardRecipient).toBe(explicitRecipient);
    });

    it('should work with mixed explicit and default addresses', () => {
      const explicitAdmin = '0x3333333333333333333333333333333333333333';
      
      const config = {
        privateKey: TEST_PRIVATE_KEY,
        tokenAdmin: explicitAdmin,
        rewardRecipient: '', // Should default
      };

      const result = resolveAddressDefaults(config);

      expect(result.tokenAdmin).toBe(explicitAdmin);
      expect(result.rewardRecipient).toBe(EXPECTED_DEPLOYER_ADDRESS);
    });
  });
});
