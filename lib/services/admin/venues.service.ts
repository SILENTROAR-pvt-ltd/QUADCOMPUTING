// The venue directory for the super admin: who each venue is, the plan in force, money (wallet, dues, last 30 days),
// compliance (GSTIN, FSSAI, PAN, foreign-guest records for Form C) and the review status. Read live, all venues at once.
import { RULES } from '@/lib/services/profile/profile-rules';
import { gstStatusOf } from '@/lib/services/billing/gst-policy';
import { planState } from '@/lib/services/wallet/subscription-state';
import { PER_BILL_PLAN } from '@/lib/services/wallet/plans';
import { loadDaily } from './rollup.service';
import { readAll } from './read-all';
import { byVenue, lastDays } from './rollup';

const BUSINESS_COLUMNS = 'id, host_id, business_name, name, slug, categories, created_at, email, contact_phone, gst_number, gst_verified_number, fssai_number, pan_number, legal_name';
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s/g, '').toUpperCase() : '');
const sumBy = (rows: any[], key: string, val: string) => rows.reduce((m, r) => m.set(r[key], (m.get(r[key]) || 0) + (Number(r[val]) || 0)), new Map<string, number>());
const countBy = (rows: any[], key: string) => rows.reduce((m, r) => m.set(r[key], (m.get(r[key]) || 0) + 1), new Map<string, number>());

export async function loadVenueDirectory(db: any, now = Date.now()) {
  const days30 = lastDays(30, now);
  const [biz, locs, subs, wallets, dues, rooms, foreign, reviews, daily] = await Promise.all([
    readAll(db, 'businesses', BUSINESS_COLUMNS, (q) => q.order('created_at', { ascending: false })),
    readAll(db, 'locations', 'business_id, city, state'),
    readAll(db, 'venue_subscriptions', 'venue_id, plan_tier, status, trial_ends_at, expires_at, trial_used_at, setup_fee_paid_at, vibey_until'),
    readAll(db, 'venue_wallets', 'venue_id, balance'),
    readAll(db, 'venue_outstanding_bills', 'venue_id, amount', (q) => q.eq('status', 'unpaid')),
    readAll(db, 'rooms', 'business_id'),
    readAll(db, 'room_stay_logs', 'business_id', (q) => q.eq('is_foreign_national', true)),
    readAll(db, 'platform_venue_reviews', 'venue_id, status, note, reviewed_at'),
    loadDaily(db, new Date(now - 31 * 86_400_000).toISOString()),
  ]);
  if (biz.error) throw biz.error;
  const owners = await readAll(db, 'profiles', 'id, full_name', (q) => q.eq('role', 'host'));

  const city = new Map<string, any>((locs.data || []).map((l: any) => [l.business_id, l]));
  const sub = new Map<string, any>((subs.data || []).map((s: any) => [s.venue_id, s]));
  const owner = new Map<string, string>((owners.data || []).map((p: any) => [p.id, p.full_name]));
  const wallet = sumBy(wallets.data || [], 'venue_id', 'balance');
  const due = sumBy(dues.data || [], 'venue_id', 'amount');
  const roomCount = countBy(rooms.data || [], 'business_id');
  const foreignCount = countBy(foreign.data || [], 'business_id');
  const review = new Map<string, any>((reviews.data || []).map((r: any) => [r.venue_id, r]));
  const money = new Map(byVenue(daily.data, days30[0]).map((v) => [v.venue_id, v]));

  return (biz.data || []).map((b: any) => {
    const s = sub.get(b.id) || null;
    const st = planState(s, now);
    const gst = gstStatusOf(b);
    const fssai = clean(b.fssai_number);
    const m = money.get(b.id);
    return {
      id: b.id, name: b.business_name || b.name || 'Venue', slug: b.slug, categories: b.categories || [], createdAt: b.created_at,
      city: city.get(b.id)?.city || null, state: city.get(b.id)?.state || null, owner: owner.get(b.host_id) || null,
      email: b.email || null, phone: b.contact_phone || null, legalName: b.legal_name || null,
      plan: {
        tier: s?.plan_tier || 'pay_as_you_go', status: s?.status || 'active', name: st.feesWaived ? st.plan?.name : PER_BILL_PLAN.name,
        phase: st.phase, onTrial: st.onTrial, endsAt: st.endsAt, daysLeft: st.daysLeft, vibeyUntil: s?.vibey_until || null,
        trialUsed: Boolean(s?.trial_used_at), setupPaid: Boolean(s?.setup_fee_paid_at),
      },
      wallet: Math.round((wallet.get(b.id) || 0) * 100) / 100,
      dues: Math.round((due.get(b.id) || 0) * 100) / 100,
      last30: { gmv: m?.gmv || 0, orders: m?.orders || 0, stay: m?.stay || 0, lastDay: m?.lastDay || null },
      compliance: {
        gstin: gst.gstin, gstValid: Boolean(gst.gstin && RULES.gst.re.test(gst.gstin)), gstConfirmed: gst.verified,
        fssai: fssai || null, fssaiValid: RULES.fssai.re.test(fssai), pan: Boolean(clean(b.pan_number)),
        rooms: roomCount.get(b.id) || 0, foreignStays: foreignCount.get(b.id) || 0,
      },
      review: review.get(b.id) || null,
    };
  });
}

export type VenueRow = Awaited<ReturnType<typeof loadVenueDirectory>>[number];
