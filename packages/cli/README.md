# @reaatech/mcp-load-test-cli

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-cli.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Command-line interface for MCP load testing. Provides `mcp-load-test` and `mcp-lt` binaries with four test commands (`load`, `ramp`, `soak`, `spike`) and a baseline comparison command (`compare`). Built on Commander.js with YAML/JSON config file support.

## Installation

```bash
npm install -g @reaatech/mcp-load-test-cli
# or
pnpm add -g @reaatech/mcp-load-test-cli
```

## Commands

| Command | Description | Default Profile |
|---------|-------------|-----------------|
| `load` | Full-featured load test with all options | ramp |
| `ramp` | Quick ramp test with minimal flags | ramp |
| `soak` | Extended soak test (default 30 min) | soak |
| `spike` | Spike/burst load test | spike |
| `compare` | Compare two JSON reports against a baseline | n/a |

## Quick Start

```bash
# Auto-detect transport, ramp from 1→50 over 60s
mcp-load-test load --endpoint https://api.example.com/mcp

# Soak at constant 25 concurrency for 30 minutes
mcp-load-test soak --endpoint https://api.example.com/mcp --concurrency 25

# Spike test: 10 baseline, burst to 100, repeat 3×
mcp-load-test spike --endpoint https://api.example.com/mcp --baseline 10 --spike 100

# Markdown output to file with breaking point detection
mcp-load-test ramp --endpoint https://api.example.com/mcp --max-concurrency 100 --breaking-point --format markdown --output report.md

# Compare two reports
mcp-load-test compare --baseline baseline.json --current current.json
```

## CLI Options

### `load` Command

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--endpoint` | `string` | (required) | MCP server endpoint (URL or command) |
| `--transport` | `string` | `"auto"` | `stdio`, `sse`, `http`, or `auto` |
| `--profile` | `string` | `"ramp"` | `ramp`, `soak`, or `spike` |
| `--max-concurrency` | `string` | `"50"` | Maximum concurrent sessions |
| `--duration` | `string` | `"60"` | Test duration in seconds |
| `--patterns` | `string` | `"explore-then-act"` | Comma-separated pattern names |
| `--breaking-point` | `boolean` | `false` | Enable breaking point detection |
| `--format` | `string` | `"console"` | Output format: `console`, `markdown`, `json` |
| `--output` | `string` | — | Output file path (writes to stdout if omitted) |
| `--timeout` | `string` | `"30000"` | Request timeout in ms |
| `--config` | `string` | — | YAML or JSON config file path |

### `ramp` Command

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--endpoint` | `string` | (required) | MCP server endpoint |
| `--transport` | `string` | `"auto"` | Transport type |
| `--max-concurrency` | `string` | `"50"` | Maximum concurrent sessions |
| `--duration` | `string` | `"60"` | Test duration in seconds |
| `--format` | `string` | `"console"` | Output format |
| `--output` | `string` | — | Output file path |
| `--breaking-point` | `boolean` | `false` | Enable breaking point detection |

### `soak` Command

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--endpoint` | `string` | (required) | MCP server endpoint |
| `--transport` | `string` | `"auto"` | Transport type |
| `--concurrency` | `string` | `"50"` | Constant concurrency |
| `--duration` | `string` | `"1800"` | Test duration in seconds |
| `--format` | `string` | `"console"` | Output format |
| `--output` | `string` | — | Output file path |
| `--breaking-point` | `boolean` | `false` | Enable breaking point detection |

### `spike` Command

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--endpoint` | `string` | (required) | MCP server endpoint |
| `--transport` | `string` | `"auto"` | Transport type |
| `--baseline` | `string` | `"10"` | Baseline concurrency |
| `--spike` | `string` | `"100"` | Spike concurrency |
| `--duration` | `string` | `"300"` | Test duration in seconds |
| `--format` | `string` | `"console"` | Output format |
| `--output` | `string` | — | Output file path |
| `--breaking-point` | `boolean` | `false` | Enable breaking point detection |

### `compare` Command

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--baseline` | `string` | (required) | Baseline report JSON path |
| `--current` | `string` | (required) | Current report JSON path |
| `--format` | `string` | `"console"` | Output format: `console` or `markdown` |
| `--output` | `string` | — | Output file path |

## Configuration File

All commands support YAML or JSON config files via `--config`:

```yaml
# load-test-config.yaml
endpoint: "https://api.example.com/mcp"
transport: "http"
auth:
  bearerToken: "${MCP_BEARER_TOKEN}"

profile:
  type: "ramp"
  minConcurrency: 1
  maxConcurrency: 100
  rampDurationMs: 300000
  holdDurationMs: 120000

patterns:
  - name: "explore-then-act"
    weight: 0.7
  - name: "multi-step-workflow"
    weight: 0.3

breakingPoint:
  enabled: true
  thresholds:
    errorRate: 0.05
    latencyP99: 5000

output:
  format: "markdown"
  file: "./load-test-report.md"
```

CLI flags override config file values.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Test succeeded, grade A/B/C |
| `1` | Test error or grade D/F |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) | `info` |
| `MCP_LT_PRETTY_LOGS` | Enable colored pretty-printed log output (set automatically by CLI) | `"1"` in CLI mode |

## Related Packages

- [`@reaatech/mcp-load-test-engine`](https://www.npmjs.com/package/@reaatech/mcp-load-test-engine) — Orchestration engine
- [`@reaatech/mcp-load-test-reporters`](https://www.npmjs.com/package/@reaatech/mcp-load-test-reporters) — Output formatters
- [`@reaatech/mcp-load-test-patterns`](https://www.npmjs.com/package/@reaatech/mcp-load-test-patterns) — Built-in patterns

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
