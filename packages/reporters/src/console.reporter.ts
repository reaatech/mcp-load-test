import type { LoadTestReport } from '@reaatech/mcp-load-test-core';
import chalk from 'chalk';

export class ConsoleReporter {
  format(report: LoadTestReport): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\nLoad Test Report'));
    lines.push(chalk.gray(`ID: ${report.id}`));
    lines.push(`Endpoint: ${report.endpoint}`);
    lines.push(`Duration: ${this.formatDuration(report.durationMs)}`);
    lines.push('');

    // Grade
    const gradeColor = this.gradeColor(report.grade);
    lines.push(`Grade: ${gradeColor(report.grade)}`);
    lines.push('');

    // Breaking point
    if (report.breakingPoint?.detected) {
      lines.push(chalk.yellow('! Breaking Point Detected'));
      lines.push(`  Concurrency: ${report.breakingPoint.concurrencyAtBreak}`);
      lines.push(
        `  Error Rate: ${((report.breakingPoint.errorRateAtBreak || 0) * 100).toFixed(1)}%`,
      );
      lines.push(`  P99 Latency: ${report.breakingPoint.latencyP99AtBreak?.toFixed(0)}ms`);
      if (report.breakingPoint.recoveryTimeMs) {
        lines.push(`  Recovery Time: ${this.formatDuration(report.breakingPoint.recoveryTimeMs)}`);
      }
      lines.push('');
    }

    // Latency table
    lines.push(chalk.bold('Latency by Tool'));
    lines.push(
      `${chalk.gray('Tool'.padEnd(20))} ${chalk.gray('p50'.padStart(8))} ${chalk.gray('p90'.padStart(8))} ${chalk.gray('p99'.padStart(8))} ${chalk.gray('Samples'.padStart(10))}`,
    );
    for (const tl of report.toolLatencies) {
      lines.push(
        `${tl.toolName.padEnd(20)} ${this.formatMs(tl.latency.p50).padStart(8)} ${this.formatMs(tl.latency.p90).padStart(8)} ${this.formatMs(tl.latency.p99).padStart(8)} ${String(tl.latency.samples).padStart(10)}`,
      );
    }
    lines.push('');

    // Throughput
    lines.push(chalk.bold('Throughput'));
    lines.push(`  Total Requests: ${report.throughput.totalRequests.toLocaleString()}`);
    lines.push(`  Successful: ${report.throughput.totalSuccessful.toLocaleString()}`);
    lines.push(`  Failed: ${report.throughput.totalFailed.toLocaleString()}`);
    lines.push(`  Average RPS: ${report.throughput.averageRps.toFixed(1)}`);
    lines.push(`  Peak RPS: ${report.throughput.peakRps.toFixed(1)}`);
    lines.push('');

    // Errors
    if (report.errorSummary.totalErrors > 0) {
      lines.push(chalk.bold('Errors'));
      lines.push(
        `  Total: ${report.errorSummary.totalErrors} (${(report.errorSummary.errorRate * 100).toFixed(2)}%)`,
      );
      for (const [category, count] of Object.entries(report.errorSummary.byCategory)) {
        lines.push(`  ${category}: ${count}`);
      }
      lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push(chalk.bold('Recommendations'));
      for (const rec of report.recommendations) {
        lines.push(`  • ${rec}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  private formatMs(ms: number): string {
    return `${ms.toFixed(0)}ms`;
  }

  private gradeColor(grade: string): (text: string) => string {
    switch (grade) {
      case 'A':
        return chalk.green.bold;
      case 'B':
        return chalk.green;
      case 'C':
        return chalk.yellow;
      case 'D':
        return chalk.red;
      case 'F':
        return chalk.red.bold;
      default:
        return chalk.white;
    }
  }
}
