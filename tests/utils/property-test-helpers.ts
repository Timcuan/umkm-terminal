/**
 * Property-based test helpers and utilities
 * Provides common patterns and utilities for property-based testing
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Default configuration for property-based tests
 */
export const DEFAULT_PBT_CONFIG: fc.Parameters<[unknown]> = {
  numRuns: 100, // Minimum 100 iterations as specified in design
  seed: 42, // Fixed seed for reproducible tests
  verbose: true, // Show counterexamples
  markInterruptAsFailure: true,
  interruptAfterTimeLimit: 30000, // 30 seconds timeout
};

/**
 * Configuration for performance-sensitive tests
 */
export const PERFORMANCE_PBT_CONFIG: fc.Parameters<[unknown]> = {
  ...DEFAULT_PBT_CONFIG,
  numRuns: 50, // Fewer runs for performance tests
  interruptAfterTimeLimit: 60000, // 60 seconds for performance tests
};

/**
 * Configuration for comprehensive tests
 */
export const COMPREHENSIVE_PBT_CONFIG: fc.Parameters<[unknown]> = {
  ...DEFAULT_PBT_CONFIG,
  numRuns: 200, // More runs for critical properties
};

// ============================================================================
// Property Test Wrapper
// ============================================================================

/**
 * Create a property-based test with proper tagging and configuration
 */
export function createPropertyTest<T>(
  testName: string,
  propertyNumber: number,
  propertyDescription: string,
  requirements: string[],
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | Promise<boolean>,
  config: fc.Parameters<[T]> = DEFAULT_PBT_CONFIG as fc.Parameters<[T]>
): void {
  it(`Feature: codebase-refactoring, Property ${propertyNumber}: ${propertyDescription}`, {
    timeout: config.interruptAfterTimeLimit || 30000
  }, async () => {
    const property = fc.asyncProperty(arbitrary, predicate);
    
    try {
      await fc.assert(property, config);
    } catch (error) {
      // Add context to property test failures
      const contextualError = new Error(
        `Property test failed: ${testName}\n` +
        `Property ${propertyNumber}: ${propertyDescription}\n` +
        `Validates: ${requirements.join(', ')}\n` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw contextualError;
    }
  });
}

/**
 * Create a property-based test for consistency between implementations
 */
export function createConsistencyTest<T, R>(
  testName: string,
  propertyNumber: number,
  propertyDescription: string,
  requirements: string[],
  arbitrary: fc.Arbitrary<T>,
  implementation1: (value: T) => R | Promise<R>,
  implementation2: (value: T) => R | Promise<R>,
  config: fc.Parameters<[T]> = DEFAULT_PBT_CONFIG as fc.Parameters<[T]>
): void {
  createPropertyTest(
    testName,
    propertyNumber,
    propertyDescription,
    requirements,
    arbitrary,
    async (value: T) => {
      const result1 = await implementation1(value);
      const result2 = await implementation2(value);
      return deepEqual(result1, result2);
    },
    config
  );
}

/**
 * Create a property-based test for round-trip properties
 */
export function createRoundTripTest<T, I>(
  testName: string,
  propertyNumber: number,
  propertyDescription: string,
  requirements: string[],
  arbitrary: fc.Arbitrary<T>,
  encode: (value: T) => I | Promise<I>,
  decode: (intermediate: I) => T | Promise<T>,
  config: fc.Parameters<[T]> = DEFAULT_PBT_CONFIG as fc.Parameters<[T]>
): void {
  createPropertyTest(
    testName,
    propertyNumber,
    propertyDescription,
    requirements,
    arbitrary,
    async (original: T) => {
      const encoded = await encode(original);
      const decoded = await decode(encoded);
      return deepEqual(original, decoded);
    },
    config
  );
}

/**
 * Create a property-based test for invariant properties
 */
export function createInvariantTest<T>(
  testName: string,
  propertyNumber: number,
  propertyDescription: string,
  requirements: string[],
  arbitrary: fc.Arbitrary<T>,
  operation: (value: T) => T | Promise<T>,
  invariant: (original: T, result: T) => boolean | Promise<boolean>,
  config: fc.Parameters<[T]> = DEFAULT_PBT_CONFIG as fc.Parameters<[T]>
): void {
  createPropertyTest(
    testName,
    propertyNumber,
    propertyDescription,
    requirements,
    arbitrary,
    async (original: T) => {
      const result = await operation(original);
      return await invariant(original, result);
    },
    config
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deep equality comparison for property tests
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }
    
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && 
      deepEqual((a as any)[key], (b as any)[key])
    );
  }
  
  return false;
}

