import type { Command } from 'commander';
import { buildAndRun } from './load.command.js';

export function registerSpikeCommand(program: Command): void {
  program
    .command('spike')
    .description('Spike load test')
    .requiredOption('--endpoint <endpoint>', 'MCP server endpoint')
    .option('--transport <type>', 'Transport type', 'auto')
    .option('--baseline <n>', 'Baseline concurrency', '10')
    .option('--spike <n>', 'Spike concurrency', '100')
    .option('--duration <seconds>', 'Test duration in seconds', '300')
    .option('--format <format>', 'Output format', 'console')
    .option('--output <path>', 'Output file path')
    .option('--breaking-point', 'Enable breaking point detection', false)
    .action(async (options) => {
      await buildAndRun({
        endpoint: options.endpoint,
        transport: options.transport,
        profile: 'spike',
        maxConcurrency: options.spike,
        duration: options.duration,
        baselineConcurrency: options.baseline,
        format: options.format,
        output: options.output,
        breakingPoint: options.breakingPoint,
      });
    });
}
