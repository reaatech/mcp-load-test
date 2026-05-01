import type { LoadTestReport } from '@reaatech/mcp-load-test-core';
import { ConsoleReporter, JsonReporter, MarkdownReporter } from '@reaatech/mcp-load-test-reporters';
import { describe, expect, it } from 'vitest';

function createMockReport(overrides: Partial<LoadTestReport> = {}): LoadTestReport {
  return {
    id: 'test-123',
    endpoint: 'http://localhost:3000',
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:01:00Z',
    durationMs: 60000,
    grade: 'B',
    breakingPoint: {
      detected: true,
      concurrencyAtBreak: 47,
      errorRateAtBreak: 0.083,
      latencyP99AtBreak: 2100,
      recoveryTimeMs: 45000,
    },
    toolLatencies: [
      {
        toolName: 'search',
        latency: {
          p50: 45,
          p90: 120,
          p95: 200,
          p99: 340,
          min: 10,
          max: 500,
          mean: 80,
          samples: 4521,
        },
      },
      {
        toolName: 'process',
        latency: {
          p50: 89,
          p90: 230,
          p95: 350,
          p99: 520,
          min: 20,
          max: 800,
          mean: 150,
          samples: 3214,
        },
      },
    ],
    errorSummary: {
      totalErrors: 12,
      totalRequests: 14237,
      errorRate: 0.0008,
      byCategory: { TIMEOUT: 5, CONNECTION: 7 },
      byTool: { search: 5, process: 7 },
    },
    throughput: {
      averageRps: 237.2,
      peakRps: 340,
      totalRequests: 14237,
      totalSuccessful: 14225,
      totalFailed: 12,
    },
    recommendations: ['Add connection pooling', 'Implement request queuing'],
    ...overrides,
  };
}

describe('reporters', () => {
  describe('ConsoleReporter', () => {
    it('should format a report with grade', () => {
      const reporter = new ConsoleReporter();
      const output = reporter.format(createMockReport());
      expect(output).toContain('Load Test Report');
      expect(output).toContain('Grade:');
      expect(output).toContain('B');
    });

    it('should include breaking point info', () => {
      const reporter = new ConsoleReporter();
      const output = reporter.format(createMockReport());
      expect(output).toContain('Breaking Point Detected');
      expect(output).toContain('47');
    });

    it('should include latency table', () => {
      const reporter = new ConsoleReporter();
      const output = reporter.format(createMockReport());
      expect(output).toContain('search');
      expect(output).toContain('process');
      expect(output).toContain('Latency by Tool');
    });

    it('should include throughput', () => {
      const reporter = new ConsoleReporter();
      const output = reporter.format(createMockReport());
      expect(output).toContain('Throughput');
      expect(output).toContain('14,237');
    });

    it('should handle report with no errors', () => {
      const reporter = new ConsoleReporter();
      const report = createMockReport({
        errorSummary: {
          totalErrors: 0,
          totalRequests: 100,
          errorRate: 0,
          byCategory: {},
          byTool: {},
        },
      });
      const output = reporter.format(report);
      expect(output).not.toContain('Errors');
    });

    it('should handle report with no breaking point', () => {
      const reporter = new ConsoleReporter();
      const report = createMockReport({ breakingPoint: null });
      const output = reporter.format(report);
      expect(output).not.toContain('Breaking Point');
    });

    it('should handle report with no recommendations', () => {
      const reporter = new ConsoleReporter();
      const report = createMockReport({ recommendations: [] });
      const output = reporter.format(report);
      expect(output).not.toContain('Recommendations');
    });

    it('should format long durations correctly', () => {
      const reporter = new ConsoleReporter();
      const report = createMockReport({ durationMs: 3661000 });
      const output = reporter.format(report);
      expect(output).toContain('1h 1m 1s');
    });

    it('should handle unknown grades', () => {
      const reporter = new ConsoleReporter();
      const report = createMockReport({ grade: 'X' as unknown as typeof report.grade });
      const output = reporter.format(report);
      expect(output).toContain('Grade:');
    });
  });

  describe('MarkdownReporter', () => {
    it('should format markdown report', () => {
      const reporter = new MarkdownReporter();
      const output = reporter.format(createMockReport());
      expect(output).toContain('# Load Test Report');
      expect(output).toContain('## Summary');
      expect(output).toContain('**Grade:** B');
    });

    it('should include latency table in markdown', () => {
      const reporter = new MarkdownReporter();
      const output = reporter.format(createMockReport());
      expect(output).toContain('## Latency');
      expect(output).toContain('| Tool | p50 | p90 | p95 | p99 | Samples |');
      expect(output).toContain('| search | 45ms |');
    });

    it('should include breaking point section', () => {
      const reporter = new MarkdownReporter();
      const output = reporter.format(createMockReport());
      expect(output).toContain('## Breaking Point Analysis');
      expect(output).toContain('47');
    });

    it('should include recommendations', () => {
      const reporter = new MarkdownReporter();
      const output = reporter.format(createMockReport());
      expect(output).toContain('## Recommendations');
      expect(output).toContain('1. Add connection pooling');
    });

    it('should format duration correctly', () => {
      const reporter = new MarkdownReporter();
      const short = createMockReport({ durationMs: 45000 });
      expect(reporter.format(short)).toContain('45s');

      const long = createMockReport({ durationMs: 125000 });
      expect(reporter.format(long)).toContain('2m 5s');
    });
  });

  describe('JsonReporter', () => {
    it('should output valid JSON', () => {
      const reporter = new JsonReporter();
      const output = reporter.format(createMockReport());
      const parsed = JSON.parse(output);
      expect(parsed.id).toBe('test-123');
      expect(parsed.grade).toBe('B');
    });
  });
});
