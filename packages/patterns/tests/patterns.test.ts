import type { MCPClient, SessionState, ToolCallPattern } from '@reaatech/mcp-load-test-core';
import { MetricsCollector } from '@reaatech/mcp-load-test-metrics';
import {
  BUILT_IN_PATTERNS,
  PatternExecutor,
  resolvePattern,
} from '@reaatech/mcp-load-test-patterns';
import { describe, expect, it, vi } from 'vitest';

describe('patterns', () => {
  describe('BUILT_IN_PATTERNS', () => {
    it('should have explore-then-act pattern', () => {
      const pattern = BUILT_IN_PATTERNS.find((p) => p.name === 'explore-then-act');
      expect(pattern).toBeDefined();
      expect(pattern?.steps.length).toBeGreaterThan(0);
    });

    it('should have read-then-write pattern', () => {
      const pattern = BUILT_IN_PATTERNS.find((p) => p.name === 'read-then-write');
      expect(pattern).toBeDefined();
      expect(pattern?.onStepError).toBe('abort');
    });

    it('should have multi-step-workflow pattern', () => {
      const pattern = BUILT_IN_PATTERNS.find((p) => p.name === 'multi-step-workflow');
      expect(pattern).toBeDefined();
      expect(pattern?.steps.length).toBe(3);
    });
  });

  describe('resolvePattern', () => {
    it('should replace random.tool placeholder', () => {
      const tools = [{ name: 'echo', description: '', inputSchema: {} }];
      const pattern: ToolCallPattern = {
        name: 'test',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'tools/call', args: { name: '{{random.tool}}', arguments: {} } }],
      };

      const resolved = resolvePattern(pattern, tools);
      expect(resolved.steps[0]?.args.name).toBe('echo');
    });
  });

  describe('PatternExecutor', () => {
    it('should execute a simple pattern successfully', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn().mockResolvedValue({ result: 'ok' }),
        callTool: vi.fn().mockResolvedValue({ result: 'ok' }),
        listTools: vi.fn().mockResolvedValue([{ name: 'echo', description: '', inputSchema: {} }]),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);

      const pattern: ToolCallPattern = {
        name: 'simple',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'tools/list', args: {} }],
      };

      await executor.execute(pattern);

      expect(mockClient.listTools).toHaveBeenCalled();
      expect(session.requestCount).toBe(1);

      const summary = metrics.getErrorSummary();
      expect(summary.totalErrors).toBe(0);
    });

    it('should record errors on failure', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn().mockRejectedValue(new Error('Timeout')),
        callTool: vi.fn().mockRejectedValue(new Error('Timeout')),
        listTools: vi.fn().mockRejectedValue(new Error('Timeout')),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);

      const pattern: ToolCallPattern = {
        name: 'failing',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'tools/list', args: {} }],
      };

      await executor.execute(pattern);

      expect(session.errorCount).toBeGreaterThan(0);
      const summary = metrics.getErrorSummary();
      expect(summary.totalErrors).toBeGreaterThan(0);
    });

    it('should abort on step error when configured', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn().mockRejectedValue(new Error('Fail')),
        callTool: vi.fn().mockRejectedValue(new Error('Fail')),
        listTools: vi.fn().mockRejectedValue(new Error('Fail')),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);

      const pattern: ToolCallPattern = {
        name: 'aborting',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'abort',
        steps: [
          { tool: 'tools/list', args: {} },
          { tool: 'tools/call', args: { name: 'echo', arguments: {} } },
        ],
      };

      await executor.execute(pattern);

      // Should only attempt first step then abort
      expect(mockClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockClient.callTool).not.toHaveBeenCalled();
    });

    it('should execute multiple successful steps', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn().mockResolvedValue({ ok: true }),
        callTool: vi.fn().mockResolvedValue({ ok: true }),
        listTools: vi.fn().mockResolvedValue([{ name: 'echo', description: '', inputSchema: {} }]),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);

      const pattern: ToolCallPattern = {
        name: 'multi',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [
          { tool: 'tools/list', args: {} },
          { tool: 'tools/call', args: { name: 'echo', arguments: {} } },
        ],
      };

      await executor.execute(pattern);

      expect(mockClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockClient.callTool).toHaveBeenCalledTimes(1);
      expect(session.requestCount).toBe(2);
    });

    it('should use sendRequest for generic tools', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn().mockResolvedValue({ ok: true }),
        callTool: vi.fn(),
        listTools: vi.fn(),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);

      const pattern: ToolCallPattern = {
        name: 'generic',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'custom/method', args: { foo: 'bar' } }],
      };

      await executor.execute(pattern);

      expect(mockClient.sendRequest).toHaveBeenCalledWith('custom/method', { foo: 'bar' });
    });

    it('should categorize timeout errors', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn(),
        callTool: vi.fn(),
        listTools: vi.fn().mockRejectedValue(new Error('Request timeout')),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);
      await executor.execute({
        name: 'fail',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'tools/list', args: {} }],
      });

      const summary = metrics.getErrorSummary();
      expect(summary.byCategory.TIMEOUT).toBeGreaterThan(0);
    });

    it('should categorize connection errors', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn(),
        callTool: vi.fn(),
        listTools: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);
      await executor.execute({
        name: 'fail',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'tools/list', args: {} }],
      });

      const summary = metrics.getErrorSummary();
      expect(summary.byCategory.CONNECTION).toBeGreaterThan(0);
    });

    it('should categorize backpressure errors', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn(),
        callTool: vi.fn(),
        listTools: vi.fn().mockRejectedValue(new Error('HTTP 429')),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);
      await executor.execute({
        name: 'fail',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'tools/list', args: {} }],
      });

      const summary = metrics.getErrorSummary();
      expect(summary.byCategory.BACKPRESSURE).toBeGreaterThan(0);
    });

    it('should categorize server errors', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn(),
        callTool: vi.fn(),
        listTools: vi.fn().mockRejectedValue(new Error('HTTP 500')),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);
      await executor.execute({
        name: 'fail',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'tools/list', args: {} }],
      });

      const summary = metrics.getErrorSummary();
      expect(summary.byCategory.SERVER).toBeGreaterThan(0);
    });

    it('should categorize protocol errors', async () => {
      const mockClient: MCPClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendRequest: vi.fn(),
        callTool: vi.fn(),
        listTools: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      };

      const metrics = new MetricsCollector();
      metrics.start();

      const session: SessionState = {
        id: 'sess-1',
        client: mockClient,
        context: {},
        currentPatternIndex: 0,
        currentStepIndex: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        status: 'active',
      };

      const executor = new PatternExecutor(mockClient, metrics, session);
      await executor.execute({
        name: 'fail',
        weight: 1,
        thinkTimeMs: 0,
        onStepError: 'continue',
        steps: [{ tool: 'tools/list', args: {} }],
      });

      const summary = metrics.getErrorSummary();
      expect(summary.byCategory.PROTOCOL).toBeGreaterThan(0);
    });
  });
});
