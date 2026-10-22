import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { addonTotal, buildStayFolio, stayNights } from '@/lib/services/accommodation/stay-folio.util';

const ctx = vi.hoisted(() => ({ db: null as any }));
const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const ROOM = 'bbbbbbbb-1111-4222-8333-444444444444';
vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, supabase: ctx.db, user: { id: 'host-1' } }),
}));

import { PATCH } from '@/app/api/host/accommodations/rooms/[id]/status/route';

const patch = (body: unknown) => PATCH(
  new Request(`http://localhost/api/host/accommodations/rooms/${ROOM}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  { params: Promise.resolve({ id: ROOM }) },
);
const room = (over: Record<string, unknown> = {}) => ({
  id: ROOM, business_id: BIZ, room_number: '101', status: 'VACANT', selected_addons: [],
  category: { id: 'cat', name: 'Mount View', price: 5000 }, ...over,
});
const breakfast = { id: 'a2', name: 'Breakfast', price: 350, billingType: 'per_person_per_day' };

describe('What a stay costs (one set of rules for quote, folio and checkout)', () => {
  it('counts hotel nights by India calendar date, at least one', () => {
    expect(stayNights('2026-10-08T08:30:00Z', '2026-10-09T05:30:00Z')).toBe(1); // 2pm in, 11am out next day
    expect(stayNights('2026-10-08T08:30:00Z', '2026-10-10T10:30:00Z')).toBe(2); // late checkout is not a third night
    expect(stayNights('2026-10-08T08:30:00Z', '2026-10-08T12:30:00Z')).toBe(1);
  });

  it('bills per-person add-ons for the people booked, and per-night ones per night', () => {
    expect(addonTotal({ ...breakfast, persons: 2 }, 3)).toBe(2100);
    expect(addonTotal(breakfast, 3)).toBe(1050); // older stays without persons count one
    expect(addonTotal({ name: 'Mattress', price: 500, billingType: 'per_night' }, 3)).toBe(1500);
    expect(addonTotal({ name: 'Cake', price: 900, billingType: 'per_stay' }, 3)).toBe(900);
  });

  it('builds folio lines whose amounts add up to the total', () => {
    const f = buildStayFolio({ roomId: ROOM, roomNumber: '101', categoryName: 'Mount View', rate: 5000, nights: 2, addons: [{ ...breakfast, persons: 2 }] });
    expect(f).toMatchObject({ tariffTotal: 10000, addonsTotal: 1400, total: 11400 });
    expect(f.lines.reduce((s, l) => s + l.price * l.qty, 0)).toBe(11400);
  });
});

describe('Front desk room changes', () => {
  beforeEach(() => { ctx.db = createFakeSupabase({ rooms: [room()], orders: [], room_stay_logs: [] }); });

  it('checks a guest in and opens the folio at the quoted price, with the stay log left open', async () => {
    const res = await patch({
      action: 'check-in', guest_name: 'Asha', guest_phone: '9876543210', id_type: 'Aadhaar Card', id_number: '1234 5678 9012', dpdp_consent_accepted: true, total_guests: 2,
      check_in_time: '2026-10-08T08:30:00Z', check_out_time: '2026-10-10T05:30:00Z', selected_addons: [{ ...breakfast, persons: 2 }],
    });
    expect(res.status).toBe(200);
    expect(ctx.db.tables.rooms[0]).toMatchObject({ status: 'OCCUPIED', guest_name: 'Asha' });
    const folio = ctx.db.tables.orders.find((o: any) => o.order_type === 'room_stay');
    expect(folio).toMatchObject({ status: 'active', grand_total: 11400, table_number: 'ROOM 101' });
    expect(ctx.db.tables.room_stay_logs[0]).toMatchObject({ guest_name: 'Asha', check_out_time: null });
  });

  it('refuses a desk check-in without the ID number or the guest\'s consent, and leaves the room free', async () => {
    const base = { action: 'check-in', guest_name: 'Asha', guest_phone: '9876543210', check_in_time: '2026-10-08T08:30:00Z', check_out_time: '2026-10-09T05:30:00Z' };
    const noId = await patch({ ...base, dpdp_consent_accepted: true });
    expect(noId.status).toBe(400);
    expect((await noId.json()).error).toMatch(/ID number/);
    const noConsent = await patch({ ...base, id_number: 'ABCD1234' });
    expect(noConsent.status).toBe(400);
    expect((await noConsent.json()).error).toMatch(/agrees/);
    expect(ctx.db.tables.rooms[0].status).toBe('VACANT');
    expect((await patch({ ...base, id_number: 'ABCD1234', dpdp_consent_accepted: true })).status).toBe(200);
  });

  it('never checks a second guest into an occupied room', async () => {
    ctx.db.tables.rooms[0].status = 'OCCUPIED';
    ctx.db.tables.rooms[0].guest_name = 'Ravi';
    const res = await patch({ action: 'check-in', guest_name: 'Asha', guest_phone: '1' });
    expect(res.status).toBe(409);
    expect(ctx.db.tables.rooms[0].guest_name).toBe('Ravi');
  });

  it('will not release an occupied room except through checkout, so no stay goes unbilled', async () => {
    ctx.db.tables.rooms[0].status = 'OCCUPIED';
    ctx.db.tables.orders.push({ id: 'o1', business_id: BIZ, room_id: ROOM, order_type: 'room_stay', status: 'active', grand_total: 5000 });
    for (const body of [{ status: 'CLEANING' }, { action: 'mark-clean' }, { status: 'MAINTENANCE' }]) {
      expect((await patch(body)).status).toBe(409);
    }
    expect(ctx.db.tables.rooms[0].status).toBe('OCCUPIED');
    expect(ctx.db.tables.orders[0].status).toBe('active');
  });

  it('moves a free room through housekeeping back to vacant, and renames it', async () => {
    expect((await patch({ status: 'CLEANING' })).status).toBe(200);
    expect(ctx.db.tables.rooms[0].status).toBe('CLEANING');
    expect((await patch({ action: 'mark-clean', status: 'VACANT' })).status).toBe(200);
    expect((await patch({ room_number: ' 201 ' })).status).toBe(200);
    expect(ctx.db.tables.rooms[0]).toMatchObject({ status: 'VACANT', room_number: '201' });
  });

  it('does not overwrite a previous guest\'s invoice still waiting for payment', async () => {
    ctx.db.tables.orders.push({ id: 'old', business_id: BIZ, room_id: ROOM, order_type: 'room_stay', status: 'ready_for_settlement', grand_total: 7000, customer_name: 'Ravi' });
    await patch({ action: 'check-in', guest_name: 'Asha', guest_phone: '9', id_number: 'ABCD1234', dpdp_consent_accepted: true, check_in_time: '2026-10-08T08:30:00Z', check_out_time: '2026-10-09T05:30:00Z' });
    expect(ctx.db.tables.orders.find((o: any) => o.id === 'old')).toMatchObject({ status: 'ready_for_settlement', grand_total: 7000, customer_name: 'Ravi' });
    expect(ctx.db.tables.orders.filter((o: any) => o.order_type === 'room_stay')).toHaveLength(2);
  });
});
