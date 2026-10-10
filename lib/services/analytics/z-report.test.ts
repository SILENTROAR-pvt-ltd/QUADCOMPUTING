import { describe, it, expect, vi } from 'vitest';
import { getDailyZReport, parseTargetDate, type ZReportData } from './z-report.service';
import { generateZReportCSV } from './z-report-export.service';

describe('PHASE 2C: Advanced Analytics, Z-Reports & Financial Reconciliation', () => {
  it('parses target dates to IST business-day boundaries', () => {
    const { dateStr, startTs, endTs } = parseTargetDate('2026-10-06');
    expect(dateStr).toBe('2026-10-06');
    expect(startTs.toISOString()).toBe('2026-10-05T18:30:00.000Z');
    expect(endTs.toISOString()).toBe('2026-10-06T18:29:59.999Z');
  });

  it('assigns an instant to the IST day it falls in (00:30 IST is still the new day)', () => {
    expect(parseTargetDate(new Date('2026-10-05T19:00:00.000Z')).dateStr).toBe('2026-10-06');
    expect(parseTargetDate(new Date('2026-10-06T18:00:00.000Z')).dateStr).toBe('2026-10-06');
    expect(parseTargetDate(new Date('2026-10-06T18:31:00.000Z')).dateStr).toBe('2026-10-07');
  });

  it('RULE (a): Computes exclusively from orders where status = "settled"', async () => {
    const mockOrders = [
      {
        id: 'ord-1',
        business_id: 'biz-test-1',
        status: 'settled',
        subtotal: 500,
        discount_amount: 50,
        tax_amount: 22.5,
        grand_total: 472.5,
        payment_method: 'UPI',
        created_at: '2026-10-06T10:00:00.000Z',
      },
      {
        id: 'ord-2',
        business_id: 'biz-test-1',
        status: 'settled',
        subtotal: 1000,
        discount_amount: 0,
        tax_amount: 50,
        grand_total: 1050,
        payment_method: 'cash',
        created_at: '2026-10-06T12:00:00.000Z',
      },
      // Pending/cancelled orders that MUST be excluded
      {
        id: 'ord-3',
        business_id: 'biz-test-1',
        status: 'pending',
        subtotal: 2000,
        discount_amount: 0,
        tax_amount: 100,
        grand_total: 2100,
        payment_method: 'UPI',
        created_at: '2026-10-06T14:00:00.000Z',
      },
      {
        id: 'ord-4',
        business_id: 'biz-test-1',
        status: 'cancelled',
        subtotal: 300,
        discount_amount: 0,
        tax_amount: 15,
        grand_total: 315,
        payment_method: 'card',
        created_at: '2026-10-06T15:00:00.000Z',
      },
    ];

    const mockClient: any = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC fallback') }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockImplementation((col: string, vals: string[]) => {
              // Both spellings written by different code paths must be matched
              expect(col).toBe('status');
              expect(vals).toEqual(['settled', 'SETTLED']);
              return {
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: mockOrders.filter((o) => o.status === 'settled'),
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          }),
        }),
      }),
    };

    const report = await getDailyZReport('biz-test-1', '2026-10-06', mockClient);

    // Assert only settled orders are included
    expect(report.operations.total_settled_orders).toBe(2);
    expect(report.summary.gross_revenue).toBe(1500); // 500 + 1000
    expect(report.summary.total_discounts).toBe(50);
    expect(report.summary.net_revenue).toBe(1450); // 1500 - 50
    expect(report.summary.total_tax).toBe(72.5); // 22.5 + 50
    expect(report.summary.grand_total).toBe(1522.5); // 472.5 + 1050
  });

  it('RULE (b): Tax amounts (CGST, SGST) are accurately aggregated', async () => {
    const mockOrders = [
      {
        id: 'ord-10',
        business_id: 'biz-test-2',
        status: 'settled',
        subtotal: 1000,
        discount_amount: 0,
        tax_amount: 50, // 5% GST: 2.5% CGST = 25, 2.5% SGST = 25
        grand_total: 1050,
        payment_method: 'card',
        created_at: '2026-10-06T11:00:00.000Z',
      },
    ];

    const mockClient: any = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'no rpc' } }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const report = await getDailyZReport('biz-test-2', '2026-10-06', mockClient);

    expect(report.summary.cgst).toBe(25);
    expect(report.summary.sgst).toBe(25);
    expect(report.summary.total_tax).toBe(50);
    expect(report.gst_compliance.cgst_amount).toBe(25);
    expect(report.gst_compliance.sgst_amount).toBe(25);
    expect(report.gst_compliance.total_gst_amount).toBe(50);
    expect(report.gst_compliance.taxable_amount).toBe(1000);
  });

  it('accurately groups tender payment methods & computes AOV', async () => {
    const mockOrders = [
      {
        id: 'ord-a',
        business_id: 'biz-test-3',
        status: 'settled',
        subtotal: 100,
        discount_amount: 0,
        tax_amount: 5,
        grand_total: 105,
        payment_method: 'cash',
        created_at: '2026-10-06T08:00:00.000Z',
      },
      {
        id: 'ord-b',
        business_id: 'biz-test-3',
        status: 'settled',
        subtotal: 200,
        discount_amount: 0,
        tax_amount: 10,
        grand_total: 210,
        payment_method: 'upi',
        created_at: '2026-10-06T09:00:00.000Z',
      },
      {
        id: 'ord-c',
        business_id: 'biz-test-3',
        status: 'settled',
        subtotal: 300,
        discount_amount: 0,
        tax_amount: 15,
        grand_total: 315,
        payment_method: 'guest_wallet',
        created_at: '2026-10-06T10:00:00.000Z',
      },
      {
        id: 'ord-d',
        business_id: 'biz-test-3',
        status: 'settled',
        subtotal: 400,
        discount_amount: 0,
        tax_amount: 20,
        grand_total: 420,
        payment_method: 'card',
        created_at: '2026-10-06T11:00:00.000Z',
      },
    ];

    const mockClient: any = {
      rpc: vi.fn().mockResolvedValue({ data: null }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const report = await getDailyZReport('biz-test-3', '2026-10-06', mockClient);

    expect(report.payment_breakdown.cash).toBe(105);
    expect(report.payment_breakdown.upi).toBe(210);
    expect(report.payment_breakdown.wallet_redemption).toBe(315);
    expect(report.payment_breakdown.card).toBe(420);
    expect(report.payment_breakdown.other).toBe(0);

    // Total orders: 4, Total grand_total: 105 + 210 + 315 + 420 = 1050
    // AOV = 1050 / 4 = 262.5
    expect(report.operations.total_settled_orders).toBe(4);
    expect(report.operations.average_order_value).toBe(262.5);
  });

  it('generates an Indian GST compliant CSV export with GSTR-1 sections', () => {
    const sampleReport: ZReportData = {
      business_id: 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
      date: '2026-10-06',
      time_range: {
        start: '2026-10-06T00:00:00.000Z',
        end: '2026-10-06T23:59:59.999Z',
      },
      summary: {
        gross_revenue: 10000,
        total_discounts: 500,
        net_revenue: 9500,
        cgst: 237.5,
        sgst: 237.5,
        total_tax: 475,
        grand_total: 9975,
      },
      payment_breakdown: {
        cash: 3000,
        upi: 4000,
        wallet_redemption: 1500,
        card: 1475,
        other: 0,
      },
      operations: {
        total_settled_orders: 25,
        average_order_value: 399,
      },
      gst_compliance: {
        gst_rate_percent: 5.0,
        cgst_rate_percent: 2.5,
        sgst_rate_percent: 2.5,
        taxable_amount: 9500,
        cgst_amount: 237.5,
        sgst_amount: 237.5,
        total_gst_amount: 475,
      },
      hourly_distribution: [
        { hour: '12:00', count: 10, sales: 4000 },
        { hour: '13:00', count: 15, sales: 5975 },
      ],
    };

    const csv = generateZReportCSV(sampleReport, {
      businessName: 'Venus Cafe Oldmanali',
      gstNumber: '02AABCU9603R1ZM',
    });

    expect(csv).toContain('DAILY Z-REPORT & FINANCIAL AUDIT');
    expect(csv).toContain('Venus Cafe Oldmanali');
    expect(csv).toContain('02AABCU9603R1ZM');
    expect(csv).toContain('SECTION 1: TURNOVER & TAX COMPLIANCE BREAKDOWN');
    expect(csv).toContain('Central GST (CGST)');
    expect(csv).toContain('State GST (SGST)');
    expect(csv).toContain('Venue Wallet Redemption');
    expect(csv).toContain('Average Order Value (AOV)');
    expect(csv).toContain('12:00,10,4000.00');
  });
});
