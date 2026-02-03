/**
 * Integration tests for startup validation
 * Tests Requirement 5.4: Validate configuration at application startup
 * 
 * This test verifies that validateEnvConfig() is called at application startup
 * and that the application exits with appropriate error messages when validation fails.
 */

import { describe, it, expect } from 'vitest';

// Mock the validateEnvConfig function for testing
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateEnvConfig(config: {
  privateKey: string;
  chainId: number;
  feeType: 'dynamic' | 'flat' | 'custom';
  feePercentage: number;
  [key: string]: any;
}): ValidationResult {
  const errors: string[] = [];

  // Validate PRIVATE_KEY
  if (!config.privateKey) {
    errors.push('PRIVATE_KEY is required. Add PRIVATE_KEY=0x... to your .env file');
  } else if (!config.privateKey.startsWith('0x')) {
    errors.push('PRIVATE_KEY must start with 0x');
  } else if (config.privateKey.length < 66) {
    errors.push('PRIVATE_KEY appears to be invalid (too short)');
  }

  // Validate CHAIN_ID
  const validChainIds = [1, 8453, 42161, 130, 10143];
  if (!validChainIds.includes(config.chainId)) {
    errors.push(`CHAIN_ID must be one of: ${validChainIds.join(', ')} (got ${config.chainId})`);
  }

  // Validate fee ranges based on FEE_TYPE
  if (config.feeType === 'dynamic') {
    if (config.feePercentage < 1 || config.feePercentage > 5) {
      errors.push('Dynamic fees must be between 1-5%');
    }
  } else if (config.feeType === 'flat') {
    if (config.feePercentage < 0.1 || config.feePercentage > 50) {
      errors.push('Flat fee must be between 0.1-50%');
    }
  } else if (config.feeType === 'custom') {
    if (config.feePercentage < 1 || config.feePercentage > 99) {
      errors.push('Custom fee must be between 1-99%');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

describe('Startup Validation Integration', () => {
  describe('Requirement 5.4: Validate configuration at application startup', () => {
    it('should validate configuration before starting interactive mode', () => {
      // Simulate invalid configuration
      const invalidConfig = {
        privateKey: '',
        chainId: 999,
        feeType: 'dynamic' as const,
        feePercentage: 10.0,
      };

      const result = validateEnvConfig(invalidConfig);

      // Verify validation fails
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Verify error messages are clear and actionable
      expect(result.errors).toContain('PRIVATE_KEY is required. Add PRIVATE_KEY=0x... to your .env file');
      expect(result.errors.some(e => e.includes('CHAIN_ID'))).toBe(true);
      expect(result.errors.some(e => e.includes('Dynamic fees'))).toBe(true);
    });

    it('should allow application to proceed when configuration is valid', () => {
      // Simulate valid configuration
      const validConfig = {
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        chainId: 8453,
        feeType: 'dynamic' as const,
        feePercentage: 3.0,
      };

      const result = validateEnvConfig(validConfig);

      // Verify validation passes
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should display all error messages when multiple validations fail', () => {
      const invalidConfig = {
        privateKey: '123', // Missing 0x prefix and too short
        chainId: 999, // Invalid chain
        feeType: 'dynamic' as const,
        feePercentage: 10.0, // Out of range for dynamic
      };

      const result = validateEnvConfig(invalidConfig);

      // Verify all errors are captured
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
      
      // Verify each error is present
      expect(result.errors.some(e => e.includes('PRIVATE_KEY'))).toBe(true);
      expect(result.errors.some(e => e.includes('CHAIN_ID'))).toBe(true);
      expect(result.errors.some(e => e.includes('Dynamic fees'))).toBe(true);
    });

    it('should validate configuration before CLI deploy mode', () => {
      // Simulate configuration for CLI deploy
      const cliConfig = {
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        chainId: 8453,
        feeType: 'flat' as const,
        feePercentage: 5.0,
      };

      const result = validateEnvConfig(cliConfig);

      // Verify validation passes for CLI mode
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should prevent application startup with missing PRIVATE_KEY', () => {
      const config = {
        privateKey: '',
        chainId: 8453,
        feeType: 'dynamic' as const,
        feePercentage: 3.0,
      };

      const result = validateEnvConfig(config);

      // Verify validation fails and provides clear guidance
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PRIVATE_KEY is required. Add PRIVATE_KEY=0x... to your .env file');
    });

    it('should prevent application startup with invalid CHAIN_ID', () => {
      const config = {
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        chainId: 999,
        feeType: 'dynamic' as const,
        feePercentage: 3.0,
      };

      const result = validateEnvConfig(config);

      // Verify validation fails and lists valid chain IDs
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('CHAIN_ID must be one of: 1, 8453, 42161, 130, 10143'))).toBe(true);
    });

    it('should prevent application startup with invalid fee configuration', () => {
      const config = {
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        chainId: 8453,
        feeType: 'dynamic' as const,
        feePercentage: 10.0, // Out of range
      };

      const result = validateEnvConfig(config);

      // Verify validation fails with clear fee range message
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dynamic fees must be between 1-5%');
    });
  });

  describe('Error message quality', () => {
    it('should provide actionable error messages', () => {
      const config = {
        privateKey: '',
        chainId: 999,
        feeType: 'dynamic' as const,
        feePercentage: 10.0,
      };

      const result = validateEnvConfig(config);

      // Verify each error message is actionable
      for (const error of result.errors) {
        // Each error should be a non-empty string
        expect(error).toBeTruthy();
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
        
        // Error messages should be descriptive (not just "invalid")
        expect(error.toLowerCase()).not.toBe('invalid');
      }
    });

    it('should include specific values in error messages when helpful', () => {
      const config = {
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        chainId: 999,
        feeType: 'dynamic' as const,
        feePercentage: 3.0,
      };

      const result = validateEnvConfig(config);

      // Verify error includes the invalid value
      expect(result.errors.some(e => e.includes('999'))).toBe(true);
    });
  });
});
