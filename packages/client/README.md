# @reaatech/mcp-load-test-client

[![npm version](https://img.shields.io/npm/v/@reaatech/mcp-load-test-client.svg)](https://www.npmjs.com/package/@reaatech/mcp-load-test-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/mcp-load-test/ci.yml?branch=main&label=CI)](https://github.com/reaatech/mcp-load-test/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Session-scoped MCP transport clients with auto-negotiation across stdio, SSE, and StreamableHTTP. Handles JSON-RPC handshakes, authentication header construction, tool discovery, and tool invocation — purpose-built for concurrent load-test sessions.

## Installation

```bash
npm install @reaatech/mcp-load-test-client
# or
pnpm add @reaatech/mcp-load-test-client
```

## Feature Overview

- **Auto-negotiation** — `transport: "auto"` tries StreamableHTTP first, falls back to SSE on connect failure, or spawns a stdio subprocess for non-URL endpoints
- **Three transports** — `StreamableHTTPTransport`, `SSETransport`, `StdioTransport` — each conforming to a shared interface
- **MCP handshake** — automatic `initialize` → `notifications/initialized` handshake on connect
- **Auth support** — API key (`X-Api-Key` header), Bearer token, and OAuth client credentials (Basic auth header or env vars for stdio)
- **Session lifecycle** — `connect()`, `disconnect()`, `sendRequest()`, `callTool()`, `listTools()`
- **Timeout handling** — configurable per-transport request timeouts with clean rejection
- **Private-endpoint warnings** — logs warnings for RFC 1918 / loopback endpoints (once per endpoint)

## Quick Start

```typescript
import { createSessionClient } from "@reaatech/mcp-load-test-client";

// Auto-detect transport from endpoint
const client = createSessionClient("http://localhost:3000", {
  transport: "auto",
  timeout: 30000,
});

await client.connect();

const tools = await client.listTools();
console.log(`${tools.length} tools discovered`);

const result = await client.callTool("echo", { text: "hello" });
console.log(result);

await client.disconnect();
```

## API Reference

### `createSessionClient(endpoint, options)`

Factory that returns an `MCPClient`-conforming instance. Handles transport negotiation.

```typescript
function createSessionClient(
  endpoint: string,
  options: SessionClientOptions,
): MCPClient;
```

#### `SessionClientOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `transport` | `TransportType` | (required) | `"stdio"`, `"sse"`, `"http"`, or `"auto"` |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `auth` | `AuthOptions` | — | Optional auth configuration |

### `MCPClient` Interface

```typescript
interface MCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendRequest(method: string, params?: unknown): Promise<unknown>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  listTools(): Promise<ToolDefinition[]>;
}
```

### Transport Classes

#### `StreamableHTTPTransport`

Full-duplex HTTP transport with session tracking via `mcp-session-id` header.

```typescript
class StreamableHTTPTransport {
  constructor(options: StreamableHTTPTransportOptions);
  connect(): Promise<void>;     // OPTIONS preflight check
  sendRequest(method, params?): Promise<unknown>;
  disconnect(): Promise<void>;  // DELETE to release session
  sendNotification(method, params?): Promise<void>;
  getSessionId(): string | null;
}
```

#### `SSETransport`

Long-lived SSE connection for server-pushed responses, `fetch POST` for requests.

```typescript
class SSETransport {
  constructor(options: SSETransportOptions);
  connect(): Promise<void>;     // Open SSE stream, listen for endpoint event
  sendRequest(method, params?): Promise<unknown>;
  disconnect(): Promise<void>;  // Close EventSource, fail pending requests
  sendNotification(method, params?): Promise<void>;
}
```

#### `StdioTransport`

Spawns a child process and communicates via JSON-RPC over stdin/stdout.

```typescript
class StdioTransport {
  constructor(options: StdioTransportOptions);
  connect(): Promise<void>;     // Spawn process, wait for spawn event
  sendRequest(method, params?): Promise<unknown>;
  disconnect(): Promise<void>;  // Kill process, fail pending requests
  sendNotification(method, params?): Promise<void>;
}
```

### `TransportError`

```typescript
class TransportError extends Error {
  constructor(message: string, code?: number, data?: unknown);
  readonly code?: number;
  readonly data?: unknown;
}
```

## Usage Patterns

### Auth with API Key

```typescript
const client = createSessionClient("https://api.example.com/mcp", {
  transport: "http",
  timeout: 30000,
  auth: { mode: "api-key", apiKey: "sk-secret" },
});
// Sends X-Api-Key: sk-secret on every request
```

### Auth with Bearer Token

```typescript
const client = createSessionClient("https://api.example.com/mcp", {
  transport: "http",
  timeout: 30000,
  auth: { mode: "bearer", bearerToken: "tok-abc123" },
});
// Sends Authorization: Bearer tok-abc123
```

### Stdio Transport with Env Vars

```typescript
const client = createSessionClient("npx my-mcp-server", {
  transport: "stdio",
  timeout: 30000,
  auth: { mode: "api-key", apiKey: "sk-secret" },
});
// Sets MCP_API_KEY=sk-secret in child process environment
```

### Auto-Fallback from HTTP to SSE

When `transport: "auto"` is set and the endpoint is a URL, `createSessionClient` tries StreamableHTTP first. If that fails, it falls back to SSE automatically — useful for servers that advertise SSE capability without HTTP.

## Related Packages

- [`@reaatech/mcp-load-test-core`](https://www.npmjs.com/package/@reaatech/mcp-load-test-core) — Types, auth options, and utilities
- [`@reaatech/mcp-load-test-engine`](https://www.npmjs.com/package/@reaatech/mcp-load-test-engine) — Session manager that creates clients per session

## License

[MIT](https://github.com/reaatech/mcp-load-test/blob/main/LICENSE)
