# @reaatech/mcp-load-test-patterns

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-patterns.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-patterns)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Realistic MCP tool-call sequences and a pattern execution engine for load testing. Models user behaviors like explore-then-act, read-then-write, and multi-step workflows — with template variables, think-time delays, and error categorization.

## Installation

```bash
npm install @reaatech/mcp-load-test-patterns
# or
pnpm add @reaatech/mcp-load-test-patterns
```

## Feature Overview

- **3 built-in patterns** — `EXPLORE_THEN_ACT`, `READ_THEN_WRITE`, `MULTI_STEP_WORKFLOW`
- **Weighted random selection** — pick patterns proportionally in session loops
- **Template variables** — `{{random.string}}`, `{{random.tool}}`, `{{previous.field}}` for stateful multi-step flows
- **Configurable think time** — realistic inter-step delays per pattern
- **Error policy per pattern** — `"abort"` stops the pattern on failure, `"continue"` moves to the next step
- **Automatic error categorization** — maps error messages to `ErrorCategory` for metrics collection

## Quick Start

```typescript
import { PatternExecutor, BUILT_IN_PATTERNS } from "@reaatech/mcp-load-test-patterns";
import { MetricsCollector } from "@reaatech/mcp-load-test-metrics";
import { createSessionClient } from "@reaatech/mcp-load-test-client";

const client = createSessionClient("http://localhost:3000", {
  transport: "http",
  timeout: 30000,
});
await client.connect();

const metrics = new MetricsCollector();
metrics.start();

const session = {
  id: "sess-1",
  client,
  context: {},
  currentPatternIndex: 0,
  currentStepIndex: 0,
  createdAt: Date.now(),
  lastActiveAt: Date.now(),
  requestCount: 0,
  errorCount: 0,
  status: "active" as const,
};

const executor = new PatternExecutor(client, metrics, session);

// Choose a pattern by weighted random selection
const totalWeight = BUILT_IN_PATTERNS.reduce((sum, p) => sum + p.weight, 0);
let random = Math.random() * totalWeight;
let selected = BUILT_IN_PATTERNS[0]!;
for (const pattern of BUILT_IN_PATTERNS) {
  random -= pattern.weight;
  if (random <= 0) { selected = pattern; break; }
}

await executor.execute(selected);
```

## API Reference

### `PatternExecutor`

Executes a `ToolCallPattern` step by step, recording latency and errors to the provided `MetricsCollector`.

```typescript
class PatternExecutor {
  constructor(
    client: MCPClient,
    metrics: MetricsCollector,
    sessionState: SessionState,
  );

  execute(pattern: ToolCallPattern): Promise<void>;
}
```

On each step, the executor:
1. Resolves template variables in step arguments
2. Dispatches `tools/list`, `tools/call`, or generic `sendRequest`
3. Records success/failure to the `MetricsCollector`
4. Updates `sessionState` with timing and context
5. Applies the pattern's `onStepError` policy

### `BUILT_IN_PATTERNS`

An array of three ready-to-use patterns:

| Pattern | Steps | Think Time | On Error |
|---------|-------|------------|----------|
| `EXPLORE_THEN_ACT` | `tools/list` → `tools/call` (random tool) | 100ms | continue |
| `READ_THEN_WRITE` | `resources/read` → `tools/call` → `resources/read` ({{previous.uri}}) | 200ms | abort |
| `MULTI_STEP_WORKFLOW` | `tools/call create` → `process` → `cleanup` ({{previous.id}}) | 150ms | abort |

### `resolvePattern(pattern, tools)`

Resolves `{{random.tool}}` placeholders against the actual tool list:

```typescript
import { resolvePattern, EXPLORE_THEN_ACT } from "@reaatech/mcp-load-test-patterns";

const tools = await client.listTools();
const resolved = resolvePattern(EXPLORE_THEN_ACT, tools);
```

### Template Variables

| Variable | Resolves To |
|----------|------------|
| `{{random.string}}` | Random 6-char alphanumeric string |
| `{{random.tool}}` | Random tool name from `resolvePattern` |
| `{{previous}}` | Full result from the previous step |
| `{{previous.field}}` | Nested field from the previous result (dot-notation) |

## Usage Patterns

### Custom Pattern Definition

```typescript
import { PatternExecutor } from "@reaatech/mcp-load-test-patterns";
import type { ToolCallPattern } from "@reaatech/mcp-load-test-core";

const myPattern: ToolCallPattern = {
  name: "search-and-process",
  weight: 0.5,
  thinkTimeMs: 100,
  onStepError: "continue",
  steps: [
    { tool: "search", args: { query: "{{random.string}}" } },
    { tool: "process", args: { results: "{{previous}}" } },
  ],
};
```

## Related Packages

- [`@reaatech/mcp-load-test-core`](https://www.npmjs.com/package/@reaatech/mcp-load-test-core) — Types and utilities
- [`@reaatech/mcp-load-test-metrics`](https://www.npmjs.com/package/@reaatech/mcp-load-test-metrics) — Latency/error collection
- [`@reaatech/mcp-load-test-engine`](https://www.npmjs.com/package/@reaatech/mcp-load-test-engine) — Session management and orchestration

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
