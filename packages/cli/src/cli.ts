#!/usr/bin/env node

// Opt into pretty log output for the CLI before the logger is imported.
if (!process.env.MCP_LT_PRETTY_LOGS) {
  process.env.MCP_LT_PRETTY_LOGS = '1';
}

import { getProgramVersion } from '@reaatech/mcp-load-test-core';
import { Command } from 'commander';
import {
  registerCompareCommand,
  registerLoadCommand,
  registerRampCommand,
  registerSoakCommand,
  registerSpikeCommand,
} from './commands/index.js';

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
