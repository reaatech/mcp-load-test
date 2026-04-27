# mcp-load-test

<p align="center">
  <em>Transport-aware, session-based, pattern-driven load testing for MCP servers.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mcp-load-test"><img src="https://img.shields.io/npm/v/mcp-load-test" alt="npm version"></a>
  <a href="https://github.com/reaatech/mcp-load-test/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/mcp-load-test" alt="license"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/node/v/mcp-load-test" alt="node version"></a>
</p>

---

**mcp-load-test** is a load testing framework purpose-built for [Model Context Protocol](https://modelcontextprotocol.io/) servers. Unlike generic HTTP load generators (`wrk`, `k6`, `artillery`), it understands MCP semantics: tool call patterns, stateful multi-turn sessions, transport-specific concurrency models, and per-tool latency distributions.

Pairs with [mcp-server-doctor](https://github.com/reaatech/mcp-server-doctor) — doctor diagnoses compliance, load-test stresses capacity.

## Table of Contents

- [Why MCP-Native Load Testing?](#why-mcp-native-load-testing)
- [Quick Start](#quick-start)
- [Features](#features)
- [CLI Reference](#cli-reference)
- [Load Profiles](#load-profiles)
- [Tool Call Patterns](#tool-call-patterns)
- [Authentication](#authentication)
- [Transport Profiles](#transport-profiles)
- [Output Formats](#output-formats)
- [Report Grading](#report-grading)
- [Configuration File](#configuration-file)
- [Library API](#library-api)
- [Breaking Point Detection](#breaking-point-detection)
- [Relationship to mcp-server-doctor](#relationship-to-mcp-server-doctor)
- [Requirements](#requirements)
- [Contributing](#contributing)
- [License](#license)

## Why MCP-Native Load Testing?

Generic HTTP load generators treat every request as an independent, stateless transaction. MCP servers are fundamentally different:

| Concern | Generic Load Tools | mcp-load-test |
|---------|-------------------|---------------|
| **State** | Stateless requests | Sessions with multi-turn context |
| **Transports** | HTTP only | StreamableHTTP, SSE, stdio — each with distinct concurrency characteristics |
| **Workload** | Uniform request rate | Realistic tool call patterns (explore-then-act, read-then-write, multi-step workflows) |
| **Latency** | Single aggregate | Per-tool histograms (P50/P90/P95/P99) |
| **Degradation** | Fixed thresholds | Adaptive breaking point detection that finds where the server actually degrades |

`mcp-load-test` models all of this so you can find the exact concurrency level where your server breaks, understand which tools are the bottleneck, and track performance regressions across releases.

## Quick Start

```bash
# One-shot with npx (no install)
npx mcp-load-test load \
  --endpoint https://api.example.com/mcp \
  --transport http \
  --profile ramp \
  --max-concurrency 50 \
  --duration 120

# Install globally
npm install -g mcp-load-test

# Ramp test — finds the breaking point
mcp-lt load --endpoint https://api.example.com/mcp --transport http --profile ramp

# Soak test — runs at constant load for an extended period
mcp-lt soak --endpoint https://api.example.com/mcp --concurrency 25 --duration 3600

# Spike test — periodic traffic bursts
mcp-lt spike --endpoint https://api.example.com/mcp --baseline 10 --spike 100 --duration 300

# stdio transport (local subprocess servers)
mcp-lt load --endpoint ./my-mcp-server.js --transport stdio

# Markdown output for PR comments
mcp-lt load --endpoint https://api.example.com/mcp --format markdown --output report.md

# Baseline comparison
mcp-lt compare --baseline baseline.json --current current.json --format markdown
```

## Features

- **Transport-aware concurrency** — StreamableHTTP keep-alive pooling, SSE long-poll limits, and stdio subprocess sequential access
- **Realistic tool call patterns** — Predefined sequences (explore-then-act, read-then-write, multi-step workflow) with weighted selection, think time, and error recovery strategies
- **Per-tool latency histograms** — Configurable bucket boundaries with P50, P90, P95, P99, min, max, and mean
- **Breaking point auto-detection** — Monitors error rate, p99 latency, timeout rate, and connection failures in real-time; detects recovery time after load reduction
- **Letter-grade scoring** — A-F grades for latency, concurrency capacity, and error rate with per-tool-category benchmarks
- **Four load profiles** — Ramp (find the limit), soak (stability over time), spike (burst tolerance), and custom (arbitrary concurrency curves)
- **Three output formats** — Human-readable console, PR-ready markdown, and machine-parseable JSON
- **CI/CD friendly** — Non-zero exit codes for D/F grades, JSON output for pipeline parsing, and baseline comparison for regression detection
- **Config file support** — YAML and JSON configuration files with full schema validation
- **Auth support** — API key, bearer token, and OAuth client credentials across all transports

## CLI Reference

```
mcp-load-test [command] [options]

Commands:
  load     Run a load test with full configuration
  ramp     Quick ramp test (shortcut for load --profile ramp)
  soak     Extended soak test (shortcut for load --profile soak)
  spike    Spike load test (shortcut for load --profile spike)
  compare  Compare two test reports

Options:
  -v, --version  Display version number
  --help         Display help
```

### `load` Command

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--endpoint` | string | *(required)* | MCP server endpoint (URL or command) |
| `--transport` | string | `auto` | Transport type: `stdio`, `sse`, `http`, or `auto` |
| `--profile` | string | `ramp` | Load profile: `ramp`, `soak`, or `spike` |
| `--max-concurrency` | number | `50` | Maximum concurrent sessions |
| `--duration` | number | `60` | Test duration in seconds |
| `--patterns` | string | `explore-then-act` | Comma-separated pattern names |
| `--breaking-point` | flag | `false` | Enable breaking point detection |
| `--format` | string | `console` | Output format: `console`, `markdown`, or `json` |
| `--output` | string | *(stdout)* | Output file path |
| `--timeout` | number | `30000` | Per-request timeout in milliseconds |
| `--config` | string | — | Configuration file path (YAML or JSON) |

### `ramp` / `soak` / `spike` Commands

Each shortcut command accepts a subset of `load` options with profile-specific defaults:

```bash
# ramp: 50 max concurrency, 60s duration, linear ramp up then down
mcp-lt ramp --endpoint https://api.example.com/mcp

# soak: 50 sessions, 30-minute sustained load
mcp-lt soak --endpoint https://api.example.com/mcp --concurrency 100 --duration 1800

# spike: 10 baseline → 100 spike, repeats 3 times over 5 minutes
mcp-lt spike --endpoint https://api.example.com/mcp --baseline 10 --spike 200 --duration 300
```

### `compare` Command

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--baseline` | string | *(required)* | Path to baseline JSON report |
| `--current` | string | *(required)* | Path to current JSON report |
| `--format` | string | `console` | Output format: `console` or `markdown` |
| `--output` | string | *(stdout)* | Output file path |

## Load Profiles

### Ramp

Linearly increases concurrency from minimum to maximum, holds at peak, then ramps down. Best for finding the breaking point.

```
Concurrency  │      ╱‾‾‾‾‾‾‾‾‾‾‾╲
             │     ╱              ╲
             │    ╱                ╲
             │   ╱                  ╲
             │──╱                    ╲──
             └────────────────────────────── time
              warmup  ramp-up  hold  ramp-down
```

### Soak

Sustains constant concurrency for an extended period. Best for detecting memory leaks, resource exhaustion, and slow degradation.

```
Concurrency  │  ─────────────────────────────
             │
             │
             │
             │───────────────────────────────── time
                   warmup      active      cooldown
```

### Spike

Alternates between baseline and spike concurrency. Tests how the server handles sudden traffic bursts and recovers between them.

```
Concurrency  │     ┃┃            ┃┃            ┃┃
             │     ┃┃            ┃┃            ┃┃
             │─────┃┃────────────┃┃────────────┃┃────── time
             │     ┃┃            ┃┃            ┃┃
              baseline spike    spike    spike   cooldown
```

### Custom

Defined by an arbitrary concurrency curve as an array of `{ timeMs, concurrency }` points with linear interpolation. Configured via a YAML/JSON config file.

## Tool Call Patterns

Patterns define realistic sequences of MCP operations that sessions execute in a loop. Each session selects patterns by weighted random choice.

### Built-in Patterns

| Pattern | Steps | Think Time | Error Strategy | Use Case |
|---------|-------|------------|----------------|----------|
| `explore-then-act` | `tools/list` → `tools/call` | 100ms | continue | Read-heavy servers |
| `read-then-write` | `resources/read` → `tools/call` → `resources/read` | 200ms | abort | Transactional workflows |
| `multi-step-workflow` | `create` → `process` → `cleanup` | 150ms | abort | Stateful pipelines |

### Pattern Reference Resolution

Steps support placeholder resolution for dynamic values:

| Placeholder | Behavior |
|-------------|----------|
| `{{random.string}}` | Random 6-character alphanumeric string |
| `{{random.tool}}` | Random tool name from `tools/list` |
| `{{random.uri}}` | Random URI (for resource patterns) |
| `{{previous}}` | Full result from the previous step |
| `{{previous.field.subfield}}` | Dot-notation path into the previous result |

### Custom Patterns

Define custom patterns in a config file:

```yaml
patterns:
  - name: "search-and-retrieve"
    weight: 0.6
    thinkTimeMs: 300
    onStepError: "abort"
    steps:
      - tool: "tools/call"
        args:
          name: "search"
          arguments: { query: "{{random.string}}" }
      - tool: "tools/call"
        args:
          name: "retrieve"
          arguments: { id: "{{previous.id}}" }
```

## Authentication

Credentials are passed through transport-native mechanisms:

| Auth Mode | HTTP/SSE Headers | stdio Environment Variables |
|-----------|-----------------|----------------------------|
| `api-key` | `X-Api-Key: <value>` | `MCP_API_KEY` |
| `bearer` | `Authorization: Bearer <value>` | `MCP_BEARER_TOKEN` |
| `oauth` | `Authorization: Basic <base64>` | `MCP_OAUTH_CLIENT_ID` / `MCP_OAUTH_CLIENT_SECRET` |

```bash
# Bearer token via CLI (not recommended for shared environments)
mcp-lt load --endpoint https://api.example.com/mcp --transport http --config config.yml
```

In `config.yml`:
```yaml
auth:
  mode: "bearer"
  bearerToken: "${MCP_TOKEN}"  # resolved from environment
```

Sensitive values should be passed via environment variables referenced in the config file — never hardcoded in committed configs.

## Transport Profiles

mcp-load-test respects each transport's inherent concurrency characteristics:

| Transport | Max Recommended Concurrency | Connection Model | Session Support | Key Constraint |
|-----------|----------------------------|------------------|-----------------|----------------|
| **StreamableHTTP** | 100+ | HTTP keep-alive, `mcp-session-id` header | Per-session | HTTP client pool limits |
| **SSE** | 25-50 | Long-lived EventSource + POST requests | Server-assigned | Browser connection limits (6 per origin) |
| **stdio** | 1-5 | Single subprocess, stdin/stdout pipe | Sequential only | Single process, no parallelism |

The `auto` transport mode auto-detects the appropriate transport based on the endpoint: URLs default to StreamableHTTP with SSE fallback; commands/scripts default to stdio.

## Output Formats

### Console

Human-readable output with color-coded grades and aligned tables. Best for terminal usage during development.

```
Load Test Report
ID: a1b2c3d4...
Endpoint: https://api.example.com/mcp
Duration: 4m 48s
Grade: B

Latency by Tool
Tool                   p50      p90      p99   Samples
tools/list            45ms     89ms    234ms     2,847
tools/call            67ms    134ms    567ms     2,119

Throughput
  Total Requests: 4,966
  Successful: 4,823
  Failed: 143
  Average RPS: 17.2
  Peak RPS: 31.0

Recommendations
  • Slow tools detected: tools/call. Consider optimization or caching.
```

### Markdown

GitHub-flavored markdown with tables, designed to drop directly into a PR comment or issue.

### JSON

Complete machine-readable report including all latency metrics, error breakdowns, and breaking point analysis. Used for CI/CD integration and baseline comparisons.

```bash
# Save a baseline for future comparison
mcp-lt load --endpoint https://api.example.com/mcp --format json --output baseline.json

# Compare against the baseline after changes
mcp-lt compare --baseline baseline.json --current current.json --format markdown
```

## Report Grading

Each test receives an A-F grade based on three dimensions:

| Dimension | A | B | C | D | F |
|-----------|---|---|---|---|---|
| **Latency (p99)** | ≤ 500ms | ≤ 1,000ms | ≤ 2,000ms | ≤ 5,000ms | > 5,000ms |
| **Concurrency** | ≥ 100 | ≥ 50 | ≥ 25 | ≥ 10 | < 10 |
| **Error Rate** | 0% | ≤ 1% | ≤ 5% | ≤ 10% | > 10% |

Per-tool-category benchmarks allow tighter thresholds for compute tools (≤100ms for A) and wider thresholds for search tools (≤1,000ms for A) when tool categories are configured.

The overall grade is the worst of the active dimensions. A test with A latency and C concurrency gets a C.

## Configuration File

Full configuration can be expressed declaratively in YAML or JSON:

```yaml
# mcp-load-test.config.yml
endpoint: "https://api.example.com/mcp"
transport: "http"

auth:
  mode: "bearer"
  bearerToken: "${MCP_TOKEN}"

profile:
  type: "ramp"
  minConcurrency: 1
  maxConcurrency: 100
  rampDurationMs: 240000    # 4 minutes
  holdDurationMs: 120000    # 2 minutes
  rampDownDurationMs: 60000  # 1 minute
  warmupDurationMs: 30000    # 30 seconds

patterns:
  - name: "explore-then-act"
    weight: 0.5
    thinkTimeMs: 100
    onStepError: "continue"
    steps:
      - tool: "tools/list"
        args: {}
      - tool: "tools/call"
        args:
          name: "{{random.tool}}"
          arguments: {}

  - name: "multi-step-workflow"
    weight: 0.3
    thinkTimeMs: 200
    onStepError: "abort"
    steps:
      - tool: "tools/call"
        args: { name: "create", arguments: {} }
      - tool: "tools/call"
        args:
          name: "process"
          arguments: { id: "{{previous.id}}" }

breakingPointDetection: true

outputFormat: "markdown"
```

CLI flags override config file values when both are specified.

## Library API

mcp-load-test can also be used programmatically:

```typescript
import { LoadEngine, PatternExecutor, MetricsCollector, Grader } from 'mcp-load-test';

const engine = new LoadEngine({
  endpoint: 'https://api.example.com/mcp',
  transport: 'http',
  profile: {
    type: 'ramp',
    minConcurrency: 1,
    maxConcurrency: 50,
    rampDurationMs: 120_000,
    holdDurationMs: 60_000,
  },
  patterns: [
    {
      name: 'explore-then-act',
      weight: 1,
      thinkTimeMs: 100,
      onStepError: 'continue',
      steps: [
        { tool: 'tools/list', args: {} },
        { tool: 'tools/call', args: { name: 'echo', arguments: {} } },
      ],
    },
  ],
  breakingPointDetection: true,
  outputFormat: 'json',
});

const report = await engine.run();
console.log(`Grade: ${report.grade}`);
console.log(`Breaking point: ${report.breakingPoint?.concurrencyAtBreak}`);
```

### Exported Modules

```typescript
import {
  LoadEngine,           // Test orchestration
  SessionManager,       // Session pool management
  MetricsCollector,     // Latency + error collection
  LatencyHistogram,     // Configurable histogram buckets
  PatternExecutor,      // Tool call pattern execution
  BreakingPointDetector, // Adaptive degradation detection
  Grader,               // A-F grade scoring
  ConsoleReporter,      // Terminal output
  MarkdownReporter,     // PR-ready markdown
  JsonReporter,         // Machine-readable JSON
  createSessionClient,  // MCP client factory
  logger,               // Pino logger instance
  getProgramVersion,    // Version string
} from 'mcp-load-test';
```

## Breaking Point Detection

When enabled with `--breaking-point`, the detector continuously monitors four signals:

| Signal | Default Threshold | Meaning |
|--------|------------------|---------|
| Error rate | 5% | Proportion of failed requests |
| p99 latency | 10,000ms | Tail latency in milliseconds |
| Timeout rate | 10% | Requests exceeding the timeout window |
| Connection failures | 10 | Cumulative dropped or refused connections |

When any threshold is breached, the breaking point is recorded — capturing the exact concurrency level, error rate, and p99 latency at the moment of degradation. After the load profile reduces concurrency (ramp-down), the detector measures the time until the error rate drops back below threshold, producing a recovery time metric.

Custom thresholds:
```yaml
breakingPoint:
  thresholds:
    errorRate: 0.02       # 2%
    latencyP99: 5000      # 5 seconds
    timeoutRate: 0.05     # 5%
    connectionFailures: 5
```

## Relationship to mcp-server-doctor

| | mcp-server-doctor | mcp-load-test |
|---|---|---|
| **Purpose** | Protocol compliance & correctness | Performance & capacity limits |
| **Duration** | Seconds (single-pass) | Minutes to hours |
| **Concurrency** | Low (1-10) | High (1-100+) |
| **Focus** | Specification adherence, error handling, tool contracts | Latency, throughput, breaking point, recovery |
| **Output** | Diagnostic report card with pass/fail | Letter grade with latency histograms and recommendations |
| **Use Case** | Pre-deployment validation, vendor evaluation | Capacity planning, regression testing, production readiness |
| **Transports** | All three (HTTP, SSE, stdio) | All three with transport-specific concurrency modeling |

Use doctor to verify your server is correct. Use load-test to verify it can handle production traffic.

## Requirements

- **Node.js** >= 22.0.0
- MCP server implementing the [2024-11-05 protocol version](https://spec.modelcontextprotocol.io/)

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding standards, and the pull request process.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design, module breakdown, and data flow.

## License

MIT © [mcp-load-test contributors](https://github.com/reaatech/mcp-load-test)

---

<p align="center">
  <sub>Built for the <a href="https://modelcontextprotocol.io/">Model Context Protocol</a> ecosystem</sub>
</p>
