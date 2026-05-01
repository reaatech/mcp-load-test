import { existsSync, readFileSync } from 'node:fs';
import type { LoadEngineOptions } from '@reaatech/mcp-load-test-core';
import { load as loadYaml } from 'js-yaml';

export function loadConfigFile(path: string): Partial<LoadEngineOptions> {
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }
  const content = readFileSync(path, 'utf-8');
  if (path.endsWith('.json')) {
    return JSON.parse(content) as Partial<LoadEngineOptions>;
  }
  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    return loadYaml(content) as Partial<LoadEngineOptions>;
  }
  // Try JSON first, then YAML
  try {
    return JSON.parse(content) as Partial<LoadEngineOptions>;
  } catch {
    return loadYaml(content) as Partial<LoadEngineOptions>;
  }
}
