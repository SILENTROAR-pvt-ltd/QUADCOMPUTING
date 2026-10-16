import { defineConfig } from 'vitest/config';
import path from 'path';

// The live A-to-Z suite (tests/e2e). Unlike vitest.config.ts this one does NOT stub the database: it reads .env.local and
// talks to the real project, so it must be asked for explicitly:
//   $env:E2E_LIVE='1'; npx vitest run --config vitest.e2e.config.ts
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './') } },
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.e2e.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
