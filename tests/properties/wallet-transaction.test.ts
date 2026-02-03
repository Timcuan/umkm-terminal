/**
 * Property Tests: Wallet Transaction Pattern Consistency
 * 
 * Property 3: Wallet Transaction Pattern Consistency
 * Validates: Requirements 1.3
 * 
 * Tests that the new WalletStoreTransaction provides consistent behavior
 * and maintains transactional integrity for wallet operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { 
  WalletStoreTransaction,
  createWalletTransaction,
  withWalletTransaction,
  syncActiveWalletWithKey
} from '../../src/wallet/transaction.js';
import { 
  loadWalletStore,
  saveWalletStore,
  getStorePath,
  getWalletDir
} from '../../src/wallet/storage.js';
import { generateWallet } from '../../src/wallet/crypto.js';
import type { WalletStore } from '../../src/wallet/types.js';

describe('Property Tests: Wallet Transaction Pattern', () => {
  let originalStore: WalletStore | null = null;
  let testWalletDir: string;

  beforeEach(() => {
    // Backup original store if it exists
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      originalStore = loadWalletStore();
    }
    
    // Clear store for clean tests
    const emptyStore: WalletStore = {
      version: 2,
      activeAddress: null,
      wallets: []
    };
    saveWalletStore(emptyStore);
    
    testWalletDir = getWalletDir();
  });

  afterEach(() => {
    // Restore original store if it existed
    if (originalStore) {
      saveWalletStore(originalStore);
    } else {
      // Clean up test store
      const storePath = getStorePath();
      if (fs.existsSync(storePath)) {
        fs.unlinkSync(storePath);
      }
    }
  });

  // Simple generators for faster tests
  const simplePassword = () => fc.constant('test-password-123');
  const simpleWalletName = () => fc.constant('Test Wallet');
  
  const generateTestWallet = () => {
    const wallet = generateWallet();
    return {
      privateKey: wallet.privateKey,
      address: wallet.address,
      name: 'Test Wallet',
      password: 'test-password-123'
    };
  };

  it('Feature: codebase-refactoring, Property 3.1: Transaction rollback restores original state', { timeout: 5000 }, async () => {
    const wallet = generateTestWallet();
    
    const transaction = createWalletTransaction();
    const originalStore = JSON.parse(JSON.stringify(transaction.getStore()));
    
    // Add wallet to transaction
    const addResult = transaction.addWallet(
      wallet.privateKey,
      wallet.name,
      wallet.password,
      false
    );
    expect(addResult.success).toBe(true);
    
    // Verify wallet was added
    expect(transaction.getStore().wallets).toHaveLength(1);
    
    // Rollback transaction
    transaction.rollback();
    
    // Store should be restored to original state
    const restoredStore = transaction.getStore();
    expect(JSON.stringify(restoredStore)).toBe(JSON.stringify(originalStore));
    expect(restoredStore.wallets).toHaveLength(0);
  });

  it('Feature: codebase-refactoring, Property 3.2: Committed transactions persist to storage', { timeout: 5000 }, async () => {
    const wallet = generateTestWallet();
    
    const transaction = createWalletTransaction();
    const addResult = transaction.addWallet(
      wallet.privateKey,
      wallet.name,
      wallet.password,
      true
    );
    
    expect(addResult.success).toBe(true);
    
    const commitResult = transaction.commit();
    expect(commitResult.success).toBe(true);
    
    // Load fresh store from disk
    const persistedStore = loadWalletStore();
    expect(persistedStore.wallets).toHaveLength(1);
    expect(persistedStore.wallets[0].address).toBe(wallet.address);
    expect(persistedStore.activeAddress).toBe(wallet.address);
  });

  it('Feature: codebase-refactoring, Property 3.3: Auto-commit transactions are immediately persisted', { timeout: 5000 }, async () => {
    const wallet = generateTestWallet();
    
    const transaction = createWalletTransaction({ autoCommit: true });
    const result = transaction.addWallet(
      wallet.privateKey,
      wallet.name,
      wallet.password,
      true
    );
    
    expect(result.success).toBe(true);
    expect(transaction.isCommitted()).toBe(true);
    
    // Should be persisted immediately
    const persistedStore = loadWalletStore();
    expect(persistedStore.wallets).toHaveLength(1);
    expect(persistedStore.wallets[0].address).toBe(wallet.address);
  });

  it('Feature: codebase-refactoring, Property 3.4: Duplicate wallet addresses are rejected', { timeout: 5000 }, async () => {
    const wallet = generateTestWallet();
    
    const transaction = createWalletTransaction();
    
    // Add wallet first time - should succeed
    const firstResult = transaction.addWallet(
      wallet.privateKey,
      wallet.name,
      wallet.password,
      false
    );
    expect(firstResult.success).toBe(true);
    
    // Add same wallet again - should fail
    const secondResult = transaction.addWallet(
      wallet.privateKey,
      'Different Name',
      wallet.password,
      false
    );
    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toContain('already exists');
  });

  it('Feature: codebase-refactoring, Property 3.5: Active wallet management is consistent', { timeout: 5000 }, async () => {
    // Generate unique wallets
    const wallet1 = generateTestWallet();
    const wallet2 = generateTestWallet();
    const wallet3 = generateTestWallet();
    const wallets = [wallet1, wallet2, wallet3];
    const activeIndex = 1; // Make second wallet active
    
    const transaction = createWalletTransaction();
    
    // Add all wallets
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      const result = transaction.addWallet(
        wallet.privateKey,
        `${wallet.name} ${i}`,
        wallet.password,
        i === activeIndex
      );
      expect(result.success).toBe(true);
    }
    
    const store = transaction.getStore();
    
    // Only one wallet should be active
    const activeWallets = store.wallets.filter(w => w.isActive);
    expect(activeWallets).toHaveLength(1);
    
    // The correct wallet should be active
    expect(activeWallets[0].address).toBe(wallets[activeIndex].address);
    expect(store.activeAddress).toBe(wallets[activeIndex].address);
  });

  it('Feature: codebase-refactoring, Property 3.6: Password verification prevents unauthorized access', { timeout: 5000 }, async () => {
    const wallet = generateTestWallet();
    
    const transaction = createWalletTransaction();
    
    // Add wallet
    const addResult = transaction.addWallet(
      wallet.privateKey,
      wallet.name,
      wallet.password,
      false
    );
    expect(addResult.success).toBe(true);
    
    // Try to set as active with wrong password
    const wrongPasswordResult = transaction.setActiveWallet(
      wallet.address,
      'wrong-password'
    );
    expect(wrongPasswordResult.success).toBe(false);
    expect(wrongPasswordResult.error).toContain('Invalid password');
    
    // Try with correct password
    const correctPasswordResult = transaction.setActiveWallet(
      wallet.address,
      wallet.password
    );
    expect(correctPasswordResult.success).toBe(true);
  });

  it('Feature: codebase-refactoring, Property 3.7: Wallet updates preserve other properties', { timeout: 5000 }, async () => {
    const wallet = generateTestWallet();
    
    const transaction = createWalletTransaction();
    
    // Add wallet
    const addResult = transaction.addWallet(
      wallet.privateKey,
      wallet.name,
      wallet.password,
      true
    );
    expect(addResult.success).toBe(true);
    
    const originalWallet = transaction.findWallet(wallet.address);
    expect(originalWallet).toBeTruthy();
    
    // Update name only
    const updateResult = transaction.updateWallet(wallet.address, {
      name: 'Updated Name'
    });
    expect(updateResult.success).toBe(true);
    
    const updatedWallet = transaction.findWallet(wallet.address);
    expect(updatedWallet).toBeTruthy();
    expect(updatedWallet!.name).toBe('Updated Name');
    expect(updatedWallet!.address).toBe(originalWallet!.address);
    expect(updatedWallet!.encryptedKey).toBe(originalWallet!.encryptedKey);
    expect(updatedWallet!.isActive).toBe(originalWallet!.isActive);
  });

  it('Feature: codebase-refactoring, Property 3.8: Removing active wallet updates active address', { timeout: 5000 }, async () => {
    const wallet1 = generateTestWallet();
    const wallet2 = generateTestWallet();
    
    const transaction = createWalletTransaction();
    
    // Add two wallets, first one active
    transaction.addWallet(wallet1.privateKey, 'Wallet 1', wallet1.password, true);
    transaction.addWallet(wallet2.privateKey, 'Wallet 2', wallet2.password, false);
    
    expect(transaction.getStore().activeAddress).toBe(wallet1.address);
    
    // Remove active wallet
    const removeResult = transaction.removeWallet(wallet1.address);
    expect(removeResult.success).toBe(true);
    
    const store = transaction.getStore();
    
    // Second wallet should become active
    expect(store.wallets).toHaveLength(1);
    expect(store.wallets[0].address).toBe(wallet2.address);
    expect(store.wallets[0].isActive).toBe(true);
    expect(store.activeAddress).toBe(wallet2.address);
  });

  it('Feature: codebase-refactoring, Property 3.9: withWalletTransaction handles errors gracefully', { timeout: 5000 }, async () => {
    const result = await withWalletTransaction(async (transaction) => {
      // Add a valid wallet
      const wallet = generateTestWallet();
      const addResult = transaction.addWallet(
        wallet.privateKey,
        wallet.name,
        wallet.password,
        true
      );
      expect(addResult.success).toBe(true);
      
      // Throw an error to test rollback
      throw new Error('Test error');
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Test error');
    
    // Store should be unchanged
    const store = loadWalletStore();
    expect(store.wallets).toHaveLength(0);
  });

  it('Feature: codebase-refactoring, Property 3.10: Transaction state is isolated from storage until commit', { timeout: 5000 }, async () => {
    const wallet = generateTestWallet();
    
    const transaction = createWalletTransaction();
    
    // Add wallet to transaction but don't commit
    const addResult = transaction.addWallet(
      wallet.privateKey,
      wallet.name,
      wallet.password,
      true
    );
    expect(addResult.success).toBe(true);
    
    // Transaction should have the wallet
    expect(transaction.getStore().wallets).toHaveLength(1);
    
    // But storage should still be empty
    const diskStore = loadWalletStore();
    expect(diskStore.wallets).toHaveLength(0);
    
    // After commit, storage should have the wallet
    transaction.commit();
    const updatedDiskStore = loadWalletStore();
    expect(updatedDiskStore.wallets).toHaveLength(1);
  });

  describe('Helper Functions', () => {
    it('Feature: codebase-refactoring, Property 3.11: syncActiveWalletWithKey validates private keys', { timeout: 5000 }, async () => {
      // Test with invalid private key
      const invalidResult = syncActiveWalletWithKey('invalid-key');
      expect(invalidResult).toBe(false);
      
      // Test with valid private key
      const wallet = generateWallet();
      const validResult = syncActiveWalletWithKey(wallet.privateKey);
      expect(validResult).toBe(true);
    });

    it('Feature: codebase-refactoring, Property 3.12: createWalletTransaction factory works correctly', { timeout: 5000 }, async () => {
      const transaction1 = createWalletTransaction();
      expect(transaction1).toBeInstanceOf(WalletStoreTransaction);
      
      const transaction2 = createWalletTransaction({ autoCommit: true });
      expect(transaction2).toBeInstanceOf(WalletStoreTransaction);
      
      // Transactions should be independent
      expect(transaction1).not.toBe(transaction2);
    });
  });

  describe('Error Structure Consistency', () => {
    it('Feature: codebase-refactoring, Property 6: Error Structure Consistency', async () => {
      const transaction = createWalletTransaction();
      
      // Test with invalid private key
      const result = transaction.addWallet('invalid-key', 'Test', 'password');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('Feature: codebase-refactoring, Property 7: Result Type Consistency', async () => {
      const transaction = createWalletTransaction();
      const wallet = generateTestWallet();
      
      const validResult = transaction.addWallet(
        wallet.privateKey,
        wallet.name,
        wallet.password
      );
      const invalidResult = transaction.addWallet('invalid-key', 'Test', 'password');
      
      // All results should follow the Result<T, E> pattern
      expect(validResult).toHaveProperty('success');
      expect(invalidResult).toHaveProperty('success');
      
      if (validResult.success) {
        expect(validResult).toHaveProperty('data');
        expect(validResult).not.toHaveProperty('error');
      }
      
      if (!invalidResult.success) {
        expect(invalidResult).toHaveProperty('error');
        expect(invalidResult).not.toHaveProperty('data');
      }
    });
  });
});