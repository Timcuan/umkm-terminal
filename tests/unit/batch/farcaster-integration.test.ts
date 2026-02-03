/**
 * Unit tests for FarcasterService
 * Validates Farcaster integration functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FarcasterService } from '../../../src/batch/farcaster-integration.js';

// Mock the farcaster module
vi.mock('../../../src/farcaster/index.js', () => ({
  getUserWallets: vi.fn()
}));

describe('FarcasterService', () => {
  let farcasterService: FarcasterService;

  beforeEach(async () => {
    farcasterService = new FarcasterService();
  });

  describe('fetchUserWallets', () => {
    it('should fetch wallets successfully', async () => {
      const { getUserWallets } = await import('../../../src/farcaster/index.js');
      const mockGetUserWallets = vi.mocked(getUserWallets);
      
      const mockWallets = ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901'];
      mockGetUserWallets.mockResolvedValue({ wallets: mockWallets });

      const result = await farcasterService.fetchUserWallets('testuser');

      expect(result).toEqual(mockWallets);
      expect(mockGetUserWallets).toHaveBeenCalledWith('testuser');
    });

    it('should throw error when no wallets found', async () => {
      const { getUserWallets } = await import('../../../src/farcaster/index.js');
      const mockGetUserWallets = vi.mocked(getUserWallets);
      
      mockGetUserWallets.mockResolvedValue({ wallets: [] });

      await expect(farcasterService.fetchUserWallets('testuser')).rejects.toThrow('No wallets found for Farcaster user');
    });

    it('should throw error when getUserWallets fails', async () => {
      const { getUserWallets } = await import('../../../src/farcaster/index.js');
      const mockGetUserWallets = vi.mocked(getUserWallets);
      
      mockGetUserWallets.mockRejectedValue(new Error('API Error'));

      await expect(farcasterService.fetchUserWallets('testuser')).rejects.toThrow('Failed to fetch Farcaster wallets');
    });
  });

  describe('validateFarcasterInput', () => {
    it('should return true for valid input', async () => {
      const { getUserWallets } = await import('../../../src/farcaster/index.js');
      const mockGetUserWallets = vi.mocked(getUserWallets);
      
      mockGetUserWallets.mockResolvedValue({ wallets: ['0x1234567890123456789012345678901234567890'] });

      const result = await farcasterService.validateFarcasterInput('testuser');

      expect(result).toBe(true);
    });

    it('should return false for invalid input', async () => {
      const { getUserWallets } = await import('../../../src/farcaster/index.js');
      const mockGetUserWallets = vi.mocked(getUserWallets);
      
      mockGetUserWallets.mockRejectedValue(new Error('Invalid user'));

      const result = await farcasterService.validateFarcasterInput('invaliduser');

      expect(result).toBe(false);
    });

    it('should return false when no wallets found', async () => {
      const { getUserWallets } = await import('../../../src/farcaster/index.js');
      const mockGetUserWallets = vi.mocked(getUserWallets);
      
      mockGetUserWallets.mockResolvedValue({ wallets: [] });

      const result = await farcasterService.validateFarcasterInput('testuser');

      expect(result).toBe(false);
    });
  });

  describe('createOptimizedConfigs', () => {
    it('should distribute tokens across wallets', () => {
      const baseConfig = { name: 'Test Token', symbol: 'TEST' };
      const walletAddresses = ['0x1111', '0x2222', '0x3333'];

      const configs = farcasterService.createOptimizedConfigs(baseConfig, 5, walletAddresses);

      expect(configs).toHaveLength(5);
      expect(configs[0].tokenAdmin).toBe('0x1111');
      expect(configs[1].tokenAdmin).toBe('0x2222');
      expect(configs[2].tokenAdmin).toBe('0x3333');
      expect(configs[3].tokenAdmin).toBe('0x1111'); // Wraps around
      expect(configs[4].tokenAdmin).toBe('0x2222');

      // Check metadata
      expect(configs[0].metadata).toEqual({
        batchIndex: 0,
        deployerWallet: '0x1111'
      });
    });
  });

  describe('createTokenConfigsForDistribution', () => {
    it('should create configs based on address distribution', () => {
      const baseConfig = { name: 'Test Token', symbol: 'TEST' };
      const addressDistribution = new Map([
        ['0x1111', ['0xaaaa', '0xbbbb']],
        ['0x2222', ['0xcccc']]
      ]);

      const configs = farcasterService.createTokenConfigsForDistribution(baseConfig, addressDistribution);

      expect(configs).toHaveLength(3);
      
      // First deployer's tokens
      expect(configs[0].tokenAdmin).toBe('0xaaaa');
      expect(configs[0].metadata).toEqual({
        deployerWallet: '0x1111',
        targetAddress: '0xaaaa',
        addressIndex: 0
      });
      
      expect(configs[1].tokenAdmin).toBe('0xbbbb');
      expect(configs[1].metadata).toEqual({
        deployerWallet: '0x1111',
        targetAddress: '0xbbbb',
        addressIndex: 1
      });

      // Second deployer's token
      expect(configs[2].tokenAdmin).toBe('0xcccc');
      expect(configs[2].metadata).toEqual({
        deployerWallet: '0x2222',
        targetAddress: '0xcccc',
        addressIndex: 0
      });
    });
  });
});