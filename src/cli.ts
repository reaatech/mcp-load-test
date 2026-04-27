#!/usr/bin/env node

// Opt into pretty log output for the CLI before the logger is imported.
if (!process.env.MCP_LT_PRETTY_LOGS) {
  process.env.MCP_LT_PRETTY_LOGS = '1';
}

import { Command } from 'commander';
import { getProgramVersion } from './version.js';
import {
  registerLoadCommand,
  registerRampCommand,
  registerSoakCommand,
  registerSpikeCommand,
  registerCompareCommand,
} from './cli/commands/index.js';

const program = new Command();

program
  .name('mcp-load-test')
  .description('Load testing framework purpose-built for MCP servers')
  .version(getProgramVersion(), '-v, --version', 'Display version number');

// Register commands
registerLoadCommand(program);
registerRampCommand(program);
registerSoakCommand(program);
registerSpikeCommand(program);
registerCompareCommand(program);

program.parse();