/**
 * Check if a value is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a value is a valid private key
 */
export function isValidPrivateKey(privateKey: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(privateKey);
}

/**
 * Check if a value is a valid transaction hash
 */
export function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Measure execution time of an operation
 */
export async function measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const end = performance.now();
  return { result, duration: end - start };
}

/**
 * Check if an operation completes within a time limit
 */
export async function completesWithinTime<T>(
  operation: () => Promise<T>,
  timeLimit: number
): Promise<boolean> {
  const { duration } = await measureTime(operation);
  return duration <= timeLimit;
}

/**
 * Create a mock function that tracks calls
 */
export function createMockFunction<TArgs extends any[], TReturn>(
  implementation?: (...args: TArgs) => TReturn
): MockFunction<TArgs, TReturn> {
  const calls: TArgs[] = [];
  
  const mockFn = ((...args: TArgs): TReturn => {
    calls.push(args);
    if (implementation) {
      return implementation(...args);
    }
    return undefined as TReturn;
  }) as MockFunction<TArgs, TReturn>;
  
  mockFn.calls = calls;
  mockFn.callCount = () => calls.length;
  mockFn.calledWith = (...args: TArgs) => 
    calls.some(call => deepEqual(call, args));
  mockFn.reset = () => {
    calls.length = 0;
  };
  
  return mockFn;
}

export interface MockFunction<TArgs extends any[], TReturn> {
  (...args: TArgs): TReturn;
  calls: TArgs[];
  callCount(): number;
  calledWith(...args: TArgs): boolean;
  reset(): void;
}

// ============================================================================
// Error Testing Utilities
// ============================================================================

/**
 * Test that an operation throws an error with specific properties
 */
export async function expectThrowsError<T>(
  operation: () => Promise<T>,
  errorMatcher: {
    name?: string;
    message?: string | RegExp;
    code?: string;
  }
): Promise<boolean> {
  try {
    await operation();
    return false; // Should have thrown
  } catch (error) {
    if (errorMatcher.name && error.name !== errorMatcher.name) {
      return false;
    }
    
    if (errorMatcher.message) {
      if (typeof errorMatcher.message === 'string') {
        if (error.message !== errorMatcher.message) {
          return false;
        }
      } else {
        if (!errorMatcher.message.test(error.message)) {
          return false;
        }
      }
    }
    
    if (errorMatcher.code && error.code !== errorMatcher.code) {
      return false;
    }
    
    return true;
  }
}

/**
 * Test that an operation returns a Result type with success: false
 */
export function expectFailureResult<T, E>(
  result: { success: boolean; data?: T; error?: E }
): boolean {
  return result.success === false && result.error !== undefined && result.data === undefined;
}

/**
 * Test that an operation returns a Result type with success: true
 */
export function expectSuccessResult<T, E>(
  result: { success: boolean; data?: T; error?: E }
): boolean {
  return result.success === true && result.data !== undefined && result.error === undefined;
}

// ============================================================================
// Performance Testing Utilities
// ============================================================================

/**
 * Test that an operation has O(1) time complexity
 */
export async function testConstantTimeComplexity<T>(
  operation: (input: T) => Promise<any>,
  inputs: T[],
  toleranceMs: number = 100
): Promise<boolean> {
  const measurements = await Promise.all(
    inputs.map(input => measureTime(() => operation(input)))
  );
  
  const durations = measurements.map(m => m.duration);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  
  // Check that all measurements are within tolerance of average
  return durations.every(duration => 
    Math.abs(duration - avgDuration) <= toleranceMs
  );
}

/**
 * Test that memory usage doesn't grow linearly with input size
 */
export async function testConstantMemoryUsage<T>(
  operation: (input: T[]) => Promise<any>,
  inputSizes: number[],
  inputGenerator: (size: number) => T[]
): Promise<boolean> {
  // This is a simplified test - in a real implementation,
  // you would measure actual memory usage
  const measurements = await Promise.all(
    inputSizes.map(async size => {
      const input = inputGenerator(size);
      const { duration } = await measureTime(() => operation(input));
      return { size, duration };
    })
  );
  
  // Check that duration doesn't grow linearly with size
  // This is a proxy for memory usage in this simplified test
  const firstMeasurement = measurements[0];
  const lastMeasurement = measurements[measurements.length - 1];
  
  if (!firstMeasurement || !lastMeasurement) return false;
  
  const sizeRatio = lastMeasurement.size / firstMeasurement.size;
  const durationRatio = lastMeasurement.duration / firstMeasurement.duration;
  
  // Duration should not grow proportionally with size
  return durationRatio < sizeRatio * 0.5; // Allow some growth but not linear
}