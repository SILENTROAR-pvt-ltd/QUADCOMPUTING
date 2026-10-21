import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { attachGuestStays } from '@/lib/services/guests/guest-stays';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };
const FILTERS = ['all', 'repeat', 'spenders', 'recent'] as const;
const HIGH_SPENDER_INR = 5000;
const RECENT_DAYS = 14;

/**
 * GET /api/host/guests?filter=all|repeat|spenders|recent&q= — the venue's guest ledger with its headline numbers. Owner only.
 * The numbers cover the whole ledger; the filter and search only narrow the table.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const q = new URL(request.url).searchParams;
    const filter = (FILTERS as readonly string[]).includes(q.get('filter') || '') ? (q.get('filter') as (typeof FILTERS)[number]) : 'all';
    const search = (q.get('q') || '').trim().toLowerCase().slice(0, 60);
    const db = adminDb();

    const { data, error } = await db.from('venue_guest_ledger').select('*').eq('business_id', auth.businessId)
      .order('last_visit_at', { ascending: false, nullsFirst: false }).limit(2000);
    if (error) {
      const missing = error.code === '42P01' || error.code === 'PGRST205' || /venue_guest_ledger/.test(String(error.message));
      return NextResponse.json({ success: false, error: missing ? 'My Guests needs one database update first (migration 20261016000007_live_events_and_guest_ledger.sql).' : 'Could not load guests.' }, { status: missing ? 409 : 500, headers: NO_STORE });
    }
    // Each guest's stays (from the stay log, by the phone given at check-in) sit beside their visits and spend.
    const all = await attachGuestStays(db, auth.businessId, data || []);
    const since = Date.now() - RECENT_DAYS * 86_400_000;
    const metrics = {
      totalGuests: all.length,
      repeatVisitors: all.filter((g: any) => g.visits >= 2).length,
      totalEventLeads: all.reduce((s: number, g: any) => s + (g.event_leads || 0), 0),
      stayGuests: all.filter((g) => g.stays > 0).length,
      nights: all.reduce((s, g) => s + g.nights, 0),
    };

    let rows = all;
    if (filter === 'repeat') rows = rows.filter((g: any) => g.visits >= 2);
    if (filter === 'spenders') rows = rows.filter((g: any) => Number(g.total_spend) >= HIGH_SPENDER_INR).sort((a: any, b: any) => Number(b.total_spend) - Number(a.total_spend));
    if (filter === 'recent') rows = rows.filter((g: any) => g.last_visit_at && Date.parse(g.last_visit_at) >= since);
    if (search) rows = rows.filter((g: any) => [g.guest_name, g.vibers_handle, g.email, g.phone].some((v) => String(v || '').toLowerCase().includes(search)));

    return NextResponse.json({ success: true, metrics, highSpenderThreshold: HIGH_SPENDER_INR, recentDays: RECENT_DAYS, guests: rows.slice(0, 500) }, { headers: NO_STORE });
  } catch (error) {
    return handleApiError(error, request, 'HostGuestsGET');
  }
}, 'HostGuestsGET');
