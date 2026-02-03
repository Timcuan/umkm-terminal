/**
 * Jest configuration for CLI User Experience Optimization testing
 * 
 * This configuration sets up Jest with TypeScript support, property-based testing
 * with fast-check, and appropriate test environments for CLI testing.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/cli/ux/**/*.test.ts',
    '<rootDir>/src/cli/ux/**/*.spec.ts',
    '<rootDir>/tests/cli-ux/**/*.test.ts',
    '<rootDir>/tests/cli-ux/**/*.spec.ts'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@cli-ux/(.*)$': '<rootDir>/src/cli/ux/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/cli/ux/testing/setup.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/cli-ux',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/cli/ux/**/*.ts',
    '!src/cli/ux/**/*.test.ts',
    '!src/cli/ux/**/*.spec.ts',
    '!src/cli/ux/testing/**/*',
    '!src/cli/ux/types.ts',
    '!src/cli/ux/interfaces.ts'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Global test variables
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true
        }
      }
    }
  },
  
  // Test reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage/cli-ux',
      outputName: 'junit.xml'
    }]
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ]
};