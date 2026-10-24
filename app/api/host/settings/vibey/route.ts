import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { readVibeySwitches, writeVibeySwitches } from '@/lib/vibey/core/venue-switch';
import { hasFeature, requireFeature } from '@/lib/services/billing/feature-gate';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

/** GET /api/host/settings/vibey → { guest, host, pilot, available }: the venue's own Vibey switches. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const switches = await readVibeySwitches(adminDb(), auth.businessId);
    return NextResponse.json({ success: true, ...switches, onPlan: await hasFeature(auth.businessId, 'vibey') }, { headers: NO_STORE });
  } catch (error: any) {
    return handleApiError(error, request, 'HostVibeySettingGET');
  }
}, 'HostVibeySettingGET');

/** PUT /api/host/settings/vibey { guest?: boolean, host?: boolean }: the owner's switches, for their own venue only. */
export const PUT = withApiErrorBoundary(async function PUT(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const next = {
      ...(typeof body?.guest === 'boolean' ? { guest: body.guest } : {}),
      ...(typeof body?.host === 'boolean' ? { host: body.host } : {}),
    };
    if (Object.keys(next).length === 0) {
      return NextResponse.json({ success: false, error: 'Choose on or off.' }, { status: 400, headers: NO_STORE });
    }
    // Switching Vibey on needs a plan that has it; switching it off never does.
    if (next.guest === true || next.host === true) {
      const blocked = await requireFeature(auth.businessId, 'vibey');
      if (blocked) return blocked;
    }
    const out = await writeVibeySwitches(adminDb(), auth.businessId, next);
    if (!out.ok) {
      return NextResponse.json({ success: false, code: out.code, error: out.error }, { status: out.code === 'NOT_READY' ? 409 : 500, headers: NO_STORE });
    }
    return NextResponse.json({ success: true, ...(await readVibeySwitches(adminDb(), auth.businessId)), onPlan: await hasFeature(auth.businessId, 'vibey') }, { headers: NO_STORE });
  } catch (error: any) {
    return handleApiError(error, request, 'HostVibeySettingPUT');
  }
}, 'HostVibeySettingPUT');
