import { createSessionClient } from '@reaatech/mcp-load-test-client';
import { generateUUID } from '@reaatech/mcp-load-test-core';
import { logger } from '@reaatech/mcp-load-test-core';
import type {
  AuthOptions,
  SessionState,
  ToolCallPattern,
  TransportType,
} from '@reaatech/mcp-load-test-core';
import type { MetricsCollector } from '@reaatech/mcp-load-test-metrics';
import { PatternExecutor } from '@reaatech/mcp-load-test-patterns';

export interface SessionManagerOptions {
  endpoint: string;
  transport: TransportType;
  timeout: number;
  auth?: AuthOptions;
  patterns: ToolCallPattern[];
  metrics: MetricsCollector;
}

export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private abortControllers = new Map<string, AbortController>();
  private running = false;

  constructor(private options: SessionManagerOptions) {}

  async createPool(targetConcurrency: number): Promise<void> {
    const currentCount = this.sessions.size;
    const diff = targetConcurrency - currentCount;

    if (diff > 0) {
      // Add sessions. Individual failures are logged but don't abort the
      // pool expansion — a server refusing connections at high load is
      // itself a measurement signal, not a test-killing error.
      const results = await Promise.allSettled(
        Array.from({ length: diff }, () => this.createSession()),
      );
      for (const r of results) {
        if (r.status === 'rejected') {
          logger.warn({ error: String(r.reason) }, 'Session creation failed');
        }
      }
    } else if (diff < 0) {
      // Remove sessions
      const toRemove = Array.from(this.sessions.values()).slice(0, Math.abs(diff));
      for (const session of toRemove) {
        await this.destroySession(session.id);
      }
    }
  }

  private async createSession(): Promise<void> {
    const id = generateUUID();
    const client = createSessionClient(this.options.endpoint, {
      transport: this.options.transport,
      timeout: this.options.timeout,
      auth: this.options.auth,
    });

    try {
      await client.connect();
    } catch (error) {
      logger.error({ sessionId: id, error: String(error) }, 'Failed to create session');
      throw error;
    }

    const session: SessionState = {
      id,
      client,
      context: {},
      currentPatternIndex: 0,
      currentStepIndex: 0,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      requestCount: 0,
      errorCount: 0,
      status: 'warming_up',
    };

    this.sessions.set(id, session);
    this.abortControllers.set(id, new AbortController());

    // Start the session's pattern loop
    this.runSessionLoop(session);
  }

  private async destroySession(id: string): Promise<void> {
    const abortController = this.abortControllers.get(id);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(id);
    }

    const session = this.sessions.get(id);
    if (session) {
      this.sessions.delete(id);
      try {
        await session.client.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  }

  private async runSessionLoop(session: SessionState): Promise<void> {
    const abortController = this.abortControllers.get(session.id);
    if (!abortController) return;

    const executor = new PatternExecutor(session.client, this.options.metrics, session);

    // Weighted random pattern selection
    const totalWeight = this.options.patterns.reduce((sum, p) => sum + p.weight, 0);

    while (this.running && !abortController.signal.aborted) {
      // Pick pattern by weight
      let random = Math.random() * totalWeight;
      let selectedPattern = this.options.patterns[0];
      for (const pattern of this.options.patterns) {
        random -= pattern.weight;
        if (random <= 0) {
          selectedPattern = pattern;
          break;
        }
      }

      if (!selectedPattern) continue;

      try {
        await executor.execute(selectedPattern);
      } catch (error) {
        logger.warn({ sessionId: session.id, error: String(error) }, 'Session loop error');
        session.status = 'error';
        if (!this.running || abortController.signal.aborted) break;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 1000);
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
    }
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
    const ids = Array.from(this.sessions.keys());
    await Promise.all(ids.map((id) => this.destroySession(id)));
  }

  getActiveSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  setSessionStatus(status: SessionState['status']): void {
    for (const session of this.sessions.values()) {
      session.status = status;
    }
  }
}
