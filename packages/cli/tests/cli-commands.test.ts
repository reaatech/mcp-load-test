import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCompareCommand } from '../src/commands/compare.command.js';
import { registerLoadCommand } from '../src/commands/load.command.js';
import { createMockMCPServer } from './mock-server.js';

describe('CLI commands', () => {
  describe('registerLoadCommand', () => {
    let server: Server;
    let port: number;

    beforeEach(async () => {
      const result = await createMockMCPServer();
      server = result.server;
      port = result.port;
    });

    afterEach(() => {
      server.close();
    });

    it('should execute load command with options', async () => {
      const program = new Command();
      registerLoadCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const loadCmd = program.commands.find((c) => c.name() === 'load');
      expect(loadCmd).toBeDefined();

      await program.parseAsync([
        'node',
        'test',
        'load',
        '--endpoint',
        `http://127.0.0.1:${port}`,
        '--transport',
        'http',
        '--profile',
        'ramp',
        '--max-concurrency',
        '2',
        '--duration',
        '1',
        '--format',
        'json',
      ]);

      // Should have logged something (report output)
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0]?.[0] as string;
      expect(JSON.parse(output)).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should write report to file when --output is provided', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'mcp-load-test-'));
      const outputPath = join(tempDir, 'report.md');

      const program = new Command();
      registerLoadCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await program.parseAsync([
        'node',
        'test',
        'load',
        '--endpoint',
        `http://127.0.0.1:${port}`,
        '--transport',
        'http',
        '--max-concurrency',
        '1',
        '--duration',
        '1',
        '--format',
        'markdown',
        '--output',
        outputPath,
      ]);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Report written to'));

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
      rmSync(tempDir, { recursive: true });
    });

    it('should output console format by default', async () => {
      const program = new Command();
      registerLoadCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await program.parseAsync([
        'node',
        'test',
        'load',
        '--endpoint',
        `http://127.0.0.1:${port}`,
        '--transport',
        'http',
        '--max-concurrency',
        '1',
        '--duration',
        '1',
      ]);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Load Test Report');

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should execute load command with soak profile', async () => {
      const program = new Command();
      registerLoadCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await program.parseAsync([
        'node',
        'test',
        'load',
        '--endpoint',
        `http://127.0.0.1:${port}`,
        '--transport',
        'http',
        '--profile',
        'soak',
        '--max-concurrency',
        '1',
        '--duration',
        '1',
        '--format',
        'json',
      ]);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should execute load command with spike profile', async () => {
      const program = new Command();
      registerLoadCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await program.parseAsync([
        'node',
        'test',
        'load',
        '--endpoint',
        `http://127.0.0.1:${port}`,
        '--transport',
        'http',
        '--profile',
        'spike',
        '--max-concurrency',
        '2',
        '--duration',
        '1',
        '--format',
        'json',
      ]);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('registerCompareCommand', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'mcp-load-test-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true });
    });

    it('should compare two reports', async () => {
      const baselinePath = join(tempDir, 'baseline.json');
      const currentPath = join(tempDir, 'current.json');

      const baseline = {
        id: 'base',
        endpoint: 'http://test',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:01:00Z',
        durationMs: 60000,
        grade: 'B',
        breakingPoint: null,
        toolLatencies: [
          {
            toolName: 'echo',
            latency: {
              p50: 10,
              p90: 20,
              p95: 25,
              p99: 30,
              min: 5,
              max: 40,
              mean: 15,
              samples: 100,
            },
          },
        ],
        errorSummary: {
          totalErrors: 0,
          totalRequests: 100,
          errorRate: 0,
          byCategory: {},
          byTool: {},
        },
        throughput: {
          averageRps: 10,
          peakRps: 15,
          totalRequests: 100,
          totalSuccessful: 100,
          totalFailed: 0,
        },
        recommendations: [],
      };

      const current = {
        ...baseline,
        id: 'curr',
        grade: 'A',
        toolLatencies: [
          {
            toolName: 'echo',
            latency: { p50: 5, p90: 10, p95: 12, p99: 15, min: 2, max: 20, mean: 8, samples: 100 },
          },
        ],
      };

      writeFileSync(baselinePath, JSON.stringify(baseline));
      writeFileSync(currentPath, JSON.stringify(current));

      const program = new Command();
      registerCompareCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await program.parseAsync([
        'node',
        'test',
        'compare',
        '--baseline',
        baselinePath,
        '--current',
        currentPath,
        '--format',
        'json',
      ]);

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.baselineComparison).toBeDefined();
      expect(parsed.baselineComparison.gradeChange).toBe('improved');

      consoleSpy.mockRestore();
    });

    it('should report unchanged grade', async () => {
      const baselinePath = join(tempDir, 'baseline.json');
      const currentPath = join(tempDir, 'current.json');

      const baseline = {
        id: 'base',
        endpoint: 'http://test',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:01:00Z',
        durationMs: 60000,
        grade: 'B',
        breakingPoint: null,
        toolLatencies: [
          {
            toolName: 'echo',
            latency: {
              p50: 10,
              p90: 20,
              p95: 25,
              p99: 30,
              min: 5,
              max: 40,
              mean: 15,
              samples: 100,
            },
          },
        ],
        errorSummary: {
          totalErrors: 0,
          totalRequests: 100,
          errorRate: 0,
          byCategory: {},
          byTool: {},
        },
        throughput: {
          averageRps: 10,
          peakRps: 15,
          totalRequests: 100,
          totalSuccessful: 100,
          totalFailed: 0,
        },
        recommendations: [],
      };

      writeFileSync(baselinePath, JSON.stringify(baseline));
      writeFileSync(currentPath, JSON.stringify(baseline));

      const program = new Command();
      registerCompareCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await program.parseAsync([
        'node',
        'test',
        'compare',
        '--baseline',
        baselinePath,
        '--current',
        currentPath,
      ]);

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.baselineComparison.gradeChange).toBe('unchanged');

      consoleSpy.mockRestore();
    });

    it('should report regressed grade', async () => {
      const baselinePath = join(tempDir, 'baseline.json');
      const currentPath = join(tempDir, 'current.json');

      const baseline = {
        id: 'base',
        endpoint: 'http://test',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:01:00Z',
        durationMs: 60000,
        grade: 'A',
        breakingPoint: null,
        toolLatencies: [
          {
            toolName: 'echo',
            latency: {
              p50: 10,
              p90: 20,
              p95: 25,
              p99: 30,
              min: 5,
              max: 40,
              mean: 15,
              samples: 100,
            },
          },
        ],
        errorSummary: {
          totalErrors: 0,
          totalRequests: 100,
          errorRate: 0,
          byCategory: {},
          byTool: {},
        },
        throughput: {
          averageRps: 10,
          peakRps: 15,
          totalRequests: 100,
          totalSuccessful: 100,
          totalFailed: 0,
        },
        recommendations: [],
      };

      const current = {
        ...baseline,
        id: 'curr',
        grade: 'C',
      };

      writeFileSync(baselinePath, JSON.stringify(baseline));
      writeFileSync(currentPath, JSON.stringify(current));

      const program = new Command();
      registerCompareCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await program.parseAsync([
        'node',
        'test',
        'compare',
        '--baseline',
        baselinePath,
        '--current',
        currentPath,
      ]);

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.baselineComparison.gradeChange).toBe('regressed');

      consoleSpy.mockRestore();
    });

    it('should handle tools missing in baseline', async () => {
      const baselinePath = join(tempDir, 'baseline.json');
      const currentPath = join(tempDir, 'current.json');

      const baseline = {
        id: 'base',
        endpoint: 'http://test',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:01:00Z',
        durationMs: 60000,
        grade: 'B',
        breakingPoint: null,
        toolLatencies: [
          {
            toolName: 'echo',
            latency: {
              p50: 10,
              p90: 20,
              p95: 25,
              p99: 30,
              min: 5,
              max: 40,
              mean: 15,
              samples: 100,
            },
          },
        ],
        errorSummary: {
          totalErrors: 0,
          totalRequests: 100,
          errorRate: 0,
          byCategory: {},
          byTool: {},
        },
        throughput: {
          averageRps: 10,
          peakRps: 15,
          totalRequests: 100,
          totalSuccessful: 100,
          totalFailed: 0,
        },
        recommendations: [],
      };

      const current = {
        ...baseline,
        id: 'curr',
        toolLatencies: [
          {
            toolName: 'echo',
            latency: {
              p50: 10,
              p90: 20,
              p95: 25,
              p99: 30,
              min: 5,
              max: 40,
              mean: 15,
              samples: 100,
            },
          },
          {
            toolName: 'new-tool',
            latency: { p50: 5, p90: 10, p95: 12, p99: 15, min: 2, max: 20, mean: 8, samples: 100 },
          },
        ],
      };

      writeFileSync(baselinePath, JSON.stringify(baseline));
      writeFileSync(currentPath, JSON.stringify(current));

      const program = new Command();
      registerCompareCommand(program);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await program.parseAsync([
        'node',
        'test',
        'compare',
        '--baseline',
        baselinePath,
        '--current',
        currentPath,
      ]);

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output);
      const newTool = parsed.baselineComparison.toolLatencyChanges.find(
        (t: { toolName: string }) => t.toolName === 'new-tool',
      );
      expect(newTool.p99ChangePercent).toBe(0);
      expect(newTool.gradeChange).toBe('unchanged');

      consoleSpy.mockRestore();
    });
  });
});
