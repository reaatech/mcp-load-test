import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';

// Raw JSON by default (library-safe). Opt into pretty output with
// MCP_LT_PRETTY_LOGS=1 — the CLI sets this automatically.
const prettyEnabled = process.env.MCP_LT_PRETTY_LOGS === '1';

export const logger = pino({
  level: logLevel,
  transport: prettyEnabled
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
