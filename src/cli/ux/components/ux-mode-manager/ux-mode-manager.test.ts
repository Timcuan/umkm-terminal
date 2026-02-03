/**
 * UX Mode Manager - Property-Based Tests
 * 
 * Comprehensive property-based tests for UX Mode Manager functionality.
 * Tests universal properties that should hold across all valid inputs.
 */

import fc from 'fast-check';
import { UXModeManager } from './ux-mode-manager.js';
import {
  UXMode,
  PromptType,
  ConfirmationLevel,
  DEFAULT_CONFIRMATION_LEVELS
} from '../../index.js';
import {
  uxModeArb,
  assertPropertyTest,
  createSpy,
  wait
} from '../../testing/setup.js';

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('UXModeManager - Property-Based Tests', () => {
  let manager: UXModeManager;

  beforeEach(() => {
    manager = new UXModeManager();
  });

  afterEach(async () => {
    // Clean up any persisted state
    await manager.resetToDefaults();
  });

  /**
   * Feature: cli-user-experience-optimization, Property 1: UX Mode Behavior Consistency
   * 
   * For any UX mode (normal/fast/ultra/expert) and any CLI operation, the system should 
   * apply the appropriate interaction patterns consistently - normal mode provides standard 
   * prompts, fast mode reduces confirmations, ultra mode minimizes prompts with smart defaults, 
   * and expert mode provides direct access with minimal overhead.
   * 
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4
   */
  it('Property 1: UX Mode Behavior Consistency', () => {
    const property = fc.property(
      uxModeArb,
      fc.constantFrom(...Object.values(PromptType)),
      async (mode: UXMode, promptType: PromptType) => {
        // Set the mode
        await manager.setMode(mode);
        
        // Get confirmation level and prompt decision
        const confirmationLevel = manager.getConfirmationLevel();
        const shouldShow = manager.shouldShowPrompt(promptType);
        
        // Verify mode-specific behavior consistency
        switch (mode) {
          case UXMode.NORMAL:
            // Normal mode: standard prompts and confirmations
            expect(confirmationLevel.requiresConfirmation).toBe(true);
            expect(confirmationLevel.showDetailedPrompts).toBe(true);
            expect(confirmationLevel.enableSmartDefaults).toBe(false);
            expect(confirmationLevel.minimizeOutput).toBe(false);
            
            // Normal mode shows most prompts
            if (promptType === PromptType.CONFIRMATION || promptType === PromptType.OPTIONAL) {
              expect(shouldShow).toBe(true);
            }
            break;
            
          case UXMode.FAST:
            // Fast mode: reduced confirmations, smart defaults enabled
            expect(confirmationLevel.requiresConfirmation).toBe(false);
            expect(confirmationLevel.showDetailedPrompts).toBe(false);
            expect(confirmationLevel.enableSmartDefaults).toBe(true);
            expect(confirmationLevel.minimizeOutput).toBe(false);
            
            // Fast mode skips optional prompts
            if (promptType === PromptType.OPTIONAL) {
              expect(shouldShow).toBe(false);
            }
            break;
            
          case UXMode.ULTRA:
            // Ultra mode: minimal prompts, auto-confirm, minimize output
            expect(confirmationLevel.requiresConfirmation).toBe(false);
            expect(confirmationLevel.showDetailedPrompts).toBe(false);
            expect(confirmationLevel.enableSmartDefaults).toBe(true);
            expect(confirmationLevel.minimizeOutput).toBe(true);
            
            // Ultra mode skips transaction and safety prompts
            if (promptType === PromptType.TRANSACTION || promptType === PromptType.SAFETY) {
              expect(shouldShow).toBe(false);
            }
            break;
            
          case UXMode.EXPERT:
            // Expert mode: direct access, minimal interface
            expect(confirmationLevel.requiresConfirmation).toBe(false);
            expect(confirmationLevel.showDetailedPrompts).toBe(false);
            expect(confirmationLevel.enableSmartDefaults).toBe(true);
            expect(confirmationLevel.minimizeOutput).toBe(true);
            break;
        }
        
        // Verify current mode is correctly set
        expect(manager.getCurrentMode()).toBe(mode);
        
        // Verify mode allows appropriate operations
        expect(manager.allowsOperation('deploy')).toBe(true); // Always allowed
        expect(manager.allowsOperation('batch-deploy')).toBe(true); // Always allowed
        
        // Dangerous operations should require confirmation unless expert mode
        const allowsDangerous = manager.allowsOperation('dangerous-operation');
        if (mode === UXMode.EXPERT) {
          expect(allowsDangerous).toBe(true);
        } else if (mode === UXMode.NORMAL) {
          expect(allowsDangerous).toBe(true); // Normal mode requires confirmation
        }
      }
    );

    assertPropertyTest(property, 100);
  });

  /**
   * Feature: cli-user-experience-optimization, Property 2: Mode Persistence and Switching
   * 
   * For any UX mode selection, the system should persist the mode across sessions and 
   * immediately apply new interaction patterns when switching modes.
   * 
   * Validates: Requirements 1.5, 1.6
   */
  it('Property 2: Mode Persistence and Switching', () => {
    const property = fc.property(
      uxModeArb,
      uxModeArb,
      async (initialMode: UXMode, targetMode: UXMode) => {
        // Set initial mode
        await manager.setMode(initialMode);
        expect(manager.getCurrentMode()).toBe(initialMode);
        
        // Get initial confirmation level
        const initialLevel = manager.getConfirmationLevel();
        
        // Switch to target mode
        await manager.setMode(targetMode);
        
        // Verify immediate application of new mode
        expect(manager.getCurrentMode()).toBe(targetMode);
        
        // Verify confirmation level changed if modes are different
        const targetLevel = manager.getConfirmationLevel();
        if (initialMode !== targetMode) {
          // At least one property should be different
          const levelChanged = 
            initialLevel.requiresConfirmation !== targetLevel.requiresConfirmation ||
            initialLevel.showDetailedPrompts !== targetLevel.showDetailedPrompts ||
            initialLevel.enableSmartDefaults !== targetLevel.enableSmartDefaults ||
            initialLevel.minimizeOutput !== targetLevel.minimizeOutput;
          
          expect(levelChanged).toBe(true);
        }
        
        // Test persistence by creating new manager instance
        const newManager = new UXModeManager();
        const persistedMode = await newManager.loadPersistedMode();
        
        // Should load the persisted mode (unless environment override)
        if (!process.env.UX_MODE && !process.env.FAST_MODE && !process.env.AUTO_CONFIRM_TRANSACTIONS) {
          expect(persistedMode).toBe(targetMode);
        }
        
        // Verify mode statistics
        const stats = manager.getModeStatistics();
        expect(stats.currentMode).toBe(targetMode);
        expect(stats.lastUpdated).toBeDefined();
        expect(typeof stats.hasEnvironmentOverride).toBe('boolean');
        expect(typeof stats.hasSessionOverride).toBe('boolean');
      }
    );

    assertPropertyTest(property, 100);
  });

  /**
   * Additional property test for mode validation and error handling
   */
  it('Property: Mode Validation and Error Handling', () => {
    const property = fc.property(
      fc.string(),
      fc.oneof(uxModeArb, fc.string()),
      async (invalidMode: string, validOrInvalidMode: UXMode | string) => {
        // Test invalid mode handling
        if (!Object.values(UXMode).includes(invalidMode as UXMode)) {
          await expect(manager.setMode(invalidMode as UXMode)).rejects.toThrow();
        }
        
        // Test valid mode handling
        if (Object.values(UXMode).includes(validOrInvalidMode as UXMode)) {
          await expect(manager.setMode(validOrInvalidMode as UXMode)).resolves.not.toThrow();
          expect(manager.getCurrentMode()).toBe(validOrInvalidMode);
        }
        
        // Test transition validation
        const canTransition = manager.canTransitionTo(validOrInvalidMode as UXMode);
        if (Object.values(UXMode).includes(validOrInvalidMode as UXMode)) {
          expect(canTransition.success).toBe(true);
        } else {
          expect(canTransition.success).toBe(false);
        }
      }
    );

    assertPropertyTest(property, 100);
  });

  /**
   * Property test for confirmation level consistency
   */
  it('Property: Confirmation Level Consistency', () => {
    const property = fc.property(
      uxModeArb,
      async (mode: UXMode) => {
        await manager.setMode(mode);
        
        const confirmationLevel = manager.getConfirmationLevel();
        const expectedLevel = DEFAULT_CONFIRMATION_LEVELS[mode];
        
        // Verify confirmation level matches expected defaults
        expect(confirmationLevel.requiresConfirmation).toBe(expectedLevel.requiresConfirmation);
        expect(confirmationLevel.showDetailedPrompts).toBe(expectedLevel.showDetailedPrompts);
        expect(confirmationLevel.enableSmartDefaults).toBe(expectedLevel.enableSmartDefaults);
        expect(confirmationLevel.minimizeOutput).toBe(expectedLevel.minimizeOutput);
        
        // Verify consistency across multiple calls
        const secondCall = manager.getConfirmationLevel();
        expect(secondCall).toEqual(confirmationLevel);
      }
    );

    assertPropertyTest(property, 100);
  });

  /**
   * Property test for prompt type handling
   */
  it('Property: Prompt Type Handling Consistency', () => {
    const property = fc.property(
      uxModeArb,
      fc.constantFrom(...Object.values(PromptType)),
      async (mode: UXMode, promptType: PromptType) => {
        await manager.setMode(mode);
        
        const shouldShow1 = manager.shouldShowPrompt(promptType);
        const shouldShow2 = manager.shouldShowPrompt(promptType);
        
        // Verify consistency across multiple calls
        expect(shouldShow1).toBe(shouldShow2);
        
        // Verify logical consistency based on mode and prompt type
        const confirmationLevel = manager.getConfirmationLevel();
        
        switch (promptType) {
          case PromptType.CONFIRMATION:
            expect(shouldShow1).toBe(confirmationLevel.requiresConfirmation);
            break;
          case PromptType.OPTIONAL:
            expect(shouldShow1).toBe(confirmationLevel.showDetailedPrompts);
            break;
          case PromptType.TRANSACTION:
            expect(shouldShow1).toBe(mode !== UXMode.ULTRA);
            break;
          case PromptType.SAFETY:
            expect(shouldShow1).toBe(mode !== UXMode.ULTRA);
            break;
          case PromptType.INFORMATION:
            expect(shouldShow1).toBe(!confirmationLevel.minimizeOutput);
            break;
        }
      }
    );

    assertPropertyTest(property, 100);
  });

  /**
   * Property test for session mode handling
   */
  it('Property: Session Mode Override Consistency', () => {
    const property = fc.property(
      uxModeArb,
      uxModeArb,
      async (persistedMode: UXMode, sessionMode: UXMode) => {
        // Set persisted mode
        await manager.setMode(persistedMode);
        expect(manager.getCurrentMode()).toBe(persistedMode);
        
        // Set session override
        manager.setSessionMode(sessionMode);
        expect(manager.getCurrentMode()).toBe(sessionMode);
        
        // Verify session override is active
        const stats = manager.getModeStatistics();
        expect(stats.hasSessionOverride).toBe(true);
        expect(stats.currentMode).toBe(sessionMode);
        
        // Clear session override
        manager.clearSessionMode();
        
        // Should revert to persisted mode (unless environment override)
        if (!process.env.UX_MODE && !process.env.FAST_MODE && !process.env.AUTO_CONFIRM_TRANSACTIONS) {
          expect(manager.getCurrentMode()).toBe(persistedMode);
        }
        
        // Verify session override is cleared
        const clearedStats = manager.getModeStatistics();
        expect(clearedStats.hasSessionOverride).toBe(false);
      }
    );

    assertPropertyTest(property, 100);
  });
});

