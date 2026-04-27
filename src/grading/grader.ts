import {
  gradeLatency,
  gradeConcurrency,
  gradeErrorRate,
  overallGrade,
  CONCURRENCY_BENCHMARKS,
  TOOL_CATEGORY_BENCHMARKS,
} from './benchmarks.js';
import type { Grade, LoadTestReport, ToolLatencyMetrics } from '../types/domain.js';
import type { LatencyBenchmarks } from './benchmarks.js';

export interface GraderOptions {
  toolCategoryMap?: Record<string, string>;
}

export interface GradeContext {
  maxObservedConcurrency?: number;
}

export class Grader {
  constructor(private options: GraderOptions = {}) {}

  grade(report: LoadTestReport, context: GradeContext = {}): Grade {
    const latencyGrade = this.gradeOverallLatency(report.toolLatencies);
    const errorRateGrade = gradeErrorRate(report.errorSummary.errorRate);

    // Concurrency grade is only meaningful when the test actually stressed
    // the server. If we detected a breaking point, use that; otherwise fall
    // back to observed peak concurrency when high enough to be informative.
    // At trivial concurrency (e.g. smoke tests), skip the concurrency
    // dimension — latency and error rate decide the grade.
    const grades: Grade[] = [latencyGrade, errorRateGrade];
    if (report.breakingPoint?.detected) {
      grades.push(gradeConcurrency(report.breakingPoint.concurrencyAtBreak || 0));
    } else if ((context.maxObservedConcurrency ?? 0) >= CONCURRENCY_BENCHMARKS.D) {
      grades.push(gradeConcurrency(context.maxObservedConcurrency ?? 0));
    }

    return overallGrade(...grades);
  }

  private gradeOverallLatency(toolLatencies: ToolLatencyMetrics[]): Grade {
    if (toolLatencies.length === 0) return 'F';

    const grades = toolLatencies.map((tl) => {
      const category = this.options.toolCategoryMap?.[tl.toolName];
      const benchmarks: LatencyBenchmarks | undefined = category
        ? TOOL_CATEGORY_BENCHMARKS[category]
        : undefined;
      return gradeLatency(tl.latency.p99, benchmarks);
    });

    // Return worst grade across all tools
    const gradeOrder: Grade[] = ['A', 'B', 'C', 'D', 'F'];
    let worstIndex = 0;
    for (const g of grades) {
      const idx = gradeOrder.indexOf(g);
      if (idx > worstIndex) worstIndex = idx;
    }
    return gradeOrder[worstIndex] ?? 'F';
  }

  generateRecommendations(report: LoadTestReport): string[] {
    const recommendations: string[] = [];

    if (report.breakingPoint?.detected && (report.breakingPoint.concurrencyAtBreak || 0) < 25) {
      recommendations.push('Consider adding connection pooling to handle higher concurrency.');
    }

    if (report.errorSummary.errorRate > 0.05) {
      recommendations.push(
        'High error rate detected. Review server error handling and capacity limits.',
      );
    }

    const slowTools = report.toolLatencies.filter((tl) => tl.latency.p99 > 5000);
    if (slowTools.length > 0) {
      recommendations.push(
        `Slow tools detected: ${slowTools.map((t) => t.toolName).join(', ')}. Consider optimization or caching.`,
      );
    }

    if (report.breakingPoint?.recoveryTimeMs && report.breakingPoint.recoveryTimeMs > 30000) {
      recommendations.push(
        'Recovery time is slow. Consider implementing circuit breakers or load shedding.',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Server performance is within acceptable parameters.');
    }

    return recommendations;
  }
}
