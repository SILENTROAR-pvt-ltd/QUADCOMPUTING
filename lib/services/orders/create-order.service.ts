import { sanitizeUuid, normalizePaymentMethod } from './order-uuid.util';
import { resolveTableTarget } from './resolve-table-id.util';
import { findActiveRoomStayOrder } from './room-stay-order.util';
import { executeOrderMutation } from './order-mutation.service';
import { deductRecipeInventoryForOrder } from './recipe-deduction.service';
import { loadGstStatus, stripTax } from '@/lib/services/billing/gst-policy';

export async function createHostOrder(supabase: any, businessId: string, body: any): Promise<any> {
  const { tableId, tableNumber } = await resolveTableTarget(supabase, businessId, body.tableId, body.tableNumber);
  const roomId = sanitizeUuid(body.roomId), guestId = sanitizeUuid(body.guestId);
  const locationId = sanitizeUuid(body.locationId), servedByStaffId = sanitizeUuid(body.servedByStaffId);
  const existingOrderId = sanitizeUuid(body.id || body.order_id);
  const paymentMethod = normalizePaymentMethod(body.paymentMethod);
  const { masterOrderId, customerName, customerPhone } = await findActiveRoomStayOrder(supabase, roomId);

  let grandTotal = Number(body.grandTotal ?? body.subtotal ?? 0);
  const subtotal = Number(body.subtotal ?? grandTotal);
  let taxAmount = Number(body.taxAmount) || 0;
  // GST only for a verified GSTIN (gst-policy.ts): otherwise the bill is saved without it.
  if (taxAmount > 0 && !(await loadGstStatus(supabase, businessId)).canCharge) {
    ({ taxAmount, grandTotal } = stripTax({ taxAmount, grandTotal }));
  }

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
    status: body.status || 'SETTLED',
  };

  const order = await executeOrderMutation(supabase, orderPayload, existingOrderId);
  if (order?.id) {
    void deductRecipeInventoryForOrder(supabase, businessId, order.id, body.items || [], order.status || orderPayload.status);
  }
  return order;
}
