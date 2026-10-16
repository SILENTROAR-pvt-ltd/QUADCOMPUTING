import { canAdvanceDelivery, isDeliveryStatus, type DeliveryStatus } from './delivery-rules';

const BOARD_COLUMNS = [
  'id', 'table_number', 'created_at', 'status', 'customer_name', 'grand_total', 'items',
  'delivery_address', 'delivery_phone', 'delivery_distance_km', 'delivery_fee', 'delivery_payment',
  'delivery_paid', 'delivery_status',
].join(', ');

/** The venue's delivery orders from the last day, newest first. The board shows them all; the host closes them in Billing. */
export async function listDeliveryOrders(db: any, businessId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db.from('orders').select(BOARD_COLUMNS)
    .eq('business_id', businessId).eq('is_delivery', true).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export type DeliveryUpdateResult =
  | { ok: true; order: Record<string, any> }
  | { ok: false; status: number; error: string };

/**
 * Moves one delivery forward a stage and/or marks its advance UPI payment received. The stage change is conditional on
 * the stage the host saw, so two staff members pressing at once cannot skip or repeat a stage.
 */
export async function updateDeliveryOrder(
  db: any,
  businessId: string,
  orderId: string,
  patch: { status?: unknown; paid?: unknown },
): Promise<DeliveryUpdateResult> {
  const { data: current, error: readErr } = await db.from('orders').select('id, delivery_status, delivery_payment, is_delivery')
    .eq('id', orderId).eq('business_id', businessId).maybeSingle();
  if (readErr) throw readErr;
  if (!current?.is_delivery) return { ok: false, status: 404, error: 'Delivery order not found.' };

  const changes: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    if (!isDeliveryStatus(patch.status)) return { ok: false, status: 400, error: 'Unknown delivery stage.' };
    if (!canAdvanceDelivery(current.delivery_status as DeliveryStatus | null, patch.status)) {
      return { ok: false, status: 409, error: 'That stage has already passed. Refresh the board to see the latest.' };
    }
    changes.delivery_status = patch.status;
  }
  if (patch.paid !== undefined) {
    if (typeof patch.paid !== 'boolean') return { ok: false, status: 400, error: 'Payment update must be yes or no.' };
    if (patch.paid && current.delivery_payment !== 'upi_advance') {
      return { ok: false, status: 400, error: 'Only advance UPI payments are confirmed here. Cash is settled in Billing.' };
    }
    changes.delivery_paid = patch.paid;
  }
  if (Object.keys(changes).length === 0) return { ok: false, status: 400, error: 'Nothing to update.' };

  let query = db.from('orders').update(changes).eq('id', orderId).eq('business_id', businessId).eq('is_delivery', true);
  query = current.delivery_status == null ? query.is('delivery_status', null) : query.eq('delivery_status', current.delivery_status);
  const { data, error } = await query.select(BOARD_COLUMNS).maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, status: 409, error: 'The order changed while you were updating it. Refresh the board.' };
  return { ok: true, order: data };
}

/** What a guest's tracker may see about their own delivery: the stage and payment state. No address or phone. */
export async function getGuestDeliveryStatus(db: any, businessId: string, orderId: string) {
  const { data, error } = await db.from('orders')
    .select('id, is_delivery, delivery_status, delivery_payment, delivery_paid, grand_total, delivery_fee, created_at')
    .eq('id', orderId).eq('business_id', businessId).maybeSingle();
  if (error) throw error;
  if (!data?.is_delivery) return null;
  return {
    order_id: data.id,
    delivery_status: data.delivery_status ?? 'received',
    delivery_payment: data.delivery_payment,
    delivery_paid: Boolean(data.delivery_paid),
    grand_total: Number(data.grand_total) || 0,
    delivery_fee: Number(data.delivery_fee) || 0,
    created_at: data.created_at,
  };
}
