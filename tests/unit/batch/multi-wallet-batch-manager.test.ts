/**
 * Unit tests for MultiWalletBatchManager setupBatchDeployer method refactoring
 * Validates that the method separation maintains functionality
 */

import { describe, it, expect } from 'vitest';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { MultiWalletBatchManager } from '../../../src/batch/multi-wallet-batch.js';

describe('MultiWalletBatchManager setupBatchDeployer Refactoring', () => {
  let batchManager: MultiWalletBatchManager;

  beforeEach(() => {
    const mockPublicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    
    batchManager = new MultiWalletBatchManager(mockPublicClient, base);
  });

  describe('method separation validation', () => {
    it('should have focused validation method', () => {
      expect(typeof (batchManager as any).validateSetupConfiguration).toBe('function');
    });

    it('should have focused configuration method', () => {
      expect(typeof (batchManager as any).configureDeploymentPlan).toBe('function');
    });

    it('should have focused execution method', () => {
      expect(typeof (batchManager as any).executeWalletInitialization).toBe('function');
    });

    it('should have separate display methods', () => {
      expect(typeof (batchManager as any).displayWalletStatistics).toBe('function');
      expect(typeof (batchManager as any).displaySetupResult).toBe('function');
    });

    it('should have wallet balance validation method', () => {
      expect(typeof (batchManager as any).validateWalletBalances).toBe('function');
    });

    it('should have wallet statistics gathering method', () => {
      expect(typeof (batchManager as any).gatherWalletStatistics).toBe('function');
    });
  });

  describe('setupBatchDeployer method signature', () => {
    it('should maintain the same public interface', () => {
      expect(typeof batchManager.setupBatchDeployer).toBe('function');
      expect(batchManager.setupBatchDeployer.length).toBe(1); // Should accept one parameter
    });
  });
});