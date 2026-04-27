export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export type TransportType = 'stdio' | 'sse' | 'http' | 'auto';
export type AuthMode = 'none' | 'api-key' | 'bearer' | 'oauth';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  samples: number;
}

export interface ToolLatencyMetrics {
  toolName: string;
  latency: LatencyMetrics;
}

export interface ErrorSummary {
  totalErrors: number;
  totalRequests: number;
  errorRate: number;
  byCategory: Record<string, number>;
  byTool: Record<string, number>;
}

export interface ThroughputMetrics {
  averageRps: number;
  peakRps: number;
  totalRequests: number;
  totalSuccessful: number;
  totalFailed: number;
}

export interface BreakingPointResult {
  detected: boolean;
  concurrencyAtBreak: number | null;
  errorRateAtBreak: number | null;
  latencyP99AtBreak: number | null;
  recoveryTimeMs: number | null;
}

export interface BaselineComparison {
  baselineId: string;
  baselineDate: string;
  gradeChange: 'improved' | 'regressed' | 'unchanged';
  latencyChangePercent: number;
  breakingPointChangePercent: number;
  errorRateChangePercent: number;
  toolLatencyChanges: Array<{
    toolName: string;
    p99ChangePercent: number;
    gradeChange: 'improved' | 'regressed' | 'unchanged';
  }>;
}

export interface LoadTestReport {
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

export interface RampProfile {
  type: 'ramp';
  minConcurrency: number;
  maxConcurrency: number;
  rampDurationMs: number;
  holdDurationMs: number;
  rampDownDurationMs?: number;
  warmupDurationMs?: number;
}

export interface SoakProfile {
  type: 'soak';
  concurrency: number;
  durationMs: number;
  warmupDurationMs?: number;
  sampleIntervalMs: number;
}

export interface SpikeProfile {
  type: 'spike';
  baselineConcurrency: number;
  spikeConcurrency: number;
  spikeDurationMs: number;
  spikeCount: number;
  /** Cooldown used both as baseline period before each spike and as final cooldown. */
  cooldownMs: number;
}

export interface CustomProfile {
  type: 'custom';
  concurrencyCurve: Array<{ timeMs: number; concurrency: number }>;
  warmupDurationMs?: number;
}

export type LoadProfile = RampProfile | SoakProfile | SpikeProfile | CustomProfile;

export interface PatternStep {
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolCallPattern {
  name: string;
  weight: number;
  thinkTimeMs: number;
  onStepError: 'abort' | 'continue';
  steps: PatternStep[];
}

export interface AuthOptions {
  mode: AuthMode;
  apiKey?: string;
  bearerToken?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
}

export interface LoadEngineOptions {
  endpoint: string;
  transport: TransportType;
  auth?: AuthOptions;
  profile: LoadProfile;
  patterns: ToolCallPattern[];
  breakingPointDetection: boolean;
  outputFormat: 'console' | 'markdown' | 'json';
}

export interface SessionState {
  id: string;
  client: MCPClient;
  context: Record<string, unknown>;
  currentPatternIndex: number;
  currentStepIndex: number;
  createdAt: number;
  lastActiveAt: number;
  requestCount: number;
  errorCount: number;
  status: 'warming_up' | 'active' | 'cooling_down' | 'error' | 'completed';
}

export interface MCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendRequest(method: string, params?: unknown): Promise<unknown>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  listTools(): Promise<ToolDefinition[]>;
}

export interface TransportConcurrencyProfile {
  maxRecommendedConcurrency: number;
  connectionReuseStrategy: 'pool' | 'single' | 'per-request';
  sessionSupport: boolean;
  notes: string;
}