// ============================================================================
// Unit Tests for Specific Scenarios
// ============================================================================

describe('UXModeManager - Unit Tests', () => {
  let manager: UXModeManager;

  beforeEach(() => {
    manager = new UXModeManager();
  });

  afterEach(async () => {
    await manager.resetToDefaults();
  });

  it('should initialize with default mode', () => {
    expect(manager.getCurrentMode()).toBe(UXMode.NORMAL);
  });

  it('should handle environment variable overrides', () => {
    // Test with environment variables
    const originalEnv = process.env;
    
    // Test FAST_MODE override
    process.env = { ...originalEnv, FAST_MODE: 'true' };
    const fastManager = new UXModeManager();
    expect(fastManager.getCurrentMode()).toBe(UXMode.FAST);
    
    // Test AUTO_CONFIRM_TRANSACTIONS override
    process.env = { ...originalEnv, AUTO_CONFIRM_TRANSACTIONS: 'true' };
    const ultraManager = new UXModeManager();
    expect(ultraManager.getCurrentMode()).toBe(UXMode.ULTRA);
    
    // Restore environment
    process.env = originalEnv;
  });

  it('should provide mode descriptions', () => {
    expect(manager.getModeDescription(UXMode.NORMAL)).toContain('Standard prompts');
    expect(manager.getModeDescription(UXMode.FAST)).toContain('Reduced confirmations');
    expect(manager.getModeDescription(UXMode.ULTRA)).toContain('Minimal prompts');
    expect(manager.getModeDescription(UXMode.EXPERT)).toContain('Direct access');
  });

  it('should recommend appropriate modes for contexts', () => {
    expect(manager.getRecommendedMode({ isAutomated: true })).toBe(UXMode.ULTRA);
    expect(manager.getRecommendedMode({ timeConstrained: true, isBatchOperation: true })).toBe(UXMode.FAST);
    expect(manager.getRecommendedMode({ isExperienced: true })).toBe(UXMode.EXPERT);
    expect(manager.getRecommendedMode({})).toBe(UXMode.NORMAL);
  });

  it('should handle confirmation level updates', async () => {
    await manager.setMode(UXMode.NORMAL);
    
    const originalLevel = manager.getConfirmationLevel();
    expect(originalLevel.requiresConfirmation).toBe(true);
    
    manager.updateConfirmationLevel(UXMode.NORMAL, { requiresConfirmation: false });
    
    const updatedLevel = manager.getConfirmationLevel();
    expect(updatedLevel.requiresConfirmation).toBe(false);
  });

  it('should handle reset to defaults', async () => {
    // Change mode and confirmation level
    await manager.setMode(UXMode.EXPERT);
    manager.updateConfirmationLevel(UXMode.NORMAL, { requiresConfirmation: false });
    
    // Reset to defaults
    await manager.resetToDefaults();
    
    // Should be back to normal mode with default confirmation level
    expect(manager.getCurrentMode()).toBe(UXMode.NORMAL);
    const level = manager.getConfirmationLevel();
    expect(level.requiresConfirmation).toBe(true);
  });

  it('should handle persistence errors gracefully', async () => {
    // Mock fs.writeFile to throw an error
    const originalWriteFile = require('fs/promises').writeFile;
    require('fs/promises').writeFile = jest.fn().mockRejectedValue(new Error('Permission denied'));
    
    // Should throw error when persistence fails
    await expect(manager.setMode(UXMode.FAST)).rejects.toThrow('Failed to persist UX mode');
    
    // Should rollback to previous mode
    expect(manager.getCurrentMode()).toBe(UXMode.NORMAL);
    
    // Restore original function
    require('fs/promises').writeFile = originalWriteFile;
  });
});