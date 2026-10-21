import { afterResponse } from '@/lib/utils/after-response';
import { feeReferenceFor } from './invoice-history.util';

/**
 * Every settled bill carries the platform fee (₹3 on pay as you go, nothing on a paid plan), recorded under the one
 * reference the Dues page, the invoice history and the P&L all read: SETTLE_<bill id>. Counter and table bills charge
 * it where they settle; room advances, payments during a stay and the stay invoice at checkout charge it here. It runs
 * after the response, keyed to the bill id, so a retry never bills the venue twice and the till never waits for it.
 */
export function chargeBillFee(businessId: string, billId: string | null | undefined, supabase: any): void {
  if (!billId) return;
  afterResponse('bill-fee', async () => {
    const { evaluateFeeGuard } = await import('./fee-guard.service');
    await evaluateFeeGuard(businessId, 'bill_generate', feeReferenceFor(billId), supabase);
  });
}
