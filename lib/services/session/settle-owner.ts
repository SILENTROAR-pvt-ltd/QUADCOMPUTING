import { billOwner, isSharedSignedInBill, type BillOwner } from '@/lib/services/wallet/bill-owner.util';

export interface CashbackDecision {
  guestHandle: string | null;
  creditCashback: boolean;
  primaryGuestId: string | null;
}

/**
 * Whose cashback this bill is, decided from who ordered each dish (order_items.guest_handle), never from the table's
 * shared session or a handle the POS sends. 7% of the whole bill may go to one signed-in guest only when they ordered
 * every dish; a bill shared with other guests gets no cashback at all.
 */
export async function decideCashback(finalOrderId: string | null, body: any, supabase: any): Promise<CashbackDecision> {
  let owner: BillOwner = { handle: null, handles: [], hasUnclaimed: false };
  // If who ordered cannot be read (including before migration 20261014000002 adds the column), nobody is credited:
  // guessing from the order's name is what credited a whole shared table to one person.
  let ownerUnknown = false;
  if (finalOrderId) {
    const { data: ownerRows, error: ownerErr } = await supabase.from('order_items').select('guest_handle').eq('order_id', finalOrderId);
    if (!ownerErr) owner = billOwner(ownerRows || []);
    else {
      ownerUnknown = true;
      if (!['42703', 'PGRST204'].includes(ownerErr.code)) console.error('[Settlement] Could not read who ordered; no cashback credited:', ownerErr);
    }
  }
  if (body?.guest_handle && String(body.guest_handle).toLowerCase() !== String(owner.handle || '').toLowerCase()) {
    console.warn('[Settlement] Ignored a cashback handle that did not order this whole bill', { orderId: finalOrderId });
  }
  const guestHandle = owner.handle;
  // Cashback goes only to a real guest identity and only when the host left the receipt's cashback switch on.
  // Cashback exists only for a guest signed in on Vibers Connect: a walk-in has no wallet to receive it.
  const creditCashback = body?.credit_cashback !== false && !ownerUnknown && !isSharedSignedInBill(owner) && Boolean(guestHandle);
  return { guestHandle, creditCashback, primaryGuestId: creditCashback ? guestHandle : null };
}
