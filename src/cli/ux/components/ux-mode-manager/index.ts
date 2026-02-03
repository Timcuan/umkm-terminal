/**
 * UX Mode Manager - Component Entry Point
 * 
 * Exports the UX Mode Manager implementation and related utilities.
 */

export { UXModeManager } from './ux-mode-manager.js';

// Re-export types for convenience
export type {
  UXMode,
  ConfirmationLevel,
  PromptType,
  UXModeManager as IUXModeManager
} from '../../types.js';