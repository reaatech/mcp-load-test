# ARCHITECTURE.md — mcp-load-test

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                  │
│  ┌─────────────┐    ┌─────────────┐                                  │
│  │     CLI     │    │  Library    │                                  │
│  │  (mcp-lt)   │    │    API      │                                  │
│  └──────┬──────┘    └──────┬──────┘                                  │
└─────────┼──────────────────┼──────────────────────────────────────────┘
          │                  │
┌─────────▼──────────────────▼──────────────────────────────────────────┐
│                     Orchestration Layer                                │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                     LoadEngine                                   │   │
│  │   1. Parse config    2. Create sessions    3. Execute profile   │   │
│  │   4. Collect metrics    5. Detect breaking point    6. Report   │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │   Session    │ │    Load      │ │    Tool      │                   │
│  │   Manager    │ │   Profile    │ │   Pattern    │                   │
│  │              │ │   Generators │ │   Executor   │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                       Analysis Layer                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                  │
│  │   Latency    │ │    Error     │ │  Throughput  │                  │
│  │  Histogram   │ │   Tracker    │ │  Collector   │                  │
│  └──────────────┘ └──────────────┘ └──────────────┘                  │
│  ┌──────────────┐ ┌──────────────┐                                   │
│  │  Breaking    │ │   Grading    │                                   │
│  │   Point      │ │   System     │                                   │
│  │  Detector    │ │              │                                   │
│  └──────────────┘ └──────────────┘                                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                         MCP Client Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │ StreamableHTTP  │  │      SSE        │  │     stdio       │       │
│  │   Transport     │  │   Transport     │  │   Transport     │       │
│  │  (high conc.)   │  │  (med conc.)    │  │  (low conc.)    │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                       Target MCP Server                               │
└──────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                          Reporters                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │
│  │   Console   │  │  Markdown   │  │    JSON     │                   │
│  │  (ANSI)     │  │  (PR-ready) │  │  (machine)  │                   │
│  └─────────────┘  └─────────────┘  └─────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
mcp-load-test/
├── packages/
│   ├── core/          @reaatech/mcp-load-test-core       Types, schemas, utils, logger
│   ├── metrics/       @reaatech/mcp-load-test-metrics    Latency histograms, error tracking
│   ├── patterns/      @reaatech/mcp-load-test-patterns   Tool call patterns, executor
│   ├── profiles/      @reaatech/mcp-load-test-profiles   Concurrency profile generators
│   ├── analysis/      @reaatech/mcp-load-test-analysis   Breaking point detection, grading
│   ├── client/        @reaatech/mcp-load-test-client     MCP transports (stdio, SSE, HTTP)
│   ├── reporters/     @reaatech/mcp-load-test-reporters  Console, markdown, JSON output
│   ├── engine/        @reaatech/mcp-load-test-engine     Orchestrator, session manager
│   └── cli/           @reaatech/mcp-load-test-cli        Commander CLI, binary entry
├── .changeset/        Changesets versioning config
├── .github/workflows/ CI + release pipelines
├── pnpm-workspace.yaml
├── turbo.json         Task orchestration
├── biome.json         Lint + format config
└── tsconfig.json      Shared TS base
```

### Dependency Graph

```
core ─────────────┬──► metrics ──────┬──► patterns ───┐
                  │                  │                │
                  ├──► profiles ─────┤                │
                  │                  │                │
                  ├──► analysis ─────┘                │
                  │                                   │
                  ├──► client ────────────────────────┤
                  │                                   │
                  ├──► reporters ─────────────────────┤
                  │                                   │
                  └──► engine ◄───────────────────────┘
                        │
                        ▼
                      cli
