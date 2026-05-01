import type { LoadTestReport } from '@reaatech/mcp-load-test-core';

export class JsonReporter {
  format(report: LoadTestReport): string {
    return JSON.stringify(report, null, 2);
  }
}
