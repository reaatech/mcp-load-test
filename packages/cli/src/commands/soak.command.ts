import type { Command } from 'commander';
import { buildAndRun } from './load.command.js';

export function registerSoakCommand(program: Command): void {
  program
    .command('soak')
    .description('Extended soak test')
    .requiredOption('--endpoint <endpoint>', 'MCP server endpoint')
    .option('--transport <type>', 'Transport type', 'auto')
    .option('--concurrency <n>', 'Constant concurrency', '50')
    .option('--duration <seconds>', 'Test duration in seconds', '1800')
    .option('--format <format>', 'Output format', 'console')
    .option('--output <path>', 'Output file path')
    .option('--breaking-point', 'Enable breaking point detection', false)
    .action(async (options) => {
      await buildAndRun({
        endpoint: options.endpoint,
        transport: options.transport,
        profile: 'soak',
        maxConcurrency: options.concurrency,
        duration: options.duration,
        format: options.format,
        output: options.output,
        breakingPoint: options.breakingPoint,
      });
    });
}