```

## Design Principles

1. **MCP-Semantic Awareness** — Understands tool call patterns, session state, and transport differences
2. **Non-Destructive by Default** — Load tests should not corrupt server state (configurable)
3. **Transport-Aware Concurrency** — Different concurrency limits per transport type
4. **Realistic Load Patterns** — Tool call sequences mimic real user behavior
5. **Actionable Reports** — Clear identification of breaking points with remediation
6. **CI/CD Friendly** — Machine-readable output, exit codes, baseline comparison

## Package Deep Dive

### Core (`packages/core`)

The foundation package. Everything depends on it.

**Exports:**
- **Types** (`types/domain.ts`) — `LoadTestReport`, `LoadProfile`, `ToolCallPattern`, `SessionState`, `MCPClient`, `AuthOptions`, `LoadEngineOptions`, transport/profile/pattern types, and all metric interfaces
- **Schemas** (`types/schemas.ts`) — Zod schemas for runtime validation of all configuration shapes
- **Utilities** (`utils/index.ts`) — `generateUUID`, `calculateStats`, `percentile`, `retryWithBackoff`, `sleep`, `measureTimeAsync`, `isValidURL`, `isPrivateURL`
- **Logger** (`observability/logger.ts`) — Pre-configured Pino instance (level controlled by `LOG_LEVEL`, pretty-printing via `MCP_LT_PRETTY_LOGS`)
- **Version** (`version.ts`) — `getProgramVersion()` reads from `package.json`

### Client (`packages/client`)

Session-scoped MCP transport clients with auto-negotiation.

- **`createSessionClient(endpoint, options)`** — Factory returning an `MCPClient`-conforming instance
- **`StreamableHTTPTransport`** — HTTP POST with `mcp-session-id` header tracking, OPTIONS preflight, DELETE on disconnect
- **`SSETransport`** — Server-Sent Events for responses, `fetch POST` for requests, endpoint event handling
- **`StdioTransport`** — Spawns child process, JSON-RPC over stdin/stdout with newline-delimited messages
- **Auth support** — API key (`X-Api-Key`), Bearer token, OAuth client credentials (headers for HTTP/SSE, env vars for stdio)
- **Auto-fallback** — When `transport: "auto"`, tries StreamableHTTP first; falls back to SSE on connect failure
- **Private endpoint warnings** — Logs when connecting to RFC 1918 / loopback addresses (once per endpoint)

```typescript
interface MCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendRequest(method: string, params?: unknown): Promise<unknown>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  listTools(): Promise<ToolDefinition[]>;
}
```

### Engine (`packages/engine`)

The orchestrator that runs load tests from start to finish.

#### LoadEngine

```typescript
class LoadEngine {
  constructor(options: LoadEngineOptions);
  run(): Promise<LoadTestReport>;
}
```

**Execution flow:**
1. Generate test UUID, record start time, start `MetricsCollector` and `SessionManager`
2. Execute load profile generator — yields `{ concurrency, phase }` tuples at ~1-second intervals
3. On each tick: adjust session pool, update session status per phase, check breaking point
4. Stop metrics and sessions, build `LoadTestReport`, compute grade and recommendations

```typescript
interface LoadEngineOptions {
  endpoint: string;
  transport: TransportType;
  auth?: AuthOptions;
  profile: LoadProfile;
  patterns: ToolCallPattern[];
  breakingPointDetection: boolean;
  outputFormat: 'console' | 'markdown' | 'json';
}
```

#### SessionManager

Manages concurrent MCP sessions with multi-turn state:

```typescript
class SessionManager {
  constructor(options: SessionManagerOptions);
  start(): Promise<void>;
  stop(): Promise<void>;
  createPool(targetConcurrency: number): Promise<void>;
  getActiveSessions(): SessionState[];
  getSessionCount(): number;
  setSessionStatus(status: SessionState['status']): void;
}
```

- **Session Lifecycle** — Create (`Promise.allSettled`), loop (weighted-random patterns), destroy (`AbortController` + `disconnect()`)
- **Pool scaling** — `createPool(target)` computes the difference and adds/removes sessions; individual creation failures don't abort pool expansion
- **Weighted-random selection** — Each session loop picks patterns proportionally by `weight`
- **Abort safety** — Sessions check `AbortSignal` between pattern executions

```typescript
interface SessionState {
  id: string;
  client: MCPClient;
  context: Record<string, unknown>;
  status: 'warming_up' | 'active' | 'cooling_down' | 'error' | 'completed';
  createdAt: number;
  lastActiveAt: number;
  requestCount: number;
  errorCount: number;
}
```

### Patterns (`packages/patterns`)

Realistic tool-call sequences with a pattern execution engine.

#### PatternExecutor

```typescript
class PatternExecutor {
  constructor(client: MCPClient, metrics: MetricsCollector, sessionState: SessionState);
  execute(pattern: ToolCallPattern): Promise<void>;
}
```

Each step: resolves template variables → dispatches via transport → records to `MetricsCollector` → applies `onStepError` policy.

#### Built-in Patterns

| Pattern | Steps | Think Time | On Error |
|---------|-------|------------|----------|
| `EXPLORE_THEN_ACT` | `tools/list` → `tools/call` (random tool) | 100ms | continue |
| `READ_THEN_WRITE` | `resources/read` → `tools/call` → `resources/read` ({{previous.uri}}) | 200ms | abort |
| `MULTI_STEP_WORKFLOW` | `tools/call create` → `process` → `cleanup` ({{previous.id}}) | 150ms | abort |

#### Template Variables

| Variable | Resolves To |
|----------|------------|
| `{{random.string}}` | Random 6-char alphanumeric |
| `{{random.tool}}` | Random tool from `resolvePattern` |
| `{{previous}}` | Full result of previous step |
| `{{previous.field}}` | Nested field via dot-notation |

### Profiles (`packages/profiles`)

Async generators yielding `{ concurrency: number, phase: string }` tuples at ~1-second intervals.

- **`rampProfileGenerator(profile)`** — `warmup` → `ramp_up` (linear interpolation) → `hold` → `ramp_down`
- **`soakProfileGenerator(profile)`** — `warmup` → `active` (constant) → `cooldown`
- **`spikeProfileGenerator(profile)`** — N cycles of `baseline` → `spike`, then final `cooldown`
- **`customProfileGenerator(profile)`** — `warmup` → `active` (linear interpolation from `concurrencyCurve`)

### Metrics (`packages/metrics`)

#### LatencyHistogram

Per-tool latency tracking with configurable buckets (default: 1ms through 50,000ms).

```typescript
class LatencyHistogram {
  constructor(buckets?: number[]);
  record(latencyMs: number): void;
  getStats(): LatencyMetrics;  // p50, p90, p95, p99, min, max, mean, samples
  merge(other: LatencyHistogram): void;
  clone(): LatencyHistogram;
}
```

#### MetricsCollector

Records individual `RequestRecord` objects and produces aggregate reports:

```typescript
class MetricsCollector {
  constructor(maxBufferSize?: number);  // default 100_000

