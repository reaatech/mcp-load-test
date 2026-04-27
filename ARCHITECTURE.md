# ARCHITECTURE.md — mcp-load-test

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                │
│  ┌─────────────┐    ┌─────────────┐                                  │
│  │     CLI     │    │   Library   │                                  │
│  │  (mcp-lt)   │    │   API       │                                  │
│  └──────┬──────┘    └──────┬──────┘                                  │
└─────────┼──────────────────┼──────────────────────────────────────────┘
          │                  │
┌─────────▼──────────────────▼──────────────────────────────────────────┐
│                        Load Test Engine                                 │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                     LoadEngine                                   │   │
│  │   1. Parse config    2. Create sessions    3. Execute profile   │   │
│  │   4. Collect metrics    5. Detect breaking point    6. Report   │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │   Session    │ │    Load      │ │    Tool      │                   │
│  │   Manager    │ │   Profile    │ │   Pattern    │                   │
│  │              │ │   Executor   │ │   Executor   │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                         Metrics Layer                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                  │
│  │   Latency    │ │    Error     │ │  Throughput  │                  │
│  │  Histogram   │ │   Tracker    │ │  Collector   │                  │
│  └──────────────┘ └──────────────┘ └──────────────┘                  │
│  ┌──────────────┐ ┌──────────────┐                                   │
│  │  Breaking    │ │   Resource   │                                   │
│  │   Point      │ │   Monitor    │                                   │
│  │  Detector    │ │              │                                   │
│  └──────────────┘ └──────────────┘                                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                         MCP Client                                    │
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
│  │  (realtime) │  │  (PR-ready) │  │  (machine)  │                   │
│  └─────────────┘  └─────────────┘  └─────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

## Design Principles

1. **MCP-Semantic Awareness** — Understands tool call patterns, session state, and transport differences
2. **Non-Destructive by Default** — Load tests should not corrupt server state (configurable)
3. **Transport-Aware Concurrency** — Different concurrency limits per transport type
4. **Realistic Load Patterns** — Tool call sequences mimic real user behavior
5. **Actionable Reports** — Clear identification of breaking points with remediation
6. **CI/CD Friendly** — Machine-readable output, exit codes, baseline comparison

## Component Deep Dive

### MCP Client (`src/mcp-client/`)

Session-scoped MCP client adapted from `mcp-server-doctor` for load-test semantics:

- **Session-scoped** — Each session gets its own client instance; no shared state between sessions
- **Lazy initialization** — `initialize` is called on connect; `tools/list` is deferred to the pattern executor (not eagerly cached)
- **Concurrent-safe** — Each transport instance handles one session's requests; concurrency comes from multiple session instances, not in-flight requests per transport
- **Reconnect on failure** — Transport failures trigger session re-creation, not global test abort

```typescript
interface SessionMCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendRequest(method: string, params?: unknown): Promise<unknown>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  listTools(): Promise<ToolDefinition[]>;
}
```

> **Note on "copy/adapt" from doctor**: `mcp-server-doctor`'s `DoctorMCPClient` is optimized for single-session diagnostics (eager tool discovery, server info caching). Load testing requires the opposite: lightweight per-session clients that defer discovery and never cache globally.

### Load Engine (`src/engine/load-engine.ts`)

The orchestrator that runs load tests:

1. Parses configuration and validates options
2. Creates session pool based on target concurrency
3. Executes load profile (ramp/soak/spike/custom)
4. Collects metrics in real-time
5. Detects breaking point if auto-detection enabled
6. Generates report in requested format

```typescript
interface LoadEngineOptions {
  endpoint: string;
  transport: TransportType;
  auth?: AuthOptions;
  profile: LoadProfile;
  patterns: ToolCallPattern[];
  maxConcurrency: number;
  duration: number;
  warmupDurationMs?: number;       // Metrics discarded during warmup
  thinkTimeMs?: number;            // Default think time between pattern steps
  breakingPointDetection: boolean;
  backpressure?: BackpressureOptions;
  outputFormat: 'console' | 'markdown' | 'json';
}

interface BackpressureOptions {
  enabled: boolean;
  maxRetries: number;
  baseDelayMs: number;
  multiplier: number;
  treatAsBreakingPoint: boolean;   // Whether 429/503 signals breaking point
}
```

