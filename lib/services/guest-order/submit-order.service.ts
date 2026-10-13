import { randomUUID } from 'crypto';
import { calculateOrderTotals, aggregateOrderItems } from '@/lib/utils/qr-session';
import { isValidUuid, buildTableOrFilter } from './order-utils';
import { defaultGstRate } from '@/lib/utils/gst-rates';
import { lookupExistingOrder } from './find-order.util';
import { enabledStations, resolveItemStation } from '@/lib/services/kitchen/item-station';
import { claimSessionGuest } from '@/lib/services/guest-session/session-guest.util';
import { loadGstStatus, stripTax } from '@/lib/services/billing/gst-policy';

export async function submitGuestOrder(body: any, supabase: any) {
  const { business_id, cafe_id, table_number, guest_name, guest_phone, guest_handle, items: incomingItems = [] } = body;
  // One note for the whole table ("Table note for kitchen"). It goes on the kitchen ticket once, never on each dish.
  const tableNote = typeof body.table_note === 'string' ? body.table_note.trim().slice(0, 200) : '';
  const rawTableNumber = (table_number || '').trim();
  if (!rawTableNumber) throw new Error('Missing table_number');
  if (!/^[A-Za-z0-9 -]{1,12}$/.test(rawTableNumber)) {
    throw new Error('Invalid table format. Must be 1-12 alphanumeric characters, spaces, or hyphens.');
  }
  if (!Array.isArray(incomingItems) || incomingItems.length === 0) throw new Error('No items in order');

  const normTable = rawTableNumber.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
  const resolvedBizId: string = isValidUuid(business_id) ? business_id! : isValidUuid(cafe_id) ? cafe_id! : '';
  if (!resolvedBizId) throw new Error('Missing or invalid business_id');

  const idempotencyKey = body.idempotency_key || body.client_order_nonce || null;
  const itemIds = incomingItems
    .map((item: any) => item.item_id || item.id)
    .filter((id: any) => typeof id === 'string' && id.trim().length > 0);

  // Every read that does not depend on another runs at once: the venue check, the duplicate check, the table's open
  // order, the verified prices, the venue's stations and its GST status. This used to be one round trip after another.
  const [bizRes, dupRes, lookup, catalogRes, stationRes, gst] = await Promise.all([
    supabase.from('businesses').select('id').eq('id', resolvedBizId).maybeSingle(),
    // DB-Backed Idempotency Guard (P0 #1): a duplicate returns the original order below. The atomic RPC re-checks the same
    // unique constraint inside its transaction, so a concurrent retry is still handled correctly.
    idempotencyKey
      ? supabase.from('orders').select('*').eq('business_id', resolvedBizId).eq('idempotency_key', idempotencyKey).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    lookupExistingOrder(supabase, resolvedBizId, rawTableNumber, normTable),
    // Verified prices come from catalog_items by id AND business_id, never from the client.
    supabase.from('catalog_items').select('id, name, price, item_type, category, metadata, station').eq('business_id', resolvedBizId).in('id', itemIds),
    // Until the station migration is applied the setting is unreadable, and every station is treated as running.
    supabase.from('businesses').select('kitchen_stations').eq('id', resolvedBizId).maybeSingle(),
    loadGstStatus(supabase, resolvedBizId),
  ]);

  // Verify business exists in database
  const { data: bizCheck, error: bizCheckErr } = bizRes;

  if (bizCheckErr || !bizCheck) {
    const { data: catCheck } = await supabase
      .from('catalog_items')
      .select('business_id')
      .eq('business_id', resolvedBizId)
      .limit(1)
      .maybeSingle();

    if (!catCheck) {
      const notFoundErr: any = new Error('Venue not found');
      notFoundErr.status = 404;
      throw notFoundErr;
    }
  }

  if (idempotencyKey) {
    const { data: existingOrder, error: dupCheckErr } = dupRes as any;

    if (dupCheckErr) throw dupCheckErr;
    if (existingOrder) {
      return {
        success: true,
        is_addon: false,
        is_duplicate: true,
        order_id: existingOrder.id,
        ticket_number: existingOrder.ticket_number || 'KOT-ACK',
        kot_status: existingOrder.status || 'open',
        order: existingOrder,
        subtotal: existingOrder.subtotal,
        tax_amount: existingOrder.tax_amount,
        grand_total: existingOrder.grand_total,
        total_amount: existingOrder.total_amount,
        items: existingOrder.items || [],
        data: existingOrder,
      };
    }
  }

  const { existingActiveOrder, previousRawItems } = lookup;
  const isAddonOrder = Boolean(existingActiveOrder);
  const targetOrderId = isValidUuid(existingActiveOrder?.id) ? existingActiveOrder.id : randomUUID();

  const catalogMap = new Map<string, any>(
    (catalogRes.data || []).map((ci: any) => [ci.id, ci])
  );
  const stations = enabledStations(stationRes.data?.kitchen_stations);

  const newItemsFormatted = incomingItems.map((item: any, idx: number) => {
    const rawId = item.item_id || item.id || null;
    const catalogItem = rawId ? catalogMap.get(rawId) : null;

    // Ignore client price/totals! Load strictly from catalog_items by id and business_id
    const realPrice = catalogItem ? Number(catalogItem.price || 0) : 0;
    const realName = catalogItem?.name || item.name || item.title || 'Curated Dish';

    // Quantity clamp 1..50
    const rawQty = Number(item.quantity ?? item.qty ?? 1);
    const clampedQty = Math.max(1, Math.min(50, Math.floor(rawQty) || 1));

    return {
      id: `item_${Date.now()}_${idx}`,
      order_id: targetOrderId,
      item_id: rawId,
      item_name: realName,
      name: realName,
      price: realPrice,
      quantity: clampedQty,
      total_price: realPrice * clampedQty,
      // Per-line GST from the verified catalog row (food 5%, services 18%, or a
      // venue override in metadata.tax_rate) — not a flat rate for the whole order.
      tax_rate: typeof catalogItem?.metadata?.tax_rate === 'number'
        ? catalogItem.metadata.tax_rate
        : defaultGstRate({ item_type: catalogItem?.item_type, category: catalogItem?.category }),
      notes: item.notes || null,
      kot_status: 'pending',
      is_addon: isAddonOrder,
      created_at: new Date().toISOString(),
    };
  });

  const cumulativeRawItems = [...previousRawItems, ...newItemsFormatted];
  const aggregatedForBill = aggregateOrderItems(cumulativeRawItems);
  // GST only when the venue has a verified GSTIN (gst-policy.ts); otherwise the bill carries no tax.
  const computedTotals = calculateOrderTotals(cumulativeRawItems);
  const totals = gst.canCharge ? computedTotals : { ...computedTotals, ...stripTax(computedTotals) };
  const customerName = guest_name || (guest_handle ? `Guest (${guest_handle})` : existingActiveOrder?.customer_name || 'Guest');
  const customerPhone = guest_phone || existingActiveOrder?.customer_phone || null;
  const ticketNumber = isAddonOrder
    ? `KOT-${Math.floor(1000 + Math.random() * 9000)}-ADD`
    : `KOT-${Math.floor(1000 + Math.random() * 9000)}`;

  // Atomic write: order insert/update + order_items insert + kitchen_tickets
  // insert + dine_in_sessions/restaurant_tables sync all happen inside one
  // Postgres transaction (supabase/migrations/20261006000006). A partial
  // failure (e.g. order created but KOT insert fails) is no longer possible.
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('submit_guest_order_atomic', {
    p_business_id: resolvedBizId,
    p_table_number: rawTableNumber,
    p_order_id: targetOrderId,
    p_is_addon: isAddonOrder,
    // Each dish records who ordered it: the verified sign-in handle (request-identity.ts), or null for a guest
    // without an account. Cashback on a shared table is decided from these rows (bill-owner.util.ts).
    p_order_items: newItemsFormatted.map((it: any) => ({
      item_id: it.item_id, item_name: it.item_name, price: it.price, quantity: it.quantity, notes: it.notes,
      guest_handle: guest_handle || null,
    })),
    p_aggregated_items: aggregatedForBill,
    p_subtotal: totals.subtotal,
    p_tax_amount: totals.taxAmount,
    p_grand_total: totals.grandTotal,
    p_idempotency_key: idempotencyKey,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    // Never stamp the ordering guest onto the table's shared session: the deployed function did
    // `guest_handle = COALESCE(p_guest_handle, guest_handle)`, which moved the whole table to the last orderer.
    p_guest_handle: null,
    p_ticket_number: ticketNumber,
    // Each line goes to the station that cooks it, from the menu catalogue (see item-station.ts).
    p_ticket_items: newItemsFormatted.map((it: any, idx: number) => {
      const catalogItem = incomingItems[idx]?.item_id || incomingItems[idx]?.id
        ? catalogMap.get(incomingItems[idx].item_id || incomingItems[idx].id)
        : undefined;
      return {
        name: it.item_name, qty: it.quantity, notes: it.notes || undefined,
        category: catalogItem?.category || 'Food & Beverage', is_addon: isAddonOrder,
        station: resolveItemStation({ station: catalogItem?.station, category: catalogItem?.category, name: it.item_name, item_type: catalogItem?.item_type }, stations),
      };
    }),
  });

  if (rpcErr) throw rpcErr;
  if (!rpcResult?.success) {
    const err: any = new Error(rpcResult?.error || 'Failed to submit order atomically');
    err.status = 409;
    err.code = 'TABLE_CLOSED';
    throw err;
  }

  // The table note goes on this submission's kitchen ticket(s) once. When the order spans several stations the
  // database gives each one a letter suffix (KOT-1234-K, -B, -G), so match the number and its suffixed copies.
  // Best-effort: the order is already committed, so a failed note write must not fail the order.
  if (tableNote) {
    const { error: noteErr } = await supabase
      .from('kitchen_tickets')
      .update({ notes: tableNote })
      .eq('order_id', targetOrderId)
      .or(`ticket_number.eq.${ticketNumber},ticket_number.like.${ticketNumber}-%`);
    if (noteErr) console.error('[submitGuestOrder] table note not saved on ticket', noteErr);
  }

  // The guest's wallet handle is NOT attached to the table's shared session: that credited the whole table's
  // cashback to whichever account claimed it. Ownership is per dish (order_items.guest_handle, written above), and
  // settlement credits a guest only when they ordered every dish on the bill (settle-session.service.ts).

  if (rpcResult.is_duplicate) {
    const { data: existingOrder } = await supabase.from('orders').select('*').eq('id', rpcResult.order_id).maybeSingle();
    return {
      success: true, is_addon: false, is_duplicate: true, order_id: rpcResult.order_id,
      ticket_number: rpcResult.ticket_number, kot_status: existingOrder?.status || 'open',
      order: existingOrder, items: existingOrder?.items || [], data: existingOrder,
    };
  }

  const orderRecord = {
    id: targetOrderId, business_id: resolvedBizId, table_number: rawTableNumber, status: 'open',
    subtotal: totals.subtotal, tax_amount: totals.taxAmount, grand_total: totals.grandTotal, total_amount: totals.grandTotal,
    customer_name: customerName, customer_phone: customerPhone,
    items: aggregatedForBill, raw_items: cumulativeRawItems,
    created_at: existingActiveOrder?.created_at || new Date().toISOString(), updated_at: new Date().toISOString(),
  };

  return {
    success: true, is_addon: isAddonOrder, order_id: targetOrderId, ticket_number: ticketNumber, kot_status: 'PENDING',
    order: orderRecord, subtotal: totals.subtotal, tax_amount: totals.taxAmount, grand_total: totals.grandTotal, total_amount: totals.grandTotal, items: orderRecord.items,
  };
}

export const placeGuestOrder = submitGuestOrder;