  start(): void;
  stop(): void;
  record(request: RequestRecord): void;

  getToolHistograms(): Map<string, LatencyHistogram>;
  getErrorSummary(): ErrorSummary;
  getThroughput(): ThroughputMetrics;
  getOverallLatencyP99(): number;
  getWindowedErrorRate(windowMs: number): { errorRate: number; samples: number };
  getActiveSessionCountOverTime(): Array<{ timestamp: number; count: number }>;
}
```

**Error categories:**

| Category | Description |
|----------|-------------|
| TIMEOUT | Request exceeded timeout |
| CONNECTION | Network/connection failures |
| PROTOCOL | Invalid MCP protocol responses |
| SERVER | Server-returned errors (5xx) |
| CLIENT | Client-side errors |
| BACKPRESSURE | 429/503 throttling signals |

### Analysis (`packages/analysis`)

Merges breaking point detection and performance grading.

#### BreakingPointDetector

```typescript
class BreakingPointDetector {
  constructor(thresholds?: Partial<BreakingThresholds>);
  check(concurrency: number, metrics: MetricsCollector): boolean;
  getResult(): BreakingPointResult;
  reset(): void;
}
```

Monitors four thresholds continuously during test execution:
- **Error rate** (default: 5%)
- **P99 latency** (default: 10,000ms)
- **Timeout rate** (default: 10%)
- **Connection failure count** (default: 10)

Once broken, tracks recovery via a 5-second rolling window with a minimum of 10 samples.

#### Grader

```typescript
class Grader {
  grade(report: LoadTestReport, context?: GradeContext): Grade;
  generateRecommendations(report: LoadTestReport): string[];
}
```

Assigns A–F grades across latency, concurrency, and error rate dimensions (worst dimension determines overall grade). Supports per-tool-category benchmarks (compute, search, io).

### Reporters (`packages/reporters`)

Three output formatters sharing the same `format(report: LoadTestReport): string` shape:

- **`ConsoleReporter`** — ANSI-colored tables with grade color coding (green/yellow/red), breaking point warnings, per-tool latency tables, and recommendations
- **`MarkdownReporter`** — GitHub-flavored markdown with summary, latency/throughput/error tables, breaking point analysis, and numbered recommendations
- **`JsonReporter`** — `JSON.stringify(report, null, 2)` for CI/CD consumption

### CLI (`packages/cli`)

Built on Commander.js. Provides `mcp-load-test` and `mcp-lt` binaries.

| Command | Description | Default Profile |
|---------|-------------|-----------------|
| `load` | Full-featured load test with all options | ramp |
| `ramp` | Quick ramp test with minimal flags | ramp |
| `soak` | Extended soak test (default 30 min) | soak |
| `spike` | Spike/burst load test | spike |
| `compare` | Compare two JSON reports against a baseline | n/a |

The CLI also supports YAML/JSON config files via `--config`, which are merged with CLI flags (flags take precedence).

## Data Flow

### Test Execution Flow

```
1. CLI parses arguments / config → LoadEngineOptions
2. Validate configuration
3. LoadEngine.run()
   ├── MetricsCollector.start()
   ├── SessionManager.start()
   ├── Execute profile (async generator)
   │   ├── Warmup phase: sessions active, metrics typically discarded
   │   ├── Active phase: sessions run weighted-random patterns (closed-loop)
   │   │   ├── Each session independently loops: pick pattern → execute steps
   │   │   ├── PatternExecutor records latency/success/errors to MetricsCollector
   │   │   ├── SessionState tracks context for multi-step variable resolution
   │   │   └── AbortController checked between pattern executions
   │   ├── BreakingPointDetector.check() on each tick (if enabled)
   │   └── SessionManager.createPool() adjusts concurrency per profile
   ├── SessionManager.stop() → destroy all sessions
   ├── MetricsCollector.stop()
   └── Build LoadTestReport → grade → recommendations
