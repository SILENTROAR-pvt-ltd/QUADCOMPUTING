import { adminDb } from '@/lib/supabase/admin';
import { afterResponse } from '@/lib/utils/after-response';
import { recordLedgerVisit } from './ledger.service';

/**
 * A stay's bills are visits in My Guests like any table bill: the advance taken before check-in, a payment during the
 * stay, and the invoice at checkout each count once for the guest who paid, with what they paid. So a guest's stays
 * are in their visits and spend, and the reports' guest figures cover the rooms as well as the kitchen. Best effort,
 * after the response: the bill is already written.
 */
export function recordStayVisit(
  businessId: string,
  billId: string | null | undefined,
  who: { handle?: string | null; phone?: string | null; email?: string | null; name?: string | null },
  spend: number,
  at?: string | null,
): void {
  if (!billId) return;
  afterResponse('stay-visit', () => recordLedgerVisit(adminDb(), businessId, billId, who, Math.max(0, Number(spend) || 0), at ?? null));
}
