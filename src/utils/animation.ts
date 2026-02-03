/**
 * Animation Utilities with Memory Leak Prevention
 * Provides reusable animation components with proper cleanup
 */

import { errorLogger, wrapError } from '../errors/index.js';

// ============================================================================
// Types
// ============================================================================

export interface AnimationOptions {
  /** Frame rate in milliseconds (default: 100) */
  frameRate?: number;
  /** Enable animation only in TTY mode (default: true) */
  ttyOnly?: boolean;
  /** Cleanup on process exit (default: true) */
  cleanupOnExit?: boolean;
}

// ============================================================================
// Base Animation Class
// ============================================================================

export abstract class BaseAnimation {
  protected interval: NodeJS.Timeout | null = null;
  protected active = false;
  protected startTime = Date.now();
  protected frameIndex = 0;
  protected readonly frameRate: number;
  protected readonly ttyOnly: boolean;
  protected cleanupOnExit: boolean;

  constructor(options: AnimationOptions = {}) {
    this.frameRate = options.frameRate || 100;
    this.ttyOnly = options.ttyOnly !== false;
    this.cleanupOnExit = options.cleanupOnExit !== false;

    // Register cleanup handlers
    if (this.cleanupOnExit) {
      this.registerCleanupHandlers();
    }
  }

  /**
   * Start the animation
   */
  start(): void {
    if (this.active) return;

    // Check TTY mode if required
    if (this.ttyOnly && !process.stdout.isTTY) {
      return;
    }

    this.active = true;
    this.startTime = Date.now();
    this.frameIndex = 0;

    try {
      this.onStart();

      if (this.ttyOnly && process.stdout.isTTY) {
        this.interval = setInterval(() => {
          try {
            this.render();
          } catch (error) {
            errorLogger.log(wrapError(error));
            this.stop(false);
          }
        }, this.frameRate);
      }
    } catch (error) {
      errorLogger.log(wrapError(error));
      this.stop(false);
    }
  }

  /**
   * Stop the animation
   */
  stop(success: boolean = true, message?: string): void {
    if (!this.active) return;

    this.active = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    try {
      this.onStop(success, message);
    } catch (error) {
      errorLogger.log(wrapError(error));
    }

    // Cleanup handlers
    if (this.cleanupOnExit) {
      this.unregisterCleanupHandlers();
    }
  }

  /**
   * Force stop and cleanup
   */
  destroy(): void {
    this.stop(false, 'Animation destroyed');
    this.unregisterCleanupHandlers();
  }

