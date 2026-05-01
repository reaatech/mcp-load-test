import type { CustomProfile } from '@reaatech/mcp-load-test-core';
import { customProfileGenerator } from '@reaatech/mcp-load-test-profiles';
import { describe, expect, it } from 'vitest';

describe('customProfileGenerator', () => {
  it('should follow a custom concurrency curve', async () => {
    const profile: CustomProfile = {
      type: 'custom',
      concurrencyCurve: [
        { timeMs: 0, concurrency: 1 },
        { timeMs: 1000, concurrency: 5 },
        { timeMs: 2000, concurrency: 10 },
      ],
    };

    const points: Array<{ concurrency: number; phase: string }> = [];
    for await (const point of customProfileGenerator(profile)) {
      points.push(point);
    }

    expect(points.length).toBeGreaterThan(0);
    expect(points[0]?.concurrency).toBe(1);
    expect(points[points.length - 1]?.concurrency).toBe(10);
  });

  it('should interpolate between curve points', async () => {
    const profile: CustomProfile = {
      type: 'custom',
      concurrencyCurve: [
        { timeMs: 0, concurrency: 0 },
        { timeMs: 2000, concurrency: 10 },
      ],
    };

    const points: Array<{ concurrency: number; phase: string }> = [];
    for await (const point of customProfileGenerator(profile)) {
      points.push(point);
    }

    // At ~1000ms, should be around 5
    const midPoint = points.find((p) => p.concurrency >= 4 && p.concurrency <= 6);
    expect(midPoint).toBeDefined();
  });

  it('should handle warmup period', async () => {
    const profile: CustomProfile = {
      type: 'custom',
      concurrencyCurve: [
        { timeMs: 0, concurrency: 5 },
        { timeMs: 1000, concurrency: 10 },
      ],
      warmupDurationMs: 500,
    };

    const points: Array<{ concurrency: number; phase: string }> = [];
    for await (const point of customProfileGenerator(profile)) {
      points.push(point);
    }

    expect(points.some((p) => p.phase === 'warmup')).toBe(true);
    expect(points.some((p) => p.phase === 'active')).toBe(true);
  });

  it('should handle empty curve', async () => {
    const profile: CustomProfile = {
      type: 'custom',
      concurrencyCurve: [],
      warmupDurationMs: 0,
    };

    const points: Array<{ concurrency: number; phase: string }> = [];
    for await (const point of customProfileGenerator(profile)) {
      points.push(point);
    }

    expect(points.length).toBe(0);
  });
});
