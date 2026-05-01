import type { Command } from 'commander';
import { buildAndRun } from './load.command.js';

export function registerRampCommand(program: Command): void {
  program
    .command('ramp')
    .description('Quick ramp test')
    .requiredOption('--endpoint <endpoint>', 'MCP server endpoint')
    .option('--transport <type>', 'Transport type', 'auto')
    .option('--max-concurrency <n>', 'Maximum concurrent sessions', '50')
    .option('--duration <seconds>', 'Test duration in seconds', '60')
    .option('--format <format>', 'Output format', 'console')
    .option('--output <path>', 'Output file path')
    .option('--breaking-point', 'Enable breaking point detection', false)
    .action(async (options) => {
      await buildAndRun({
        endpoint: options.endpoint,
        transport: options.transport,
        profile: 'ramp',
        maxConcurrency: options.maxConcurrency,
        duration: options.duration,
        format: options.format,
        output: options.output,
        breakingPoint: options.breakingPoint,
      });
    });
}