### Session Manager (`src/engine/session-manager.ts`)

Manages concurrent MCP sessions with multi-turn state:

- **Session Lifecycle** — Create, use, cleanup
- **State Tracking** — Per-session context for multi-turn workflows
- **Connection Pooling** — Reuse connections where appropriate
- **Transport-Aware** — Different pooling strategies per transport

```typescript
interface SessionState {
  id: string;
  client: MCPClient;
  context: Record<string, unknown>; // Multi-turn state passed between pattern steps
  currentPatternIndex: number;      // Which pattern is being executed
  currentStepIndex: number;         // Which step within the pattern
  createdAt: number;
  lastActiveAt: number;
  requestCount: number;
  errorCount: number;
  status: 'warming_up' | 'active' | 'cooling_down' | 'error' | 'completed';
}
```

### Load Profiles (`src/profiles/`)

#### Ramp Profile
Gradually increases concurrency from min to max, with optional ramp-down:
```typescript
interface RampProfile {
  type: 'ramp';
  minConcurrency: number;      // Starting concurrency
  maxConcurrency: number;      // Peak concurrency
  rampDurationMs: number;      // Time to reach max
  holdDurationMs: number;      // Time at max before ending
  rampDownDurationMs?: number; // Time to return to min (for recovery analysis)
  warmupDurationMs?: number;   // Metrics discarded during initial ramp
}
```

#### Soak Profile
Sustained load over extended period to detect memory leaks and degradation:
```typescript
interface SoakProfile {
  type: 'soak';
  concurrency: number;       // Constant concurrency
  durationMs: number;        // Total test duration
  warmupDurationMs?: number; // Metrics discarded during initial period
  sampleIntervalMs: number;  // Metrics sampling interval
}
```

#### Spike Profile
Sudden burst of concurrent requests to test resilience:
```typescript
interface SpikeProfile {
  type: 'spike';
  baselineConcurrency: number;  // Normal load
  spikeConcurrency: number;     // Burst load
  spikeDurationMs: number;      // How long the spike lasts
  spikeCount: number;           // Number of spikes
  cooldownMs: number;           // Time between spikes
}
```

### Tool Call Patterns (`src/patterns/`)

Realistic sequences of tool calls that mimic user behavior:

#### Built-in Patterns

1. **Explore-Then-Act**
   ```
   1. tools/list
   2. Pick random tool
   3. tools/call with generated args
   ```

2. **Read-Then-Write**
   ```
   1. resources/read (get current state)
   2. tools/call (modify state)
   3. resources/read (verify change)
   ```

3. **Multi-Step Workflow**
   ```
   1. tools/call step1 (create entity)
   2. tools/call step2 (using step1 result)
   3. tools/call step3 (cleanup)
   ```

#### Custom Pattern Definition

```yaml
patterns:
  - name: "search-and-process"
    weight: 0.5                    # Relative selection weight
    thinkTimeMs: 100               # Delay between steps
    onStepError: "continue"        # 'abort' | 'continue'
    steps:
      - tool: "search"
        args: { query: "{{random.string}}" }
      - tool: "process"
        args: { results: "{{previous.results}}" }
```

### Metrics Collection (`src/metrics/`)

#### Latency Histogram (`src/metrics/histogram.ts`)

Per-tool latency tracking with configurable buckets:

```typescript
class LatencyHistogram {
  private buckets: number[];      // Bucket boundaries
  private counts: number[];       // Count per bucket
  private samples: number[];      // Raw samples for percentile calc
  
  record(latencyMs: number): void;
  getPercentile(p: number): number;
  getStats(): LatencyStats;       // p50, p90, p99, min, max, mean
}
```

#### Error Tracker (`src/metrics/collector.ts`)

Categorizes and tracks errors:

| Category | Description |
|----------|-------------|
| TIMEOUT | Request exceeded timeout |
| CONNECTION | Network/connection failures |
| PROTOCOL | Invalid MCP protocol responses |
| SERVER | Server-returned errors |
| CLIENT | Client-side errors |

#### Throughput Metrics

