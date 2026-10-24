// The system page: how much data the platform holds, how the AI assistant is behaving (last 24 hours), how many screens
// are likely connected right now, and links to the consoles where compute and limits are changed.
import { checkHealth } from './health.service';
import { countRows } from './overview.service';
import { readAll } from './read-all';

const VOLUME_TABLES = ['businesses', 'orders', 'order_items', 'kitchen_tickets', 'dine_in_sessions', 'catalog_items', 'guest_accounts', 'guest_wallets',
  'staff_profiles', 'rooms', 'stay_booking_requests', 'usage_ledger', 'vibey_turns', 'staff_notifications'];

/** The Supabase project ref from its URL (https://<ref>.supabase.co), for console links. */
export function projectRef(url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''): string | null {
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

export async function loadSystem(db: any, now = Date.now()) {
  const dayAgo = new Date(now - 86_400_000).toISOString();
  const [health, counts, turns, openTables, guestsOnline, staffToday] = await Promise.all([
    checkHealth(db),
    Promise.all(VOLUME_TABLES.map(async (t) => ({ table: t, rows: await countRows(db, t) }))),
    readAll(db, 'vibey_turns', 'surface, latency_ms, error_code, model', (q) => q.gte('created_at', dayAgo).order('created_at', { ascending: true })),
    countRows(db, 'dine_in_sessions', (q) => q.eq('status', 'open')),
    countRows(db, 'guest_auth_sessions', (q) => q.gte('last_seen_at', new Date(now - 15 * 60_000).toISOString())),
    countRows(db, 'staff_profiles', (q) => q.gte('last_login_at', new Date(now - 12 * 3_600_000).toISOString())),
  ]);
  const t = turns.data || [];
  const withModel = t.filter((x: any) => x.model).length;
  const ref = projectRef();
  return {
    health,
    volumes: counts.filter((c) => c.rows !== null),
    vibey: {
      turns24h: t.length,
      guest: t.filter((x: any) => x.surface === 'guest').length,
      host: t.filter((x: any) => x.surface === 'host').length,
      avgMs: t.length ? Math.round(t.reduce((a: number, x: any) => a + (Number(x.latency_ms) || 0), 0) / t.length) : null,
      errors: t.filter((x: any) => x.error_code).length,
      modelShare: t.length ? Math.round((withModel / t.length) * 100) : null,
    },
    // Each open table has guest phones on its channel; each signed-in staff member has a screen. An estimate, labelled so.
    connections: { openTables: openTables ?? 0, guestsOnline: guestsOnline ?? 0, staffScreens: staffToday ?? 0 },
    links: {
      supabase: ref ? `https://supabase.com/dashboard/project/${ref}` : null,
      supabaseCompute: ref ? `https://supabase.com/dashboard/project/${ref}/settings/compute-and-disk` : null,
      supabaseRealtime: ref ? `https://supabase.com/dashboard/project/${ref}/realtime/inspector` : null,
      vercel: 'https://vercel.com/dashboard',
      upstash: 'https://console.upstash.com/',
    },
  };
}
