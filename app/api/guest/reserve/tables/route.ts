import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { listTablesForSlot } from '@/lib/services/reservations/reservations.service';

export const dynamic = 'force-dynamic';

/** GET /api/guest/reserve/tables?cafe_id=&date=&time=: which tables are free for one slot. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validation = await validateGuestAccess(searchParams.get('cafe_id') || searchParams.get('venue_id'));
  if (validation.error) return validation.error;

  const date = searchParams.get('date') ?? '';
  const time = searchParams.get('time') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: 'date and time are required' }, { status: 400 });
  }

  const tables = await listTablesForSlot(adminDb(), validation.businessId, date, time);
  return NextResponse.json({ success: true, tables }, { headers: { 'Cache-Control': 'no-store' } });
}, 'GuestReserveTablesGET');
