import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSetupSql, CLUB_MIGRATIONS } from '@/lib/club/setup-sql';

const ROOT = process.cwd();
const read = (name: string) => readFileSync(join(ROOT, 'supabase', 'migrations', name), 'utf8');
const SETUP = join(ROOT, 'supabase', 'club_setup_all.sql');

describe('One-paste Club database setup', () => {
  it('supabase/club_setup_all.sql is exactly the four Club migrations, in order', () => {
    const expected = buildSetupSql(read);
    // Run with UPDATE_CLUB_SQL=1 to regenerate the file after changing a Club migration.
    if (process.env.UPDATE_CLUB_SQL === '1' || !existsSync(SETUP)) writeFileSync(SETUP, expected);
    expect(readFileSync(SETUP, 'utf8')).toBe(expected);
  });

  it('each later migration stops with a clear message when an earlier one has not run', () => {
    for (const name of CLUB_MIGRATIONS.slice(1)) expect(read(name)).toMatch(/to_regclass\('public\.[a-z_]+'\) IS NULL[\s\S]*RAISE EXCEPTION 'Run /);
    expect(read(CLUB_MIGRATIONS[0])).toContain('CREATE TABLE IF NOT EXISTS public.vibers_accounts');
  });
});
