import { writeFileSync } from 'node:fs';
import { logger } from '@reaatech/mcp-load-test-core';
import type { LoadEngineOptions, LoadProfile, ToolCallPattern } from '@reaatech/mcp-load-test-core';
import { LoadEngine } from '@reaatech/mcp-load-test-engine';
import { BUILT_IN_PATTERNS } from '@reaatech/mcp-load-test-patterns';
import { ConsoleReporter, JsonReporter, MarkdownReporter } from '@reaatech/mcp-load-test-reporters';
import type { Command } from 'commander';
import { loadConfigFile } from '../config-loader.js';

export interface RunOptions {
  endpoint: string;
  transport: string;
  profile: string;
  maxConcurrency: string;
  duration: string;
  patterns?: string;
  breakingPoint?: boolean;
  format?: string;
  output?: string;
  timeout?: string;
  config?: string;
  baselineConcurrency?: string;
}

interface LoadCommandOptions {
  endpoint: string;
  transport: 'stdio' | 'sse' | 'http' | 'auto';
  profile: string;
  maxConcurrency: string;
  duration: string;
  patterns: string;
  breakingPoint: boolean;
  format: 'console' | 'markdown' | 'json';
  output: string;
  timeout: string;
  config?: string;
}

export function registerLoadCommand(program: Command): void {
  program
    .command('load')
    .description('Run a load test')
    .requiredOption('--endpoint <endpoint>', 'MCP server endpoint (URL or command)')
    .option('--transport <type>', 'Transport type', 'auto')
    .option('--profile <profile>', 'Load profile (ramp, soak, spike)', 'ramp')
    .option('--max-concurrency <n>', 'Maximum concurrent sessions', '50')
    .option('--duration <seconds>', 'Test duration in seconds', '60')
    .option('--patterns <names>', 'Comma-separated pattern names', 'explore-then-act')
    .option('--breaking-point', 'Enable breaking point detection', false)
    .option('--format <format>', 'Output format (console, markdown, json)', 'console')
    .option('--output <path>', 'Output file path')
    .option('--timeout <ms>', 'Request timeout in ms', '30000')
    .option('--config <path>', 'Configuration file path (YAML or JSON)')
    .action(async (options: LoadCommandOptions) => {
      await buildAndRun({
        endpoint: options.endpoint,
        transport: options.transport,
        profile: options.profile,
        maxConcurrency: options.maxConcurrency,
        duration: options.duration,
        patterns: options.patterns,
        breakingPoint: options.breakingPoint,
        format: options.format,
        output: options.output,
        timeout: options.timeout,
        config: options.config,
      });
    });
}

export async function buildAndRun(options: RunOptions): Promise<void> {
  const config = options.config ? loadConfigFile(options.config) : {};
  const engineOptions = buildOptions(options, config);
  const engine = new LoadEngine(engineOptions);

  let aborted = false;
  const onAbort = () => {
    if (!aborted) {
      aborted = true;
      logger.warn('Received interrupt signal, stopping engine...');
      engineOptions.profile = {
        type: 'ramp',
        minConcurrency: 0,
        maxConcurrency: 0,
        rampDurationMs: 0,
        holdDurationMs: 0,
      };
    }
  };

  const sigintHandler = () => onAbort();
  const sigtermHandler = () => onAbort();
  process.on('SIGINT', sigintHandler);
  process.on('SIGTERM', sigtermHandler);

  try {
    const report = await engine.run();

    process.off('SIGINT', sigintHandler);
    process.off('SIGTERM', sigtermHandler);

    let output: string;
    switch (engineOptions.outputFormat) {
      case 'markdown':
        output = new MarkdownReporter().format(report);
        break;
      case 'json':
        output = new JsonReporter().format(report);
        break;
      default:
        output = new ConsoleReporter().format(report);
        break;
    }

    if (options.output) {
      writeFileSync(options.output, output);
      console.log(`Report written to ${options.output}`);
    } else {
      console.log(output);
    }

    if (report.grade === 'D' || report.grade === 'F') {
      process.exit(1);
    }
  } catch (error) {
    process.off('SIGINT', sigintHandler);
    process.off('SIGTERM', sigtermHandler);
    logger.error({ error: String(error) }, 'Load test failed');
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function buildOptions(
  cliOptions: RunOptions,
  config: Partial<LoadEngineOptions>,
): LoadEngineOptions {
  const patternNames = (cliOptions.patterns || 'explore-then-act').split(',').map((p) => p.trim());
  const patterns = resolvePatterns(patternNames, config.patterns);

  const profile = buildProfile(cliOptions, config.profile);

  return {
    // Config first, then CLI overrides
    ...config,
    endpoint: cliOptions.endpoint,
    transport: cliOptions.transport as 'stdio' | 'sse' | 'http' | 'auto',
    profile,
    patterns,
    breakingPointDetection: cliOptions.breakingPoint ?? config.breakingPointDetection ?? false,
    outputFormat:
      (cliOptions.format as 'console' | 'markdown' | 'json') ?? config.outputFormat ?? 'console',
  };
}

function resolvePatterns(names: string[], configPatterns?: ToolCallPattern[]): ToolCallPattern[] {
  if (configPatterns && configPatterns.length > 0) {
    return configPatterns;
  }

  const resolved: ToolCallPattern[] = [];
  for (const name of names) {
    const builtIn = BUILT_IN_PATTERNS.find((p) => p.name === name);
    if (builtIn) {
      resolved.push(builtIn);
    }
  }

  if (resolved.length === 0) {
    const first = BUILT_IN_PATTERNS[0];
    if (first) resolved.push(first);
  }

  return resolved;
}

function buildProfile(cliOptions: RunOptions, configProfile?: LoadProfile): LoadProfile {
  if (configProfile) return configProfile;

  const maxConcurrency = Number.parseInt(cliOptions.maxConcurrency, 10);
  const durationMs = Number.parseInt(cliOptions.duration, 10) * 1000;

  switch (cliOptions.profile) {
    case 'soak':
      return {
        type: 'soak',
        concurrency: maxConcurrency,
        durationMs,
        sampleIntervalMs: 1000,
      };
    case 'spike': {
      const baseline =
        cliOptions.baselineConcurrency !== undefined
          ? Number.parseInt(cliOptions.baselineConcurrency, 10)
          : Math.max(1, Math.floor(maxConcurrency / 4));
      return {
        type: 'spike',
        baselineConcurrency: baseline,
        spikeConcurrency: maxConcurrency,
        spikeDurationMs: Math.floor(durationMs / 5),
        spikeCount: 3,
        cooldownMs: Math.floor(durationMs / 5),
      };
    }
    default:
      return {
        type: 'ramp',
        minConcurrency: 1,
        maxConcurrency,
        rampDurationMs: Math.floor(durationMs * 0.6),
        holdDurationMs: Math.floor(durationMs * 0.3),
        rampDownDurationMs: Math.floor(durationMs * 0.1),
      };
  }
}
