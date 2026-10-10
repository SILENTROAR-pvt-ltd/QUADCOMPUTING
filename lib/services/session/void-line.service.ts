// Changing a line on a live table's bill: its quantity, or removing it. The database does the work in one
// transaction (edit_pending_order_line); this turns its refusals into messages a host can act on.
export interface VoidFailure { ok: false; status: number; error: string }
export interface VoidSuccess {
  ok: true;
  value: { order_id: string; item: string; removed: boolean; quantity: number; subtotal: number; tax_amount: number; grand_total: number; ticket_updated: boolean };
}

export function mapVoidError(message: string): VoidFailure {
  if (message.includes('LINE_NOT_FOUND')) return { ok: false, status: 404, error: 'That item is no longer on this bill.' };
  if (message.includes('ORDER_CLOSED')) return { ok: false, status: 409, error: 'This bill is already settled, so the item cannot be changed.' };
  if (message.includes('LINE_STARTED')) return { ok: false, status: 409, error: 'The kitchen has started this item, so it cannot be changed now.' };
  if (message.includes('QUANTITY_INVALID')) return { ok: false, status: 400, error: 'A quantity must be between 1 and 50.' };
  return { ok: false, status: 500, error: 'The item could not be changed. Please try again.' };
}

/** Sets a pending line's quantity. A quantity of 0 removes it. */
export async function editPendingLine(
  db: any,
  businessId: string,
  orderItemId: string,
  quantity: number,
  staffId: string | null
): Promise<VoidFailure | VoidSuccess> {
  const { data, error } = await db.rpc('edit_pending_order_line', {
    p_business_id: businessId,
    p_order_item_id: orderItemId,
    p_quantity: quantity,
    p_staff_id: staffId,
  });
  if (error) return mapVoidError(String(error.message || ''));
  return { ok: true, value: data };
}

export function voidPendingLine(db: any, businessId: string, orderItemId: string, staffId: string | null) {
  return editPendingLine(db, businessId, orderItemId, 0, staffId);
}
