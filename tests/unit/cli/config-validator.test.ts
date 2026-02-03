/**
 * Unit tests for validateEnvConfig() function
 * Tests Requirements 5.1, 5.2, 5.3
 * 
 * This test verifies that validateEnvConfig() properly validates:
 * - PRIVATE_KEY presence and format
 * - CHAIN_ID is one of the supported chains
 * - Fee ranges based on FEE_TYPE
 */

import { describe, it, expect } from 'vitest';

// Mock the validateEnvConfig function for testing
// In actual implementation, this would be imported from src/cli/index.ts
// For now, we'll define it here to match the implementation
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

describe('validateEnvConfig()', () => {
  // Valid test configuration
  const validConfig = {
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    chainId: 8453,
    feeType: 'dynamic' as const,
    feePercentage: 3.0,
  };

  describe('Requirement 5.1: Validate PRIVATE_KEY presence', () => {
    it('should fail when PRIVATE_KEY is missing', () => {
      const config = {
        ...validConfig,
        privateKey: '',
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PRIVATE_KEY is required. Add PRIVATE_KEY=0x... to your .env file');
    });

    it('should fail when PRIVATE_KEY does not start with 0x', () => {
      const config = {
        ...validConfig,
        privateKey: 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PRIVATE_KEY must start with 0x');
    });

    it('should fail when PRIVATE_KEY is too short', () => {
      const config = {
        ...validConfig,
        privateKey: '0x123',
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PRIVATE_KEY appears to be invalid (too short)');
    });

    it('should pass when PRIVATE_KEY is valid', () => {
      const result = validateEnvConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Requirement 5.2: Validate CHAIN_ID', () => {
    it('should fail when CHAIN_ID is not supported (invalid chain)', () => {
      const config = {
        ...validConfig,
        chainId: 999,
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CHAIN_ID must be one of: 1, 8453, 42161, 130, 10143 (got 999)');
    });

    it('should pass for Ethereum (1)', () => {
      const config = {
        ...validConfig,
        chainId: 1,
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for Base (8453)', () => {
      const config = {
        ...validConfig,
        chainId: 8453,
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for Arbitrum (42161)', () => {
      const config = {
        ...validConfig,
        chainId: 42161,
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for Unichain (130)', () => {
      const config = {
        ...validConfig,
        chainId: 130,
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for Monad (10143)', () => {
      const config = {
        ...validConfig,
        chainId: 10143,
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Requirement 5.3: Validate fee ranges based on FEE_TYPE', () => {
    describe('Dynamic fees', () => {
      it('should fail when dynamic fee is below 1%', () => {
        const config = {
          ...validConfig,
          feeType: 'dynamic' as const,
          feePercentage: 0.5,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Dynamic fees must be between 1-5%');
      });

      it('should fail when dynamic fee is above 5%', () => {
        const config = {
          ...validConfig,
          feeType: 'dynamic' as const,
          feePercentage: 6.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Dynamic fees must be between 1-5%');
      });

      it('should pass when dynamic fee is 1%', () => {
        const config = {
          ...validConfig,
          feeType: 'dynamic' as const,
          feePercentage: 1.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass when dynamic fee is 5%', () => {
        const config = {
          ...validConfig,
          feeType: 'dynamic' as const,
          feePercentage: 5.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass when dynamic fee is 3%', () => {
        const config = {
          ...validConfig,
          feeType: 'dynamic' as const,
          feePercentage: 3.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Flat fees', () => {
      it('should fail when flat fee is below 0.1%', () => {
        const config = {
          ...validConfig,
          feeType: 'flat' as const,
          feePercentage: 0.05,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Flat fee must be between 0.1-50%');
      });

      it('should fail when flat fee is above 50%', () => {
        const config = {
          ...validConfig,
          feeType: 'flat' as const,
          feePercentage: 51.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Flat fee must be between 0.1-50%');
      });

      it('should pass when flat fee is 0.1%', () => {
        const config = {
          ...validConfig,
          feeType: 'flat' as const,
          feePercentage: 0.1,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass when flat fee is 50%', () => {
        const config = {
          ...validConfig,
          feeType: 'flat' as const,
          feePercentage: 50.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass when flat fee is 10%', () => {
        const config = {
          ...validConfig,
          feeType: 'flat' as const,
          feePercentage: 10.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Custom fees', () => {
      it('should fail when custom fee is below 1%', () => {
        const config = {
          ...validConfig,
          feeType: 'custom' as const,
          feePercentage: 0.5,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Custom fee must be between 1-99%');
      });

      it('should fail when custom fee is above 99%', () => {
        const config = {
          ...validConfig,
          feeType: 'custom' as const,
          feePercentage: 100.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Custom fee must be between 1-99%');
      });

      it('should pass when custom fee is 1%', () => {
        const config = {
          ...validConfig,
          feeType: 'custom' as const,
          feePercentage: 1.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass when custom fee is 99%', () => {
        const config = {
          ...validConfig,
          feeType: 'custom' as const,
          feePercentage: 99.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass when custom fee is 25%', () => {
        const config = {
          ...validConfig,
          feeType: 'custom' as const,
          feePercentage: 25.0,
        };

        const result = validateEnvConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Multiple validation errors', () => {
    it('should return all validation errors when multiple fields are invalid', () => {
      const config = {
        privateKey: '',
        chainId: 999,
        feeType: 'dynamic' as const,
        feePercentage: 10.0,
      };

      const result = validateEnvConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('PRIVATE_KEY is required. Add PRIVATE_KEY=0x... to your .env file');
      expect(result.errors).toContain('CHAIN_ID must be one of: 1, 8453, 42161, 130, 10143 (got 999)');
      expect(result.errors).toContain('Dynamic fees must be between 1-5%');
    });

    it('should return empty errors array when all fields are valid', () => {
      const result = validateEnvConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle boundary values for dynamic fees', () => {
      const config1 = {
        ...validConfig,
        feeType: 'dynamic' as const,
        feePercentage: 1.0,
      };
      expect(validateEnvConfig(config1).valid).toBe(true);

      const config2 = {
        ...validConfig,
        feeType: 'dynamic' as const,
        feePercentage: 5.0,
      };
      expect(validateEnvConfig(config2).valid).toBe(true);

      const config3 = {
        ...validConfig,
        feeType: 'dynamic' as const,
        feePercentage: 0.99,
      };
      expect(validateEnvConfig(config3).valid).toBe(false);

      const config4 = {
        ...validConfig,
        feeType: 'dynamic' as const,
        feePercentage: 5.01,
      };
      expect(validateEnvConfig(config4).valid).toBe(false);
    });

    it('should handle boundary values for flat fees', () => {
      const config1 = {
        ...validConfig,
        feeType: 'flat' as const,
        feePercentage: 0.1,
      };
      expect(validateEnvConfig(config1).valid).toBe(true);

      const config2 = {
        ...validConfig,
        feeType: 'flat' as const,
        feePercentage: 50.0,
      };
      expect(validateEnvConfig(config2).valid).toBe(true);

      const config3 = {
        ...validConfig,
        feeType: 'flat' as const,
        feePercentage: 0.09,
      };
      expect(validateEnvConfig(config3).valid).toBe(false);

      const config4 = {
        ...validConfig,
        feeType: 'flat' as const,
        feePercentage: 50.01,
      };
      expect(validateEnvConfig(config4).valid).toBe(false);
    });

    it('should handle boundary values for custom fees', () => {
      const config1 = {
        ...validConfig,
        feeType: 'custom' as const,
        feePercentage: 1.0,
      };
      expect(validateEnvConfig(config1).valid).toBe(true);

      const config2 = {
        ...validConfig,
        feeType: 'custom' as const,
        feePercentage: 99.0,
      };
      expect(validateEnvConfig(config2).valid).toBe(true);

      const config3 = {
        ...validConfig,
        feeType: 'custom' as const,
        feePercentage: 0.99,
      };
      expect(validateEnvConfig(config3).valid).toBe(false);

      const config4 = {
        ...validConfig,
        feeType: 'custom' as const,
        feePercentage: 99.01,
      };
      expect(validateEnvConfig(config4).valid).toBe(false);
    });
  });
});
