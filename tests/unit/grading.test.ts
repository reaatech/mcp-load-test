import { describe, it, expect } from 'vitest';
import {
  gradeLatency,
  gradeConcurrency,
  gradeErrorRate,
  overallGrade,
  TOOL_CATEGORY_BENCHMARKS,
} from '../../src/grading/benchmarks.js';
import { Grader } from '../../src/grading/grader.js';
import type { LoadTestReport } from '../../src/types/domain.js';

describe('grading', () => {
  describe('gradeLatency', () => {
    it('should give A for fast responses', () => {
      expect(gradeLatency(100)).toBe('A');
    });

    it('should give F for very slow responses', () => {
      expect(gradeLatency(100000)).toBe('F');
    });

    it('should use category benchmarks', () => {
      const searchBenchmarks = TOOL_CATEGORY_BENCHMARKS.search;
      expect(gradeLatency(500, searchBenchmarks)).toBe('A');
      expect(gradeLatency(3000, searchBenchmarks)).toBe('C');
    });
  });

  describe('gradeConcurrency', () => {
    it('should grade by concurrency levels', () => {
      expect(gradeConcurrency(150)).toBe('A');
      expect(gradeConcurrency(75)).toBe('B');
      expect(gradeConcurrency(5)).toBe('F');
    });
  });

  describe('gradeErrorRate', () => {
    it('should grade by error rate', () => {
      expect(gradeErrorRate(0)).toBe('A');
      expect(gradeErrorRate(0.02)).toBe('C');
      expect(gradeErrorRate(0.15)).toBe('F');
    });
  });

  describe('overallGrade', () => {
    it('should return worst grade', () => {
      expect(overallGrade('A', 'A', 'F')).toBe('F');
      expect(overallGrade('B', 'C', 'A')).toBe('C');
    });
  });

  describe('Grader', () => {
    it('should generate recommendations', () => {
      const grader = new Grader();
      const report: LoadTestReport = {
        id: 'test',
        endpoint: 'http://test',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 1000,
        grade: 'C',
        breakingPoint: {
          detected: true,
          concurrencyAtBreak: 10,
          errorRateAtBreak: 0.2,
          latencyP99AtBreak: 1000,
          recoveryTimeMs: 60000,
        },
        toolLatencies: [
          {
            toolName: 'slow',
            latency: {
              p50: 100,
              p90: 200,
              p95: 300,
              p99: 6000,
              min: 50,
              max: 7000,
              mean: 200,
              samples: 10,
            },
          },
        ],
        errorSummary: {
          totalErrors: 10,
          totalRequests: 100,
          errorRate: 0.1,
          byCategory: {},
          byTool: {},
        },
        throughput: {
          averageRps: 10,
          peakRps: 20,
          totalRequests: 100,
          totalSuccessful: 90,
          totalFailed: 10,
        },
        recommendations: [],
      };

      const recs = grader.generateRecommendations(report);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some((r) => r.includes('slow'))).toBe(true);
    });

    it('should grade with no breaking point', () => {
      const grader = new Grader();
      const report: LoadTestReport = {
        id: 'test',
        endpoint: 'http://test',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 1000,
        grade: 'C',
        breakingPoint: null,
        toolLatencies: [
          {
            toolName: 'fast',
            latency: { p50: 10, p90: 20, p95: 25, p99: 30, min: 5, max: 40, mean: 15, samples: 100 },
          },
        ],
        errorSummary: { totalErrors: 0, totalRequests: 100, errorRate: 0, byCategory: {}, byTool: {} },
        throughput: { averageRps: 10, peakRps: 15, totalRequests: 100, totalSuccessful: 100, totalFailed: 0 },
        recommendations: [],
      };

      expect(grader.grade(report, { maxObservedConcurrency: 100 })).toBe('A');
    });

    it('should return F for empty tool latencies', () => {
      const grader = new Grader();
      const report: LoadTestReport = {
        id: 'test',
        endpoint: 'http://test',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 1000,
        grade: 'C',
        breakingPoint: null,
        toolLatencies: [],
        errorSummary: { totalErrors: 0, totalRequests: 0, errorRate: 0, byCategory: {}, byTool: {} },
        throughput: { averageRps: 0, peakRps: 0, totalRequests: 0, totalSuccessful: 0, totalFailed: 0 },
        recommendations: [],
      };

      expect(grader.grade(report)).toBe('F');
    });

    it('should use tool category benchmarks when provided', () => {
      const grader = new Grader({ toolCategoryMap: { search: 'search' } });
      const report: LoadTestReport = {
        id: 'test',
        endpoint: 'http://test',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 1000,
        grade: 'C',
        breakingPoint: null,
        toolLatencies: [
          {
            toolName: 'search',
            latency: { p50: 10, p90: 20, p95: 25, p99: 500, min: 5, max: 40, mean: 15, samples: 100 },
          },
        ],
        errorSummary: { totalErrors: 0, totalRequests: 100, errorRate: 0, byCategory: {}, byTool: {} },
        throughput: { averageRps: 10, peakRps: 15, totalRequests: 100, totalSuccessful: 100, totalFailed: 0 },
        recommendations: [],
      };

      // 500ms is within search benchmark A grade
      expect(grader.grade(report, { maxObservedConcurrency: 100 })).toBe('A');
    });

    it('should return default recommendation when all is well', () => {
      const grader = new Grader();
      const report: LoadTestReport = {
        id: 'test',
        endpoint: 'http://test',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 1000,
        grade: 'C',
        breakingPoint: null,
        toolLatencies: [
          {
            toolName: 'fast',
            latency: { p50: 10, p90: 20, p95: 25, p99: 30, min: 5, max: 40, mean: 15, samples: 100 },
          },
        ],
        errorSummary: { totalErrors: 0, totalRequests: 100, errorRate: 0, byCategory: {}, byTool: {} },
        throughput: { averageRps: 10, peakRps: 15, totalRequests: 100, totalSuccessful: 100, totalFailed: 0 },
        recommendations: [],
      };

      const recs = grader.generateRecommendations(report);
      expect(recs.length).toBe(1);
      expect(recs[0]).toContain('acceptable parameters');
    });
  });
});
