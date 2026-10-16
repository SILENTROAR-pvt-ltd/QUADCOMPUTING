import { describe, expect, it } from 'vitest';
import { buildReports, channelOf, guestKey } from './reports.util';

// 16 Oct 2026 is a Friday. 07:00 UTC = 12:30 IST, 14:00 UTC = 19:30 IST.
const line = (name: string, price: number, qty: number, category?: string) => ({ name, price, qty, category });
const orders = [
  { status: 'settled', subtotal: 400, discount_amount: 40, tax_amount: 18, grand_total: 378, table_number: 'T-01',
    customer_phone: '+91 98765 43210', created_at: '2026-10-16T07:00:00Z', items: [line('Paneer Wrap', 200, 2, 'Mains')] },
  { status: 'SETTLED', subtotal: 100, discount_amount: 0, tax_amount: 0, grand_total: 130, delivery_fee: 30, is_delivery: true,
    table_number: 'DLV-AB12CD34', customer_phone: '9876543210', created_at: '2026-10-16T14:00:00Z', items: [line('Chai', 50, 2, 'Drinks')] },
  { status: 'settled', subtotal: 0, discount_amount: 0, tax_amount: 0, grand_total: 250, table_number: '',
    customer_name: 'Guest', created_at: '2026-10-17T07:10:00Z', items: [line('Thali', 250, 1)] }, // no breakdown saved
  { status: 'open', grand_total: 999, table_number: 'T-02', created_at: '2026-10-16T08:00:00Z', items: [] },
  { status: 'cancelled', grand_total: 500, table_number: 'T-03', created_at: '2026-10-16T08:00:00Z', items: [] },
];

describe('buildReports: summary', () => {
  const s = buildReports(orders).summary;

  it('adds gross sales, discounts, GST and delivery fees up to what was collected', () => {
    expect(s).toMatchObject({ gross_sales: 750, discounts: 40, net_sales: 710, gst: 18, delivery_fees: 30, other_charges: 0, collected: 758 });
    expect(s.net_sales + s.gst + s.delivery_fees + s.other_charges).toBe(s.collected);
  });

  it('counts settled bills only, and keeps open and cancelled bills apart', () => {
    expect(s).toMatchObject({ settled_bills: 3, avg_bill: 252.67, items_sold: 5, open_bills: 1, open_value: 999, cancelled_bills: 1, cancelled_value: 500 });
  });

  it('shows any charge the breakdown does not explain instead of hiding it', () => {
    const odd = buildReports([{ status: 'settled', subtotal: 100, discount_amount: 0, tax_amount: 0, grand_total: 110, created_at: '2026-10-16T07:00:00Z', items: [] }]);
    expect(odd.summary.other_charges).toBe(10);
  });
});

describe('buildReports: when, where and what', () => {
  const r = buildReports(orders);

  it('puts each bill in its India-time hour and finds the peak', () => {
    expect(r.by_hour).toHaveLength(24);
    expect(r.by_hour[12]).toMatchObject({ label: '12 PM', bills: 2, sales: 628 });
    expect(r.by_hour[19]).toMatchObject({ label: '7 PM', bills: 1, sales: 130 });
    expect(r.peak_hour?.hour).toBe(12);
  });

  it('puts each bill on its India-time weekday, Monday first', () => {
    expect(r.by_weekday.map((w) => w.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(r.by_weekday[4]).toMatchObject({ label: 'Fri', bills: 2, sales: 508 });
    expect(r.by_weekday[5]).toMatchObject({ label: 'Sat', bills: 1, sales: 250 });
  });

  it('splits dine-in, delivery and counter, and the parts add up to collected', () => {
    expect(r.channels.map((c) => [c.id, c.bills, c.sales])).toEqual([['dine_in', 1, 378], ['delivery', 1, 130], ['counter', 1, 250]]);
    expect(r.channels.reduce((a, c) => a + c.sales, 0)).toBe(r.summary.collected);
  });

  it('spreads bill discounts over the dishes, so categories add up to net sales', () => {
    const total = r.categories.reduce((a, c) => a + c.net_sales, 0);
    expect(Math.round(total * 100) / 100).toBe(r.summary.net_sales);
    expect(r.categories.find((c) => c.name === 'Mains')).toMatchObject({ qty: 2, net_sales: 360 });
    expect(r.items[0]).toMatchObject({ name: 'Paneer Wrap', net_sales: 360 });
  });

  it('counts a guest by phone across bills, and a bill with no name or phone as a walk-in', () => {
    expect(r.guests).toMatchObject({ source: 'bills', known: 1, walk_ins: 1, returning: 1, new_guests: 0, returning_rate: 100 });
  });

  it('takes a dish category from the menu catalogue when the bill line has none', () => {
    const catalogue: Record<string, string> = { thali: 'Meals', chai: 'Drinks (catalogue)' };
    const withMenu = buildReports(orders, (name) => catalogue[name.toLowerCase()] ?? null);
    const names = withMenu.categories.map((c) => c.name);
    expect(names).toContain('Meals');
    expect(names).not.toContain('Uncategorised');
    // A category saved on the line itself wins over the catalogue.
    expect(names).toContain('Drinks');
    expect(names).not.toContain('Drinks (catalogue)');
  });
});

describe('helpers', () => {
  it('classifies channels', () => {
    expect(channelOf({ table_number: 'T-01' })).toBe('dine_in');
    expect(channelOf({ table_number: 'Room 4' })).toBe('dine_in');
    expect(channelOf({ table_number: 'DLV-1' })).toBe('delivery');
    expect(channelOf({ table_number: null })).toBe('counter');
    expect(channelOf({ table_number: 'Takeaway' })).toBe('counter');
  });

  it('keys guests by phone, then real name', () => {
    expect(guestKey({ customer_phone: '+91 98765-43210' })).toBe('p:9876543210');
    expect(guestKey({ customer_name: ' Asha ' })).toBe('n:asha');
    expect(guestKey({ customer_name: 'Guest (@x)' })).toBeNull();
    expect(guestKey({})).toBeNull();
  });

  it('reports nothing, without dividing by zero, for an empty period', () => {
    const r = buildReports([]);
    expect(r.summary).toMatchObject({ collected: 0, settled_bills: 0, avg_bill: 0 });
    expect(r.peak_hour).toBeNull();
    expect(r.guests.returning_rate).toBeNull();
  });
});
