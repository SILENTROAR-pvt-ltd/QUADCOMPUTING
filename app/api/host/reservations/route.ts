import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { listReservations, updateReservationStatus, type Reservation } from '@/lib/services/reservations/reservations.service';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
const STATUSES: Reservation['status'][] = ['requested', 'confirmed', 'seated', 'cancelled', 'no_show'];

/** GET /api/host/reservations?filter=upcoming|all */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const filter = new URL(request.url).searchParams.get('filter') === 'all' ? 'all' : 'upcoming';
  const reservations = await listReservations(adminDb(), auth.business.id, filter);
  return NextResponse.json({ success: true, reservations }, { headers: noStore });
}, 'HostReservationsGET');

/** PATCH /api/host/reservations: body { id, status }. Owner only. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  if (auth.staff) return NextResponse.json({ error: 'Only the owner can change reservations.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const status = body.status as Reservation['status'];
  if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid reservation update.' }, { status: 400 });
  }
  await updateReservationStatus(adminDb(), id, auth.business.id, status);
  return NextResponse.json({ success: true });
}, 'HostReservationsPATCH');
