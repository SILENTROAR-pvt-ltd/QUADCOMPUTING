import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import {
  initializeGuestSession,
  getGuestSession,
  updateGuestSession,
} from '@/lib/services/guest-session.service';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryCafeId = searchParams.get('cafe_id') || searchParams.get('business_id');
    const body = await request.json().catch(() => ({}));

    const rawCafeId = queryCafeId || body?.business_id || body?.cafe_id;
    const validation = await validateGuestAccess(rawCafeId, body?.table_number);
    if (validation.error) return validation.error;
    const { businessId, tableNumber } = validation;

    body.business_id = businessId;
    body.cafe_id = businessId;
    body.table_number = tableNumber;

    const supabase = adminDb();
    // A signed-in guest's identity comes from their session, never from the body,
    // so cashback can only ever land in the wallet of the account that's signed in.
    const signedIn = await accountForRequest(supabase, request, businessId);
    if (signedIn) {
      body.guest_handle = signedIn.handle;
      body.guest_name = signedIn.display_name;
      body.customer_phone = signedIn.phone || undefined;
    }

    const result = await initializeGuestSession(body, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Guest Session Error:', error);
    const status = error.message?.includes('not found') ? 404 : (error.message?.includes('Missing') || error.message?.includes('Invalid') ? 400 : 500);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}, 'GuestSessionPOST')

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cafeParamRaw = searchParams.get('cafe_id') || searchParams.get('business_id');
    const tableParamRaw = searchParams.get('table') || searchParams.get('table_number');

    const validation = await validateGuestAccess(cafeParamRaw, tableParamRaw);
    if (validation.error) return validation.error;

    const supabase = adminDb();
    const result = await getGuestSession(request.url, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Guest Session GET Error:', error);
    const status = error.message?.includes('not found') ? 404 : (error.message?.includes('Missing') || error.message?.includes('Invalid') ? 400 : 500);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}, 'GuestSessionGET')

export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryCafeId = searchParams.get('cafe_id') || searchParams.get('business_id');
    const body = await request.json().catch(() => ({}));

    const rawCafeId = queryCafeId || body?.business_id || body?.cafe_id;
    const validation = await validateGuestAccess(rawCafeId, body?.table_number);
    if (validation.error) return validation.error;
    const { businessId, tableNumber } = validation;

    const limited = await enforceRateLimit(request, 'guest_session_patch', 60, 60_000, businessId);
    if (limited) return limited;

    body.business_id = businessId;
    body.cafe_id = businessId;
    body.table_number = tableNumber;

    const supabase = adminDb();
    const result = await updateGuestSession(body, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Guest Session PATCH Error:', error);
    const status = error.message?.includes('not found') ? 404 : (error.message?.includes('Missing') || error.message?.includes('Invalid') ? 400 : 500);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}, 'GuestSessionPATCH')
