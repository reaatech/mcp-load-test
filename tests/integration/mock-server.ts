import { createServer } from 'node:http';
import type { Server } from 'node:http';

export function createMockMCPServer(port: number = 0): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      // Simple JSON-RPC handler
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const request = JSON.parse(body);
            const response = handleRequest(request);
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (request.method === 'initialize') {
              headers['mcp-session-id'] = 'mock-session-' + Math.random().toString(36).slice(2);
            }
            res.writeHead(200, headers);
            res.end(JSON.stringify(response));
          } catch {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else if (req.method === 'DELETE') {
        res.writeHead(200);
        res.end(JSON.stringify({ result: 'disconnected' }));
      } else {
        res.writeHead(405);
        res.end();
      }
    });

    server.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      resolve({ server, port: actualPort });
    });
  });
}

function handleRequest(request: { id?: number; method?: string; params?: unknown }): unknown {
  switch (request.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'mock-mcp-server', version: '1.0.0' },
        },
      };
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            { name: 'echo', description: 'Echo input', inputSchema: {} },
            { name: 'delay', description: 'Delay response', inputSchema: {} },
          ],
        },
      };
    case 'tools/call':
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { content: [{ type: 'text', text: 'ok' }] },
      };
    default:
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: 'Method not found' },
      };
  }
}
