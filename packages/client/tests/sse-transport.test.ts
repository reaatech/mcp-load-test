import { SSETransport } from '@reaatech/mcp-load-test-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('eventsource', () => {
  class MockEventSource {
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private listeners = new Map<string, Array<(event: Event) => void>>();
    url: string;
    options: unknown;

    constructor(url: string, options?: unknown) {
      this.url = url;
      this.options = options;
      setTimeout(() => {
        if (this.onopen) this.onopen();
      }, 10);
    }

    addEventListener(event: string, handler: (event: Event) => void) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)?.push(handler);
    }

    close() {
      // noop
    }

    emit(event: string, data: unknown) {
      const handlers = this.listeners.get(event) || [];
      const msgEvent = {
        data: typeof data === 'string' ? data : JSON.stringify(data),
      } as MessageEvent;
      for (const handler of handlers) {
        handler(msgEvent as unknown as Event);
      }
    }
  }

  return { EventSource: MockEventSource };
});

describe('SSETransport', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should connect via EventSource', async () => {
    const transport = new SSETransport({ url: 'http://test/sse', timeout: 5000 });
    await transport.connect();
    await transport.disconnect();
  });

  it('should send request after endpoint is established', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(''),
    });

    const transport = new SSETransport({ url: 'http://test/sse', timeout: 5000 });
    await transport.connect();

    // biome-ignore lint/suspicious/noExplicitAny: accessing private eventSource in test
    const es = (transport as any).eventSource;
    es.emit('endpoint', { endpoint: 'http://test/post' });

    const promise = transport.sendRequest('initialize', {});

    setTimeout(() => {
      es.emit('message', { id: 1, result: { initialized: true } });
    }, 20);

    const result = await promise;
    expect(result).toEqual({ initialized: true });
    await transport.disconnect();
  });

  it('should fallback to endpoint URL when no endpoint event received', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));
    const transport = new SSETransport({ url: 'http://test/sse', timeout: 5000 });
    await transport.connect();
    await expect(transport.sendRequest('initialize', {})).rejects.toThrow('fetch failed');
    await transport.disconnect();
  });

  it('should handle timeout', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(''),
    });

    const transport = new SSETransport({ url: 'http://test/sse', timeout: 50 });
    await transport.connect();

    // biome-ignore lint/suspicious/noExplicitAny: accessing private eventSource in test
    const es = (transport as any).eventSource;
    es.emit('endpoint', { endpoint: 'http://test/post' });

    await expect(transport.sendRequest('initialize', {})).rejects.toThrow('timeout');
    await transport.disconnect();
  });

  it('should reject pending requests on disconnect', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(''),
    });

    const transport = new SSETransport({ url: 'http://test/sse', timeout: 5000 });
    await transport.connect();

    // biome-ignore lint/suspicious/noExplicitAny: accessing private eventSource in test
    const es = (transport as any).eventSource;
    es.emit('endpoint', { endpoint: 'http://test/post' });

    const promise = transport.sendRequest('initialize', {});
    await transport.disconnect();

    await expect(promise).rejects.toThrow('disconnected');
  });
});
