// A table asking for its bill, as a guest call: the same BILL notification a "call the waiter" makes, so the bell rings on
// every host and staff screen, the tray says which table asked, and Billing lights in the sidebar. The call is cleared
// when that table's bill is settled or the table is freed, so the tray never keeps asking for a bill already paid.
import { recordStaffCall } from './staff-call.service';

/** Rings the host for a table's bill. Never throws: the bill request itself is already recorded. */
export async function ringBillRequest(db: any, businessId: string, table: string | null | undefined, now = Date.now()): Promise<boolean> {
  const tableNumber = String(table || '').trim();
  if (!businessId || !tableNumber) return false;
  try {
    const r = await recordStaffCall(db, { businessId, tableNumber, type: 'BILL', message: null }, now);
    if (!r.ok) console.error('[bill-call] the bell was not rung:', r.error);
    return r.ok;
  } catch (err) {
    console.error('[bill-call] the bell was not rung:', err);
    return false;
  }
}

/** Clears the BILL calls still waiting for one table. `tableOr` is the table's or-filter (buildTableOrFilter). */
export async function clearBillCalls(db: any, businessId: string, tableOr: string): Promise<void> {
  if (!businessId || !tableOr) return;
  try {
    const { error } = await db.from('staff_notifications').update({ status: 'RESOLVED' })
      .eq('business_id', businessId).eq('notification_type', 'BILL').eq('status', 'PENDING').or(tableOr);
    if (error) console.error('[bill-call] could not clear the bill call:', error.message);
  } catch (err) {
    console.error('[bill-call] could not clear the bill call:', err);
  }
}
