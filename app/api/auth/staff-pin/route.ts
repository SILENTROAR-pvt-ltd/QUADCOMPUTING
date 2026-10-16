import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { checkStaffPin, findVenueById, findVenueBySlug, isFourDigitPin, listLoginStaff } from '@/lib/services/staff-auth/staff-login.service';
import { terminalPath } from '@/lib/services/staff-auth/staff-roles';
import { signStaffSession, staffSecret, STAFF_COOKIE, STAFF_SESSION_SECONDS } from '@/lib/services/staff-auth/staff-session';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, error, ...extra }, { status, headers: NO_STORE });

/** The venue a request names: `business_id` (the staff link) or, for older links, `slug`. */
const venueFor = (db: any, businessId: unknown, slug: unknown) =>
  businessId ? findVenueById(db, businessId) : findVenueBySlug(db, String(slug || ''));

/** GET /api/auth/staff-pin?business_id=<venue> — the venue's name and who can sign in (names and roles only). */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const businessId = q.get('business_id');
  const limited = await enforceRateLimit(request, 'staff_pin_list', 60, 60_000, businessId || q.get('slug') || 'none');
  if (limited) return limited;
  const db = adminDb();
  const venue = await venueFor(db, businessId, q.get('slug'));
  if (!venue) return fail('This sign-in link is not valid.', 404);
  return NextResponse.json({ success: true, venue: { name: venue.name }, staff: await listLoginStaff(db, venue.id) }, { headers: NO_STORE });
}, 'StaffPinGET');

/** POST /api/auth/staff-pin  { business_id, staff_id, pin } — signs the staff member in and says where to go. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const secret = staffSecret();
  if (!secret) return fail('Staff sign-in is not set up on this server yet.', 503);

  const body = await request.json().catch(() => ({}));
  const slug = String(body?.business_id || body?.slug || '');
  const staffId = String(body?.staff_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(staffId) || !isFourDigitPin(body?.pin)) return fail('Choose your name and enter your 4-digit PIN.', 400);

  const limited = await enforceRateLimit(request, 'staff_pin_login', 30, 60_000, slug || 'none');
  if (limited) return limited;

  const db = adminDb();
  const venue = await venueFor(db, body?.business_id, body?.slug);
  if (!venue) return fail('This sign-in link is not valid.', 404);

  const out = await checkStaffPin(db, venue.id, staffId, body.pin);
  if (!out.ok) {
    if (out.code === 'LOCKED') {
      const mins = Math.max(1, Math.ceil((out.retryAfterSeconds ?? 300) / 60));
      return fail(`Too many wrong PINs. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or ask the owner.`, 423, { code: 'LOCKED', retryAfterSeconds: out.retryAfterSeconds });
    }
    // An unknown person and a wrong PIN look the same from outside.
    return fail(out.code === 'WRONG' && out.triesLeft !== undefined ? `That PIN is not right. ${out.triesLeft} ${out.triesLeft === 1 ? 'try' : 'tries'} left.` : 'That PIN is not right.', 401, { code: 'WRONG' });
  }

  const exp = Math.floor(Date.now() / 1000) + STAFF_SESSION_SECONDS;
  const token = await signStaffSession({ sid: out.staff.id, bid: venue.id, role: out.staff.role, name: out.staff.name, exp }, secret);
  const res = NextResponse.json(
    { success: true, staff: { name: out.staff.name, role: out.staff.role }, redirect: terminalPath(venue.id, out.staff.role) },
    { headers: NO_STORE },
  );
  res.cookies.set(STAFF_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: STAFF_SESSION_SECONDS });
  return res;
}, 'StaffPinPOST');

/** DELETE /api/auth/staff-pin — signs out. */
export const DELETE = withApiErrorBoundary(async function DELETE() {
  const res = NextResponse.json({ success: true }, { headers: NO_STORE });
  res.cookies.set(STAFF_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return res;
}, 'StaffPinDELETE');
