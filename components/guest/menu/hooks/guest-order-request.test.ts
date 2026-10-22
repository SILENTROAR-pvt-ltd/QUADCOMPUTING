import { describe, it, expect } from 'vitest';
import { attemptSignature, orderRequest } from './guest-order-request';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const dal = { cart_id: 'c1', item_id: 'i-dal', name: 'Dal', base_price: 200, total_item_price: 230, quantity: 2, selected_addons: [{ name: 'Ghee', price: 30 }], notes: 'less spicy' } as any;
const base = { tableNumber: 'T-01', cafeParam: BIZ, guestId: 'g1', activeSession: null, masterOrder: null, name: 'Asha', phone: '', notes: ' window seat ', currentGuestName: 'Guest', items: [dal] };

describe('the guest order request', () => {
  it('sends the table order with each dish note, the table note once, the retry key, and survives the page closing', () => {
    const { url, init } = orderRequest(base, 'go-1');
    const body = JSON.parse(String(init.body));
    expect(url).toBe('/api/guest/order');
    expect(init.keepalive).toBe(true);
    expect(body).toMatchObject({ table_number: 'T-01', business_id: BIZ, guest_name: 'Asha', table_note: 'window seat', idempotency_key: 'go-1' });
    expect(body.items[0]).toMatchObject({ item_id: 'i-dal', quantity: 2, notes: 'Ghee (+₹30) | less spicy' });
  });

  it("sends a room's order to the room's own endpoint", () => {
    const { url, init } = orderRequest({ ...base, roomCode: 'ab12' }, 'go-2');
    expect(url).toBe('/api/guest/room/ab12/order');
    expect(JSON.parse(String(init.body))).toMatchObject({ note: 'window seat', idempotency_key: 'go-2', items: [{ item_id: 'i-dal', quantity: 2 }] });
  });

  it('keeps the same signature for the same cart, so a retry reuses its key, and a new one for a changed cart', () => {
    expect(attemptSignature('T-01', 'x', [dal])).toBe(attemptSignature('T-01', 'x ', [dal]));
    expect(attemptSignature('T-01', 'x', [dal])).not.toBe(attemptSignature('T-01', 'x', [{ ...dal, quantity: 3 }]));
  });
});
