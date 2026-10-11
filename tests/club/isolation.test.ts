// Vibers Club and Quad Computing share one repository, one login and one database, and nothing else.
// These checks fail the build if either side starts reaching into the other.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const CLUB_DIRS = ['lib/club', 'components/club', 'app/(club)', 'app/api/club', 'tests/club'].map((d) => d.split('/').join(sep));

/** Shared modules Club code may use: login, database clients, request guards, and the one identity service. */
const ALLOWED_SHARED = [
  '@/lib/supabase/admin', '@/lib/supabase/server', '@/lib/supabase/client',
  '@/lib/auth/verified-user', '@/lib/auth/auth-messages', '@/lib/auth/guest-auth',
  '@/lib/middleware/error-handler', '@/lib/middleware/rate-limiter',
  '@/lib/services/guest-auth/vibers-profile.service',
  '@/lib/testing/fake-supabase',
  '@/components/vibers/vibers-fonts', '@/components/vibers/vibers-brand',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const isClub = (file: string) => CLUB_DIRS.some((d) => relative(ROOT, file).startsWith(d));
const sources = ['app', 'lib', 'components', 'tests'].flatMap((d) => walk(join(ROOT, d)));
const importsOf = (file: string) => Array.from(readFileSync(file, 'utf8').matchAll(/from\s+['"](@\/[^'"]+)['"]|import\(\s*['"](@\/[^'"]+)['"]\s*\)/g)).map((m) => m[1] || m[2]);

describe('Club ↔ QC isolation', () => {
  it('no QC file imports Club code', () => {
    const offenders = sources.filter((f) => !isClub(f)).filter((f) => importsOf(f).some((i) => i.startsWith('@/lib/club') || i.startsWith('@/components/club')));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it('Club code only uses the agreed shared modules', () => {
    const bad: string[] = [];
    for (const f of sources.filter(isClub)) {
      for (const i of importsOf(f)) {
        if (i.startsWith('@/lib/club') || i.startsWith('@/components/club')) continue;
        if (!ALLOWED_SHARED.includes(i)) bad.push(`${relative(ROOT, f)} → ${i}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('Club migrations only create Club objects (plus one read-only index on vibers_accounts)', () => {
    const dir = join(ROOT, 'supabase', 'migrations');
    const club = readdirSync(dir).filter((f) => /^20261011\d+_club_/.test(f));
    expect(club.length).toBeGreaterThanOrEqual(4);
    // vibers_accounts is the shared identity table: Club may create it if missing (same definition as
    // QC migration 20261010000019) and switch on its row-level security, nothing more.
    const CLUB_TABLE = /^(club_\w+|viber_\w+|business_categories|property_marketplace|escrow_ledger|vibers_accounts)$/;
    for (const f of club) {
      const sql = readFileSync(join(dir, f), 'utf8');
      const touches = Array.from(sql.matchAll(/ALTER TABLE public\.vibers_accounts (.+);/g)).map((m) => m[1]);
      expect(touches.every((t) => t === 'ENABLE ROW LEVEL SECURITY'), `${f} alters vibers_accounts`).toBe(true);
    }
    for (const f of club) {
      const sql = readFileSync(join(dir, f), 'utf8');
      for (const m of Array.from(sql.matchAll(/ALTER TABLE (?:IF EXISTS )?public\.(\w+)/gi))) expect(m[1], `${f}: ALTER ${m[1]}`).toMatch(CLUB_TABLE);
      for (const m of Array.from(sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/gi))) expect(m[1], `${f}: CREATE ${m[1]}`).toMatch(CLUB_TABLE);
      for (const m of Array.from(sql.matchAll(/FUNCTION public\.(\w+)/gi))) expect(m[1], `${f}: FUNCTION ${m[1]}`).toMatch(/^club_/);
      expect(sql, `${f} drops something`).not.toMatch(/\bDROP\s+(TABLE|COLUMN|FUNCTION|POLICY)/i);
      const indexes = Array.from(sql.matchAll(/CREATE (?:UNIQUE )?INDEX IF NOT EXISTS \w+\s+ON public\.(\w+)/gi)).map((m) => m[1]);
      for (const t of indexes) expect(t === 'vibers_accounts' || CLUB_TABLE.test(t), `${f}: index on ${t}`).toBe(true);
    }
  });
});
