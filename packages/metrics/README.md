# @reaatech/mcp-load-test-metrics

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-metrics.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-metrics)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Latency histograms, throughput collection, and error tracking purpose-built for MCP load testing. Tracks per-tool percentile distributions, rolling-window error rates, and peak RPS from raw request records.

## Installation

```bash
npm install @reaatech/mcp-load-test-metrics
# or
pnpm add @reaatech/mcp-load-test-metrics
```

## Feature Overview

- **Per-tool latency histograms** — configurable bucket boundaries, auto-created on first request
- **Full stats output** — P50/P90/P95/P99/min/max/mean/sample count via `calculateStats`
- **Error categorization** — classifies failures as `TIMEOUT`, `CONNECTION`, `PROTOCOL`, `SERVER`, `CLIENT`, or `BACKPRESSURE`
- **Rolling-window error rate** — configurable window (default 5s) for breaking point and recovery detection
- **Peak RPS calculation** — 1-second window resolution from buffered request records
- **Circular buffer** — 100K-record ceiling with oldest-half eviction to keep memory bounded
- **Tool-agnostic** — works with any MCP tool name without registration

## Quick Start

```typescript
import { MetricsCollector } from "@reaatech/mcp-load-test-metrics";

const metrics = new MetricsCollector();

metrics.start();

// Record requests as they complete
metrics.record({
  sessionId: "sess-1",
  toolName: "search",
  latencyMs: 45,
  success: true,
  timestamp: Date.now(),
});

metrics.record({
  sessionId: "sess-2",
  toolName: "search",
  latencyMs: 0,
  success: false,
  errorCategory: "TIMEOUT",
  timestamp: Date.now(),
});

metrics.stop();

// Retrieve aggregated results
const errorSummary = metrics.getErrorSummary();
console.log(`Error rate: ${(errorSummary.errorRate * 100).toFixed(1)}%`);

const throughput = metrics.getThroughput();
console.log(`Peak RPS: ${throughput.peakRps}`);

const p99 = metrics.getOverallLatencyP99();
console.log(`Overall P99: ${p99}ms`);

// Per-tool histograms
for (const [toolName, histogram] of metrics.getToolHistograms()) {
  const stats = histogram.getStats();
  console.log(`${toolName} P99: ${stats.p99}ms`);
}
```

## API Reference

### `MetricsCollector`

Central collector that records individual request results and produces aggregate reports.

```typescript
class MetricsCollector {
  constructor(maxBufferSize?: number); // default 100_000

  start(): void;                       // Reset counters and begin collection
  stop(): void;                        // Finalize and stop timing
  record(request: RequestRecord): void; // Record an individual request result

  getToolHistograms(): Map<string, LatencyHistogram>; // Per-tool histogram map
  getErrorSummary(): ErrorSummary;                     // Error counts, rates, breakdowns
  getThroughput(): ThroughputMetrics;                  // Average/peak RPS, success/failure
  getOverallLatencyP99(): number;                      // P99 across all tools
  getWindowedErrorRate(windowMs: number): { errorRate: number; samples: number };
  getActiveSessionCountOverTime(): Array<{ timestamp: number; count: number }>;
}
```

### `ErrorCategory`

```typescript
type ErrorCategory =
  | "TIMEOUT"       // Request exceeded timeout
  | "CONNECTION"    // Network/connection failure
  | "PROTOCOL"      // Invalid MCP protocol response
  | "SERVER"        // Server-returned error (5xx)
  | "CLIENT"        // Client-side error
  | "BACKPRESSURE"; // 429/503 throttling
```

### `RequestRecord`

```typescript
interface RequestRecord {
  sessionId: string;
  toolName: string;
  latencyMs: number;
  success: boolean;
  errorCategory?: ErrorCategory;
  timestamp: number;
}
```

### `LatencyHistogram`

Bucket-based histogram with percentile calculation via `calculateStats` from core.

```typescript
class LatencyHistogram {
  constructor(buckets?: number[]); // Default: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]ms

  record(latencyMs: number): void;
  getStats(): LatencyMetrics;      // p50, p90, p95, p99, min, max, mean, samples
  getBucketCounts(): Array<{ upperBound: number; count: number }>;
  getOverflowCount(): number;      // Requests above the highest bucket
  merge(other: LatencyHistogram): void;
  clone(): LatencyHistogram;
}
```

## Usage Patterns

### Custom Histogram Buckets

```typescript
const histogram = new LatencyHistogram([5, 10, 25, 50, 100, 250, 500]);
histogram.record(42);
histogram.record(180);
const stats = histogram.getStats();
// stats.p50 ≈ 42, stats.p99 ≈ 180
```

### Windowed Error Rate for Recovery Detection

```typescript
// After detecting a breaking point, check if recovery is occurring
const windowed = metrics.getWindowedErrorRate(5000); // 5-second window
if (windowed.errorRate < 0.05 && windowed.samples >= 10) {
  console.log("Server appears recovered");
}
```

## Related Packages

- [`@reaatech/mcp-load-test-core`](https://www.npmjs.com/package/@reaatech/mcp-load-test-core) — Types, utilities, and schemas
- [`@reaatech/mcp-load-test-analysis`](https://www.npmjs.com/package/@reaatech/mcp-load-test-analysis) — Breaking point detection and grading
- [`@reaatech/mcp-load-test-engine`](https://www.npmjs.com/package/@reaatech/mcp-load-test-engine) — Orchestration engine

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
