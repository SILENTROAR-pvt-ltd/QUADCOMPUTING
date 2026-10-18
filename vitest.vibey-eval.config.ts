// The live Vibey model eval (Phase 0). Calls the real provider, so it never runs with the unit tests:
//   npx vitest run --config vitest.vibey-eval.config.ts
// Only the language-model settings are read from .env.local; Supabase stays pointed at nothing, as in the unit tests.
import { configDefaults, defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

const local = dotenv.config({ path: '.env.local', quiet: true }).parsed ?? {};

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './') } },
  test: {
    environment: 'node',
    include: ['tests/vibey/eval/**/*.eval.ts'],
    exclude: [...configDefaults.exclude],
    testTimeout: 90 * 60_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:1',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-not-real',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-not-real',
      LLM_API_KEY: local.LLM_API_KEY ?? '',
      LLM_BASE_URL: local.LLM_BASE_URL ?? '',
      VIBEY_EVAL_MODELS: process.env.VIBEY_EVAL_MODELS ?? '',
    },
  },
});
