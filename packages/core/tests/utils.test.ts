import {
  calculateStats,
  generateId,
  isPrivateURL,
  isValidURL,
  percentile,
  sleep,
} from '@reaatech/mcp-load-test-core';
import { describe, expect, it } from 'vitest';

describe('utils', () => {
  describe('generateId', () => {
    it('should generate an 8-character string', () => {
      const id = generateId();
      expect(id).toHaveLength(8);
    });
  });

  describe('percentile', () => {
    it('should return 0 for empty array', () => {
      expect(percentile([], 50)).toBe(0);
    });

    it('should calculate median correctly', () => {
      expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it('should calculate p90 correctly', () => {
      expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9.1);
    });
  });

  describe('calculateStats', () => {
    it('should return zeros for empty array', () => {
      const stats = calculateStats([]);
      expect(stats.samples).toBe(0);
      expect(stats.p50).toBe(0);
    });

    it('should calculate all percentiles', () => {
      const stats = calculateStats([10, 20, 30, 40, 50]);
      expect(stats.samples).toBe(5);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.p50).toBe(30);
    });
  });

  describe('isValidURL', () => {
    it('should validate HTTP URLs', () => {
      expect(isValidURL('http://example.com')).toBe(true);
      expect(isValidURL('https://example.com/mcp')).toBe(true);
    });

    it('should reject plain paths', () => {
      expect(isValidURL('./server.sh')).toBe(false);
    });
  });

  describe('isPrivateURL', () => {
    it('should identify localhost', () => {
      expect(isPrivateURL('http://localhost:3000')).toBe(true);
    });

    it('should identify private IP ranges', () => {
      expect(isPrivateURL('http://192.168.1.1')).toBe(true);
      expect(isPrivateURL('http://10.0.0.1')).toBe(true);
    });

    it('should reject public URLs', () => {
      expect(isPrivateURL('https://example.com')).toBe(false);
    });
  });

  describe('sleep', () => {
    it('should delay for specified ms', async () => {
      const start = Date.now();
      await sleep(50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(45);
    });
  });
});
