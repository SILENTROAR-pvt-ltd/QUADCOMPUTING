import { NextResponse, after } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { checkRateLimit, enforceRateLimit, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { chatJson, vibeyModelConfigured } from '@/lib/vibey/core/llm';
import { spendModelBudget, vibeyFlags } from '@/lib/vibey/core/flags';
import { recordTurn } from '@/lib/vibey/core/telemetry';
import { buildHostGraph, runHostTurn } from '@/lib/vibey/host/graph';
import { loadLockedModules } from '@/lib/vibey/host/locks';
import { hasMasterUnlock, masterUnlockFromCookieHeader } from '@/lib/services/security/master-unlock';
import { hostReplySchema, hostRequestSchema } from '@/lib/vibey/host/schema';
import { makeContext } from '@/lib/vibey/host/tools';
import { hasFeature, requireFeature } from '@/lib/services/billing/feature-gate';

// Node, not Edge: the service-role client and LangGraph's async context need it.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

const graph = buildHostGraph({
  route: (prompt, schema) => chatJson({ ...prompt, schema, timeoutMs: 3500, maxTokens: 250 }),
  reserveModel: async (businessId) => vibeyModelConfigured() && spendModelBudget(businessId, 'host'),
});

function later(job: () => Promise<void>) {
  try { after(job); } catch { void job(); }
}

/** GET /api/host/vibey : whether the co-pilot is on for this venue. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const onPlan = await hasFeature(auth.businessId, 'vibey');
  return NextResponse.json({ enabled: vibeyFlags(auth.business).host && onPlan, planRequired: !onPlan, simple: !vibeyModelConfigured() }, { headers: NO_STORE });
}, 'HostVibeyGET');

/** POST /api/host/vibey : one question about the signed-in venue, answered read-only from the dashboard's own services. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const { businessId } = auth;
  if (!vibeyFlags(auth.business).host) return NextResponse.json({ success: false, error: 'Vibey is not switched on for this venue.' }, { status: 403 });
  const blocked = await requireFeature(businessId, 'vibey');
  if (blocked) return blocked;

  const parsed = hostRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid question.' }, { status: 400 });

  const perIp = await enforceRateLimit(request, 'vibey_host', 30, 60_000);
  if (perIp) return perIp;
  const perVenue = await checkRateLimit({ key: `vibey_host_venue:${businessId}`, limit: 40, windowMs: 60_000 });
  if (!perVenue.allowed) return rateLimitResponse(perVenue, 'Vibey is busy for this venue. Try again in a moment.');

  // The owner's unlock is the server-held master-PIN cookie, never a flag in the request body.
  const screenUnlocked = !auth.staff && hasMasterUnlock(masterUnlockFromCookieHeader(request.headers.get('cookie')), auth.user.id, businessId);
  const locked = await loadLockedModules(businessId, screenUnlocked, Boolean(auth.staff));
  const ctx = makeContext(businessId, auth.supabase, adminDb());
  const { reply, usage, errorCode } = await runHostTurn(graph, { businessId, req: parsed.data, ctx, locked, staff: Boolean(auth.staff) });
  const safe = hostReplySchema.parse(reply);

  later(() => recordTurn(adminDb(), {
    businessId, surface: 'host', intent: safe.meta.tools[0] ?? 'none', actions: safe.meta.tools, path: safe.meta.path,
    model: usage?.model ?? null, latencyMs: safe.meta.ms, tokensIn: usage?.tokensIn, tokensOut: usage?.tokensOut, errorCode,
  }));
  return NextResponse.json(safe, { headers: NO_STORE });
}, 'HostVibeyPOST');
