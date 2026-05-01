# @reaatech/mcp-load-test-analysis

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-analysis.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-analysis)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Breaking point detection and performance grading for MCP load test reports. Continuously monitors error rates and latency during tests, detects degradation thresholds, tracks recovery time, and assigns letter grades with actionable recommendations.

## Installation

```bash
npm install @reaatech/mcp-load-test-analysis
# or
pnpm add @reaatech/mcp-load-test-analysis
```

## Feature Overview

- **Breaking point detection** — monitors error rate, P99 latency, timeout rate, and connection failures against configurable thresholds
- **Recovery tracking** — once broken, watches a 5-second rolling window (minimum 10 samples) to detect when the server recovers
- **Letter grading** — A/B/C/D/F grades for latency (with per-tool-category benchmarks), concurrency, and error rate
- **Actionable recommendations** — auto-generates remediation advice based on breaking point, slow tools, error rates, and recovery time
- **Configurable thresholds** — override any detector threshold per test run

## Quick Start

```typescript
import { BreakingPointDetector, Grader } from "@reaatech/mcp-load-test-analysis";
import type { LoadTestReport } from "@reaatech/mcp-load-test-core";

// Breaking point detection
const detector = new BreakingPointDetector({
  errorRate: 0.05,        // 5% error rate threshold
  latencyP99: 10000,      // 10s P99 threshold
  timeoutRate: 0.10,      // 10% timeout threshold
  connectionFailures: 10, // Absolute count
});

// Check during a test
const broken = detector.check(currentConcurrency, metricsCollector);

// Get results after
const result = detector.getResult();
// { detected: true, concurrencyAtBreak: 47, recoveryTimeMs: 45000 }
```

## API Reference

### `BreakingPointDetector`

```typescript
class BreakingPointDetector {
  constructor(thresholds?: Partial<BreakingThresholds>);

  check(concurrency: number, metrics: MetricsCollector): boolean;  // Returns true if broken
  getResult(): BreakingPointResult;
  reset(): void;  // Clear state for re-use
}
```

#### `BreakingThresholds`

| Property | Default | Description |
|----------|---------|-------------|
| `errorRate` | `0.05` | Overall error rate threshold |
| `latencyP99` | `10000` | P99 latency threshold in ms |
| `timeoutRate` | `0.10` | Timeout proportion threshold |
| `connectionFailures` | `10` | Absolute connection-failure count |

#### `BreakingPointResult`

| Property | Type | Description |
|----------|------|-------------|
| `detected` | `boolean` | Whether the server broke |
| `concurrencyAtBreak` | `number \| null` | Concurrency when break was first detected |
| `errorRateAtBreak` | `number \| null` | Error rate at the breaking point |
| `latencyP99AtBreak` | `number \| null` | P99 latency at the breaking point |
| `recoveryTimeMs` | `number \| null` | Time until error rate returned below threshold |

### `Grader`

Assigns letter grades and generates human-readable recommendations.

```typescript
class Grader {
  constructor(options?: GraderOptions);

  grade(report: LoadTestReport, context?: GradeContext): Grade;
  generateRecommendations(report: LoadTestReport): string[];
}
```

#### `GraderOptions`

| Property | Type | Description |
|----------|------|-------------|
| `toolCategoryMap` | `Record<string, string>` | Maps tool names to categories (`"compute"`, `"search"`, `"io"`) for per-category benchmarks |

### Grading Functions

Standalone functions usable without the `Grader` class:

```typescript
import { gradeLatency, gradeConcurrency, gradeErrorRate, overallGrade } from "@reaatech/mcp-load-test-analysis";

gradeLatency(p99: number, benchmarks?: LatencyBenchmarks): Grade;
gradeConcurrency(maxSustainable: number): Grade;
gradeErrorRate(errorRate: number): Grade;
overallGrade(...scores: Grade[]): Grade;  // Returns the worst grade
```

### Default Benchmarks

| Dimension | A | B | C | D |
|-----------|---|---|---|---|
| Latency P99 | ≤ 500ms | ≤ 1000ms | ≤ 2000ms | ≤ 5000ms |
| Concurrency | ≥ 100 | ≥ 50 | ≥ 25 | ≥ 10 |
| Error Rate | 0% | ≤ 1% | ≤ 5% | ≤ 10% |

#### Per-Tool-Category Latency Overrides

| Category | A | B | C | D |
|----------|---|---|---|---|
| compute | ≤ 100ms | ≤ 250ms | ≤ 500ms | ≤ 1000ms |
| search | ≤ 1000ms | ≤ 2000ms | ≤ 5000ms | ≤ 10000ms |
| io | ≤ 250ms | ≤ 500ms | ≤ 1000ms | ≤ 2500ms |

## Usage Patterns

### Detection with Recovery Tracking

```typescript
const detector = new BreakingPointDetector({ errorRate: 0.05 });

for (const { concurrency } of profileGenerator) {
  const broken = detector.check(concurrency, metrics);

  if (broken && detector.getResult().recoveryTimeMs === null) {
    // Not yet recovered — still in a broken state
    continue;
  }

  if (broken && detector.getResult().recoveryTimeMs !== null) {
    console.log(`Recovered after ${detector.getResult().recoveryTimeMs}ms`);
    break;
  }
}
```

### Custom Benchmarks per Tool

```typescript
import { Grader } from "@reaatech/mcp-load-test-analysis";

const grader = new Grader({
  toolCategoryMap: {
    "db-query": "search",
    "math-solver": "compute",
    "file-upload": "io",
  },
});

const grade = grader.grade(report);
const recs = grader.generateRecommendations(report);
// ["Slow tools detected: db-query. Consider optimization or caching."]
```

## Related Packages

- [`@reaatech/mcp-load-test-core`](https://www.npmjs.com/package/@reaatech/mcp-load-test-core) — Report and result types
- [`@reaatech/mcp-load-test-metrics`](https://www.npmjs.com/package/@reaatech/mcp-load-test-metrics) — Metrics collector consumed by the detector

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