4. Reporter.format(report) → output
5. Exit code 0 (grade A/B/C) or 1 (grade D/F or error)
```

### Metrics Collection Flow (per request)

```
1. Session picks tool from pattern
2. PatternExecutor.measureTimeAsync() wraps the transport call
3. On success → MetricsCollector.record({ success: true, latencyMs })
4. On error → categorizeError() → MetricsCollector.record({ success: false, errorCategory })
5. LatencyHistogram.record() updates bucket counts and samples
6. MetricsCollector maintains bounded circular buffers (100K ceiling)
```

### Concurrency Model

**Closed-loop concurrency**: The framework maintains a fixed pool of long-lived sessions. Each session continuously executes patterns until the test ends. This models realistic MCP usage where a user (session) makes multiple tool calls over time, rather than a flood of independent requests.

- **Not open-loop**: We do not model "X new sessions per second." Instead, we model "X concurrent sessions, each doing work."
- **Think time**: Delays between pattern steps simulate realistic user pauses and prevent unrealistic request flooding.
- **Session lifetime**: A session starts at test start (or when concurrency increases) and ends at test end (or when concurrency decreases). Errors within a pattern step may abort the pattern but typically do not kill the session.

## Error Handling

| Error Type | Detection | Recovery |
|------------|-----------|----------|
| Connection refused | ECONNREFUSED | Retry with backoff, fail after max retries |
| Timeout | Request exceeds timeout | Record as timeout error, continue |
| Session expired | mcp-session-id invalid | Re-establish session, retry request |
| Server overload | 429/503 responses | Record as BACKPRESSURE; may trigger breaking point |
| Protocol error | Invalid JSON-RPC | Record protocol error, continue |
| Transport failure | Stream closed unexpectedly | Reconnect transport, recreate session |

## Transport Concurrency Profiles

Each transport has different concurrency characteristics:

| Transport | Max Recommended Concurrency | Connection Model |
|-----------|----------------------------|------------------|
| StreamableHTTP | 100+ | HTTP keep-alive, session-based |
| SSE | 25-50 | Long-lived SSE + POST connections |
| stdio | 1-5 | Single subprocess, sequential |

```typescript
interface TransportConcurrencyProfile {
  maxRecommendedConcurrency: number;
  connectionReuseStrategy: 'pool' | 'single' | 'per-request';
  sessionSupport: boolean;
  notes: string;
}
```

## Observability

### Structured Logging (Pino)

Pre-configured logger from `@reaatech/mcp-load-test-core`. Level controlled by `LOG_LEVEL` env (default `"info"`). Pretty-printed output enabled via `MCP_LT_PRETTY_LOGS=1` (set automatically by the CLI).

Significant events logged with structured fields:
- `sessionId`, `toolName`, `concurrency` — Request context
- `latencyMs`, `success`, `errorCategory` — Request result
- `phase`, `endpoint`, `transport` — Profile state
- `breakingPointDetected`, `errorRate` — Breaking point

## Configuration

### CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--endpoint` | MCP server endpoint (URL or command) | (required) |
| `--transport` | `stdio`, `sse`, `http`, `auto` | `auto` |
| `--profile` | `ramp`, `soak`, `spike` | `ramp` |
| `--max-concurrency` | Maximum concurrent sessions | `50` |
| `--duration` | Test duration in seconds | `60` |
| `--patterns` | Comma-separated pattern names | `explore-then-act` |
| `--breaking-point` | Enable breaking point detection | `false` |
| `--format` | `console`, `markdown`, `json` | `console` |
| `--output` | Output file path | stdout |
| `--timeout` | Request timeout in ms | `30000` |
| `--config` | YAML or JSON config file path | — |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | `production` or `development` | `development` |
| `LOG_LEVEL` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) | `info` |
| `MCP_LT_PRETTY_LOGS` | Enable colored pretty-printed log output | `"1"` in CLI mode |
| `MCP_API_KEY` | API key for auth | — |
| `MCP_BEARER_TOKEN` | Bearer token for auth | — |

