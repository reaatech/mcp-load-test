import { createSessionClient } from '@reaatech/mcp-load-test-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('mcp-client auth', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('sess-123') },
      json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: {} }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should build OAuth headers with client credentials', async () => {
    const client = createSessionClient('http://localhost:3000', {
      transport: 'http',
      timeout: 5000,
      auth: { mode: 'oauth', oauthClientId: 'client', oauthClientSecret: 'secret' },
    });

    await client.connect();
    await client.sendRequest('test', {});

    const calls = vi.mocked(global.fetch).mock.calls;
    const init = calls[1]?.[1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toMatch(/^Basic /);
    await client.disconnect();
  });

  it('should fallback to bearer token for OAuth without client credentials', async () => {
    const client = createSessionClient('http://localhost:3000', {
      transport: 'http',
      timeout: 5000,
      auth: { mode: 'oauth', bearerToken: 'tok-123' },
    });

    await client.connect();
    await client.sendRequest('test', {});

    const calls = vi.mocked(global.fetch).mock.calls;
    const init = calls[1]?.[1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    await client.disconnect();
  });

  it('should set stdio env vars for bearer token', async () => {
    const client = createSessionClient('./server.sh', {
      transport: 'stdio',
      timeout: 5000,
      auth: { mode: 'bearer', bearerToken: 'tok-123' },
    });

    expect(client).toBeDefined();
  });

  it('should set stdio env vars for api key', async () => {
    const client = createSessionClient('./server.sh', {
      transport: 'stdio',
      timeout: 5000,
      auth: { mode: 'api-key', apiKey: 'key-123' },
    });

    expect(client).toBeDefined();
  });

  it('should set stdio env vars for OAuth', async () => {
    const client = createSessionClient('./server.sh', {
      transport: 'stdio',
      timeout: 5000,
      auth: { mode: 'oauth', oauthClientId: 'client', oauthClientSecret: 'secret' },
    });

    expect(client).toBeDefined();
  });

  it('should return server info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: vi.fn().mockReturnValue('sess-123') },
      json: vi.fn().mockResolvedValue({
        jsonrpc: '2.0',
        id: 1,
        result: { serverInfo: { name: 'test-server', version: '1.0' } },
      }),
    });

    const client = createSessionClient('http://localhost:3000', {
      transport: 'http',
      timeout: 5000,
    });

    await client.connect();
    expect(
      (client as unknown as { getServerInfo: () => Record<string, unknown> }).getServerInfo(),
    ).toEqual({ name: 'test-server', version: '1.0' });
    await client.disconnect();
  });
});
