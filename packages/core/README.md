# @reaatech/mcp-load-test-core

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-core.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Canonical TypeScript types, Zod schemas, utility functions, and structured logging for the `@reaatech/mcp-load-test-*` ecosystem. This package is the single source of truth for all MCP load test domain shapes.

## Installation

```bash
npm install @reaatech/mcp-load-test-core
# or
pnpm add @reaatech/mcp-load-test-core
```

## Feature Overview

- **30+ exported types** — every domain entity has a TypeScript interface or type alias
- **Zod schemas** — runtime validation for all configuration shapes (profiles, patterns, auth, engine options)
- **Utility library** — percentile calculation, stats aggregation, retry with backoff, URL validation, timing helpers
- **Structured logging** — pre-configured Pino logger with opt-in pretty printing via `MCP_LT_PRETTY_LOGS`
- **Zero cross-package dependencies** — lightweight foundation for the entire ecosystem

## Quick Start

```typescript
import {
  type LoadProfile,
  type ToolCallPattern,
  type LoadEngineOptions,
  loadEngineOptionsSchema,
} from "@reaatech/mcp-load-test-core";

// Define a ramp profile
const profile: LoadProfile = {
  type: "ramp",
  minConcurrency: 1,
  maxConcurrency: 100,
  rampDurationMs: 300000,
  holdDurationMs: 120000,
};

// Validate runtime configuration with Zod
const options = loadEngineOptionsSchema.parse({
  endpoint: "https://api.example.com/mcp",
  transport: "http",
  profile,
  patterns: [{ name: "explore-then-act", weight: 1, thinkTimeMs: 100, onStepError: "continue", steps: [{ tool: "tools/list", args: {} }] }],
});
```

## Exports

### Domain Types (`types/domain.ts`)

| Export | Description |
|--------|-------------|
| `Grade` | Letter grade: `"A" \| "B" \| "C" \| "D" \| "F"` |
| `TransportType` | Transport protocol: `"stdio" \| "sse" \| "http" \| "auto"` |
| `AuthMode` | Authentication mode: `"none" \| "api-key" \| "bearer" \| "oauth"` |
| `ToolDefinition` | MCP tool descriptor with `name`, `description`, `inputSchema` |
| `LatencyMetrics` | Percentile summary: `p50`, `p90`, `p95`, `p99`, `min`, `max`, `mean`, `samples` |
| `ToolLatencyMetrics` | Per-tool latency with `toolName` and `latency: LatencyMetrics` |
| `ErrorSummary` | Error aggregation: `totalErrors`, `errorRate`, breakdowns by category and tool |
| `ThroughputMetrics` | Throughput snapshot: `averageRps`, `peakRps`, success/failure tallies |
| `BreakingPointResult` | Detection result: `detected`, `concurrencyAtBreak`, `recoveryTimeMs` |
| `BaselineComparison` | Comparison deltas: grade change, latency/error/throughput deltas |
| `LoadTestReport` | Full test output: grade, breaking point, latencies, errors, throughput, recommendations |

### Profile Types

| Export | Description |
|--------|-------------|
| `RampProfile` | Linear ramp from min → max concurrency |
| `SoakProfile` | Sustained constant-concurrency load |
| `SpikeProfile` | Alternating baseline/spike cycles |
| `CustomProfile` | Arbitrary concurrency curve via `concurrencyCurve` |
| `LoadProfile` | Discriminated union of all four profile types |

### Pattern Types

| Export | Description |
|--------|-------------|
| `PatternStep` | A single tool call: `{ tool: string; args: Record<string, unknown> }` |
| `ToolCallPattern` | Multi-step sequence with weight, think time, and error policy |

### Configuration Types

| Export | Description |
|--------|-------------|
| `AuthOptions` | Auth configuration for API key, bearer token, or OAuth |
| `LoadEngineOptions` | Complete test configuration (endpoint, transport, profile, patterns) |
| `SessionState` | Per-session mutable state (id, client, context, counters, status) |
| `MCPClient` | Interface contract for transport-layer abstraction |

### Zod Schemas (`types/schemas.ts`)

Every domain type has a corresponding Zod schema for runtime validation:

| Schema | Validates |
|--------|-----------|
| `loadProfileSchema` | Union of `rampProfileSchema`, `soakProfileSchema`, `spikeProfileSchema`, `customProfileSchema` |
| `toolCallPatternSchema` | Pattern definition with step count ≥ 1 |
| `authOptionsSchema` | Auth mode and credentials |
| `loadEngineOptionsSchema` | Full test configuration |

### Utilities (`utils/index.ts`)

| Export | Description |
|--------|-------------|
| `generateUUID()` | RFC 9562 UUID v4 |
| `generateId()` | 8-character random identifier |
| `now()` | ISO 8601 UTC timestamp |
| `measureTimeAsync(fn)` | Wraps an async function and returns `{ result, durationMs }` |
| `sleep(ms)` | Promise-based delay |
| `retryWithBackoff(fn, maxRetries?, baseDelay?, multiplier?)` | Exponential backoff retry loop |
| `percentile(sortedValues, p)` | Interpolated percentile calculation |
| `calculateStats(values)` | Full stats object (p50/p90/p95/p99/min/max/mean/samples) |
| `isValidURL(value)` | URL string validation |
| `isPrivateURL(url)` | RFC 1918 / loopback / link-local detection |

### Logging (`observability/logger.ts`)

| Export | Description |
|--------|-------------|
| `logger` | Pre-configured Pino logger instance. Level controlled by `LOG_LEVEL` env (default `"info"`). Pretty output enabled when `MCP_LT_PRETTY_LOGS=1`. |

### Version (`version.ts`)

| Export | Description |
|--------|-------------|
| `getProgramVersion()` | Returns the package version from `package.json` (cached) |

## Related Packages

- [`@reaatech/mcp-load-test-metrics`](https://www.npmjs.com/package/@reaatech/mcp-load-test-metrics) — Latency histograms and throughput collection
- [`@reaatech/mcp-load-test-patterns`](https://www.npmjs.com/package/@reaatech/mcp-load-test-patterns) — Tool call patterns and executor
- [`@reaatech/mcp-load-test-profiles`](https://www.npmjs.com/package/@reaatech/mcp-load-test-profiles) — Concurrency profile generators
- [`@reaatech/mcp-load-test-analysis`](https://www.npmjs.com/package/@reaatech/mcp-load-test-analysis) — Breaking point detection and grading
- [`@reaatech/mcp-load-test-client`](https://www.npmjs.com/package/@reaatech/mcp-load-test-client) — MCP transport clients

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
