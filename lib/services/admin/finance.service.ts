// The platform's money, read live: what venues paid us (plans, setup, ₹3 bill fees), what they still owe (dues), and
// what we and the venues hold for others (venue credit not yet used, guests' cashback balances).
import { readAllPages } from '@/lib/services/analytics/fetch-data.service';
import { businessDateString } from '@/lib/utils/business-day';
import { readAll } from './read-all';

const num = (v: unknown) => Number(v) || 0;
const r2 = (n: number) => Math.round(n * 100) / 100;
const month = (iso: string) => businessDateString(new Date(iso)).slice(0, 7);

export async function loadFinance(db: any, now = Date.now()) {
  const since30 = new Date(now - 30 * 86_400_000).toISOString();
  const [ledger, dues, venueWallets, guestWallets, payments, venues] = await Promise.all([
    readAllPages((f, t) => db.from('usage_ledger').select('venue_id, action_type, cost, metadata, created_at')
      .in('action_type', ['bill_generate', 'PLAN_PURCHASE', 'WALLET_TOPUP']).order('created_at', { ascending: true }).range(f, t)),
    readAllPages((f, t) => db.from('venue_outstanding_bills').select('venue_id, amount').eq('status', 'unpaid').range(f, t)),
    readAll(db, 'venue_wallets', 'venue_id, balance'),
    readAllPages((f, t) => db.from('guest_wallets').select('balance, total_cashback_earned').range(f, t)),
    readAll(db, 'venue_topup_requests', 'venue_id, amount, request_type, requested_plan_tier, status, reviewed_at, created_at', (q) => q.eq('status', 'approved')),
    readAll(db, 'businesses', 'id, business_name, name'),
  ]);
  for (const r of [ledger, dues, guestWallets]) if (r.error) throw r.error;

  const names = new Map<string, string>((venues.data || []).map((b: any) => [b.id, b.business_name || b.name || 'Venue']));
  const perVenue = new Map<string, { fees: number; fees30: number; dues: number; wallet: number }>();
  const row = (id: string) => perVenue.get(id) ?? perVenue.set(id, { fees: 0, fees30: 0, dues: 0, wallet: 0 }).get(id)!;
  // A plan payment's amount includes any setup paid with it; that part is moved to "setup" so nothing is counted twice.
  const byMonth = new Map<string, { fees: number; plans: number; setup: number; setupInPlans: number }>();
  const mrow = (m: string) => byMonth.get(m) ?? byMonth.set(m, { fees: 0, plans: 0, setup: 0, setupInPlans: 0 }).get(m)!;

  let fees = 0; let fees30 = 0; let setup = 0; let setupInPlans = 0;
  for (const l of ledger.rows) {
    if (l.action_type === 'bill_generate') {
      fees += num(l.cost); row(l.venue_id).fees += num(l.cost); mrow(month(l.created_at)).fees += num(l.cost);
      if (l.created_at >= since30) { fees30 += num(l.cost); row(l.venue_id).fees30 += num(l.cost); }
    } else {
      const s = num(l.metadata?.setup_fee);
      setup += s; mrow(month(l.created_at)).setup += s;
      if (l.action_type === 'PLAN_PURCHASE') { setupInPlans += s; mrow(month(l.created_at)).setupInPlans += s; }
    }
  }
  for (const d of dues.rows) row(d.venue_id).dues += num(d.amount);
  for (const w of venueWallets.data || []) row(w.venue_id).wallet += num(w.balance);

  let plans = 0; let credit = 0;
  for (const p of payments.data || []) {
    const isPlan = p.request_type === 'plan_subscription';
    if (isPlan) { plans += num(p.amount); mrow(month(p.reviewed_at || p.created_at)).plans += num(p.amount); } else credit += num(p.amount);
  }

  const months = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
    .map(([m, v]) => ({ month: m, fees: r2(v.fees), plans: r2(Math.max(0, v.plans - v.setupInPlans)), setup: r2(v.setup) }));
  return {
    collected: { fees: r2(fees), fees30: r2(fees30), plans: r2(Math.max(0, plans - setupInPlans)), setup: r2(setup), creditSold: r2(credit) },
    owed: { dues: r2(dues.rows.reduce((a: number, d: any) => a + num(d.amount), 0)), duesCount: dues.rows.length },
    held: {
      venueCredit: r2((venueWallets.data || []).reduce((a: number, w: any) => a + num(w.balance), 0)),
      guestCashback: r2(guestWallets.rows.reduce((a: number, w: any) => a + num(w.balance), 0)),
      cashbackIssued: r2(guestWallets.rows.reduce((a: number, w: any) => a + num(w.total_cashback_earned), 0)),
    },
    months,
    venues: Array.from(perVenue.entries()).map(([id, v]) => ({ id, name: names.get(id) || 'Venue', fees: r2(v.fees), fees30: r2(v.fees30), dues: r2(v.dues), wallet: r2(v.wallet) }))
      .sort((a, b) => b.dues - a.dues || b.fees - a.fees),
  };
}
