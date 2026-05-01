# mcp-load-test

[![CI](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org/)

> Load testing framework purpose-built for [MCP (Model Context Protocol)](https://spec.modelcontextprotocol.io/) servers. Transport-aware, session-based, pattern-driven — with latency histograms, breaking point detection, and PR-ready reports.

This monorepo provides a CLI, an orchestration engine, MCP transport clients, and supporting infrastructure for stress-testing MCP servers under realistic concurrent workloads.

## Features

- **Transport-aware** — StreamableHTTP, SSE, and stdio have radically different concurrency profiles; this framework understands and accounts for each
- **Session-based closed-loop concurrency** — long-lived sessions continuously execute weighted-random tool-call patterns, modeling real user behavior
- **Realistic patterns** — explore-then-act, read-then-write, and multi-step workflows with template variables, think-time delays, and stateful context
- **Latency histograms** — per-tool P50/P90/P95/P99 tracking with configurable bucket boundaries
- **Breaking point detection** — adaptive threshold monitoring for error rates, latency spikes, timeout rates, and connection failures — with recovery time tracking
- **Performance grading** — A/B/C/D/F letter grades for latency, concurrency, and error rate with per-tool-category benchmarks
- **PR-ready reports** — console (ANSI-colored), markdown (GitHub-flavored), and JSON (CI/CD) output formats

## Installation

### Using the CLI

```bash
npm install -g @reaatech/mcp-load-test-cli
# or
pnpm add -g @reaatech/mcp-load-test-cli
```

### Using individual packages

```bash
# Core types, schemas, utilities, and logging
pnpm add @reaatech/mcp-load-test-core

# Latency histograms and throughput collection
pnpm add @reaatech/mcp-load-test-metrics

# Tool call patterns and executor
pnpm add @reaatech/mcp-load-test-patterns

# Concurrency profile generators
pnpm add @reaatech/mcp-load-test-profiles

# Breaking point detection and grading
pnpm add @reaatech/mcp-load-test-analysis

# MCP transport clients (stdio, SSE, HTTP)
pnpm add @reaatech/mcp-load-test-client

# Console, markdown, and JSON reporters
pnpm add @reaatech/mcp-load-test-reporters

# Orchestration engine and session manager
pnpm add @reaatech/mcp-load-test-engine

# Command-line interface
pnpm add @reaatech/mcp-load-test-cli
```

### Contributing

```bash
# Clone the repository
git clone https://github.com/reaatech/mcp-load-test.git
cd mcp-load-test

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the test suite
pnpm test

# Run linting
pnpm lint
```

## Quick Start

Run a ramp test against an MCP server:

```bash
mcp-load-test load --endpoint https://api.example.com/mcp \
  --transport http \
  --profile ramp \
  --max-concurrency 100 \
  --duration 300 \
  --breaking-point \
  --format markdown \
  --output report.md
```

Run a soak test to detect memory leaks:

```bash
mcp-load-test soak --endpoint https://api.example.com/mcp \
  --concurrency 50 \
  --duration 1800 \
  --format json \
  --output soak-results.json
```

Compare two test runs:

```bash
mcp-load-test compare --baseline baseline.json --current soak-results.json
```

### Programmatic Usage

```typescript
import { LoadEngine } from "@reaatech/mcp-load-test-engine";
import { MarkdownReporter } from "@reaatech/mcp-load-test-reporters";

const engine = new LoadEngine({
  endpoint: "https://api.example.com/mcp",
  transport: "http",
  profile: {
    type: "ramp",
    minConcurrency: 1,
    maxConcurrency: 100,
    rampDurationMs: 300000,
    holdDurationMs: 120000,
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
  outputFormat: "markdown",
});

const report = await engine.run();
const output = new MarkdownReporter().format(report);
console.log(output);
```

## Packages

| Package | Description |
| ------- | ----------- |
| [`@reaatech/mcp-load-test-core`](./packages/core) | Types, Zod schemas, utilities, and structured logging |
| [`@reaatech/mcp-load-test-metrics`](./packages/metrics) | Latency histograms, throughput collection, and error tracking |
| [`@reaatech/mcp-load-test-patterns`](./packages/patterns) | Tool call patterns and execution engine |
| [`@reaatech/mcp-load-test-profiles`](./packages/profiles) | Concurrency profile generators (ramp, soak, spike, custom) |
| [`@reaatech/mcp-load-test-analysis`](./packages/analysis) | Breaking point detection and performance grading |
| [`@reaatech/mcp-load-test-client`](./packages/client) | MCP transport clients (stdio, SSE, StreamableHTTP) |
| [`@reaatech/mcp-load-test-reporters`](./packages/reporters) | Console, markdown, and JSON output formatters |
| [`@reaatech/mcp-load-test-engine`](./packages/engine) | Orchestration engine and session manager |
| [`@reaatech/mcp-load-test-cli`](./packages/cli) | Command-line interface (`mcp-load-test` binary) |

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System design, package relationships, and data flows
- [`AGENTS.md`](./AGENTS.md) — Coding conventions and development guidelines
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contribution workflow and release process


## Comparison with mcp-server-doctor

| Aspect | [mcp-server-doctor](https://github.com/reaatech/mcp-server-doctor) | mcp-load-test |
|--------|---------------------------------------------------------------------|---------------|
| Purpose | Diagnostics & compliance grading | Stress testing & breaking point |
| Duration | Seconds | Minutes to hours |
| Concurrency | Low (1–10) | High (1–100+) |
| Focus | Correctness, protocol compliance | Performance, capacity limits |
| Output | Report card grade | Breaking point analysis |
| Use Case | Pre-deployment check | Capacity planning |

Together they provide complete MCP server quality assurance:
- **Doctor** answers: "Is the server correctly implemented?"
- **Load Test** answers: "How much load can the server handle?"

## License

[MIT](LICENSE)
