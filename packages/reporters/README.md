# @reaatech/mcp-load-test-reporters

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-reporters.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-reporters)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Console, markdown, and JSON output formatters for MCP load test reports. Choose between real-time terminal display, GitHub-flavored PR-ready markdown, or machine-readable JSON for CI/CD integration.

## Installation

```bash
npm install @reaatech/mcp-load-test-reporters
# or
pnpm add @reaatech/mcp-load-test-reporters
```

## Feature Overview

- **Console reporter** — ANSI-colored tables with grade color coding, breaking point warnings, and latency tables
- **Markdown reporter** — GitHub-flavored tables and formatted sections suitable for PR comments
- **JSON reporter** — machine-readable output for CI/CD pipelines and programmatic consumption
- **Grade color coding** — green (A/B), yellow (C), red (D/F) in console output
- **Duration formatting** — human-readable `2m 30s` or `1h 5m 10s` timestamps

## Quick Start

```typescript
import {
  ConsoleReporter,
  MarkdownReporter,
  JsonReporter,
} from "@reaatech/mcp-load-test-reporters";
import type { LoadTestReport } from "@reaatech/mcp-load-test-core";

const report: LoadTestReport = {
  id: "test-abc123",
  endpoint: "https://api.example.com/mcp",
  startedAt: "2026-05-01T00:00:00Z",
  completedAt: "2026-05-01T00:01:00Z",
  durationMs: 60000,
  grade: "B",
  breakingPoint: null,
  toolLatencies: [
    { toolName: "search", latency: { p50: 45, p90: 120, p95: 200, p99: 340, min: 10, max: 500, mean: 85, samples: 4521 } },
  ],
  errorSummary: { totalErrors: 5, totalRequests: 5000, errorRate: 0.001, byCategory: { TIMEOUT: 5 }, byTool: { search: 5 } },
  throughput: { averageRps: 83, peakRps: 145, totalRequests: 5000, totalSuccessful: 4995, totalFailed: 5 },
  recommendations: ["Server performance is within acceptable parameters."],
};

// Console output (ANSI colors)
const consoleOutput = new ConsoleReporter().format(report);
console.log(consoleOutput);

// Markdown (PR-ready)
const markdownOutput = new MarkdownReporter().format(report);
await writeFile("report.md", markdownOutput);

// JSON (CI/CD)
const jsonOutput = new JsonReporter().format(report);
await writeFile("report.json", jsonOutput);
```

## API Reference

### `ConsoleReporter`

Formats a report with ANSI colors via `chalk`.

```typescript
class ConsoleReporter {
  format(report: LoadTestReport): string;
}
```

**Output sections:**
- Header with test ID, endpoint, and duration
- Grade (color-coded: green/yellow/red)
- Breaking point details (if detected)
- Per-tool latency table (p50/p90/p99/Samples)
- Throughput statistics (total/successful/failed, avg/peak RPS)
- Error summary by category
- Numbered recommendations

### `MarkdownReporter`

Formats a report as GitHub-flavored markdown tables.

```typescript
class MarkdownReporter {
  format(report: LoadTestReport): string;
}
```

**Output sections:**
- `# Load Test Report`
- `## Summary` — grade, breaking point, duration, total requests, endpoint
- `## Latency` — markdown table with p50/p90/p95/p99/Samples per tool
- `## Throughput` — bullet list of avg/peak RPS, success/failure counts
- `## Breaking Point Analysis` — degradation details (if detected)
- `## Errors` — error counts and category breakdown table
- `## Recommendations` — numbered list
- Footer with generation timestamp

### `JsonReporter`

Machine-readable JSON output.

```typescript
class JsonReporter {
  format(report: LoadTestReport): string;
}

// Output: JSON.stringify(report, null, 2)
```

## Output Examples

### Console Output

```
Load Test Report
ID: test-abc123
Endpoint: https://api.example.com/mcp
Duration: 1m 0s

Grade: B

Latency by Tool
Tool                     p50     p90     p99   Samples
search                  45ms   120ms   340ms     4,521

Throughput
  Total Requests: 5,000
  Successful: 4,995
  Failed: 5
  Average RPS: 83.0
  Peak RPS: 145.0

Errors
  Total: 5 (0.10%)
  TIMEOUT: 5

Recommendations
  * Server performance is within acceptable parameters.
```

### Markdown Output

```markdown
# Load Test Report

## Summary
- **Grade:** B
- **Duration:** 1m 0s
- **Total Requests:** 5,000
- **Endpoint:** https://api.example.com/mcp

## Latency
| Tool | p50 | p90 | p95 | p99 | Samples |
|------|-----|-----|-----|-----|---------|
| search | 45ms | 120ms | 200ms | 340ms | 4,521 |
```

## Related Packages

- [`@reaatech/mcp-load-test-core`](https://www.npmjs.com/package/@reaatech/mcp-load-test-core) — Report types and schemas
- [`@reaatech/mcp-load-test-engine`](https://www.npmjs.com/package/@reaatech/mcp-load-test-engine) — Engine that produces reports

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
