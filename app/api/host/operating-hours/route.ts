import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { getVenueHours, upsertVenueHours, type WeekdayHours } from '@/lib/services/reservations/venue-hours.service';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
const TIME_RE = /^\d{2}:\d{2}$/;

function parseHours(raw: unknown): WeekdayHours[] | string {
  if (!Array.isArray(raw) || raw.length !== 7) return 'Hours must be given for all seven days.';
  const rows: WeekdayHours[] = [];
  for (const r of raw as any[]) {
    const weekday = Number(r?.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return 'Invalid weekday.';
    const openTime = String(r.openTime ?? '');
    const closeTime = String(r.closeTime ?? '');
    const isClosed = Boolean(r.isClosed);
    if (!isClosed) {
      if (!TIME_RE.test(openTime) || !TIME_RE.test(closeTime)) return 'Enter opening and closing times.';
      if (closeTime <= openTime) return 'Closing time must be after opening time.';
    }
    rows.push({ weekday, openTime: openTime || '10:00', closeTime: closeTime || '22:00', isClosed });
  }
  return rows;
}

/** GET /api/host/operating-hours: the venue's weekly hours and the reservations switch. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const hours = await getVenueHours(auth.supabase, auth.business.id);
  return NextResponse.json({
    success: true,
    hours,
    reservationsEnabled: Boolean(auth.business.reservations_enabled),
  }, { headers: noStore });
}, 'HostOperatingHoursGET');

/** PUT /api/host/operating-hours: the owner saves hours and the reservations switch. Staff PINs cannot change them. */
export const PUT = withApiErrorBoundary(async function PUT(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  if (auth.staff) return NextResponse.json({ error: 'Only the owner can change opening hours.' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const hours = parseHours(body.hours);
  if (typeof hours === 'string') return NextResponse.json({ error: hours }, { status: 400 });

  const db = adminDb();
  await upsertVenueHours(db, auth.business.id, hours);
  const { error } = await db.from('businesses').update({ reservations_enabled: Boolean(body.reservationsEnabled) }).eq('id', auth.business.id);
  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 });

  return NextResponse.json({ success: true });
}, 'HostOperatingHoursPUT');