- **Requests Per Second (RPS)** — Rolling window average
- **Success Rate** — Successful vs total requests
- **Active Sessions** — Current concurrent session count
- **Queue Depth** — Pending requests waiting for execution

### Breaking Point Detection (`src/breaking-point/`)

#### Threshold Monitors

Continuously monitors for degradation:

```typescript
interface BreakingThresholds {
  errorRate: number;        // e.g., 0.05 = 5% error rate
  latencyP99: number;       // e.g., 10000 = 10s p99
  timeoutRate: number;      // e.g., 0.10 = 10% timeouts
  connectionFailures: number; // Absolute count threshold
}
```

#### Auto-Scaling Search

Binary search for max sustainable load:

1. Start at low concurrency
2. Double until errors appear
3. Binary search between last-good and first-bad
4. Verify with sustained load at found limit

#### Recovery Analysis

After breaking point detection:
1. Reduce load to 50% of breaking point
2. Monitor recovery time
3. Check if error rate returns to baseline
4. Report recovery characteristics

### Transport Concurrency Profiles

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

### Grading System (`src/grading/`)

Load test specific benchmarks:

```typescript
// Default latency benchmarks (p99 in ms) — override per-tool-category in config
const DEFAULT_LATENCY_BENCHMARKS = {
  A: { p99: 500 },
  B: { p99: 1000 },
  C: { p99: 2000 },
  D: { p99: 5000 },
};

// Per-tool-category overrides (e.g., search tools are naturally slower)
const TOOL_CATEGORY_BENCHMARKS: Record<string, LatencyBenchmarks> = {
  compute: { A: { p99: 100 }, B: { p99: 250 }, C: { p99: 500 }, D: { p99: 1000 } },
  search:  { A: { p99: 1000 }, B: { p99: 2000 }, C: { p99: 5000 }, D: { p99: 10000 } },
  io:      { A: { p99: 250 }, B: { p99: 500 }, C: { p99: 1000 }, D: { p99: 2500 } },
};

// Concurrency benchmarks (max sustainable)
const CONCURRENCY_BENCHMARKS = {
  A: 100,
  B: 50,
  C: 25,
  D: 10,
};

// Error rate benchmarks
const ERROR_RATE_BENCHMARKS = {
  A: 0,
  B: 0.01,
  C: 0.05,
  D: 0.10,
};
```

### Reporter System (`src/reporters/`)

#### Markdown Reporter (PR-Ready)

Generates a report suitable for GitHub PR comments:

```markdown
# Load Test Report

## Summary
- **Grade:** B 🟢
- **Breaking Point:** 47 concurrent sessions
- **Duration:** 5m 23s
- **Total Requests:** 14,237

## Latency (p99)
| Tool | p50 | p90 | p99 | Samples |
|------|-----|-----|-----|---------|
| search | 45ms | 120ms | 340ms | 4,521 |
| process | 89ms | 230ms | 520ms | 3,214 |

## Breaking Point Analysis
Server began degrading at 47 concurrent sessions:
- Error rate increased from 0.1% to 8.3%
- p99 latency increased from 340ms to 2.1s
- Recovery time: 45s after load reduction

## Recommendations
1. Add connection pooling to handle higher concurrency
2. Implement request queuing for spike protection
```

#### JSON Reporter

Machine-readable format for CI/CD:

```typescript
interface LoadTestReport {
  id: string;
  endpoint: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  grade: Grade;
  breakingPoint: BreakingPointResult | null;
  toolLatencies: ToolLatencyMetrics[];
  errorSummary: ErrorSummary;
  throughput: ThroughputMetrics;
  recommendations: string[];
  baselineComparison?: BaselineComparison;
}

interface BaselineComparison {
  baselineId: string;
  baselineDate: string;
  gradeChange: 'improved' | 'regressed' | 'unchanged';
  latencyChangePercent: number;    // Overall p99 change
  breakingPointChangePercent: number;
  errorRateChangePercent: number;
  toolLatencyChanges: Array<{
    toolName: string;
    p99ChangePercent: number;
    gradeChange: 'improved' | 'regressed' | 'unchanged';
  }>;
}
```

#### Console Reporter

Real-time progress display with live metrics:

```
[████████████████░░░░] 75% | 45/60 sessions | 234 RPS | 0.2% errors
  p50: 45ms  p90: 120ms  p99: 340ms
```

