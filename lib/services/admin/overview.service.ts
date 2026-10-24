// The dashboard: for a window of 7, 30 or 90 days against the window before it, platform GMV, bills, active venues,
// average bill, platform income and new venues; GMV per day (F&B and stays); top venues; the latest payments; the
// newest venues; and, right now, the floor, the plan mix and the queues. Every figure is read at request time.
import { businessDayRange } from '@/lib/utils/business-day';
import { planState } from '@/lib/services/wallet/subscription-state';
import { PER_BILL_PLAN } from '@/lib/services/wallet/plans';
import { loadDaily } from './rollup.service';
import { byVenue, lastDays, seriesByDay, totals } from './rollup';
import { readAll } from './read-all';

const DAY = 86_400_000;
const num = (v: unknown) => Number(v) || 0;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** A row count, or null when the table is not there (a migration not applied) or unreadable. */
export async function countRows(db: any, table: string, filter: (q: any) => any = (q) => q): Promise<number | null> {
  const { count, error } = await filter(db.from(table).select('*', { count: 'exact', head: true }));
  return error ? null : count ?? 0;
}

export type PlanBucket = 'yewe' | 'm1' | 'm2' | 'rhodium' | 'legacy';

/** Venues per plan in force now, plus trials, grace weeks, suspensions and running Vibey add-ons. */
export function planMix(subs: any[], now = Date.now()) {
  const mix: Record<PlanBucket, number> = { yewe: 0, m1: 0, m2: 0, rhodium: 0, legacy: 0 };
  let trials = 0; let grace = 0; let suspended = 0; let vibey = 0;
  for (const s of subs) {
    const st = planState(s, now);
    const id = st.feesWaived ? st.plan?.id : null;
    const bucket: PlanBucket = !id ? 'yewe' : id === 'm1_pro' ? 'm1' : id === 'm2_pro' ? 'm2' : id === 'rhodium_annual' ? 'rhodium' : 'legacy';
    mix[bucket] += 1;
    if (st.onTrial) trials += 1;
    if (st.phase === 'grace') grace += 1;
    if (s.status === 'suspended') suspended += 1;
    if (s.vibey_until && Date.parse(s.vibey_until) > now) vibey += 1;
  }
  return { mix, trials, grace, suspended, vibey };
}

/** ₹3 fees taken plus payments approved (plans, add-ons, setup and credit) between two instants. */
function income(fees: any[], payments: any[], fromISO: string, toISO: string) {
  const f = fees.filter((x) => x.created_at >= fromISO && x.created_at < toISO).reduce((a, x) => a + num(x.cost), 0);
  const p = payments.filter((x) => (x.reviewed_at || x.created_at) >= fromISO && (x.reviewed_at || x.created_at) < toISO).reduce((a, x) => a + num(x.amount), 0);
  return { fees: r2(f), payments: r2(p), total: r2(f + p) };
}

export async function loadOverview(db: any, days: number, now = Date.now()) {
  const span = lastDays(days * 2, now);
  const current = span.slice(days);
  const fromISO = businessDayRange(span[0]).start.toISOString();
  const curISO = businessDayRange(current[0]).start.toISOString();
  const nowISO = new Date(now).toISOString();

  const [daily, venues, subs, fees, payments, latestPayments, locs, openTables, guestsOnline, staffToday, roomsOccupied, pendingPayments, openTickets, pendingReviews] = await Promise.all([
    loadDaily(db, fromISO),
    readAll(db, 'businesses', 'id, business_name, name, created_at, categories', (q) => q.order('created_at', { ascending: false })),
    readAll(db, 'venue_subscriptions', 'venue_id, plan_tier, status, trial_ends_at, expires_at, vibey_until'),
    readAll(db, 'usage_ledger', 'cost, created_at', (q) => q.eq('action_type', 'bill_generate').gte('created_at', fromISO).order('created_at', { ascending: true })),
    readAll(db, 'venue_topup_requests', 'amount, reviewed_at, created_at', (q) => q.eq('status', 'approved').gte('created_at', new Date(Date.parse(fromISO) - 7 * DAY).toISOString())),
    db.from('venue_topup_requests').select('id, venue_id, amount, request_type, requested_plan_tier, status, utr_number, created_at').order('created_at', { ascending: false }).limit(6),
    readAll(db, 'locations', 'business_id, city'),
    countRows(db, 'dine_in_sessions', (q) => q.eq('status', 'open')),
    countRows(db, 'guest_auth_sessions', (q) => q.gte('last_seen_at', new Date(now - 15 * 60_000).toISOString())),
    countRows(db, 'staff_profiles', (q) => q.gte('last_login_at', new Date(now - 12 * 3_600_000).toISOString())),
    countRows(db, 'rooms', (q) => q.eq('status', 'OCCUPIED')),
    countRows(db, 'venue_topup_requests', (q) => q.eq('status', 'pending')),
    countRows(db, 'support_tickets', (q) => q.neq('status', 'resolved')),
    countRows(db, 'platform_venue_reviews', (q) => q.in('status', ['pending', 'needs_docs'])),
  ]);
  if (venues.error) throw venues.error;

  const all = venues.data || [];
  const names = new Map<string, string>(all.map((b: any) => [b.id, b.business_name || b.name || 'Venue']));
  const city = new Map<string, string>((locs.data || []).map((l: any) => [l.business_id, l.city]));
  const subByVenue = new Map<string, any>((subs.data || []).map((s: any) => [s.venue_id, s]));
  const rows = daily.data;
  const cur = totals(rows.filter((r) => r.day >= current[0]));
  const prev = totals(rows.filter((r) => r.day < current[0]));
  const planName = (id: string) => { const st = planState(subByVenue.get(id) || null, now); return st.feesWaived ? st.plan?.name || 'Plan' : PER_BILL_PLAN.name; };

  return {
    asOf: nowISO,
    days,
    source: daily.source,
    current: { ...cur, avgBill: cur.orders ? r2(cur.gmv / cur.orders) : 0, income: income(fees.data || [], payments.data || [], curISO, nowISO), newVenues: all.filter((b: any) => b.created_at >= curISO).length },
    previous: { ...prev, avgBill: prev.orders ? r2(prev.gmv / prev.orders) : 0, income: income(fees.data || [], payments.data || [], fromISO, curISO), newVenues: all.filter((b: any) => b.created_at >= fromISO && b.created_at < curISO).length },
    venuesTotal: all.length,
    series: seriesByDay(rows, current),
    topVenues: byVenue(rows, current[0]).slice(0, 5).map((v) => ({ ...v, name: names.get(v.venue_id) || 'Venue', city: city.get(v.venue_id) || null })),
    latestPayments: (latestPayments.data || []).map((p: any) => ({ ...p, venue: names.get(p.venue_id) || 'Venue' })),
    newestVenues: all.slice(0, 5).map((b: any) => ({ id: b.id, name: names.get(b.id), city: city.get(b.id) || null, createdAt: b.created_at, plan: planName(b.id), categories: b.categories || [] })),
    floor: { openTables, guestsOnline, staffToday, roomsOccupied },
    queues: { pendingPayments, openTickets, pendingReviews },
    plans: planMix(subs.data || [], now),
  };
}
