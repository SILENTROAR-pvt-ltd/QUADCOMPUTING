import { describe, expect, it } from 'vitest';
import { buildReports } from '@/lib/services/analytics/reports.util';
import { reportCsv } from './report-csv';

describe('reportCsv', () => {
  const r = buildReports([
    { status: 'settled', subtotal: 100, discount_amount: 0, tax_amount: 5, grand_total: 105, table_number: 'T-1', customer_name: 'Rao, "Sr"',
      created_at: '2026-10-16T07:00:00Z', items: [{ name: 'Dosa, plain', price: 100, qty: 1, category: 'Tiffin' }] },
  ]);
  const csv = reportCsv(r, '16 Oct 2026');

  it('carries every section with plain rupee numbers', () => {
    expect(csv).toContain('Total collected,105');
    expect(csv).toContain('Net sales,100');
    expect(csv).toContain('12 PM,1,105');
    expect(csv).toContain('Dine-in,1,105');
  });

  it('quotes values with commas or quotes', () => {
    expect(csv).toContain('"Dosa, plain",1,100,100');
  });
});
