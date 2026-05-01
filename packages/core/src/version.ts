import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let cachedVersion: string | null = null;

export function getProgramVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    cachedVersion = (require('../package.json') as { version: string }).version;
    return cachedVersion;
  } catch {
    cachedVersion = '0.0.0';
    return cachedVersion;
  }
}
