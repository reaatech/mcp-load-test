import { describe, it, expect } from 'vitest';
import { LatencyHistogram } from '../../src/metrics/histogram.js';

describe('LatencyHistogram', () => {
  it('should record and calculate stats', () => {
    const h = new LatencyHistogram();
    h.record(10);
    h.record(20);
    h.record(30);

    const stats = h.getStats();
    expect(stats.samples).toBe(3);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(30);
    expect(stats.p50).toBe(20);
  });

  it('should track bucket counts', () => {
    const h = new LatencyHistogram([10, 50, 100]);
    h.record(5);
    h.record(20);
    h.record(60);
    h.record(200);

    const buckets = h.getBucketCounts();
    expect(buckets[0]?.count).toBe(1); // <= 10
    expect(buckets[1]?.count).toBe(1); // <= 50
    expect(buckets[2]?.count).toBe(1); // <= 100
    expect(h.getOverflowCount()).toBe(1); // > 100
  });

  it('should merge histograms', () => {
    const h1 = new LatencyHistogram();
    h1.record(10);
    h1.record(20);

    const h2 = new LatencyHistogram();
    h2.record(30);

    h1.merge(h2);
    expect(h1.getStats().samples).toBe(3);
  });

  it('should clone correctly', () => {
    const h1 = new LatencyHistogram();
    h1.record(10);

    const h2 = h1.clone();
    h2.record(20);

    expect(h1.getStats().samples).toBe(1);
    expect(h2.getStats().samples).toBe(2);
  });
});
