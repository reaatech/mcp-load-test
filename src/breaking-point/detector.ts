import type { BreakingPointResult } from '../types/domain.js';
import type { MetricsCollector } from '../metrics/index.js';

export interface BreakingThresholds {
  errorRate: number;
  latencyP99: number;
  timeoutRate: number;
  connectionFailures: number;
}

export const DEFAULT_THRESHOLDS: BreakingThresholds = {
  errorRate: 0.05,
  latencyP99: 10000,
  timeoutRate: 0.1,
  connectionFailures: 10,
};

// Window used for recovery detection: only recent samples count as "recovered".
const RECOVERY_WINDOW_MS = 5000;
// Minimum samples in the recovery window before we'll declare recovery — avoids
// false positives from a brief lull in traffic.
const RECOVERY_MIN_SAMPLES = 10;

export class BreakingPointDetector {
  private thresholds: BreakingThresholds;
  private broken = false;
  private breakConcurrency: number | null = null;
  private breakMetrics: { errorRate: number; latencyP99: number } | null = null;
  private detectedAt: number | null = null;
  private recoveryTimeMs: number | null = null;

  constructor(thresholds?: Partial<BreakingThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  check(concurrency: number, metrics: MetricsCollector): boolean {
    if (this.broken) {
      this.updateRecovery(metrics);
      return true;
    }

    const errorSummary = metrics.getErrorSummary();
    const overallP99 = metrics.getOverallLatencyP99();

    const timeoutCount = errorSummary.byCategory['TIMEOUT'] || 0;
    const timeoutRate =
      errorSummary.totalRequests > 0 ? timeoutCount / errorSummary.totalRequests : 0;
    const connectionFailures = errorSummary.byCategory['CONNECTION'] || 0;

    const isBroken =
      errorSummary.errorRate > this.thresholds.errorRate ||
      overallP99 > this.thresholds.latencyP99 ||
      timeoutRate > this.thresholds.timeoutRate ||
      connectionFailures > this.thresholds.connectionFailures;

    if (isBroken) {
      this.broken = true;
      this.breakConcurrency = concurrency;
      this.breakMetrics = {
        errorRate: errorSummary.errorRate,
        latencyP99: overallP99,
      };
      this.detectedAt = Date.now();
    }

    return isBroken;
  }

  private updateRecovery(metrics: MetricsCollector): void {
    if (this.recoveryTimeMs !== null || this.detectedAt === null) return;
    const { errorRate, samples } = metrics.getWindowedErrorRate(RECOVERY_WINDOW_MS);
    if (samples >= RECOVERY_MIN_SAMPLES && errorRate < this.thresholds.errorRate) {
      this.recoveryTimeMs = Date.now() - this.detectedAt;
    }
  }

  getResult(): BreakingPointResult {
    return {
      detected: this.broken,
      concurrencyAtBreak: this.breakConcurrency,
      errorRateAtBreak: this.breakMetrics?.errorRate ?? null,
      latencyP99AtBreak: this.breakMetrics?.latencyP99 ?? null,
      recoveryTimeMs: this.recoveryTimeMs,
    };
  }

  reset(): void {
    this.broken = false;
    this.breakConcurrency = null;
    this.breakMetrics = null;
    this.detectedAt = null;
    this.recoveryTimeMs = null;
  }
}
