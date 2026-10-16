import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { currentBillingDay, daysBetween, isBillingDay } from '@/lib/services/wallet/billing-day';
import { parseSlipFilters } from '@/lib/services/wallet/day-slips.util';
import { fetchDaySlips } from '@/lib/services/wallet/day-slips.service';

export const dynamic = 'force-dynamic';

const MAX_DAYS = 366;
const bad = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });

/**
 * GET /api/host/wallet/day-slips?from=YYYY-MM-DD&to=YYYY-MM-DD&fee=all|due|paid|none&payment=all|UPI|CASH|CARD|OTHER&q=…
 * `all=1` instead of from/to reads all time. A billing day runs 10 AM to 10 PM IST and closes at 10 PM.
 * Without dates it is today's billing day.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;

    const params = new URL(request.url).searchParams;
    const allTime = params.get('all') === '1';
    const today = currentBillingDay();
    const from = params.get('from') || today;
    const to = params.get('to') || from;
    if (!allTime) {
      if (!isBillingDay(from) || !isBillingDay(to)) return bad('Dates must be YYYY-MM-DD.');
      const span = daysBetween(from, to);
      if (span < 1) return bad('The start date must be on or before the end date.');
      if (span > MAX_DAYS) return bad('Choose a range of a year or less, or All time.');
    }

    const result = await fetchDaySlips(adminDb(), auth.businessId, allTime ? { from: null, to: null } : { from, to }, parseSlipFilters(params));
    return NextResponse.json(
      { success: true, range: allTime ? { all: true } : { from, to }, today, ...result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'HostWalletDaySlipsGET');
