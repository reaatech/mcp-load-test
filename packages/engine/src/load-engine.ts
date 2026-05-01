import { BreakingPointDetector } from '@reaatech/mcp-load-test-analysis';
import { Grader } from '@reaatech/mcp-load-test-analysis';
import { generateUUID, now } from '@reaatech/mcp-load-test-core';
import { logger } from '@reaatech/mcp-load-test-core';
import type {
  LoadEngineOptions,
  LoadProfile,
  LoadTestReport,
  ToolLatencyMetrics,
} from '@reaatech/mcp-load-test-core';
import { MetricsCollector } from '@reaatech/mcp-load-test-metrics';
import {
  customProfileGenerator,
  rampProfileGenerator,
  soakProfileGenerator,
  spikeProfileGenerator,
} from '@reaatech/mcp-load-test-profiles';
import { SessionManager } from './session-manager.js';

export class LoadEngine {
  private sessionManager: SessionManager;
  private metrics: MetricsCollector;
  private breakingPointDetector: BreakingPointDetector;
  private grader: Grader;
  private maxObservedConcurrency = 0;

  constructor(private options: LoadEngineOptions) {
    this.metrics = new MetricsCollector();
    this.sessionManager = new SessionManager({
      endpoint: options.endpoint,
      transport: options.transport,
      timeout: 30000,
      auth: options.auth,
      patterns: options.patterns,
      metrics: this.metrics,
    });
    this.breakingPointDetector = new BreakingPointDetector();
    this.grader = new Grader();
  }

  async run(): Promise<LoadTestReport> {
    const id = generateUUID();
    const startedAt = now();
    const startTime = performance.now();

    logger.info(
      { id, endpoint: this.options.endpoint, transport: this.options.transport },
      'Starting load test',
    );

    this.metrics.start();
    await this.sessionManager.start();

    // Run the profile
    await this.executeProfile(this.options.profile);

    // Stop and collect
    this.metrics.stop();
    await this.sessionManager.stop();

    const completedAt = now();
    const durationMs = Math.round(performance.now() - startTime);

    // Build report
    const toolHistograms = this.metrics.getToolHistograms();
    const toolLatencies: ToolLatencyMetrics[] = Array.from(toolHistograms.entries()).map(
      ([toolName, histogram]) => ({
        toolName,
        latency: histogram.getStats(),
      }),
    );

    const errorSummary = this.metrics.getErrorSummary();
    const throughput = this.metrics.getThroughput();
    const breakingPoint = this.breakingPointDetector.getResult();

    const report: LoadTestReport = {
      id,
      endpoint: this.options.endpoint,
      startedAt,
      completedAt,
      durationMs,
      grade: 'C', // placeholder, will be updated
      breakingPoint,
      toolLatencies,
      errorSummary,
      throughput,
      recommendations: [],
    };

    report.grade = this.grader.grade(report, {
      maxObservedConcurrency: this.maxObservedConcurrency,
    });
    report.recommendations = this.grader.generateRecommendations(report);

    logger.info({ id, grade: report.grade, durationMs }, 'Load test completed');

    return report;
  }

  private async executeProfile(profile: LoadProfile): Promise<void> {
    const generator = this.getProfileGenerator(profile);

    for await (const { concurrency, phase } of generator) {
      logger.debug({ concurrency, phase }, 'Adjusting concurrency');

      // Update session pool size
      await this.sessionManager.createPool(concurrency);
      if (concurrency > this.maxObservedConcurrency) {
        this.maxObservedConcurrency = concurrency;
      }

      // Update session status based on phase
      if (phase === 'warmup') {
        this.sessionManager.setSessionStatus('warming_up');
      } else if (phase === 'ramp_down' || phase === 'cooldown') {
        this.sessionManager.setSessionStatus('cooling_down');
      } else {
        this.sessionManager.setSessionStatus('active');
      }

      // Check breaking point (and recovery, if already detected).
      if (this.options.breakingPointDetection && phase !== 'warmup') {
        const broken = this.breakingPointDetector.check(concurrency, this.metrics);
        if (broken && !this.breakingPointDetector.getResult().recoveryTimeMs) {
          logger.warn({ concurrency }, 'Breaking point detected');
        }
      }
    }
  }

  private getProfileGenerator(profile: LoadProfile) {
    switch (profile.type) {
      case 'ramp':
        return rampProfileGenerator(profile);
      case 'soak':
        return soakProfileGenerator(profile);
      case 'spike':
        return spikeProfileGenerator(profile);
      case 'custom':
        return customProfileGenerator(profile);
      default:
        throw new Error(`Unknown profile type: ${(profile as { type: string }).type}`);
    }
  }
}
