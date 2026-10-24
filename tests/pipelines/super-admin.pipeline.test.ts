// The super admin's routes: only a super admin gets in; figures come from the data; every change is logged and refused
// while the log is missing; notices reach venues; tickets go both ways; exports download.
import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const A = 'aaaaaaaa-1111-4222-8333-444444444444';
const B = 'bbbbbbbb-1111-4222-8333-444444444444';
const DAY = 86_400_000;
const ctx = vi.hoisted(() => ({ db: null as any, admin: true }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => (ctx.admin
    ? { error: null, adminId: 'admin-1', user: { id: 'admin-1', email: 'boss@example.test' }, supabase: ctx.db }
    : { error: NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 }) }),
  requireHost: async () => ({ error: null, businessId: A, business: { id: A }, supabase: ctx.db, user: { id: 'host-a' } }),
  adminDb: () => ctx.db,
}));
vi.mock('@/lib/middleware/rate-limiter', async (orig) => ({ ...(await orig<any>()), enforceRateLimit: async () => null }));

import { GET as overviewGET } from '@/app/api/admin/overview/route';
import { POST as venuePOST } from '@/app/api/admin/venues/[id]/route';
import { GET as announcementsGET, POST as announcementsPOST, PATCH as announcementsPATCH } from '@/app/api/admin/announcements/route';
import { GET as hostNoticesGET } from '@/app/api/host/announcements/route';
import { GET as hostSupportGET, POST as hostSupportPOST } from '@/app/api/host/support/route';
import { GET as supportGET, PATCH as supportPATCH } from '@/app/api/admin/support/route';
import { GET as exportGET } from '@/app/api/admin/exports/route';

