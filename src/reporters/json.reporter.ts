import type { LoadTestReport } from '../types/domain.js';

export class JsonReporter {
  format(report: LoadTestReport): string {
    return JSON.stringify(report, null, 2);
  }
}
