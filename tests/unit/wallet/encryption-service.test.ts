/**
 * Unit tests for EncryptionService
 * Validates encryption and decryption functionality
 */

import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../../../src/wallet/encryption-service.js';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'test private key';
      const password = 'test password';

      const encrypted = encryptionService.encrypt(plaintext, password);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);

      const decrypted = encryptionService.decrypt(encrypted, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should return null for wrong password', () => {
      const plaintext = 'test private key';
      const password = 'test password';
      const wrongPassword = 'wrong password';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const decrypted = encryptionService.decrypt(encrypted, wrongPassword);
      
      expect(decrypted).toBeNull();
    });

    it('should return null for invalid encrypted data', () => {
      const invalidEncrypted = 'invalid-base64-data';
      const password = 'test password';

      const decrypted = encryptionService.decrypt(invalidEncrypted, password);
      expect(decrypted).toBeNull();
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const password = 'test password';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const decrypted = encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '0x1234567890abcdef!@#$%^&*()';
      const password = 'test password with spaces and symbols!@#';

      const encrypted = encryptionService.encrypt(plaintext, password);
      const decrypted = encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('generateSalt', () => {
    it('should generate different salts', () => {
      const salt1 = encryptionService.generateSalt();
      const salt2 = encryptionService.generateSalt();

      expect(salt1).toBeTruthy();
      expect(salt2).toBeTruthy();
      expect(salt1).not.toBe(salt2);
      expect(salt1.length).toBeGreaterThan(0);
      expect(salt2.length).toBeGreaterThan(0);
    });

    it('should generate hex strings', () => {
      const salt = encryptionService.generateSalt();
      expect(salt).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('encryption consistency', () => {
    it('should produce different encrypted outputs for same input', () => {
      const plaintext = 'test private key';
      const password = 'test password';

      const encrypted1 = encryptionService.encrypt(plaintext, password);
      const encrypted2 = encryptionService.encrypt(plaintext, password);

      // Should be different due to random IV and salt
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same plaintext
      expect(encryptionService.decrypt(encrypted1, password)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2, password)).toBe(plaintext);
    });
  });
});