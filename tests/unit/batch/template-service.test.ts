/**
 * Unit tests for TemplateService
 * Validates template management functionality
 */

import { describe, it, expect } from 'vitest';
import { TemplateService } from '../../../src/batch/template-service.js';
import type { GenerateOptions } from '../../../src/batch/types.js';

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
  });

  describe('generateTemplate', () => {
    it('should generate template with correct structure', () => {
      const options: GenerateOptions = {
        name: 'Test Token',
        symbol: 'TEST',
        chain: 'base',
        fee: 5,
        mev: 8
      };

      const template = templateService.generateTemplate(3, options);

      expect(template.name).toBe('Batch 3x TEST');
      expect(template.description).toBe('Deploy 3 Test Token tokens');
      expect(template.chain).toBe('base');
      expect(template.tokens).toHaveLength(3);
      expect(template.defaults.fee).toBe(5);
      expect(template.defaults.mev).toBe(8);

      // All tokens should have the same name and symbol
      template.tokens.forEach(token => {
        expect(token.name).toBe('Test Token');
        expect(token.symbol).toBe('TEST');
      });
    });
  });

  describe('generateNumberedTemplate', () => {
    it('should generate numbered template with unique names', () => {
      const options: GenerateOptions = {
        name: 'Test Token',
        symbol: 'TEST',
        chain: 'base'
      };

      const template = templateService.generateNumberedTemplate(3, options);

      expect(template.tokens).toHaveLength(3);
      expect(template.tokens[0].name).toBe('Test Token 1');
      expect(template.tokens[0].symbol).toBe('TEST1');
      expect(template.tokens[1].name).toBe('Test Token 2');
      expect(template.tokens[1].symbol).toBe('TEST2');
      expect(template.tokens[2].name).toBe('Test Token 3');
      expect(template.tokens[2].symbol).toBe('TEST3');
    });

    it('should respect startIndex option', () => {
      const options: GenerateOptions & { startIndex: number } = {
        name: 'Test Token',
        symbol: 'TEST',
        chain: 'base',
        startIndex: 5
      };

      const template = templateService.generateNumberedTemplate(2, options);

      expect(template.tokens[0].name).toBe('Test Token 5');
      expect(template.tokens[0].symbol).toBe('TEST5');
      expect(template.tokens[1].name).toBe('Test Token 6');
      expect(template.tokens[1].symbol).toBe('TEST6');
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const template = templateService.generateTemplate(1, {
        name: 'Test Token',
        symbol: 'TEST',
        chain: 'base'
      });

      expect(() => templateService.validateTemplate(template)).not.toThrow();
    });

    it('should throw error for empty tokens array', () => {
      const template = {
        name: 'Test',
        description: 'Test',
        chain: 'base' as const,
        defaults: {},
        tokens: []
      };

      expect(() => templateService.validateTemplate(template)).toThrow('tokens array is empty');
    });

    it('should throw error for invalid chain', () => {
      const template = {
        name: 'Test',
        description: 'Test',
        chain: 'invalid' as any,
        defaults: {},
        tokens: [{ name: 'Test', symbol: 'TEST', image: '', description: '', tokenAdmin: '', rewardRecipients: [] }]
      };

      expect(() => templateService.validateTemplate(template)).toThrow('Invalid chain: invalid');
    });
  });
});