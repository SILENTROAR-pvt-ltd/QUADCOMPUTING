import { describe, it, expect } from 'vitest';
import { mapFolioToReceipt } from './receipt-adapter';
import type { HistoricalStayRecord } from '@/types';

describe('Receipt Adapter: mapFolioToReceipt', () => {
  it('maps a base room stay without addons into a standardized invoice', () => {
    const stay: HistoricalStayRecord = {
      id: 'stay-uuid-1234',
      business_id: 'biz-1',
      room_id: 'room-1',
      guest_name: 'Harshit Singh',
      guest_phone: '+91 9876543210',
      check_in_time: '2026-09-20T10:00:00.000Z',
      check_out_time: '2026-09-22T10:00:00.000Z',
      nights: 2,
      status: 'SETTLED',
      room_number: '101',
      category_name: 'Deluxe Suite',
      category_price: 3500,
      total_billed_amount: 7000,
    };

    const invoice = mapFolioToReceipt(stay);

    expect(invoice.id).toBe('stay-uuid-1234');
    expect(invoice.guest_name).toBe('Harshit Singh');
    expect(invoice.guest_phone).toBe('+91 9876543210');
    expect(invoice.table_number).toBe('Room 101 (Deluxe Suite)');
    expect(invoice.payment_method).toBe('SETTLED');
    expect(invoice.isReadOnly).toBe(true);

    expect(invoice.items).toHaveLength(1);
    expect(invoice.items[0].name).toContain('Room Stay - Deluxe Suite (Room 101)');
    expect(invoice.items[0].qty).toBe(2);
    expect(invoice.items[0].price).toBe(3500);
    expect(invoice.items[0].section).toBe('ACCOMMODATION');

    expect(invoice.subtotal).toBe(7000);
    expect(invoice.grandTotal).toBe(7000);
  });

  it('maps add-on services with per-night and per-stay pricing correctly', () => {
    const stay: HistoricalStayRecord = {
      id: 'stay-uuid-5678',
      business_id: 'biz-1',
      room_id: 'room-2',
      guest_name: 'Sarah Connor',
      guest_phone: '+91 9123456789',
      check_in_time: '2026-09-20T10:00:00.000Z',
      check_out_time: '2026-09-23T10:00:00.000Z',
      nights: 3,
      status: 'SETTLED',
      room_number: '204',
      category_name: 'Premium Chalet',
      category_price: 4000,
      selected_addons: [
        {
          id: 'addon-1',
          name: 'Complimentary Buffet Breakfast',
          price: 500,
          billingType: 'per_night',
          isActive: true,
        },
        {
          id: 'addon-2',
          name: 'Airport VIP Transfer',
          price: 1500,
          billingType: 'per_stay',
          isActive: true,
        }
      ],
      // 3 * 4000 = 12000 (Room) + 3 * 500 = 1500 (Breakfast) + 1500 (Airport) = 15000
      total_billed_amount: 15000,
    };

    const invoice = mapFolioToReceipt(stay);

    expect(invoice.items).toHaveLength(3);

    // Item 1: Room Stay
    expect(invoice.items[0].qty).toBe(3);
    expect(invoice.items[0].price).toBe(4000);

    // Item 2: Per-night addon (Breakfast)
    const breakfast = invoice.items.find(it => it.name.includes('Buffet Breakfast'))!;
    expect(breakfast.qty).toBe(3);
    expect(breakfast.price).toBe(500);
    expect(breakfast.section).toBe('ADD_ON');

    // Item 3: Per-stay addon (Airport)
    const airport = invoice.items.find(it => it.name.includes('Airport VIP Transfer'))!;
    expect(airport.qty).toBe(1);
    expect(airport.price).toBe(1500);
    expect(airport.section).toBe('ADD_ON');

    expect(invoice.subtotal).toBe(15000);
    expect(invoice.grandTotal).toBe(15000);
  });

  it('detects merged room service / F&B folio charges and breaks them into a dedicated section', () => {
    const stay: HistoricalStayRecord = {
      id: 'stay-uuid-9999',
      business_id: 'biz-1',
      room_id: 'room-3',
      guest_name: 'Bruce Wayne',
      guest_phone: '+91 9999999999',
      check_in_time: '2026-09-22T10:00:00.000Z',
      check_out_time: '2026-09-23T10:00:00.000Z',
      nights: 1,
      status: 'SETTLED',
      room_number: 'Penthouse',
      category_name: 'Presidential Suite',
      category_price: 15000,
      selected_addons: [],
      // Base: 15000 + Room Service Dining: 3200 = 18200 total
      total_billed_amount: 18200,
    };

    const invoice = mapFolioToReceipt(stay);

    expect(invoice.items).toHaveLength(2);
    expect(invoice.items[0].section).toBe('ACCOMMODATION');

    const fnbItem = invoice.items.find(it => it.section === 'ROOM_SERVICE')!;
    expect(fnbItem).toBeDefined();
    expect(fnbItem.name).toBe('Room Service & F&B Orders');
    expect(fnbItem.price).toBe(3200);
    expect(fnbItem.qty).toBe(1);

    expect(invoice.subtotal).toBe(18200);
    expect(invoice.grandTotal).toBe(18200);
  });
});
