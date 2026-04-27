import { readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import type { LoadTestReport } from '../../types/domain.js';
import type { Grade } from '../../types/domain.js';
import { MarkdownReporter } from '../../reporters/markdown.reporter.js';

const GRADE_ORDER: Grade[] = ['A', 'B', 'C', 'D', 'F'];

function compareGrade(a: Grade, b: Grade): 'improved' | 'regressed' | 'unchanged' {
  if (a === b) return 'unchanged';
  return GRADE_ORDER.indexOf(a) < GRADE_ORDER.indexOf(b) ? 'improved' : 'regressed';
}

export function registerCompareCommand(program: Command): void {
  program
    .command('compare')
    .description('Compare with baseline')
    .requiredOption('--baseline <path>', 'Baseline report path')
    .requiredOption('--current <path>', 'Current report path')
    .option('--format <format>', 'Output format', 'console')
    .option('--output <path>', 'Output file path')
    .action(async (options) => {
      const baseline: LoadTestReport = JSON.parse(readFileSync(options.baseline, 'utf-8'));
      const current: LoadTestReport = JSON.parse(readFileSync(options.current, 'utf-8'));

      const comparison = buildComparison(baseline, current);
      current.baselineComparison = comparison;

      let output: string;
      if (options.format === 'markdown') {
        output = new MarkdownReporter().format(current);
      } else {
        output = JSON.stringify(current, null, 2);
      }

      if (options.output) {
        writeFileSync(options.output, output);
        console.log(`Comparison written to ${options.output}`);
      } else {
        console.log(output);
      }
    });
}

function buildComparison(baseline: LoadTestReport, current: LoadTestReport) {
  const overallBaselineP99 = baseline.toolLatencies.length
    ? Math.max(...baseline.toolLatencies.map((t) => t.latency.p99))
    : 0;
  const overallCurrentP99 = current.toolLatencies.length
    ? Math.max(...current.toolLatencies.map((t) => t.latency.p99))
    : 0;

  const latencyChange =
    overallBaselineP99 > 0
      ? ((overallCurrentP99 - overallBaselineP99) / overallBaselineP99) * 100
      : 0;

  const breakingPointChange =
    baseline.breakingPoint?.concurrencyAtBreak && current.breakingPoint?.concurrencyAtBreak
      ? ((current.breakingPoint.concurrencyAtBreak - baseline.breakingPoint.concurrencyAtBreak) /
          baseline.breakingPoint.concurrencyAtBreak) *
        100
      : 0;

  const errorRateChange =
    baseline.errorSummary.errorRate > 0
      ? ((current.errorSummary.errorRate - baseline.errorSummary.errorRate) /
          baseline.errorSummary.errorRate) *
        100
      : 0;

  const gradeChange = compareGrade(current.grade, baseline.grade);

  const toolLatencyChanges = current.toolLatencies.map((ctl) => {
    const btl = baseline.toolLatencies.find((t) => t.toolName === ctl.toolName);
    const p99ChangePercent = btl
      ? ((ctl.latency.p99 - btl.latency.p99) / (btl.latency.p99 || 1)) * 100
      : 0;

    const toolGradeChange: 'improved' | 'regressed' | 'unchanged' =
      !btl || ctl.latency.p99 === btl.latency.p99
        ? 'unchanged'
        : ctl.latency.p99 < btl.latency.p99
          ? 'improved'
          : 'regressed';

    return {
      toolName: ctl.toolName,
      p99ChangePercent,
      gradeChange: toolGradeChange,
    };
  });

  return {
    baselineId: baseline.id,
    baselineDate: baseline.completedAt,
    gradeChange,
    latencyChangePercent: Math.round(latencyChange * 100) / 100,
    breakingPointChangePercent: Math.round(breakingPointChange * 100) / 100,
    errorRateChangePercent: Math.round(errorRateChange * 100) / 100,
    toolLatencyChanges,
  };
}
