import { LatencyHistogram } from './histogram.js';
import { percentile } from '../utils/index.js';
import type { ErrorSummary, ThroughputMetrics } from '../types/domain.js';

export type ErrorCategory =
  | 'TIMEOUT'
  | 'CONNECTION'
  | 'PROTOCOL'
  | 'SERVER'
  | 'CLIENT'
  | 'BACKPRESSURE';

export interface RequestRecord {
  sessionId: string;
  toolName: string;
  latencyMs: number;
  success: boolean;
  errorCategory?: ErrorCategory;
  timestamp: number;
}

export class MetricsCollector {
  private toolHistograms = new Map<string, LatencyHistogram>();
  private errors: Array<{ category: ErrorCategory; toolName: string; timestamp: number }> = [];
  private requests: RequestRecord[] = [];
  private startTime = 0;
  private endTime = 0;
  private _totalRequests = 0;
  private _totalSuccessful = 0;
  private _totalErrors = 0;
  private readonly maxBufferSize: number;

  constructor(maxBufferSize = 100_000) {
    this.maxBufferSize = maxBufferSize;
  }

    start(): void {
    this.startTime = performance.now();
    this._totalRequests = 0;
    this._totalSuccessful = 0;
    this._totalErrors = 0;
  }

  stop(): void {
    this.endTime = performance.now();
  }

  record(request: RequestRecord): void {
    this._totalRequests++;
    if (request.success) this._totalSuccessful++;

    if (this.requests.length >= this.maxBufferSize) {
      this.requests.splice(0, Math.floor(this.requests.length / 2));
    }
    this.requests.push(request);

    if (request.success) {
      let histogram = this.toolHistograms.get(request.toolName);
      if (!histogram) {
        histogram = new LatencyHistogram();
        this.toolHistograms.set(request.toolName, histogram);
      }
      histogram.record(request.latencyMs);
    } else if (request.errorCategory) {
      this._totalErrors++;
      if (this.errors.length >= this.maxBufferSize) {
        this.errors.splice(0, Math.floor(this.errors.length / 2));
      }
      this.errors.push({
        category: request.errorCategory,
        toolName: request.toolName,
        timestamp: request.timestamp,
      });
    }
  }

  getToolHistograms(): Map<string, LatencyHistogram> {
    return new Map(this.toolHistograms);
  }

  getErrorSummary(): ErrorSummary {
    const totalRequests = this._totalRequests;
    const totalErrors = this._totalErrors;
    const byCategory: Record<string, number> = {};
    const byTool: Record<string, number> = {};

    for (const error of this.errors) {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      byTool[error.toolName] = (byTool[error.toolName] || 0) + 1;
    }

    return {
      totalErrors,
      totalRequests,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      byCategory,
      byTool,
    };
  }

  getThroughput(): ThroughputMetrics {
    const durationSec = (this.endTime - this.startTime) / 1000;
    const totalRequests = this._totalRequests;
    const totalSuccessful = this._totalSuccessful;

    // Calculate peak RPS using 1-second windows (from buffered requests)
    const windows = new Map<number, number>();
    for (const req of this.requests) {
      const sec = Math.floor(req.timestamp / 1000);
      windows.set(sec, (windows.get(sec) || 0) + 1);
    }
    let peakRps = 0;
    for (const count of windows.values()) {
      if (count > peakRps) peakRps = count;
    }

    return {
      averageRps: durationSec > 0 ? totalRequests / durationSec : 0,
      peakRps,
      totalRequests,
      totalSuccessful,
      totalFailed: totalRequests - totalSuccessful,
    };
  }

  getOverallLatencyP99(): number {
    const samples: number[] = [];
    for (const req of this.requests) {
      if (req.success) samples.push(req.latencyMs);
    }
    if (samples.length === 0) return 0;
    samples.sort((a, b) => a - b);
    return percentile(samples, 99);
  }

  getWindowedErrorRate(windowMs: number): { errorRate: number; samples: number } {
    const cutoff = Date.now() - windowMs;
    let total = 0;
    let errors = 0;
    for (const req of this.requests) {
      if (req.timestamp < cutoff) continue;
      total++;
      if (!req.success) errors++;
    }
    return {
      errorRate: total > 0 ? errors / total : 0,
      samples: total,
    };
  }

  getActiveSessionCountOverTime(): Array<{ timestamp: number; count: number }> {
    // Simplified: return unique session count per second
    const windows = new Map<number, Set<string>>();
    for (const req of this.requests) {
      const sec = Math.floor(req.timestamp / 1000);
      if (!windows.has(sec)) {
        windows.set(sec, new Set());
      }
      windows.get(sec)!.add(req.sessionId);
    }
    return Array.from(windows.entries())
      .map(([timestamp, sessions]) => ({ timestamp, count: sessions.size }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}
