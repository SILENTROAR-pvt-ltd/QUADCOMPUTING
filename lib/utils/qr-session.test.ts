import { describe, it, expect } from 'vitest';
import { 
  calculateOrderTotals, 
  aggregateOrderItems, 
  getTableVisualState 
} from './qr-session';
import type { OrderItemRecord } from '@/types/qr-session';

describe('QR Session Utility Suite', () => {
  it('calculates order subtotal, 5% tax, and grand total accurately', () => {
    const items = [
      { price: 250, quantity: 2 }, // 500
      { price: 120, quantity: 1 }, // 120
      { price: 80, quantity: 3 },  // 240
    ]; // subtotal = 860
    
    const totals = calculateOrderTotals(items, 5);
    expect(totals.subtotal).toBe(860);
    expect(totals.taxAmount).toBe(43); // 5% of 860
    expect(totals.grandTotal).toBe(903);
    expect(totals.totalQuantity).toBe(6);
  });

  it('taxes each line at its own GST rate (food 5%, services 18%)', () => {
    const totals = calculateOrderTotals([
      { price: 200, quantity: 1, tax_rate: 0.05 }, // food: 10
      { price: 50, quantity: 2, tax_rate: 0.18 },  // service: 18
      { price: 100, quantity: 1 },                 // legacy line, default 5%: 5
    ]);
    expect(totals.subtotal).toBe(400);
    expect(totals.taxAmount).toBe(33);
    expect(totals.grandTotal).toBe(433);
  });

  it('aggregates multiple KOT batches by item into unified cart lines', () => {
    const rawItems: OrderItemRecord[] = [
      {
        id: 'kot-1',
        order_id: 'ord-1',
        item_id: 'dish-fries',
        item_name: 'French Fries',
        price: 150,
        quantity: 2,
        kot_status: 'served',
        created_at: '2026-09-23T05:00:00Z',
      },
      {
        id: 'kot-2',
        order_id: 'ord-1',
        item_id: 'dish-burger',
        item_name: 'Veg Supreme Burger',
        price: 220,
        quantity: 1,
        notes: 'Extra cheese',
        kot_status: 'cooking',
        created_at: '2026-09-23T05:10:00Z',
      },
      {
        id: 'kot-3',
        order_id: 'ord-1',
        item_id: 'dish-fries',
        item_name: 'French Fries',
        price: 150,
        quantity: 1,
        kot_status: 'pending',
        created_at: '2026-09-23T05:25:00Z',
      },
    ];

    const aggregated = aggregateOrderItems(rawItems);
    expect(aggregated).toHaveLength(2);

    const fries = aggregated.find(a => a.name === 'French Fries');
    expect(fries).toBeDefined();
    expect(fries?.qty).toBe(3); // 2 + 1
    expect(fries?.price).toBe(150);

    const burger = aggregated.find(a => a.name === 'Veg Supreme Burger');
    expect(burger).toBeDefined();
    expect(burger?.qty).toBe(1);
    expect(burger?.notes).toBe('Extra cheese');
  });

  it('maps table visual states correctly between open, bill_requested, and empty', () => {
    const emptyState = getTableVisualState(null);
    expect(emptyState.color).toBe('grey');
    expect(emptyState.label).toBe('Available');

    const openState = getTableVisualState('open');
    expect(openState.color).toBe('green');
    expect(openState.label).toContain('Active');

    const requestedState = getTableVisualState('bill_requested');
    expect(requestedState.color).toBe('amber');
    expect(requestedState.label).toBe('Bill Requested');
  });
});
