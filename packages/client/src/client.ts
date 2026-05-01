import { isPrivateURL, isValidURL } from '@reaatech/mcp-load-test-core';
import { getProgramVersion } from '@reaatech/mcp-load-test-core';
import { logger } from '@reaatech/mcp-load-test-core';
import type {
  AuthOptions,
  MCPClient,
  ToolDefinition,
  TransportType,
} from '@reaatech/mcp-load-test-core';
import { SSETransport, StdioTransport, StreamableHTTPTransport } from './transports/index.js';

const warnedPrivateEndpoints = new Set<string>();

export interface SessionClientOptions {
  transport: TransportType;
  timeout: number;
  auth?: AuthOptions;
}

export function createSessionClient(endpoint: string, options: SessionClientOptions): MCPClient {
  return new SessionMCPClient(endpoint, options);
}

class SessionMCPClient implements MCPClient {
  private transport: StdioTransport | SSETransport | StreamableHTTPTransport | null = null;
  private serverInfo: Record<string, unknown> = {};

  constructor(
    private endpoint: string,
    private options: SessionClientOptions,
  ) {}

  async connect(): Promise<void> {
    if (isPrivateURL(this.endpoint) && !warnedPrivateEndpoints.has(this.endpoint)) {
      warnedPrivateEndpoints.add(this.endpoint);
      logger.warn({ endpoint: this.endpoint }, 'Connecting to a private/internal endpoint');
    }

    let transport = await this.negotiateTransport();

    try {
      await transport.connect();
    } catch (connectError) {
      if (this.options.transport === 'auto' && transport instanceof StreamableHTTPTransport) {
        logger.warn(
          {
            endpoint: this.endpoint,
            error: connectError instanceof Error ? connectError.message : String(connectError),
          },
          'HTTP transport failed, falling back to SSE',
        );
        transport = new SSETransport({
          url: this.endpoint,
          timeout: this.options.timeout,
          headers: this.buildHeaders(),
        });
        await transport.connect();
      } else {
        throw connectError;
      }
    }

    this.transport = transport;

    const initResult = await transport.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-load-test', version: getProgramVersion() },
    });
    const initRecord = initResult as Record<string, unknown>;
    this.serverInfo = (initRecord.serverInfo as Record<string, unknown>) || initRecord;

    try {
      await transport.sendNotification('notifications/initialized', {});
    } catch {
      // Notifications are best-effort
    }
  }

  private async negotiateTransport(): Promise<
    StdioTransport | SSETransport | StreamableHTTPTransport
  > {
    const requested = this.options.transport;
    const isUrl = isValidURL(this.endpoint);

    if (requested === 'stdio') {
      return new StdioTransport({
        command: this.endpoint,
        args: [],
        timeout: this.options.timeout,
        env: this.buildStdioEnv(),
      });
    }

    if (requested === 'http') {
      if (!isUrl) {
        throw new Error('HTTP transport requires a URL endpoint');
      }
      return new StreamableHTTPTransport({
        url: this.endpoint,
        timeout: this.options.timeout,
        headers: this.buildHeaders(),
      });
    }

    if (requested === 'sse') {
      if (!isUrl) {
        throw new Error('SSE transport requires a URL endpoint');
      }
      return new SSETransport({
        url: this.endpoint,
        timeout: this.options.timeout,
        headers: this.buildHeaders(),
      });
    }

    if (requested === 'auto') {
      if (!isUrl) {
        return new StdioTransport({
          command: this.endpoint,
          args: [],
          timeout: this.options.timeout,
          env: this.buildStdioEnv(),
        });
      }
      return new StreamableHTTPTransport({
        url: this.endpoint,
        timeout: this.options.timeout,
        headers: this.buildHeaders(),
      });
    }

    throw new Error(`Unknown transport: ${requested}`);
  }

  private buildStdioEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    if (!this.options.auth) return env;
    switch (this.options.auth.mode) {
      case 'api-key':
        if (this.options.auth.apiKey) {
          env.MCP_API_KEY = this.options.auth.apiKey;
        }
        break;
      case 'bearer':
        if (this.options.auth.bearerToken) {
          env.MCP_BEARER_TOKEN = this.options.auth.bearerToken;
        }
        break;
      case 'oauth':
        if (this.options.auth.oauthClientId) {
          env.MCP_OAUTH_CLIENT_ID = this.options.auth.oauthClientId;
        }
        if (this.options.auth.oauthClientSecret) {
          env.MCP_OAUTH_CLIENT_SECRET = this.options.auth.oauthClientSecret;
        }
        break;
    }
    return env;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!this.options.auth) return headers;

    switch (this.options.auth.mode) {
      case 'api-key':
        if (this.options.auth.apiKey) {
          headers['X-Api-Key'] = this.options.auth.apiKey;
        }
        break;
      case 'bearer':
        if (this.options.auth.bearerToken) {
          headers.Authorization = `Bearer ${this.options.auth.bearerToken}`;
        }
        break;
      case 'oauth':
        if (this.options.auth.oauthClientId && this.options.auth.oauthClientSecret) {
          headers.Authorization = `Basic ${Buffer.from(`${this.options.auth.oauthClientId}:${this.options.auth.oauthClientSecret}`).toString('base64')}`;
        } else if (this.options.auth.bearerToken) {
          headers.Authorization = `Bearer ${this.options.auth.bearerToken}`;
        }
        break;
    }

    return headers;
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
      this.transport = null;
    }
  }

  async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.transport) {
      throw new Error('Not connected');
    }
    return this.transport.sendRequest(method, params);
  }

  async listTools(): Promise<ToolDefinition[]> {
    const result = await this.sendRequest('tools/list');
    const toolsArray = (result as { tools?: Array<Record<string, unknown>> })?.tools || [];
    return toolsArray.map((t) => ({
      name: t.name as string,
      description: (t.description as string) || '',
      inputSchema: (t.inputSchema as Record<string, unknown>) || {},
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.sendRequest('tools/call', { name, arguments: args });
  }

  getServerInfo(): Record<string, unknown> {
    return { ...this.serverInfo };
  }
}
