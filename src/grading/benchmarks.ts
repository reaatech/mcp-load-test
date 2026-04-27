import type { Grade } from '../types/domain.js';

export interface LatencyBenchmarks {
  A: { p99: number };
  B: { p99: number };
  C: { p99: number };
  D: { p99: number };
}

export const DEFAULT_LATENCY_BENCHMARKS: LatencyBenchmarks = {
  A: { p99: 500 },
  B: { p99: 1000 },
  C: { p99: 2000 },
  D: { p99: 5000 },
};

export const TOOL_CATEGORY_BENCHMARKS: Record<string, LatencyBenchmarks> = {
  compute: {
    A: { p99: 100 },
    B: { p99: 250 },
    C: { p99: 500 },
    D: { p99: 1000 },
  },
  search: {
    A: { p99: 1000 },
    B: { p99: 2000 },
    C: { p99: 5000 },
    D: { p99: 10000 },
  },
  io: {
    A: { p99: 250 },
    B: { p99: 500 },
    C: { p99: 1000 },
    D: { p99: 2500 },
  },
};

export const CONCURRENCY_BENCHMARKS = {
  A: 100,
  B: 50,
  C: 25,
  D: 10,
};

export const ERROR_RATE_BENCHMARKS = {
  A: 0,
  B: 0.01,
  C: 0.05,
  D: 0.1,
};

function gradeFromValue(value: number, thresholds: Record<Grade, number>): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D'];
  for (const g of grades) {
    if (value <= thresholds[g]) return g;
  }
  return 'F';
}

function gradeFromValueHigherIsBetter(value: number, thresholds: Record<Grade, number>): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D'];
  for (const g of grades) {
    if (value >= thresholds[g]) return g;
  }
  return 'F';
}

export function gradeLatency(p99: number, benchmarks?: LatencyBenchmarks): Grade {
  const b = benchmarks || DEFAULT_LATENCY_BENCHMARKS;
  return gradeFromValue(p99, {
    A: b.A.p99,
    B: b.B.p99,
    C: b.C.p99,
    D: b.D.p99,
    F: Infinity,
  });
}

export function gradeConcurrency(maxSustainable: number): Grade {
  return gradeFromValueHigherIsBetter(maxSustainable, {
    A: CONCURRENCY_BENCHMARKS.A,
    B: CONCURRENCY_BENCHMARKS.B,
    C: CONCURRENCY_BENCHMARKS.C,
    D: CONCURRENCY_BENCHMARKS.D,
    F: 0,
  });
}

export function gradeErrorRate(errorRate: number): Grade {
  return gradeFromValue(errorRate, {
    A: ERROR_RATE_BENCHMARKS.A,
    B: ERROR_RATE_BENCHMARKS.B,
    C: ERROR_RATE_BENCHMARKS.C,
    D: ERROR_RATE_BENCHMARKS.D,
    F: Infinity,
  });
}

export function overallGrade(...scores: Grade[]): Grade {
  if (scores.length === 0) return 'F';
  const grades: Grade[] = ['F', 'D', 'C', 'B', 'A'];
  let worstIndex = grades.length - 1; // Start with best grade, then find worst
  for (const g of scores) {
    const idx = grades.indexOf(g);
    if (idx < worstIndex) worstIndex = idx;
  }
  return grades[worstIndex] ?? 'F';
}
