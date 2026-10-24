import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { loadEntitlements } from '@/lib/services/billing/feature-gate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/host/plan : what the signed-in venue's plan unlocks now, and where it stands (trial, ending, grace), for the
 * dashboard's locked sections and renewal reminders. The server gates each feature on its own routes regardless.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const e = await loadEntitlements(auth.businessId);
  return NextResponse.json({
    success: true,
    plan: e.plan.id,
    planName: e.state.plan?.name ?? e.plan.name,
    phase: e.state.phase,
    onTrial: e.state.onTrial,
    perBill: e.perBill,
    daysLeft: e.state.daysLeft,
    endsAt: e.state.endsAt,
    features: Array.from(e.features),
    vibeyUntil: e.vibeyUntil,
  }, { headers: { 'Cache-Control': 'no-store' } });
}, 'HostPlanGET');
