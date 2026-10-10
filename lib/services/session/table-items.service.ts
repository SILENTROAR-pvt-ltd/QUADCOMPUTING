// A host adds catalogue items to a table. It runs through the same guest order pipeline as a guest's order,
// so the items are priced from the catalogue, routed to their stations, and go to the kitchen as an add-on
// ticket when the table already has an open order.
import { randomUUID } from 'node:crypto';
import { submitGuestOrder } from '@/lib/services/guest-order/submit-order.service';
import type { TableItemsInput } from './table-items-input';

export type AddItemsResult =
  | { ok: true; value: { order_id: string; ticket_number: string; is_addon: boolean; kot_status: string } }
  | { ok: false; status: number; error: string };

/** The table's open session, opened for the host when the table has none yet. Its id is a host walk-in uid. */
export async function ensureOpenSession(db: any, businessId: string, tableNumber: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: open } = await db
    .from('dine_in_sessions')
    .select('id')
    .eq('business_id', businessId)
    .eq('table_number', tableNumber)
    .in('status', ['open', 'bill_requested'])
    .limit(1)
    .maybeSingle();
  if (open) return { ok: true, id: open.id };

  const { data: table } = await db
    .from('restaurant_tables')
    .select('id, is_active')
    .eq('business_id', businessId)
    .eq('table_number', tableNumber)
    .maybeSingle();
  if (!table || table.is_active === false) return { ok: false, error: 'That table is not set up for this venue.' };

  const now = new Date().toISOString();
  const { data: created, error } = await db
    .from('dine_in_sessions')
    .insert({
      business_id: businessId,
      table_id: table.id,
      table_number: tableNumber,
      guest_session_id: `host-${randomUUID()}`,
      status: 'open',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error || !created) throw error ?? new Error('The table could not be opened.');
  return { ok: true, id: created.id };
}

export async function addItemsToTable(db: any, businessId: string, input: TableItemsInput): Promise<AddItemsResult> {
  const session = await ensureOpenSession(db, businessId, input.table_number);
  if (!session.ok) return { ok: false, status: 404, error: session.error };

  try {
    const result = await submitGuestOrder({
      business_id: businessId,
      table_number: input.table_number,
      items: input.items.map((i) => ({ item_id: i.item_id, quantity: i.quantity, notes: i.notes ?? undefined })),
      // A fresh key per submission: each press is its own order, and a double press is handled by the button.
      idempotency_key: `host-add-${randomUUID()}`,
    }, db);
    return {
      ok: true,
      value: {
        order_id: result.order_id,
        ticket_number: String(result.ticket_number ?? ''),
        is_addon: Boolean(result.is_addon),
        kot_status: String(result.kot_status ?? ''),
      },
    };
  } catch (err: any) {
    return { ok: false, status: Number(err?.status) || 500, error: err?.message || 'The items could not be added. Please try again.' };
  }
}
