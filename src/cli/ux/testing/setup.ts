/**
 * Jest setup file for CLI User Experience Optimization testing
 * 
 * This file configures the testing environment, sets up property-based testing
 * with fast-check, and provides common test utilities and mocks.
 */

import { jest } from '@jest/globals';
import fc from 'fast-check';

// ============================================================================
// Global Test Configuration
// ============================================================================

// Increase timeout for property-based tests
jest.setTimeout(30000);

// Configure fast-check for property-based testing
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations per property test
  verbose: true,
  seed: 42, // Deterministic seed for reproducible tests
  endOnFailure: true,
  maxSkipsPerRun: 1000,
  interruptAfterTimeLimit: 5000, // 5 second timeout per property test
  markInterruptAsFailure: false
});

// ============================================================================
// Global Mocks
// ============================================================================

// Mock console methods to avoid noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock process.env for consistent testing
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    CLI_UX_TEST_MODE: 'true'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn()
}));

// Mock path operations
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  extname: jest.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  })
}));

// Mock os operations
jest.mock('os', () => ({
  platform: jest.fn(() => 'linux'),
  homedir: jest.fn(() => '/home/test'),
  tmpdir: jest.fn(() => '/tmp'),
  type: jest.fn(() => 'Linux'),
  release: jest.fn(() => '5.4.0'),
  arch: jest.fn(() => 'x64')
}));

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock CLI error for testing
 */
export function createMockCLIError(
  message: string = 'Test error',
  category: string = 'test',
  recoverable: boolean = true
) {
  return {
    name: 'CLIError',
    message,
    category,
    recoverable,
    suggestions: [],
    context: {
      operation: 'test',
      timestamp: new Date(),
      platform: 'linux',
      uxMode: 'normal'
    }
  };
}

/**
 * Create a mock deployment configuration for testing
 */
export function createMockDeployConfiguration() {
  return {
    tokenName: 'Test Token',
    symbol: 'TEST',
    feeConfiguration: {
      percentage: 3.0,
      strategy: 'flat',
      appliesTo: ['TOKEN', 'WETH'],
      lastModified: new Date()
    },
    spoofingConfiguration: {
      adminAllocation: 0.1,
      recipientAllocation: 99.9,
      strategy: {
        id: 'test-strategy',
        name: 'Test Strategy',
        adminPercentage: 0.1,
        recipientPercentage: 99.9,
        description: 'Test distribution strategy'
      },
      realTimeUpdates: true,
      integrationMode: 'standard'
    },
    validationLevel: 'standard',
    clankerIntegration: true
  };
}

/**
 * Create a mock user preferences object for testing
 */
export function createMockUserPreferences() {
  return {
    userId: 'test-user',
    uxMode: 'normal',
    defaultFeeStrategy: 'dynamic',
    preferredDeployMode: 'quick',
    smartDefaultsEnabled: true,
    platformOptimizations: {
      pathSeparator: '/',
      commandPrefix: '',
      environmentVariables: {},
      terminalCapabilities: {
        supportsColor: true,
        supportsUnicode: true,
        supportsInteractivity: true,
        maxWidth: 80,
        maxHeight: 24
      }
    },
    usageHistory: [],
    lastUpdated: new Date()
  };
}

/**
 * Wait for a specified amount of time (for async testing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a spy that tracks calls and arguments
 */
export function createSpy<T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> {
  return jest.fn(implementation) as jest.MockedFunction<T>;
}

/**
 * Assert that a property-based test passes with the required number of iterations
 */
export function assertPropertyTest(
  property: fc.Property<any>,
  minIterations: number = 100
): void {
  const result = fc.check(property, { numRuns: minIterations });
  if (result.failed) {
    throw new Error(`Property test failed after ${result.numRuns} runs: ${result.counterexample}`);
  }
  expect(result.numRuns).toBeGreaterThanOrEqual(minIterations);
}

// ============================================================================
// Property-Based Testing Generators
// ============================================================================

/**
 * Generator for UX modes
 */
export const uxModeArb = fc.constantFrom('normal', 'fast', 'ultra', 'expert');

/**
 * Generator for platforms
 */
export const platformArb = fc.constantFrom('windows', 'mac', 'linux', 'wsl', 'termux');

/**
 * Generator for fee strategies
 */
export const feeStrategyArb = fc.constantFrom('dynamic', 'flat', 'custom');

/**
 * Generator for deploy modes
 */
