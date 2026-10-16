/**
 * Live, read-only check of one invoice: a real settled bill of this venue must come back with items that add up to its
 * total, and a bill of another venue must not come back at all. OFF unless E2E_LIVE=1; set E2E_VENUE_ID to the venue.
 *
 *   $env:E2E_LIVE='1'; $env:E2E_VENUE_ID='<uuid>'; npx vitest run --config vitest.e2e.config.ts tests/e2e/invoice-detail.e2e.test.ts
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { liveEnv } from './support';
import { fetchInvoiceDetail } from '@/lib/services/wallet/invoice-detail.service';

const LIVE = process.env.E2E_LIVE === '1' && Boolean(process.env.E2E_VENUE_ID);
const ENV = liveEnv();
for (const [k, v] of Object.entries(ENV)) if (process.env[k] === undefined) process.env[k] = v;

describe.skipIf(!LIVE)('One invoice, read only', () => {
  const db = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const venue = process.env.E2E_VENUE_ID as string;

  it('returns a settled bill of this venue with items that add up to its total', async () => {
    const { data: row, error } = await db.from('orders').select('id, subtotal, grand_total, status').eq('business_id', venue)
      .in('status', ['settled', 'SETTLED']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    expect(error).toBeNull();
    expect(row).not.toBeNull();
    const inv = await fetchInvoiceDetail(db, venue, row!.id);
    expect(inv).not.toBeNull();
    expect(inv!.total).toBe(Math.round(Number(row!.grand_total) * 100) / 100);
    const itemsSum = Math.round(inv!.items.reduce((a, i) => a + i.amount, 0) * 100) / 100;
    expect(Math.abs(itemsSum - inv!.subtotal)).toBeLessThanOrEqual(0.05 * Math.max(1, inv!.items.length));
    console.log('[invoice-detail]', JSON.stringify({ number: inv!.invoice_number, items: inv!.items.length, total: inv!.total, fee: inv!.fee, status: inv!.fee_status }));
  });

  it('does not return a bill that belongs to another venue', async () => {
    const other = '00000000-0000-4000-8000-000000000000';
    const { data: row } = await db.from('orders').select('id').eq('business_id', venue).in('status', ['settled', 'SETTLED']).limit(1).maybeSingle();
    expect(await fetchInvoiceDetail(db, other, row!.id)).toBeNull();
  });
});
