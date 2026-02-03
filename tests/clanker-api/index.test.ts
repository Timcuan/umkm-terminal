/**
 * Clanker API Test Suite Index
 * Comprehensive test suite for Clanker API integration compatibility
 */

// Import all test suites to ensure they run
import './compatibility.test.js';
import './regression.test.js';
import './token-config-compatibility.test.js';

// Re-export test utilities for other test files
export * from './test-utils.js';