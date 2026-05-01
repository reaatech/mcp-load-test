# @reaatech/mcp-load-test-profiles

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-profiles.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-profiles)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Async generator-based concurrency profile generators for MCP load testing. Produces `{ concurrency, phase }` tuples at 1-second intervals to feed the engine's session pool.

## Installation

```bash
npm install @reaatech/mcp-load-test-profiles
# or
pnpm add @reaatech/mcp-load-test-profiles
```

## Feature Overview

- **Four profile types** — ramp, soak, spike, and custom (arbitrary curve)
- **Phase tracking** — each yield includes a phase label (`warmup`, `ramp_up`, `hold`, `active`, `baseline`, `spike`, `cooldown`) for metrics filtering
- **Linear interpolation** — smooth concurrency transitions in ramp and custom profiles
- **Configurable warmup** — optional warmup period where metrics are typically discarded
- **1-second resolution** — generators yield at roughly 1-second intervals for engine feedback loops

## Quick Start

```typescript
import { rampProfileGenerator } from "@reaatech/mcp-load-test-profiles";

const generator = rampProfileGenerator({
  type: "ramp",
  minConcurrency: 1,
  maxConcurrency: 50,
  rampDurationMs: 30000,      // 30 seconds to reach 50
  holdDurationMs: 10000,      // 10 seconds at peak
  rampDownDurationMs: 5000,   // 5 seconds back to 1
  warmupDurationMs: 5000,     // 5 seconds of warmup at min
});

for await (const { concurrency, phase } of generator) {
  // Adjust session pool to `concurrency`
  // Filter metrics based on `phase`
  console.log(`${phase}: ${concurrency} sessions`);
}
```

## API Reference

### `rampProfileGenerator(profile: RampProfile)`

Gradually increases concurrency from min to max, holds, then optionally ramps down.

**Phases:** `warmup` → `ramp_up` → `hold` → `ramp_down`

```typescript
interface RampProfile {
  type: "ramp";
  minConcurrency: number;
  maxConcurrency: number;
  rampDurationMs: number;
  holdDurationMs: number;
  rampDownDurationMs?: number;
  warmupDurationMs?: number;
}
```

### `soakProfileGenerator(profile: SoakProfile)`

Sustained constant-concurrency load to detect memory leaks and long-term degradation.

**Phases:** `warmup` → `active` → `cooldown`

```typescript
interface SoakProfile {
  type: "soak";
  concurrency: number;
  durationMs: number;
  warmupDurationMs?: number;
  sampleIntervalMs: number;
}
```

### `spikeProfileGenerator(profile: SpikeProfile)`

Alternating baseline/spike cycles to test resilience against sudden bursts.

**Phases:** `baseline` → `spike` → `baseline` → `spike` → ... → `cooldown`

```typescript
interface SpikeProfile {
  type: "spike";
  baselineConcurrency: number;
  spikeConcurrency: number;
  spikeDurationMs: number;
  spikeCount: number;
  cooldownMs: number;
}
```

### `customProfileGenerator(profile: CustomProfile)`

Arbitrary concurrency curve with linear interpolation between user-defined points.

**Phases:** `warmup` → `active`

```typescript
interface CustomProfile {
  type: "custom";
  concurrencyCurve: Array<{ timeMs: number; concurrency: number }>;
  warmupDurationMs?: number;
}
```

## Usage Patterns

### Custom Concurrency Curve

```typescript
import { customProfileGenerator } from "@reaatech/mcp-load-test-profiles";

const generator = customProfileGenerator({
  type: "custom",
  concurrencyCurve: [
    { timeMs: 0,     concurrency: 1 },
    { timeMs: 10000, concurrency: 25 },
    { timeMs: 20000, concurrency: 50 },
    { timeMs: 30000, concurrency: 10 }, // sudden drop
    { timeMs: 40000, concurrency: 100 }, // spike
  ],
});

for await (const { concurrency } of generator) {
  console.log(concurrency);
  // 1, 3, 5, ..., 25, 28, ..., 50, 42, ..., 10, 19, ..., 100
}
```

### Filtering Metrics by Phase

```typescript
for await (const { concurrency, phase } of rampProfileGenerator(profile)) {
  if (phase === "warmup") {
    // Don't record metrics — server is still scaling up
  } else {
    // Record metrics normally
  }
}
```

## Related Packages

- [`@reaatech/mcp-load-test-core`](https://www.npmjs.com/package/@reaatech/mcp-load-test-core) — Profile type definitions
- [`@reaatech/mcp-load-test-engine`](https://www.npmjs.com/package/@reaatech/mcp-load-test-engine) — Engine that consumes these generators

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
