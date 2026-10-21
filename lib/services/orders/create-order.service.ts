import { sanitizeUuid, normalizePaymentMethod } from './order-uuid.util';
import { resolveTableTarget } from './resolve-table-id.util';
import { findActiveRoomStayOrder } from './room-stay-order.util';
import { executeOrderMutation } from './order-mutation.service';
import { deductRecipeInventoryForOrder } from './recipe-deduction.service';
import { loadGstStatus, stripTax } from '@/lib/services/billing/gst-policy';
import { readCashTender } from '@/lib/services/billing/cash-tender';
import { afterResponse } from '@/lib/utils/after-response';

export async function createHostOrder(supabase: any, businessId: string, body: any): Promise<any> {
  const roomId = sanitizeUuid(body.roomId), guestId = sanitizeUuid(body.guestId);
  const locationId = sanitizeUuid(body.locationId), servedByStaffId = sanitizeUuid(body.servedByStaffId);
  const existingOrderId = sanitizeUuid(body.id || body.order_id);
  const paymentMethod = normalizePaymentMethod(body.paymentMethod);

  let grandTotal = Number(body.grandTotal ?? body.subtotal ?? 0);
  const subtotal = Number(body.subtotal ?? grandTotal);
  let taxAmount = Number(body.taxAmount) || 0;

  // The table, the room's open stay and the venue's GST status do not depend on each other: read together.
  const [{ tableId, tableNumber }, { masterOrderId, customerName, customerPhone }, gst] = await Promise.all([
    resolveTableTarget(supabase, businessId, body.tableId, body.tableNumber),
    findActiveRoomStayOrder(supabase, roomId),
    taxAmount > 0 ? loadGstStatus(supabase, businessId) : Promise.resolve(null),
  ]);
  // GST only for a verified GSTIN (gst-policy.ts): otherwise the bill is saved without it.
  if (gst && !gst.canCharge) ({ taxAmount, grandTotal } = stripTax({ taxAmount, grandTotal }));

  // A bill that settles in this same request keeps the order's own status until the settlement closes it, so a
  // settlement that is refused leaves the table's order open instead of marked settled with the table still running.
  // That holds for a bill saved for the first time too: it is inserted open, and only the settlement marks it settled.
  const settlesNow = Boolean(body.settlement);
  // Cash given and change returned (cash-tender.ts): the route checked it against the bill before coming here.
  const cash = readCashTender(paymentMethod, grandTotal, body.cashTendered).tender;

  const orderPayload = {
    business_id: businessId,
    items: body.items || [],
    subtotal,
    discount_type: body.discountType || null,
    discount_value: Number(body.discountValue) || 0,
    discount_amount: Number(body.discountAmount) || 0,
    tax_amount: taxAmount,
    grand_total: grandTotal,
    total_amount: grandTotal,
    payment_method: paymentMethod,
    // Written only when cash was given: a database without migration 20261022000001 still saves every other bill.
    ...(cash ? { cash_tendered: cash.cash_tendered, cash_change: cash.cash_change } : {}),
    table_id: tableId,
    table_number: tableNumber,
    order_source: body.orderSource || 'POS',
    order_type: body.orderType || (roomId ? 'room_service' : 'pos'),
    master_order_id: masterOrderId,
    customer_name: customerName || body.customer_name || body.guest_name || null,
    customer_phone: customerPhone || body.customer_phone || body.guest_phone || null,
    location_id: locationId,
    served_by_staff_id: servedByStaffId,
    staff_name: body.staffName || null,
    room_id: roomId,
    guest_id: guestId,
    // While a settlement is pending, the client's status is not written: a bill cannot arrive pre-marked settled.
    status: settlesNow ? undefined : (body.status || 'SETTLED'),
  };

  const order = await executeOrderMutation(supabase, orderPayload, existingOrderId, settlesNow ? 'open' : 'SETTLED');
  if (order?.id) {
    afterResponse('recipe-deduction', () => deductRecipeInventoryForOrder(supabase, businessId, order.id, body.items || [], order.status || orderPayload.status || 'SETTLED'));
  }
  return order;
}
