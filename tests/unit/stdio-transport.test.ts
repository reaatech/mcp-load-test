import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StdioTransport } from '../../src/mcp-client/transports/stdio.js';

vi.mock('node:child_process', () => {
  const listeners = new Map<string, Array<(data?: unknown) => void>>();
  const onceListeners = new Map<string, Array<(data?: unknown) => void>>();

  const addListener = (event: string, cb: (data?: unknown) => void) => {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event)!.push(cb);
  };

  const mockProc = {
    stdout: {
      on: addListener,
      emit: (event: string, data: unknown) => {
        (listeners.get(event) || []).forEach((cb) => cb(data));
      },
    },
    stderr: {
      on: vi.fn(),
    },
    stdin: {
      write: vi.fn(),
    },
    kill: vi.fn(),
    on: addListener,
    once: (event: string, cb: (data?: unknown) => void) => {
      if (!onceListeners.has(event)) onceListeners.set(event, []);
      onceListeners.get(event)!.push(cb);
    },
    off: (event: string, cb: (data?: unknown) => void) => {
      const arr = listeners.get(event);
      if (!arr) return;
      const idx = arr.indexOf(cb);
      if (idx >= 0) arr.splice(idx, 1);
    },
    emit: (event: string, data?: unknown) => {
      (listeners.get(event) || []).forEach((cb) => cb(data));
      const onces = onceListeners.get(event) || [];
      onceListeners.set(event, []);
      onces.forEach((cb) => cb(data));
    },
  };

  return {
    spawn: vi.fn().mockReturnValue(mockProc),
  };
});

import { spawn } from 'node:child_process';

describe('StdioTransport', () => {
  let transport: StdioTransport;

  function getMockProc(): {
    stdout: { emit: (event: string, data: unknown) => void };
    stdin: { write: ReturnType<typeof vi.fn> };
    kill: ReturnType<typeof vi.fn>;
    emit: (event: string, data?: unknown) => void;
  } {
    return vi.mocked(spawn).mock.results[0]!.value;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    transport = new StdioTransport({ command: 'node', args: ['server.js'], timeout: 100 });
  });

  afterEach(async () => {
    try {
      await transport.disconnect();
    } catch {
      // ignore
    }
  });

  it('should connect when process spawns', async () => {
    const connectPromise = transport.connect();
    getMockProc().emit('spawn');
    await connectPromise;
  });

  it('should reject if process exits immediately', async () => {
    const connectPromise = transport.connect();
    getMockProc().emit('exit', 1);
    await expect(connectPromise).rejects.toThrow('exited immediately');
  });

  it('should send request and receive response', async () => {
    const connectPromise = transport.connect();
    const cp = getMockProc();
    cp.emit('spawn');
    await connectPromise;

    const requestPromise = transport.sendRequest('initialize', { protocolVersion: '2024-11-05' });

    cp.stdout.emit('data', Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { initialized: true } }) + '\n'));

    const result = await requestPromise;
    expect(result).toEqual({ initialized: true });
  });

  it('should handle JSON-RPC error response', async () => {
    const connectPromise = transport.connect();
    const cp = getMockProc();
    cp.emit('spawn');
    await connectPromise;

    const requestPromise = transport.sendRequest('initialize', {});

    cp.stdout.emit('data', Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -1, message: 'Error' } }) + '\n'));

    await expect(requestPromise).rejects.toThrow('Error');
  });

  it('should timeout requests', async () => {
    const connectPromise = transport.connect();
    getMockProc().emit('spawn');
    await connectPromise;

    const requestPromise = transport.sendRequest('initialize', {});
    await expect(requestPromise).rejects.toThrow('timeout');
  });

  it('should throw if not connected', async () => {
    await expect(transport.sendRequest('initialize', {})).rejects.toThrow('Not connected');
  });

  it('should handle process exit after connection', async () => {
    const connectPromise = transport.connect();
    const cp = getMockProc();
    cp.emit('spawn');
    await connectPromise;

    const requestPromise = transport.sendRequest('initialize', {});
    cp.emit('exit', 0);

    await expect(requestPromise).rejects.toThrow('exited unexpectedly');
  });

  it('should reject pending requests on disconnect', async () => {
    const connectPromise = transport.connect();
    const cp = getMockProc();
    cp.emit('spawn');
    await connectPromise;

    const requestPromise = transport.sendRequest('initialize', {});
    await transport.disconnect();

    await expect(requestPromise).rejects.toThrow('disconnected');
  });
});