### Configuration File (YAML)

```yaml
endpoint: "https://api.example.com/mcp"
transport: "http"
auth:
  bearerToken: "${MCP_BEARER_TOKEN}"

profile:
  type: "ramp"
  minConcurrency: 1
  maxConcurrency: 100
  rampDurationMs: 300000  # 5 minutes
  holdDurationMs: 120000  # 2 minutes

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

## Toolchain

| Concern | Tool |
|---------|------|
| Package manager | pnpm 10.22.0 |
| Build | tsup (CJS + ESM + dts per package) |
| Task orchestration | Turbo |
| Lint + format | Biome |
| Versioning | Changesets |
| Testing | Vitest |
| TypeScript | 6.0 (strict mode, NodeNext module resolution) |

## Comparison with mcp-server-doctor

| Aspect | mcp-server-doctor | mcp-load-test |
|--------|-------------------|---------------|
| Purpose | Diagnostics & grading | Stress testing & breaking point |
| Duration | Seconds | Minutes to hours |
| Concurrency | Low (1–10) | High (1–100+) |
| Focus | Compliance, correctness | Performance, limits |
| Output | Report card grade | Breaking point analysis |
| Use Case | Pre-deployment check | Capacity planning |

Together they provide complete server quality assurance:
- **Doctor** answers: "Is the server correctly implemented?"
- **Load Test** answers: "How much load can the server handle?"
