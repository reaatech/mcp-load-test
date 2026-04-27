import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LoadEngine } from '../../src/engine/load-engine.js';
import { createMockMCPServer } from './mock-server.js';
import type { Server } from 'node:http';

describe('LoadEngine Integration', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    const result = await createMockMCPServer();
    server = result.server;
    port = result.port;
  });

  afterAll(() => {
    server.close();
  });

  it('should run a ramp test against mock server', async () => {
    const engine = new LoadEngine({
      endpoint: `http://127.0.0.1:${port}`,
      transport: 'http',
      profile: {
        type: 'ramp',
        minConcurrency: 1,
        maxConcurrency: 3,
        rampDurationMs: 1000,
        holdDurationMs: 500,
      },
      patterns: [
        {
          name: 'explore-then-act',
          weight: 1,
          thinkTimeMs: 50,
          onStepError: 'continue',
          steps: [
            { tool: 'tools/list', args: {} },
            { tool: 'tools/call', args: { name: 'echo', arguments: {} } },
          ],
        },
      ],
      breakingPointDetection: false,
      outputFormat: 'console',
    });

    const report = await engine.run();

    expect(report.id).toBeDefined();
    expect(report.endpoint).toBe(`http://127.0.0.1:${port}`);
    expect(report.durationMs).toBeGreaterThan(0);
    expect(report.throughput.totalRequests).toBeGreaterThan(0);
  });
});