const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const req = (url: string, method = 'GET', body?: unknown) =>
  new Request(`http://x${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function seed(withAdminTables = true, failOn: Record<string, () => boolean> = {}) {
  ctx.admin = true;
  ctx.db = createFakeSupabase({
    businesses: [{ id: A, business_name: 'Bombay Rasoi', created_at: iso(-30) }, { id: B, business_name: 'Mad Kings', created_at: iso(-2) }],
    venue_subscriptions: [
      { venue_id: A, plan_tier: 'pay_as_you_go', status: 'active', trial_ends_at: null, expires_at: null, setup_fee_paid_at: iso(-30), vibey_until: null },
      { venue_id: B, plan_tier: 'm1_pro', status: 'active', trial_ends_at: null, expires_at: iso(200), setup_fee_paid_at: null, vibey_until: null },
    ],
    orders: [
      { id: 'o1', business_id: A, status: 'settled', created_at: iso(-1), grand_total: 1000, subtotal: 950, discount_amount: 0, tax_amount: 50, order_type: 'pos' },
      { id: 'o2', business_id: B, status: 'SETTLED', created_at: iso(-1), grand_total: 4000, subtotal: 4000, discount_amount: 0, tax_amount: 0, order_type: 'room_stay' },
      { id: 'o3', business_id: A, status: 'cancelled', created_at: iso(-1), grand_total: 999, order_type: 'pos' },
    ],
    usage_ledger: [{ venue_id: A, action_type: 'bill_generate', cost: 3, created_at: iso(-1) }],
    venue_topup_requests: [], locations: [], dine_in_sessions: [{ id: 's1', status: 'open' }], guest_auth_sessions: [], staff_profiles: [], rooms: [],
    ...(withAdminTables ? { platform_admin_actions: [], platform_venue_reviews: [], platform_announcements: [], support_tickets: [] } : {}),
  }, { failOn });
}

describe('super admin', () => {
  it('lets only a super admin in', async () => {
    seed(); ctx.admin = false;
    expect((await overviewGET(req('/api/admin/overview'))).status).toBe(403);
  });

  it('reports settled GMV, stays, active venues, the plan mix and the floor from the data', async () => {
    seed();
    const o = await (await overviewGET(req('/api/admin/overview?days=7'))).json();
    expect(o.current).toMatchObject({ gmv: 5000, orders: 2, stay: 4000, fnb: 1000, venues: 2 });
    expect(o.current.income.fees).toBe(3);
    expect(o.plans.mix).toMatchObject({ yewe: 1, m1: 1 });
    expect(o.floor.openTables).toBe(1);
    expect(o.topVenues[0]).toMatchObject({ name: 'Mad Kings', gmv: 4000 });
  });

  it('refuses every change while the admin log is missing, and changes nothing', async () => {
    seed(true, { 'platform_admin_actions.select': () => true });
    const r = await venuePOST(req(`/api/admin/venues/${B}`, 'POST', { action: 'set_plan', planTier: 'rhodium_annual', days: 30 }), params(B));
    expect(r.status).toBe(503);
    expect(ctx.db.tables.venue_subscriptions[1].plan_tier).toBe('m1_pro');
  });

  it('gives a plan, suspends and reviews a venue, each written to the admin log with before and after', async () => {
    seed();
    expect((await venuePOST(req(`/api/admin/venues/${B}`, 'POST', { action: 'set_plan', planTier: 'm2_pro', days: 30 }), params(B))).status).toBe(200);
    expect(ctx.db.tables.venue_subscriptions[1]).toMatchObject({ plan_tier: 'm2_pro', status: 'active' });
    expect((await venuePOST(req(`/api/admin/venues/${B}`, 'POST', { action: 'suspend', reason: 'Fraud check' }), params(B))).status).toBe(200);
    expect(ctx.db.tables.venue_subscriptions[1].status).toBe('suspended');
    expect((await venuePOST(req(`/api/admin/venues/${B}`, 'POST', { action: 'review', status: 'needs_docs', note: 'FSSAI' }), params(B))).status).toBe(200);
    expect(ctx.db.tables.platform_venue_reviews[0]).toMatchObject({ venue_id: B, status: 'needs_docs', reviewed_by: 'admin-1' });
    const log = ctx.db.tables.platform_admin_actions;
    expect(log.map((l: any) => l.action)).toEqual(['venue_set_plan', 'venue_suspend', 'venue_review']);
    expect(log[0]).toMatchObject({ admin_id: 'admin-1', admin_email: 'boss@example.test', venue_id: B });
    expect(log[0].detail.before.plan_tier).toBe('m1_pro');
    expect((await venuePOST(req(`/api/admin/venues/${B}`, 'POST', { action: 'nuke' }), params(B))).status).toBe(400);
  });

  it('publishes a notice every venue sees, and withdraws it', async () => {
    seed();
    expect((await announcementsPOST(req('/api/admin/announcements', 'POST', { title: 'x', severity: 'info' }))).status).toBe(400);
    const made = await (await announcementsPOST(req('/api/admin/announcements', 'POST', { title: 'Maintenance at 2 AM', severity: 'warning', hours: 6 }))).json();
    expect((await (await hostNoticesGET(req('/api/host/announcements'))).json()).announcements).toHaveLength(1);
    expect((await (await announcementsGET(req('/api/admin/announcements'))).json()).announcements).toHaveLength(1);
    await announcementsPATCH(req('/api/admin/announcements', 'PATCH', { id: made.announcement.id }));
    expect((await (await hostNoticesGET(req('/api/host/announcements'))).json()).announcements).toHaveLength(0);
  });

  it('carries a support ticket from the venue to the admin and the reply back', async () => {
    seed();
    expect((await hostSupportPOST(req('/api/host/support', 'POST', { subject: 'POS', body: 'x' }))).status).toBe(400);
    expect((await hostSupportPOST(req('/api/host/support', 'POST', { subject: 'Printer not printing', body: 'KOT stuck since 8 PM', priority: 'urgent' }))).status).toBe(201);
    const queue = await (await supportGET(req('/api/admin/support'))).json();
    expect(queue.tickets[0]).toMatchObject({ venue: 'Bombay Rasoi', priority: 'urgent', status: 'open' });
    await supportPATCH(req('/api/admin/support', 'PATCH', { id: queue.tickets[0].id, status: 'resolved', admin_note: 'Restart the printer app' }));
    const mine = await (await hostSupportGET(req('/api/host/support'))).json();
    expect(mine.tickets[0]).toMatchObject({ status: 'resolved', admin_note: 'Restart the printer app' });
  });

  it('downloads the GST CSV, and keeps Form C (passports) behind the admin log', async () => {
    seed();
    const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
    const from = new Date(Date.now() - 10 * DAY).toISOString().slice(0, 10);
    const gst = await exportGET(req(`/api/admin/exports?type=gst&from=${from}&to=${today}`));
    expect(gst.headers.get('content-type')).toMatch(/text\/csv/);
    const csv = await gst.text();
    expect(csv).toMatch(/Month,Venue,Legal name,GSTIN/);
    expect(csv).toMatch(/Bombay Rasoi/);
    expect(ctx.db.tables.platform_admin_actions.map((l: any) => l.action)).toContain('export_gst');

    seed(true, { 'platform_admin_actions.select': () => true });
    expect((await exportGET(req(`/api/admin/exports?type=form_c&from=${from}&to=${today}`))).status).toBe(503);
  });
});
