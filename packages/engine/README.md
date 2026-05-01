# @reaatech/mcp-load-test-engine

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-engine.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Orchestration engine and session manager for MCP load testing. Ties together profiles, patterns, metrics, breaking point detection, and grading into a single `LoadEngine.run()` call — producing a complete `LoadTestReport`.

## Installation

```bash
npm install @reaatech/mcp-load-test-engine
# or
pnpm add @reaatech/mcp-load-test-engine
```

## Feature Overview

- **Single `run()` entry point** — one async call executes the full test lifecycle
- **Session pool management** — `Promise.allSettled` scaling with individual-failure tolerance
- **Closed-loop concurrency** — long-lived sessions continuously execute weighted-random patterns
- **Breaking point monitoring** — integrated detection with recovery tracking during test execution
- **Auto-grading** — letter grades and recommendations embedded in the final report
- **SIGINT/SIGTERM-safe** — abort controllers for clean shutdown and partial report generation

## Quick Start

```typescript
import { LoadEngine } from "@reaatech/mcp-load-test-engine";

const engine = new LoadEngine({
  endpoint: "https://api.example.com/mcp",
  transport: "http",
  profile: {
    type: "ramp",
    minConcurrency: 1,
    maxConcurrency: 50,
    rampDurationMs: 30000,
    holdDurationMs: 10000,
  },
  patterns: [
    {
      name: "explore-then-act",
      weight: 1,
      thinkTimeMs: 100,
      onStepError: "continue",
      steps: [
        { tool: "tools/list", args: {} },
        { tool: "tools/call", args: { name: "echo", arguments: {} } },
      ],
    },
  ],
  breakingPointDetection: true,
  outputFormat: "console",
});

const report = await engine.run();

console.log(`Grade: ${report.grade}`);
console.log(`P99 Latency: ${report.toolLatencies[0]?.latency.p99}ms`);
console.log(`Peak RPS: ${report.throughput.peakRps}`);
```

## API Reference

### `LoadEngine`

The main orchestrator class.

```typescript
class LoadEngine {
  constructor(options: LoadEngineOptions);
  run(): Promise<LoadTestReport>;
}
```

#### Execution Flow

1. Records start time and generates a test UUID
2. Starts `MetricsCollector` and `SessionManager`
3. Executes the profile generator, adjusting session pool size each second
4. Checks breaking point on each tick (if enabled)
5. Stops session manager and metrics collector
6. Builds and returns `LoadTestReport` with grade and recommendations

#### `LoadEngineOptions`

| Property | Type | Description |
|----------|------|-------------|
| `endpoint` | `string` | MCP server URL or stdio command |
| `transport` | `TransportType` | `"stdio" \| "sse" \| "http" \| "auto"` |
| `auth` | `AuthOptions` | Optional authentication |
| `profile` | `LoadProfile` | Ramp, soak, spike, or custom profile |
| `patterns` | `ToolCallPattern[]` | At least one pattern |
| `breakingPointDetection` | `boolean` | Enable breaking point monitoring |
| `outputFormat` | `OutputFormat` | `"console" \| "markdown" \| "json"` |

### `SessionManager`

Manages a dynamic pool of MCP sessions with weighted-random pattern execution.

```typescript
class SessionManager {
  constructor(options: SessionManagerOptions);

  start(): Promise<void>;                  // Enable session loop
  stop(): Promise<void>;                   // Destroy all sessions
  createPool(targetConcurrency: number): Promise<void>;  // Scale sessions up/down
  getActiveSessions(): SessionState[];     // Current session list
  getSessionCount(): number;               // Current pool size
  setSessionStatus(status: SessionState["status"]): void;  // Update all session states
}
```

#### Session Lifecycle

1. **Create** — `createPool(n)` spawns `n` sessions via `Promise.allSettled` (individual failures don't abort pool expansion)
2. **Connect** — each session runs `client.connect()` → `initialize` handshake
3. **Loop** — each session enters an infinite loop of weighted-random pattern selection → execution, yielding on `AbortSignal`
4. **Destroy** — `stop()` or pool reduction calls `client.disconnect()` and aborts the loop

### `SessionState`

```typescript
interface SessionState {
  id: string;
  client: MCPClient;
  context: Record<string, unknown>;  // Multi-turn state (lastResult, etc.)
  currentPatternIndex: number;
  currentStepIndex: number;
  createdAt: number;
  lastActiveAt: number;
  requestCount: number;
  errorCount: number;
  status: "warming_up" | "active" | "cooling_down" | "error" | "completed";
}
```

## Usage Patterns

### Programmatic Report Processing

```typescript
const engine = new LoadEngine(options);
const report = await engine.run();

if (report.breakingPoint?.detected) {
  console.warn(`Server broke at ${report.breakingPoint.concurrencyAtBreak} sessions`);
  console.warn(`Recovery took ${report.breakingPoint.recoveryTimeMs}ms`);
}

if (report.grade === "D" || report.grade === "F") {
  process.exit(1);
}
```

### Abort-Aware Testing

```typescript
const engine = new LoadEngine(options);

process.on("SIGINT", () => {
  // The engine handles abort internally;
  // partial reports are still generated
});

const report = await engine.run();
// Report is always returned, even on interrupt
```

## Related Packages

- [`@reaatech/mcp-load-test-core`](https://www.npmjs.com/package/@reaatech/mcp-load-test-core) — Types, utilities, and logger
- [`@reaatech/mcp-load-test-metrics`](https://www.npmjs.com/package/@reaatech/mcp-load-test-metrics) — Metrics collection
- [`@reaatech/mcp-load-test-patterns`](https://www.npmjs.com/package/@reaatech/mcp-load-test-patterns) — Pattern executor
- [`@reaatech/mcp-load-test-profiles`](https://www.npmjs.com/package/@reaatech/mcp-load-test-profiles) — Profile generators
- [`@reaatech/mcp-load-test-analysis`](https://www.npmjs.com/package/@reaatech/mcp-load-test-analysis) — Breaking point and grading
- [`@reaatech/mcp-load-test-client`](https://www.npmjs.com/package/@reaatech/mcp-load-test-client) — Transport clients

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
