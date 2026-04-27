import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      LOG_LEVEL: 'warn',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/types/**',
        'src/**/index.ts',
        'src/cli.ts',
        'src/index.ts',
        'tests/**',
        '**/*.d.ts',
        'dist/**',
        'eslint.config.js',
        'vitest.config.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
