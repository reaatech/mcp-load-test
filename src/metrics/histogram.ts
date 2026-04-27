import { calculateStats } from '../utils/index.js';
import type { LatencyMetrics } from '../types/domain.js';

const DEFAULT_BUCKETS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

export class LatencyHistogram {
  private buckets: number[];
  private counts: number[];
  private samples: number[] = [];
  private totalSum = 0;

  constructor(buckets?: number[]) {
    this.buckets =
      buckets && buckets.length > 0 ? [...buckets].sort((a, b) => a - b) : DEFAULT_BUCKETS;
    this.counts = new Array(this.buckets.length + 1).fill(0);
  }

  record(latencyMs: number): void {
    this.samples.push(latencyMs);
    this.totalSum += latencyMs;

    let bucketIndex = this.buckets.findIndex((b) => latencyMs <= b);
    if (bucketIndex === -1) {
      bucketIndex = this.buckets.length;
    }
    this.counts[bucketIndex]!++;
  }

  getStats(): LatencyMetrics {
    return calculateStats(this.samples);
  }

  getBucketCounts(): Array<{ upperBound: number; count: number }> {
    return this.buckets.map((upperBound, i) => ({
      upperBound,
      count: this.counts[i] || 0,
    }));
  }

  getOverflowCount(): number {
    return this.counts[this.buckets.length] || 0;
  }

  merge(other: LatencyHistogram): void {
    for (const sample of other.samples) {
      this.record(sample);
    }
  }

  clone(): LatencyHistogram {
    const cloned = new LatencyHistogram(this.buckets);
    cloned.merge(this);
    return cloned;
  }
}
