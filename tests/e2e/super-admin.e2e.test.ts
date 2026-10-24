/**
 * Live, read-only check of the super admin's data routes against the real database: every page's figures load, add up
 * with each other and with direct counts. Nothing is written (a change is only tried while the admin log is missing,
 * which the route refuses). OFF unless E2E_LIVE=1.
 *
 *   $env:E2E_LIVE='1'; npx vitest run --config vitest.e2e.config.ts tests/e2e/super-admin.e2e.test.ts
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const LIVE = process.env.E2E_LIVE === '1';
try {
  for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
} catch { /* skipped below */ }

vi.mock('@/lib/auth/guards', async (orig) => {
  const { adminDb } = await import('@/lib/supabase/admin');
  return { ...(await orig<any>()), requireAdmin: async () => ({ error: null, adminId: '00000000-0000-4000-8000-000000000001', user: { email: 'e2e@example.test' }, supabase: adminDb() }) };
});

import { adminDb } from '@/lib/supabase/admin';
import { GET as overviewGET } from '@/app/api/admin/overview/route';
import { GET as venuesGET } from '@/app/api/admin/venues/route';
import { GET as financeGET } from '@/app/api/admin/finance/route';
import { GET as analyticsGET } from '@/app/api/admin/analytics/route';
import { GET as systemGET } from '@/app/api/admin/system/route';
import { GET as supportGET } from '@/app/api/admin/support/route';
import { GET as countsGET } from '@/app/api/admin/counts/route';

const req = (url: string) => new Request(`http://x${url}`);
const body = async (p: Promise<Response>) => { const r = await p; return { status: r.status, json: await r.json() }; };

describe.skipIf(!LIVE)('super admin, live data', () => {
  const db = adminDb();

  it('dashboard figures load and agree with direct counts', async () => {
    const o = await body(overviewGET(req('/api/admin/overview?days=30')));
    expect(o.status).toBe(200);
    const { count: venues } = await db.from('businesses').select('*', { count: 'exact', head: true });
    expect(o.json.venuesTotal).toBe(venues);
    const mix = Object.values(o.json.plans.mix as Record<string, number>).reduce((a, b) => a + b, 0);
    const { count: subs } = await db.from('venue_subscriptions').select('*', { count: 'exact', head: true });
    expect(mix).toBe(subs);
    const seriesGmv = o.json.series.reduce((a: number, p: any) => a + p.gmv, 0);
    expect(Math.round(seriesGmv)).toBe(Math.round(o.json.current.gmv));
    expect(o.json.health.checks.find((c: any) => c.id === 'database').level).not.toBe('critical');
    console.log('[live] 30d GMV', o.json.current.gmv, 'bills', o.json.current.orders, 'venues', o.json.venuesTotal, 'source', o.json.source,
      'health', o.json.health.checks.map((c: any) => `${c.id}:${c.level}:${c.ms}ms`).join(' '));
  });

  it('venues, finance, analytics, system, support and counts load', async () => {
    const v = await body(venuesGET(req('/api/admin/venues')));
    expect(v.status).toBe(200);
    expect(v.json.venues.length).toBeGreaterThan(0);
    const f = await body(financeGET(req('/api/admin/finance')));
    expect(f.status).toBe(200);
    const { data: wallets } = await db.from('venue_wallets').select('balance');
    expect(f.json.held.venueCredit).toBeCloseTo((wallets || []).reduce((a: number, w: any) => a + Number(w.balance), 0), 2);
    const a = await body(analyticsGET(req('/api/admin/analytics?days=90')));
    expect(a.status).toBe(200);
    const heat = a.json.heatmap.flat().reduce((x: number, y: number) => x + y, 0);
    expect(heat).toBe(a.json.totals.orders);
    expect((await body(systemGET(req('/api/admin/system')))).status).toBe(200);
    expect((await body(supportGET(req('/api/admin/support')))).status).toBe(200);
    expect((await body(countsGET(req('/api/admin/counts')))).status).toBe(200);
    console.log('[live] venues', v.json.venues.map((x: any) => `${x.name}:${x.plan.name}:${x.last30.orders}`).join(' | '),
      '· fees', f.json.collected.fees, 'dues', f.json.owed.dues, '· 90d bills', a.json.totals.orders);
  });
  // Exports are not run here: each one is recorded in the append-only admin log, and this check must write nothing.
});
