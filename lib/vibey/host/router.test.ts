import { describe, expect, it } from 'vitest';
import { invoiceRefOf, routeByKeywords, timeframeOf } from './router';
import { numbersGrounded, numbersIn, verifiedOr } from './verify-numbers';
import { lockedModules } from './locks';

const names = (t: string) => routeByKeywords(t).map((c) => c.name);

describe('host keyword router', () => {
  it('routes the common questions without a model', () => {
    expect(routeByKeywords('how did we do today?')).toEqual([{ name: 'sales_summary', args: { timeframe: 'daily' } }]);
    expect(routeByKeywords('sales this week')).toEqual([{ name: 'sales_summary', args: { timeframe: 'weekly' } }]);
    expect(names('what do I owe?')).toEqual(['dues']);
    expect(routeByKeywords('what do I owe today')[0]).toEqual({ name: 'dues', args: { range: 'today' } });
    expect(names("what's running low")).toEqual(['stock_alerts']);
    expect(names('top dishes this month')).toEqual(['top_items']);
    expect(names('which tables have been open longest?')).toEqual(['live_tables']);
    expect(names("who's booked for tomorrow")).toEqual(['reservations']);
    expect(routeByKeywords('reservations kal')[0].args).toEqual({ day: 'tomorrow' });
    expect(names('profit and sales yesterday')).toEqual(['profit_and_loss', 'sales_summary']);
  });

  it('reads the bill number by code, never from a model', () => {
    expect(invoiceRefOf('show me ord 12')).toBe('ORD-012');
    expect(invoiceRefOf('bill ORD-007 please')).toBe('ORD-007');
    expect(routeByKeywords('find invoice inv-2026-55')[0]).toEqual({ name: 'find_invoice', args: { orderNumber: 'INV-2026-55' } });
    expect(invoiceRefOf('how are you')).toBeNull();
  });

  it('maps periods', () => {
    expect(timeframeOf('kal ka sale')).toBe('yesterday');
    expect(timeframeOf('this month')).toBe('mtd');
    expect(timeframeOf('last 30 days')).toBe('30d');
    expect(timeframeOf('anything')).toBe('daily');
  });

  it('returns nothing for questions it cannot place', () => {
    expect(routeByKeywords('write me a poem')).toEqual([]);
  });
});

describe('number verifier', () => {
  const tool = { cards: [{ items: [{ value: 12450.5 }, { value: 37 }, { value: 8.4 }] }] };
  it('accepts sentences whose numbers all come from the tools', () => {
    expect(numbersIn('Net sales ₹12,450.50 from 37 bills, up 8.4%')).toEqual([12450.5, 37, 8.4]);
    expect(numbersGrounded('Net sales ₹12,450.50 from 37 bills, up 8.4%', tool)).toBe(true);
    expect(numbersGrounded('Net sales ₹12,451 from 37 bills', tool)).toBe(true);
  });
  it('rejects a sentence with an invented number', () => {
    expect(numbersGrounded('Net sales ₹15,000 from 37 bills', tool)).toBe(false);
    expect(verifiedOr('Up 20% today', tool, 'Here is what I found.')).toBe('Here is what I found.');
  });
});

describe('locks', () => {
  const row = { protected_modules: { dashboard: true, tables: false } };
  it('mirrors the screen gate and never lifts a lock for staff', () => {
    expect(lockedModules(row, false, false, false)).toEqual([]);
    expect(lockedModules(row, true, false, false)).toContain('dashboard');
    expect(lockedModules(row, true, false, false)).toContain('payments');
    expect(lockedModules(row, true, false, false)).not.toContain('tables');
    expect(lockedModules(row, true, true, false)).toEqual([]);
    expect(lockedModules(row, true, true, true)).toContain('dashboard');
  });
});
