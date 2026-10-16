import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'node',
    // The live A-to-Z suite writes real rows; it only runs through vitest.e2e.config.ts, never with the unit tests.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    // Tests never load .env.local: they must not be able to reach the real Supabase project.
    // These placeholders point at nothing, so a test that forgets to mock a client fails loudly
    // instead of reading or writing production data.
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:1',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-not-real',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-not-real',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    },
  },
});
