/**
 * Whether this venue lets waiters settle a bill from Live Tables. The owner's switch, stored on the venue.
 * It reads as OFF whenever it cannot be read (the column is not there yet, or the read failed): a waiter then
 * sends the bill to billing, which is the safe way round.
 */
export async function readWaiterCanSettle(db: any, businessId: string): Promise<boolean> {
  try {
    const { data, error } = await db.from('businesses').select('waiter_can_settle').eq('id', businessId).maybeSingle();
    if (error) return false;
    return data?.waiter_can_settle === true;
  } catch {
    return false;
  }
}

export type WriteResult = { ok: true } | { ok: false; code: 'NOT_READY' | 'FAILED'; error: string };

/** Saves the owner's switch. A venue database without the column answers NOT_READY, with what to do about it. */
export async function writeWaiterCanSettle(db: any, businessId: string, enabled: boolean): Promise<WriteResult> {
  const { error } = await db.from('businesses').update({ waiter_can_settle: enabled }).eq('id', businessId);
  if (!error) return { ok: true };
  const missing = error.code === '42703' || error.code === 'PGRST204' || /waiter_can_settle/i.test(String(error.message || ''));
  if (missing) {
    return { ok: false, code: 'NOT_READY', error: 'This setting needs one database update first (migration 20261016000002_waiter_settle_switch.sql).' };
  }
  return { ok: false, code: 'FAILED', error: 'The setting could not be saved. Please try again.' };
}
