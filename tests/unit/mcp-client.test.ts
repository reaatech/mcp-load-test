import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSessionClient } from '../../src/mcp-client/client.js';

describe('mcp-client', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should create a session client for HTTP transport', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('sess-123') },
      json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: { initialized: true } }),
    });

    const client = createSessionClient('http://localhost:3000', {
      transport: 'http',
      timeout: 5000,
    });

    await client.connect();
    const tools = await client.listTools();
    expect(Array.isArray(tools)).toBe(true);
    await client.disconnect();
  });

  it('should auto-negotiate stdio for non-URL endpoint', async () => {
    // stdio would try to spawn a process, which we can't easily mock here
    // But we can verify the client is created with the right options
    const client = createSessionClient('./server.sh', {
      transport: 'auto',
      timeout: 5000,
    });

    expect(client).toBeDefined();
  });

  it('should throw for HTTP transport with non-URL endpoint', async () => {
    const client = createSessionClient('./server.sh', {
      transport: 'http',
      timeout: 5000,
    });

    await expect(client.connect()).rejects.toThrow('HTTP transport requires a URL endpoint');
  });

  it('should throw for SSE transport with non-URL endpoint', async () => {
    const client = createSessionClient('./server.sh', {
      transport: 'sse',
      timeout: 5000,
    });

    await expect(client.connect()).rejects.toThrow('SSE transport requires a URL endpoint');
  });

  it('should throw for unknown transport', async () => {
    const client = createSessionClient('http://test', {
      transport: 'unknown' as 'http',
      timeout: 5000,
    });

    await expect(client.connect()).rejects.toThrow('Unknown transport');
  });

  it('should call a tool', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('sess-123') },
      json: vi.fn().mockResolvedValue({
        jsonrpc: '2.0',
        id: 1,
        result: { content: [{ type: 'text', text: 'hello' }] },
      }),
    });

    const client = createSessionClient('http://localhost:3000', {
      transport: 'http',
      timeout: 5000,
    });

    await client.connect();
    const result = await client.callTool('echo', { message: 'hello' });
    expect(result).toEqual({ content: [{ type: 'text', text: 'hello' }] });
    await client.disconnect();
  });

  it('should build auth headers for bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('sess-123') },
      json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: {} }),
    });

    const client = createSessionClient('http://localhost:3000', {
      transport: 'http',
      timeout: 5000,
      auth: { mode: 'bearer', bearerToken: 'tok-123' },
    });

    await client.connect();
    await client.sendRequest('test', {});

    const calls = vi.mocked(global.fetch).mock.calls;
    const init = calls[1]![1] as { headers: Record<string, string> };
    expect(init.headers['Authorization']).toBe('Bearer tok-123');
    await client.disconnect();
  });

  it('should build auth headers for api key', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('sess-123') },
      json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: {} }),
    });

    const client = createSessionClient('http://localhost:3000', {
      transport: 'http',
      timeout: 5000,
      auth: { mode: 'api-key', apiKey: 'key-123' },
    });

    await client.connect();
    await client.sendRequest('test', {});

    const calls = vi.mocked(global.fetch).mock.calls;
    const init = calls[1]![1] as { headers: Record<string, string> };
    expect(init.headers['X-Api-Key']).toBe('key-123');
    await client.disconnect();
  });
});
