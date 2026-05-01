import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      LOG_LEVEL: 'warn',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/**/index.ts', 'tests/**', '**/*.d.ts', 'dist/**'],
    },
  },
});
