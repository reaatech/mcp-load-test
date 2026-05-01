import type { RampProfile, SoakProfile, SpikeProfile } from '@reaatech/mcp-load-test-core';
import { rampProfileGenerator } from '@reaatech/mcp-load-test-profiles';
import { soakProfileGenerator } from '@reaatech/mcp-load-test-profiles';
import { spikeProfileGenerator } from '@reaatech/mcp-load-test-profiles';
import { describe, expect, it } from 'vitest';

describe('profile generators', () => {
  describe('rampProfileGenerator', () => {
    it('should ramp up concurrency', async () => {
      const profile: RampProfile = {
        type: 'ramp',
        minConcurrency: 1,
        maxConcurrency: 10,
        rampDurationMs: 2000,
        holdDurationMs: 1000,
      };

      const points: Array<{ concurrency: number; phase: string }> = [];
      for await (const point of rampProfileGenerator(profile)) {
        points.push(point);
      }

      expect(points.length).toBeGreaterThan(0);
      expect(points[0]?.concurrency).toBe(1);
      expect(points[points.length - 1]?.concurrency).toBeLessThanOrEqual(10);
    });

    it('should handle zero warmup and ramp down', async () => {
      const profile: RampProfile = {
        type: 'ramp',
        minConcurrency: 1,
        maxConcurrency: 5,
        rampDurationMs: 1000,
        holdDurationMs: 500,
        warmupDurationMs: 0,
        rampDownDurationMs: 0,
      };

      const points: Array<{ concurrency: number; phase: string }> = [];
      for await (const point of rampProfileGenerator(profile)) {
        points.push(point);
      }

      expect(points.some((p) => p.phase === 'warmup')).toBe(false);
      expect(points.some((p) => p.phase === 'ramp_down')).toBe(false);
      expect(points.some((p) => p.phase === 'ramp_up')).toBe(true);
    });
  });

  describe('soakProfileGenerator', () => {
    it('should maintain constant concurrency', async () => {
      const profile: SoakProfile = {
        type: 'soak',
        concurrency: 5,
        durationMs: 1500,
        sampleIntervalMs: 1000,
      };

      const points: Array<{ concurrency: number; phase: string }> = [];
      for await (const point of soakProfileGenerator(profile)) {
        points.push(point);
      }

      expect(points.every((p) => p.concurrency === 5)).toBe(true);
    });

    it('should handle zero warmup', async () => {
      const profile: SoakProfile = {
        type: 'soak',
        concurrency: 3,
        durationMs: 500,
        sampleIntervalMs: 1000,
        warmupDurationMs: 0,
      };

      const points: Array<{ concurrency: number; phase: string }> = [];
      for await (const point of soakProfileGenerator(profile)) {
        points.push(point);
      }

      expect(points.some((p) => p.phase === 'warmup')).toBe(false);
      expect(points.some((p) => p.phase === 'active')).toBe(true);
    });
  });

  describe('spikeProfileGenerator', () => {
    it('should alternate between baseline and spike', async () => {
      const profile: SpikeProfile = {
        type: 'spike',
        baselineConcurrency: 2,
        spikeConcurrency: 10,
        spikeDurationMs: 500,
        spikeCount: 2,
        cooldownMs: 500,
      };

      const points: Array<{ concurrency: number; phase: string }> = [];
      for await (const point of spikeProfileGenerator(profile)) {
        points.push(point);
      }

      const hasBaseline = points.some((p) => p.concurrency === 2);
      const hasSpike = points.some((p) => p.concurrency === 10);
      expect(hasBaseline).toBe(true);
      expect(hasSpike).toBe(true);
    });
  });
});
