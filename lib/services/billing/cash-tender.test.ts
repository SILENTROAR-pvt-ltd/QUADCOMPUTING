import { describe, it, expect } from 'vitest';
import { cashSuggestions, readCashTender } from './cash-tender';
import { buildZFigures } from '@/lib/services/analytics/eod-z-report.util';

describe('cash handed over and change', () => {
  it('keeps the notes given and the change for a cash bill, nothing for other tenders or an exact amount left blank', () => {
    expect(readCashTender('CASH', 3050, 4000)).toEqual({ tender: { cash_tendered: 4000, cash_change: 950 }, error: null });
    expect(readCashTender('cash', 3050, '3050')).toEqual({ tender: { cash_tendered: 3050, cash_change: 0 }, error: null });
    expect(readCashTender('CASH', 3050, undefined)).toEqual({ tender: null, error: null });
    expect(readCashTender('UPI', 3050, 4000)).toEqual({ tender: null, error: null });
  });

  it('refuses cash short of the bill, a nonsense amount, and a wild overpayment', () => {
    expect(readCashTender('CASH', 3050, 3000).error).toMatch(/less than the bill/);
    expect(readCashTender('CASH', 3050, 'abc').error).toMatch(/Enter the cash/);
    expect(readCashTender('CASH', 3050, 999999).error).toMatch(/far more/);
  });

  it('suggests the exact bill and the notes a guest would hand over', () => {
    expect(cashSuggestions(3050)).toEqual([3050, 3100, 3200, 3500]);
    expect(cashSuggestions(950)).toEqual([950, 1000, 2000]);
  });

  it('the Z-report reconciles cash received against change returned, while cash sales stay the bills', () => {
    const z = buildZFigures([
      { id: 'a', status: 'SETTLED', created_at: '2026-10-22T10:00:00Z', subtotal: 3050, grand_total: 3050, payment_method: 'CASH', cash_tendered: 4000, cash_change: 950, items: [] },
      { id: 'b', status: 'SETTLED', created_at: '2026-10-22T11:00:00Z', subtotal: 200, grand_total: 200, payment_method: 'CASH', items: [] },
      { id: 'c', status: 'SETTLED', created_at: '2026-10-22T12:00:00Z', subtotal: 500, grand_total: 500, payment_method: 'UPI', items: [] },
    ], 0, () => null);
    expect(z.tenders).toMatchObject({ cash: 3250, cash_received: 4200, change_given: 950, upi: 500 });
  });
});