## Data Flow

### Test Execution Flow

```
1. CLI parses arguments → LoadTestOptions
2. Validate configuration and target endpoint
3. LoadEngine.start()
   ├── SessionManager.createPool(maxConcurrency)
   ├── ProfileExecutor.run(profile)
   │   ├── Warmup phase: sessions active, metrics discarded
   │   ├── Active phase: all sessions run patterns concurrently (closed-loop)
   │   │   ├── Each session independently loops through weighted patterns
   │   │   ├── PatternExecutor.execute(pattern) with thinkTime between steps
   │   │   ├── MetricsCollector.record(latency, success)
   │   │   ├── BreakingPointDetector.check()
   │   │   └── BackpressureHandler.handle(response)
   │   └── Adjust concurrency per profile (ramp up / spike / hold)
   ├── Cooldown phase: ramp down, observe recovery
   ├── SessionManager.cleanup()
   └── Return LoadTestReport
4. Reporter.format(report) → output
5. Exit with appropriate code
```

### Metrics Collection Flow (per request)

```
1. Session picks tool from pattern
2. Start timer
3. Execute tools/call via transport
4. Stop timer → record latency
5. On success: increment success counter
6. On error: categorize error, increment error counter
7. Update rolling RPS calculation
8. Check breaking point thresholds
9. If broken: signal profile executor to adjust
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
| Server overload | 503/429 responses | Apply backoff if backpressure enabled; may trigger breaking point |
| Protocol error | Invalid JSON-RPC | Record protocol error, continue |
| Transport failure | Stream closed unexpectedly | Reconnect transport, recreate session |

## Observability

### Structured Logging (Pino)

All significant events logged with structured fields:
- `sessionId`, `toolName`, `concurrency` — Request context
- `latencyMs`, `success`, `errorType` — Request result
- `profile`, `currentConcurrency`, `targetConcurrency` — Profile state
- `breakingPointDetected`, `errorRate`, `threshold` — Breaking point

### Metrics (OpenTelemetry)

| Metric | Type | Description |
|--------|------|-------------|
| `loadtest_requests_total` | Counter | Total requests, by tool and status |
| `loadtest_request_duration_ms` | Histogram | Request latency distribution |
| `loadtest_active_sessions` | Gauge | Current active session count |
| `loadtest_error_total` | Counter | Errors by category |
| `loadtest_rps` | Gauge | Current requests per second |
| `loadtest_breaking_point` | Gauge | Detected breaking point concurrency |

## Configuration

### CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--endpoint` | MCP server endpoint (URL or command) | (required) |
| `--transport` | `stdio`, `sse`, `http`, `auto` | `auto` |
| `--profile` | `ramp`, `soak`, `spike`, `custom` | `ramp` |
| `--max-concurrency` | Maximum concurrent sessions | `50` |
| `--duration` | Test duration in seconds | `60` |
| `--patterns` | Comma-separated pattern names | `explore-then-act` |
| `--breaking-point` | Enable auto breaking point detection | `false` |
| `--format` | `console`, `markdown`, `json` | `console` |
| `--output` | Output file path | stdout |
| `--timeout` | Request timeout in ms | `30000` |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | `production` or `development` | `development` |
| `LOG_LEVEL` | Pino log level | `info` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint for metrics | (disabled) |
| `MCP_API_KEY` | API key for auth | (none) |
| `MCP_BEARER_TOKEN` | Bearer token for auth | (none) |

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
  holdDurationMs: 120000 # 2 minutes

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

## Comparison with mcp-server-doctor

| Aspect | mcp-server-doctor | mcp-load-test |
|--------|-------------------|---------------|
| Purpose | Diagnostics & grading | Stress testing & breaking point |
| Duration | Seconds | Minutes to hours |
| Concurrency | Low (1-10) | High (1-100+) |
| Focus | Compliance, correctness | Performance, limits |
| Output | Report card grade | Breaking point analysis |
| Use Case | Pre-deployment check | Capacity planning |

Together they provide complete server quality assurance:
- **Doctor** answers: "Is the server correctly implemented?"
- **Load Test** answers: "How much load can the server handle?"
