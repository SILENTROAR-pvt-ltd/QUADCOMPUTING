// Builds supabase/club_setup_all.sql: the four Club migrations, in order, as one paste for the
// Supabase SQL editor. tests/club/setup-sql.test.ts fails if the file drifts from the migrations.
export const CLUB_MIGRATIONS = [
  '20261011000001_club_identity.sql',
  '20261011000002_club_social.sql',
  '20261011000003_club_events_marketplace.sql',
  '20261011000004_club_ledger.sql',
];

export const SETUP_HEADER = `-- Vibers Club: complete database setup in one paste (Supabase → SQL Editor → Run).
-- Generated from supabase/migrations/2026101100000{1..4}_club_*.sql; do not edit by hand.
-- Safe to run more than once. It only creates Club tables (and the shared vibers_accounts table if it
-- is missing); Quad Computing tables are not changed.
`;

export function buildSetupSql(read: (name: string) => string): string {
  return SETUP_HEADER + CLUB_MIGRATIONS.map((name) => `\n-- ===== ${name} =====\n${read(name).trimEnd()}\n`).join('');
}
