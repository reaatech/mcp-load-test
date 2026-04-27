import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfigFile } from '../../src/cli/config-loader.js';

describe('config-loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mcp-load-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it('should load JSON config', () => {
    const path = join(tempDir, 'config.json');
    writeFileSync(path, JSON.stringify({ endpoint: 'http://test', transport: 'http' }));

    const config = loadConfigFile(path);
    expect(config.endpoint).toBe('http://test');
    expect(config.transport).toBe('http');
  });

  it('should load YAML config', () => {
    const path = join(tempDir, 'config.yaml');
    writeFileSync(path, 'endpoint: http://test\ntransport: sse\n');

    const config = loadConfigFile(path);
    expect(config.endpoint).toBe('http://test');
    expect(config.transport).toBe('sse');
  });

  it('should load YML config', () => {
    const path = join(tempDir, 'config.yml');
    writeFileSync(path, 'endpoint: http://test\n');

    const config = loadConfigFile(path);
    expect(config.endpoint).toBe('http://test');
  });

  it('should auto-detect JSON in file without extension', () => {
    const path = join(tempDir, 'config');
    writeFileSync(path, JSON.stringify({ endpoint: 'http://test' }));

    const config = loadConfigFile(path);
    expect(config.endpoint).toBe('http://test');
  });

  it('should throw for non-existent file', () => {
    expect(() => loadConfigFile('/nonexistent/config.json')).toThrow('Config file not found');
  });
});
