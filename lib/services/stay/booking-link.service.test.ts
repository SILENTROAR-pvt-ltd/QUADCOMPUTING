import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { linkBookingToStay, loadOpenBooking } from './booking-link.service';
import { bookingPrefill } from '@/components/host/workspaces/accommodations/checkin/booking-prefill';

const BIZ = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ROOM = '33333333-3333-4333-8333-333333333333';
const row = (over: Record<string, unknown> = {}) => ({
  id: 'bk1', business_id: BIZ, category_id: 'cat1', check_in: '2026-10-21', check_out: '2026-10-23', guests: 3,
  guest_name: 'Asha Rao', guest_phone: '9876543210', guest_email: null, confirmation_code: 'ST-ABC234', status: 'confirmed', ...over,
});

describe('a reservation becoming a stay', () => {
  it('loads only an open booking of this venue', async () => {
    const db = createFakeSupabase({ stay_booking_requests: [row(), row({ id: 'bk2', status: 'checked_in' }), row({ id: 'bk3', business_id: OTHER })] });
    expect((await loadOpenBooking(db, BIZ, 'bk1'))?.confirmation_code).toBe('ST-ABC234');
    expect(await loadOpenBooking(db, BIZ, 'bk2')).toBeNull();
    expect(await loadOpenBooking(db, BIZ, 'bk3')).toBeNull();
  });

  it('closes the booking once; a second desk cannot reuse it', async () => {
    const db = createFakeSupabase({ stay_booking_requests: [row()] });
    expect(await linkBookingToStay(db, 'bk1', ROOM, '2026-10-21T08:00:00.000Z')).toBe(true);
    expect(db.tables.stay_booking_requests[0]).toMatchObject({ status: 'checked_in', room_id: ROOM });
    expect(await linkBookingToStay(db, 'bk1', ROOM)).toBe(false);
  });

  it('fills the desk form from the booking, with the booked check-out at 11:00', () => {
    const p = bookingPrefill(row() as never, '2026-10-21T09:30');
    expect(p).toMatchObject({ guestName: 'Asha Rao', guestPhone: '9876543210', adults: '3', checkOutTime: '2026-10-23T11:00' });
  });

  it('never hands the desk a check-out in the past', () => {
    const p = bookingPrefill(row({ check_out: '2026-10-20' }) as never, '2026-10-21T09:30');
    expect(p.checkOutTime).toBe('2026-10-22T11:00');
  });
});
