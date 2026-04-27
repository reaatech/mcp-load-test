import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  StreamableHTTPTransport,
  TransportError,
} from '../../src/mcp-client/transports/index.js';

describe('transports', () => {
  describe('StreamableHTTPTransport', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should send initialize request and capture session id', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn().mockReturnValue('sess-123') },
        json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: { initialized: true } }),
      });

      const transport = new StreamableHTTPTransport({ url: 'http://test', timeout: 5000 });
      await transport.connect();

      const result = await transport.sendRequest('initialize', { protocolVersion: '2024-11-05' });
      expect(result).toEqual({ initialized: true });
      expect(transport.getSessionId()).toBe('sess-123');
    });

    it('should include mcp-session-id header on subsequent requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn().mockReturnValue('sess-123') },
        json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: {} }),
      });

      const transport = new StreamableHTTPTransport({ url: 'http://test', timeout: 5000 });
      await transport.connect();
      await transport.sendRequest('initialize', {});
      await transport.sendRequest('tools/list', {});

      const calls = vi.mocked(global.fetch).mock.calls;
      const toolsCall = calls[2];
      expect(toolsCall).toBeDefined();
      const headers = toolsCall![1]?.headers as Record<string, string>;
      expect(headers['mcp-session-id']).toBe('sess-123');
    });

    it('should throw on HTTP error', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ok: true, status: 200 } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response);
      });

      const transport = new StreamableHTTPTransport({ url: 'http://test', timeout: 5000 });
      await transport.connect();
      await expect(transport.sendRequest('initialize', {})).rejects.toThrow('HTTP 500');
    });

    it('should throw TransportError on JSON-RPC error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn() },
        json: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32600, message: 'Invalid Request' },
        }),
      });

      const transport = new StreamableHTTPTransport({ url: 'http://test', timeout: 5000 });
      await transport.connect();
      await expect(transport.sendRequest('initialize', {})).rejects.toThrow(TransportError);
    });

    it('should send DELETE on disconnect', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn().mockReturnValue('sess-123') },
        json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: {} }),
      });

      const transport = new StreamableHTTPTransport({ url: 'http://test', timeout: 5000 });
      await transport.connect();
      await transport.sendRequest('initialize', {});
      await transport.disconnect();

      const calls = vi.mocked(global.fetch).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall![1]?.method).toBe('DELETE');
    });

    it('should throw if sending non-initialize before connect', async () => {
      const transport = new StreamableHTTPTransport({ url: 'http://test', timeout: 5000 });
      await expect(transport.sendRequest('tools/list', {})).rejects.toThrow('Not connected');
    });
  });

  describe('TransportError', () => {
    it('should store code and data', () => {
      const err = new TransportError('message', -1, { detail: 'test' });
      expect(err.code).toBe(-1);
      expect(err.data).toEqual({ detail: 'test' });
      expect(err.message).toBe('message');
    });
  });
});
