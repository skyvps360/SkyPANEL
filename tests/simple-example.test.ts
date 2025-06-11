import { describe, it, expect } from 'vitest';

describe('Simple Example Test', () => {
  describe('Basic Math Operations', () => {
    it('should correctly add two numbers', () => {
      expect(1 + 2).toBe(3);
    });

    it('should correctly subtract two numbers', () => {
      expect(5 - 2).toBe(3);
    });

    it('should correctly multiply two numbers', () => {
      expect(2 * 3).toBe(6);
    });

    it('should correctly divide two numbers', () => {
      expect(6 / 2).toBe(3);
    });
  });

  describe('String Operations', () => {
    it('should correctly concatenate strings', () => {
      expect('Hello ' + 'World').toBe('Hello World');
    });

    it('should correctly check string length', () => {
      expect('SkyPANEL'.length).toBe(8);
    });
  });
});