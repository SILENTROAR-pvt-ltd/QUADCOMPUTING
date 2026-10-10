import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess, UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';

// guest_sessions only feeds lobby presence; the guest does not need it to order. So a failed write
// does not block them, but it is reported as `persisted: false` (and logged) instead of being
// disguised as success, and nothing is kept in per-instance memory that other instances can't see.

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryCafeId = searchParams.get('cafe_id') || searchParams.get('business_id');

  const body = await request.json().catch(() => ({}));
  const { guest_name, table_number, cafe_id: bodyCafeId } = body;

  // QR / URL cafe_id takes precedence; never derived from body when QR is present
  const rawCafeId = queryCafeId || bodyCafeId;

  const validation = await validateGuestAccess(rawCafeId, table_number);
  if (validation.error) return validation.error;
  const { businessId, tableNumber } = validation;

  const limited = await enforceRateLimit(request, 'guest_onboard', 240, 60_000, businessId);
  if (limited) return limited;

  if (!guest_name || typeof guest_name !== 'string' || !guest_name.trim()) {
    return NextResponse.json({ success: false, error: 'guest_name is required' }, { status: 400 });
  }

  const normalizedName = guest_name.trim().slice(0, 60);
  const customerId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const newGuestRecord = {
    customer_id: customerId,
    session_id: customerId,
    cafe_id: businessId,
    table_number: tableNumber!,
    guest_name: normalizedName,
    avatar: '☕',
    status: 'active',
    created_at: nowIso,
    updated_at: nowIso,
  };

  const db = adminDb();

  const { data, error } = await db.from('guest_sessions').insert([newGuestRecord]).select('*').single();
  if (!error && data) {
    return NextResponse.json({ success: true, customer_id: data.customer_id || customerId, session: data, persisted: true });
  }

  // Older deployments may lack the customer_id/cafe_id columns; retry with the base columns only.
  console.error('[POST /api/guest/onboard] full insert failed, retrying base columns:', error?.message);
  const { data: retryData, error: retryError } = await db
    .from('guest_sessions')
    .insert([{ session_id: customerId, table_number: tableNumber!, guest_name: normalizedName, avatar: '☕', status: 'active' }])
    .select('*')
    .single();

  if (!retryError && retryData) {
    return NextResponse.json({
      success: true,
      customer_id: customerId,
      session: { ...retryData, customer_id: customerId, cafe_id: businessId },
      persisted: true,
    });
  }

  console.error('[POST /api/guest/onboard] guest session NOT stored:', retryError?.message);
  return NextResponse.json({
    success: true,
    customer_id: customerId,
    session: newGuestRecord,
    persisted: false,
  });
}, 'GuestOnboardPOST')

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id');

  if (!customerId || !UUID_REGEX.test(customerId)) {
    return NextResponse.json({ error: 'Missing or invalid customer_id parameter' }, { status: 400 });
  }

  const { data, error } = await adminDb()
    .from('guest_sessions')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    console.error('[GET /api/guest/onboard]', error.message);
    return NextResponse.json({ success: false, error: 'Could not load the session' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

  return NextResponse.json({ success: true, session: data });
}, 'GuestOnboardGET')
