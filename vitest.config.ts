import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000, // 30 seconds for property-based tests
    hookTimeout: 30000,
    teardownTimeout: 30000,
    // Property-based tests need more time
    slowTestThreshold: 5000,
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});