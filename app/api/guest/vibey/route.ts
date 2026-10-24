import { NextResponse, after } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { checkRateLimit, enforceRateLimit, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { chatJson, vibeyModelConfigured } from '@/lib/vibey/core/llm';
import { spendModelBudget, vibeyFlags } from '@/lib/vibey/core/flags';
import { recordTurn } from '@/lib/vibey/core/telemetry';
import { buildGuestGraph, runGuestTurn, runGuestTurnStream, type GuestTurnResult } from '@/lib/vibey/guest/graph';
import { guestReplySchema, guestRequestSchema } from '@/lib/vibey/guest/schema';
import { loadGuestVenue } from '@/lib/vibey/guest/venue';
import { loadPopularity, venueHour } from '@/lib/vibey/guest/popularity';
import { listPublicEvents } from '@/lib/services/live-events/events.service';
import { hasFeature } from '@/lib/services/billing/feature-gate';

// Node, not Edge: the service-role client, node:crypto and LangGraph's async context need it.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

// One compiled graph per server instance; per-request data travels in its state.
const graph = buildGuestGraph({
  understand: (prompt, schema) => chatJson({ ...prompt, schema, timeoutMs: 3500, maxTokens: 300 }),
  reserveModel: async (businessId) => vibeyModelConfigured() && spendModelBudget(businessId, 'guest'),
  loadEvents: async (businessId) => ((await hasFeature(businessId, 'events')) ? listPublicEvents(adminDb(), businessId) : []),
  // A guest writing in another language gets the reply translated (dish names and prices are kept out of the model's reach).
  translate: (prompt, schema) => chatJson({ ...prompt, schema, timeoutMs: 4000, maxTokens: 600 }),
});

/** Runs work after the response is sent; outside a request (tests) it simply runs. */
function later(job: () => Promise<void>) {
  try { after(job); } catch { void job(); }
}

/** GET /api/guest/vibey?cafe_id= : whether this venue offers Vibey, and whether it is in rules-only mode. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const cafe = new URL(request.url).searchParams.get('cafe_id');
  const validation = await validateGuestAccess(cafe);
  if (validation.error) return validation.error;
  const limited = await enforceRateLimit(request, 'vibey_guest_status', 120, 60_000, validation.businessId);
  if (limited) return limited;
  const venue = await loadGuestVenue(adminDb(), validation.businessId);
  // Vibey is a Rhodium feature (or the add-on on M¹-Pro / M²-Pro): on any other plan the launcher stays hidden.
  const enabled = Boolean(venue && vibeyFlags(venue.business).guest) && (await hasFeature(validation.businessId, 'vibey'));
  return NextResponse.json({ enabled, simple: enabled && !vibeyModelConfigured() }, { headers: NO_STORE });
}, 'GuestVibeyGET');

/** POST /api/guest/vibey : one guest message in, one proposed tray change (never an order) out. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const parsed = guestRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid message.' }, { status: 400 });
  const req = parsed.data;

  const validation = await validateGuestAccess(req.cafe_id, req.table_number);
  if (validation.error) return validation.error;
  const { businessId, tableNumber } = validation;

  const perIp = await enforceRateLimit(request, 'vibey_guest', 30, 60_000);
  if (perIp) return perIp;
  const perTable = await checkRateLimit({ key: `vibey_guest_table:${businessId}:${String(tableNumber).replace(/\W/g, '_')}`, limit: 20, windowMs: 60_000 });
  if (!perTable.allowed) return rateLimitResponse(perTable, 'Vibey needs a short breather. Try again in a moment, or order from the menu.');

  const db = adminDb();
  const venue = await loadGuestVenue(db, businessId);
  if (!venue) return NextResponse.json({ success: false, error: 'Venue not found.' }, { status: 404 });
  if (!vibeyFlags(venue.business).guest || !(await hasFeature(businessId, 'vibey', db))) return NextResponse.json({ success: false, error: 'Vibey is not available at this venue.' }, { status: 403 });

  const popularity = await loadPopularity(db, businessId);
  const input = {
    businessId, menu: venue.dishes, featured: venue.featured, popularity, hour: venueHour(),
    req: { ...req, table_number: tableNumber ?? req.table_number },
  };
  const finish = (result: GuestTurnResult) => {
    const safe = guestReplySchema.parse(result.reply);
    later(() => recordTurn(db, {
      businessId, surface: 'guest', tableNumber, intent: safe.meta.intent, path: safe.meta.path,
      actions: safe.actions.map((a) => ('itemId' in a ? { type: a.type, itemId: a.itemId, qty: 'qty' in a ? a.qty : undefined } : { type: a.type })),
      model: result.usage?.model ?? null, latencyMs: safe.meta.ms, tokensIn: result.usage?.tokensIn, tokensOut: result.usage?.tokensOut, errorCode: result.errorCode,
    }));
    return safe;
  };

  // The chat asks for a stream: each graph step is sent as it finishes ("step"), then the reply ("reply").
  if ((request.headers.get('accept') || '').includes('text/event-stream')) {
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        try {
          send('reply', finish(await runGuestTurnStream(graph, input, (step) => send('step', { step }))));
        } catch (err: any) {
          console.error('[vibey] guest stream failed:', err?.message);
          send('error', { error: 'Vibey could not answer just now. You can still order from the menu.' });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(body, { headers: { ...NO_STORE, 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive' } });
  }
  return NextResponse.json(finish(await runGuestTurn(graph, input)), { headers: NO_STORE });
}, 'GuestVibeyPOST');
