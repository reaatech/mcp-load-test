import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { Command } from 'commander';
import { registerRampCommand } from '../../src/cli/commands/ramp.command.js';
import { registerSoakCommand } from '../../src/cli/commands/soak.command.js';
import { registerSpikeCommand } from '../../src/cli/commands/spike.command.js';
import { registerLoadCommand } from '../../src/cli/commands/load.command.js';
import { createMockMCPServer } from '../integration/mock-server.js';
import type { Server } from 'node:http';

describe('CLI shortcut commands', () => {
  let server: Server;
  let port: number;
  let exitSpy: MockInstance<(code?: string | number | null | undefined) => never>;

  beforeEach(async () => {
    const result = await createMockMCPServer();
    server = result.server;
    port = result.port;
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    server.close();
    exitSpy.mockRestore();
  });

  it('should execute ramp command', async () => {
    const program = new Command();
    registerLoadCommand(program);
    registerRampCommand(program);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync([
      'node',
      'test',
      'ramp',
      '--endpoint',
      `http://127.0.0.1:${port}`,
      '--transport',
      'http',
      '--max-concurrency',
      '2',
      '--duration',
      '1',
      '--format',
      'json',
    ]);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should execute soak command', async () => {
    const program = new Command();
    registerLoadCommand(program);
    registerSoakCommand(program);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync([
      'node',
      'test',
      'soak',
      '--endpoint',
      `http://127.0.0.1:${port}`,
      '--transport',
      'http',
      '--concurrency',
      '2',
      '--duration',
      '1',
      '--format',
      'json',
    ]);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should execute spike command', async () => {
    const program = new Command();
    registerLoadCommand(program);
    registerSpikeCommand(program);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync([
      'node',
      'test',
      'spike',
      '--endpoint',
      `http://127.0.0.1:${port}`,
      '--transport',
      'http',
      '--baseline',
      '1',
      '--spike',
      '2',
      '--duration',
      '1',
      '--format',
      'json',
    ]);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