export const deployModeArb = fc.constantFrom('quick', 'advanced');

/**
 * Generator for validation levels
 */
export const validationLevelArb = fc.constantFrom('minimal', 'standard', 'strict');

/**
 * Generator for token names
 */
export const tokenNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(name => name.trim().length > 0);

/**
 * Generator for token symbols
 */
export const tokenSymbolArb = fc.string({ minLength: 1, maxLength: 10 })
  .map(s => s.toUpperCase())
  .filter(symbol => /^[A-Z0-9]+$/.test(symbol));

/**
 * Generator for fee percentages
 */
export const feePercentageArb = fc.float({ min: 0.1, max: 99.9 });

/**
 * Generator for allocation percentages (0.1% to 99.9%)
 */
export const allocationPercentageArb = fc.float({ min: 0.1, max: 99.9 });

/**
 * Generator for timestamps
 */
export const timestampArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });

/**
 * Generator for configuration objects
 */
export const configurationArb = fc.record({
  tokenName: tokenNameArb,
  symbol: tokenSymbolArb,
  feeConfiguration: fc.record({
    percentage: feePercentageArb,
    strategy: feeStrategyArb,
    appliesTo: fc.constant(['TOKEN', 'WETH']),
    lastModified: timestampArb
  }),
  spoofingConfiguration: fc.record({
    adminAllocation: allocationPercentageArb,
    recipientAllocation: allocationPercentageArb,
    realTimeUpdates: fc.boolean(),
    integrationMode: fc.constantFrom('standard', 'optimized', 'custom')
  }),
  validationLevel: validationLevelArb,
  clankerIntegration: fc.boolean()
});

/**
 * Generator for CLI commands
 */
export const cliCommandArb = fc.record({
  command: fc.constantFrom('deploy', 'config', 'help', 'version'),
  args: fc.array(fc.string(), { maxLength: 10 }),
  flags: fc.record({
    verbose: fc.boolean(),
    quiet: fc.boolean(),
    force: fc.boolean()
  }, { requiredKeys: [] })
});

/**
 * Generator for error contexts
 */
export const errorContextArb = fc.record({
  operation: fc.string({ minLength: 1, maxLength: 50 }),
  timestamp: timestampArb,
  platform: platformArb,
  uxMode: uxModeArb,
  userInput: fc.anything(),
  systemState: fc.anything()
});

// ============================================================================
// Test Matchers
// ============================================================================

// Extend Jest matchers for CLI-specific assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUXMode(): R;
      toBeValidPlatform(): R;
      toBeValidFeePercentage(): R;
      toHaveValidConfiguration(): R;
    }
  }
}

// Custom matcher for UX modes
expect.extend({
  toBeValidUXMode(received: any) {
    const validModes = ['normal', 'fast', 'ultra', 'expert'];
    const pass = validModes.includes(received);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid UX mode`
          : `Expected ${received} to be a valid UX mode (${validModes.join(', ')})`,
      pass
    };
  }
});

// Custom matcher for platforms
expect.extend({
  toBeValidPlatform(received: any) {
    const validPlatforms = ['windows', 'mac', 'linux', 'wsl', 'termux'];
    const pass = validPlatforms.includes(received);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid platform`
          : `Expected ${received} to be a valid platform (${validPlatforms.join(', ')})`,
      pass
    };
  }
});

// Custom matcher for fee percentages
expect.extend({
  toBeValidFeePercentage(received: any) {
    const pass = typeof received === 'number' && received >= 0.1 && received <= 99.9;
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid fee percentage`
          : `Expected ${received} to be a valid fee percentage (0.1-99.9)`,
      pass
    };
  }
});

// Custom matcher for configuration objects
expect.extend({
  toHaveValidConfiguration(received: any) {
    const hasRequiredFields = 
      received &&
      typeof received.tokenName === 'string' &&
      typeof received.symbol === 'string' &&
      received.feeConfiguration &&
      received.spoofingConfiguration &&
      typeof received.validationLevel === 'string' &&
      typeof received.clankerIntegration === 'boolean';
    
    return {
      message: () => 
        hasRequiredFields 
          ? `Expected configuration not to be valid`
          : `Expected configuration to have all required fields`,
      pass: hasRequiredFields
    };
  }
});

// ============================================================================
// Cleanup
// ============================================================================

// Global cleanup after all tests
afterAll(() => {
  // Restore original console
  global.console = originalConsole;
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset modules
  jest.resetModules();
});