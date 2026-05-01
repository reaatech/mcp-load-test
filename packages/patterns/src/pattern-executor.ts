import { measureTimeAsync, sleep } from '@reaatech/mcp-load-test-core';
import { logger } from '@reaatech/mcp-load-test-core';
import type { MCPClient, SessionState, ToolCallPattern } from '@reaatech/mcp-load-test-core';
import type { ErrorCategory, MetricsCollector } from '@reaatech/mcp-load-test-metrics';

export class PatternExecutor {
  constructor(
    private client: MCPClient,
    private metrics: MetricsCollector,
    private sessionState: SessionState,
  ) {}

  async execute(pattern: ToolCallPattern): Promise<void> {
    const resolvedPattern = this.resolvePattern(pattern);

    for (let i = 0; i < resolvedPattern.steps.length; i++) {
      const step = resolvedPattern.steps[i];
      if (!step) continue;

      // Think time before each step (except first)
      if (i > 0 && resolvedPattern.thinkTimeMs > 0) {
        await sleep(resolvedPattern.thinkTimeMs);
      }

      const stepResult = await this.executeStep(step.tool, step.args);

      if (!stepResult.success) {
        if (resolvedPattern.onStepError === 'abort') {
          break;
        }
        // continue to next step
      }
    }
  }

  private async executeStep(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    try {
      const { result, durationMs } = await measureTimeAsync(async () => {
        if (tool === 'tools/list') {
          return this.client.listTools();
        }
        if (tool === 'tools/call' && typeof args.name === 'string') {
          return this.client.callTool(args.name, (args.arguments as Record<string, unknown>) || {});
        }
        // Generic request for other methods
        return this.client.sendRequest(tool, args);
      });

      this.metrics.record({
        sessionId: this.sessionState.id,
        toolName: tool,
        latencyMs: durationMs,
        success: true,
        timestamp: Date.now(),
      });

      // Store result in session context for potential future step resolution
      this.sessionState.context.lastResult = result;
      this.sessionState.requestCount++;
      this.sessionState.lastActiveAt = Date.now();

      return { success: true };
    } catch (error) {
      const errorCategory = this.categorizeError(error);
      this.metrics.record({
        sessionId: this.sessionState.id,
        toolName: tool,
        latencyMs: 0,
        success: false,
        errorCategory,
        timestamp: Date.now(),
      });

      this.sessionState.errorCount++;
      this.sessionState.lastActiveAt = Date.now();

      logger.warn(
        { sessionId: this.sessionState.id, tool, errorCategory, error: String(error) },
        'Pattern step failed',
      );

      return { success: false };
    }
  }

  private categorizeError(error: unknown): ErrorCategory {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('timeout') || msg.includes('TIMEOUT')) return 'TIMEOUT';
    if (msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET') || msg.includes('disconnect')) {
      return 'CONNECTION';
    }
    if (msg.includes('HTTP 429') || msg.includes('HTTP 503')) return 'BACKPRESSURE';
    if (msg.includes('HTTP 5') || msg.includes('Server error')) return 'SERVER';
    if (msg.includes('jsonrpc') || msg.includes('Invalid JSON')) return 'PROTOCOL';
    return 'CLIENT';
  }

  private resolvePattern(pattern: ToolCallPattern): ToolCallPattern {
    const randomString = () => Math.random().toString(36).slice(2, 8);
    const previousMatch = /^\{\{previous(?:\.([^}]+))?\}\}$/;

    const resolveValue = (value: unknown): unknown => {
      if (typeof value !== 'string') return value;
      if (value === '{{random.string}}') return randomString();
      const match = previousMatch.exec(value);
      if (match) {
        const path = match[1];
        const last = this.sessionState.context.lastResult;
        if (!path) return last;
        return getByPath(last, path);
      }
      return value;
    };

    const resolvedSteps = pattern.steps.map((step) => ({
      ...step,
      args: Object.fromEntries(
        Object.entries(step.args).map(([key, value]) => [key, resolveValue(value)]),
      ),
    }));

    return { ...pattern, steps: resolvedSteps };
  }
}

function getByPath(obj: unknown, path: string): unknown {
  const segments = path.split('.').filter((s) => s.length > 0);
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