  /**
   * Check if animation is active
   */
  isRunning(): boolean {
    return this.active;
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Register process exit handlers
   */
  private registerCleanupHandlers(): void {
    process.once('SIGINT', () => this.destroy());
    process.once('SIGTERM', () => this.destroy());
    process.once('exit', () => this.destroy());
  }

  /**
   * Unregister process exit handlers
   */
  private unregisterCleanupHandlers(): void {
    process.removeListener('SIGINT', this.destroy);
    process.removeListener('SIGTERM', this.destroy);
    process.removeListener('exit', this.destroy);
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onStart(): void;
  protected abstract render(): void;
  protected abstract onStop(success: boolean, message?: string): void;
}

// ============================================================================
// Mining Animation
// ============================================================================

const SPINNER_FRAMES = ['|', '/', '-', '\\'];

export class MiningAnimation extends BaseAnimation {
  private pattern = '';
  private maxTime = 30000;
  private currentAttempts = 0;
  private lastLine = '';

  constructor(pattern: string, maxTimeMs: number = 30000, options?: AnimationOptions) {
    super(options);
    this.pattern = pattern;
    this.maxTime = maxTimeMs;
  }

  protected onStart(): void {
    console.log('');
    console.log('\x1b[36m  +------------------------------------------+\x1b[0m');
    console.log(
      '\x1b[36m  |\x1b[0m' +
        '\x1b[1;37m         VANITY MINING IN PROGRESS        \x1b[0m' +
        '\x1b[36m|\x1b[0m'
    );
    console.log('\x1b[36m  +------------------------------------------+\x1b[0m');
    console.log('');
  }

  protected render(): void {
    this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
    const spinner = SPINNER_FRAMES[this.frameIndex];
    const elapsed = this.getElapsedTime() / 1000;
    const progress = Math.min(elapsed / (this.maxTime / 1000), 1);
    const progressBar = this.createProgressBar(progress);
    const timeLeft = Math.max(0, Math.ceil(this.maxTime / 1000 - elapsed));
    const attemptsK = (this.currentAttempts / 1000).toFixed(0);

    const line =
      `\r${' '.repeat(70)}\r` +
      `  \x1b[36m${spinner}\x1b[0m \x1b[33m${this.pattern}\x1b[0m ${progressBar} ` +
      `\x1b[37m${timeLeft}s\x1b[0m \x1b[36m${attemptsK}k\x1b[0m tries`;

    // Only write if line changed to avoid flicker
    if (line !== this.lastLine) {
      process.stdout.write(line);
      this.lastLine = line;
    }
  }

  protected onStop(success: boolean, message?: string): void {
    process.stdout.write(`\r${' '.repeat(70)}\r`);
    if (success) {
      console.log(`\x1b[32m  [OK] ${message || 'Mining completed'}\x1b[0m`);
    } else {
      console.log(`\x1b[33m  [!] ${message || 'Mining stopped'}\x1b[0m`);
    }
    console.log('');
  }

  update(attempts: number): void {
    this.currentAttempts = attempts;
  }

  private createProgressBar(progress: number, width: number = 20): string {
    const filled = Math.round(progress * width);
    const empty = width - filled;
    const filledBar = '\x1b[36m#\x1b[0m'.repeat(filled);
    const emptyBar = '\x1b[90m-\x1b[0m'.repeat(empty);
    return `[${filledBar}${emptyBar}]`;
  }
}

// ============================================================================
// Deploy Animation
// ============================================================================

export class DeployAnimation extends BaseAnimation {
  private dotCount = 0;
  private step = 0;
  private steps = [
    'Preparing transaction',
    'Signing with wallet',
    'Broadcasting to network',
    'Waiting for confirmation',
    'Finalizing deployment',
  ];
  private lastLine = '';

  protected onStart(): void {
    console.log('');
    console.log('\x1b[36m  +------------------------------------------+\x1b[0m');
    console.log(
      '\x1b[36m  |\x1b[0m' +
        '\x1b[1;37m            DEPLOYING TOKEN               \x1b[0m' +
        '\x1b[36m|\x1b[0m'
    );
    console.log('\x1b[36m  +------------------------------------------+\x1b[0m');
    console.log('');
  }

  protected render(): void {
    this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
    const spinner = SPINNER_FRAMES[this.frameIndex];
    const stepText = this.steps[this.step % this.steps.length];

    // Animate dots
    this.dotCount = (this.dotCount + 1) % 4;
    const dots = '.'.repeat(this.dotCount);

    // Cycle through steps every 8 frames
    if (this.frameIndex === 0) {
      this.step = (this.step + 1) % this.steps.length;
    }

    const line =
      `\r${' '.repeat(60)}\r` + `  \x1b[36m${spinner}\x1b[0m \x1b[37m${stepText}${dots}\x1b[0m`;

    // Only write if line changed
    if (line !== this.lastLine) {
      process.stdout.write(line);
      this.lastLine = line;
    }
  }

  protected onStop(success: boolean, message?: string): void {
    process.stdout.write(`\r${' '.repeat(60)}\r`);
    if (success) {
      console.log(`\x1b[32m  [OK] ${message || 'Deployment completed'}\x1b[0m`);
    } else {
      console.log(`\x1b[31m  [FAIL] ${message || 'Deployment failed'}\x1b[0m`);
    }
    console.log('');
  }
}

// ============================================================================
// Progress Bar Animation
// ============================================================================

export class ProgressBar extends BaseAnimation {
  private current = 0;
  private total = 100;
  private width = 20;
  private label = '';
  private lastLine = '';

  constructor(total: number, label: string = '', width: number = 20, options?: AnimationOptions) {
    super(options);
    this.total = total;
    this.width = width;
    this.label = label;
  }

  protected onStart(): void {
    // No initial output
  }

  protected render(): void {
    const progress = this.total > 0 ? this.current / this.total : 0;
    const filled = Math.round(progress * this.width);
    const empty = this.width - filled;
    const percentage = Math.round(progress * 100);

    const filledBar = '\x1b[36m#\x1b[0m'.repeat(filled);
    const emptyBar = '\x1b[90m-\x1b[0m'.repeat(empty);

    const line = `\r${this.label} [${filledBar}${emptyBar}] ${percentage}% (${this.current}/${this.total})`;

    if (line !== this.lastLine) {
      process.stdout.write(line);
      this.lastLine = line;
    }
  }

  protected onStop(_success: boolean, _message?: string): void {
    console.log(''); // New line after progress
  }

  update(current: number): void {
    this.current = Math.min(current, this.total);
  }

  increment(): void {
    this.update(this.current + 1);
  }
}

// ============================================================================
// Animation Manager
// ============================================================================

export class AnimationManager {
  private animations: BaseAnimation[] = [];

  /**
   * Add animation to manager
   */
  add(animation: BaseAnimation): this {
    this.animations.push(animation);
    return this;
  }

  /**
   * Start all animations
   */
  startAll(): void {
    this.animations.forEach((animation) => {
      try {
        animation.start();
      } catch (error) {
        // Wrap error before logging
        const wrappedError = wrapError(error as Error, 'Animation start failed');
        errorLogger.log(wrappedError);
      }
    });
  }

  /**
   * Stop all animations
   */
  stopAll(success: boolean = true, message?: string): void {
    this.animations.forEach((animation) => {
      try {
        animation.stop(success, message);
      } catch (error) {
        // Wrap error before logging
        const wrappedError = wrapError(error as Error, 'Animation start failed');
        errorLogger.log(wrappedError);
      }
    });
  }

  /**
   * Destroy all animations and cleanup
   */
  destroyAll(): void {
    this.animations.forEach((animation) => {
      try {
        animation.destroy();
      } catch (error) {
        // Wrap error before logging
        const wrappedError = wrapError(error as Error, 'Animation failed');
        errorLogger.log(wrappedError);
      }
    });
    this.animations = [];
  }

  /**
   * Get active animations count
   */
  getActiveCount(): number {
    return this.animations.filter((a) => a.isRunning()).length;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a simple spinner animation
 */
export function createSpinner(message: string = ''): MiningAnimation {
  return new MiningAnimation(message, 30000, { frameRate: 100 });
}

/**
 * Create a progress bar
 */
export function createProgressBar(total: number, label: string = ''): ProgressBar {
  return new ProgressBar(total, label);
}

/**
 * Run an async function with loading animation
 */
export async function withLoadingAnimation<T>(
  fn: () => Promise<T>,
  message: string = 'Loading...'
): Promise<T> {
  const animation = new MiningAnimation(message);
  animation.start();

  try {
    const result = await fn();
    animation.stop(true, 'Complete');
    return result;
  } catch (error) {
    animation.stop(false, 'Failed');
    throw error;
  }
}

// Global animation manager instance
export const animationManager = new AnimationManager();
