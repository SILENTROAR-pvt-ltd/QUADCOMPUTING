// A guest who reserved with their Vibers ID owns the advance bill the desk issues for the room: it then appears among
// their invoices. Best effort, after the bill is written; a database without orders.guest_handle is left alone.

export async function stampAdvanceBillOwner(db: any, businessId: string, billId: string, accountId: string | null): Promise<void> {
  if (!accountId) return;
  try {
    const { data: account } = await db.from('guest_accounts').select('handle').eq('id', accountId).maybeSingle();
    if (!account?.handle) return;
    const { error } = await db.from('orders').update({ guest_handle: account.handle }).eq('id', billId).eq('business_id', businessId);
    if (error && !['42703', 'PGRST204'].includes(error.code)) console.error("[stay pass] could not mark the advance bill as the guest's", error.message);
  } catch (e) {
    console.error("[stay pass] could not mark the advance bill as the guest's", e);
  }
}
