import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { resolveBusinessId } from '@/lib/services/guest-order/business-resolver.service';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { readMenuInfo } from '@/lib/services/menu-info/menu-info';
import { availabilityFromRows, OPEN_BOOKING_STATUSES } from '@/lib/services/stay/stay-availability.service';
import { validateStayBooking, nightsBetween } from '@/lib/services/stay/stay-booking.service';
import { todayIst } from '@/lib/services/reservations/venue-hours.service';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/guest/stay/showcase?venue=<slug or id>[&check_in&check_out]
 * The public room showcase: the venue's room types with photos, amenities and price, how many of each are free now,
 * and, with dates, how many are free for those nights. Nothing about guests or rooms' occupants.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resolved = await resolveBusinessId(searchParams.get('venue') || searchParams.get('cafe_id'));
    if (!resolved.success) return resolved.error;
    const business = resolved.business;
    const limited = await enforceRateLimit(request, 'stay_showcase', 120, 60_000, business.id);
    if (limited) return limited;

    const checkIn = searchParams.get('check_in') || '';
    const checkOut = searchParams.get('check_out') || '';
    const hasRange = DATE.test(checkIn) && DATE.test(checkOut) && nightsBetween(checkIn, checkOut) >= 1;

    const db = adminDb();
    const [{ data: categories, error: catErr }, { data: rooms, error: roomsErr }, bookingsRes] = await Promise.all([
      db.from('room_categories').select('id, name, price, occupancy, total_units, photos, amenities, available_addons').eq('business_id', business.id).order('price', { ascending: true }),
      db.from('rooms').select('id, category_id, status, check_out_date, check_out_time').eq('business_id', business.id),
      hasRange
        ? db.from('stay_booking_requests').select('category_id, check_in, check_out').eq('business_id', business.id).in('status', OPEN_BOOKING_STATUSES)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (catErr) throw catErr;
    if (roomsErr) throw roomsErr;
    if (bookingsRes.error) throw bookingsRes.error;

    const today = todayIst();
    const range = hasRange ? { checkIn, checkOut } : { checkIn: today, checkOut: today };
    const types = (categories || []).map((c: any) => {
      const own = (rooms || []).filter((r: any) => r.category_id === c.id);
      const bookings = (bookingsRes.data || []).filter((b: any) => b.category_id === c.id);
      const a = availabilityFromRows(own, bookings, range.checkIn, range.checkOut);
      return {
        id: c.id, name: c.name, price: Number(c.price) || 0, occupancy: c.occupancy || 2,
        photos: Array.isArray(c.photos) ? c.photos.slice(0, 8) : [], amenities: Array.isArray(c.amenities) ? c.amenities : [],
        addons: Array.isArray(c.available_addons) ? c.available_addons.map((x: any) => ({ name: x.name, price: Number(x.price) || 0 })) : [],
        rooms_total: a.total, vacant_now: a.vacantNow, available_for_dates: hasRange ? a.available : null,
      };
    });

    const info = readMenuInfo(business.menu_info);
    const rangeError = hasRange ? validateStayBooking({ categoryId: '00000000-0000-4000-8000-000000000000', guestName: 'guest', guestPhone: '9999999999', checkIn, checkOut, guests: 1 }, today) : null;
    return NextResponse.json({
      success: true,
      venue: {
        id: business.id, name: business.business_name || business.name || 'Venue', slug: business.slug || null,
        tagline: business.stay_tagline || info.tagline || null, address: info.address || null, phones: info.phones,
        categories: business.categories || [], checkin_time: business.checkin_time || null, checkout_time: business.checkout_time || null,
        self_checkin_enabled: Boolean(business.self_checkin_enabled), in_room_dining_enabled: business.in_room_dining_enabled !== false,
      },
      types,
      range: hasRange ? { check_in: checkIn, check_out: checkOut, nights: nightsBetween(checkIn, checkOut), error: rangeError && !/room type|guest/.test(rangeError) ? rangeError : null } : null,
    }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' } });
  } catch (error) {
    return handleApiError(error, request, 'StayShowcaseGET');
  }
}, 'StayShowcaseGET');
