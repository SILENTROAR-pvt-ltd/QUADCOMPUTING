import { aggregateOrderItems } from '@/lib/utils/qr-session';
import { isValidUuid, CLOSED_STATUSES, normalizeCumulativeItems, buildTableOrFilter } from './order-utils';
import { resolveLatestKitchenTicket } from './active-ticket.util';
import { ownVisitOrders } from './own-visit.util';

/** The guest's own view of the open order: the bill and its items, never the customer's name or phone. */
function guestSafeOrder<T extends Record<string, any> | null>(order: T): T {
  if (!order) return order;
  const { customer_name: _name, customer_phone: _phone, ...rest } = order;
  return rest as T;
}
export async function getGuestActiveOrder(requestUrl: string, supabase: any) {
  const { searchParams } = new URL(requestUrl);
  const tableParamRaw = searchParams.get('table') || searchParams.get('table_number');
  const cafeParamRaw = searchParams.get('cafe_id') || searchParams.get('business_id');
  // The order this device took part in. A settled bill is only revealed to a
  // device that can name it — otherwise anyone scanning the table QR in the
  // next two hours saw the previous party's bill and cashback.
  const knownOrder = searchParams.get('known_order') || '';
  if (!tableParamRaw) throw new Error('Missing table parameter');

  const table_number = tableParamRaw.trim();
  const normTable = table_number.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
  const tableOr = buildTableOrFilter(table_number);
  const resolvedBizId: string = isValidUuid(cafeParamRaw) ? cafeParamRaw! : '';
  if (!resolvedBizId) throw new Error('Missing or invalid business_id');
  let activeOrder: any = null, items: any[] = [], isSettled = false, settledTotal = 0, isBillRequested = false;
  let cashbackCredited = 0;

  // A guest phone calls this every few seconds, so its database reads run at the same time wherever one does not
  // need another's answer: the table's open order and its session are independent, and so are the order's dishes and
  // its kitchen ticket. This was five reads one after another; it is now two rounds.
  const [ordersRes, sessionRes] = await Promise.all([
    supabase.from('orders').select('*').eq('business_id', resolvedBizId)
      .or(tableOr)
      .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`).order('created_at', { ascending: false }).limit(1),
    supabase.from('dine_in_sessions').select('id, status').eq('business_id', resolvedBizId)
      .or(`table_number.eq.${table_number},table_number.eq.Table ${table_number},table_number.eq.T-${normTable}`)
      .in('status', ['open', 'bill_requested']).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { data: dbOrders, error: ordersErr } = ordersRes;
  if (ordersErr) throw ordersErr;

  // With an open order the guest always sees it as live, so its kitchen ticket is needed: fetch it with the dishes.
  let prefetchedTicket: any = null;
  if (dbOrders && dbOrders.length > 0) {
    activeOrder = dbOrders[0];
    const [itemsRes, ticket] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', activeOrder.id).order('created_at', { ascending: true }),
      resolveLatestKitchenTicket(supabase, resolvedBizId, table_number, normTable, activeOrder.id),
    ]);
    const { data: orderItems, error: itemsErr } = itemsRes;
    if (itemsErr) throw itemsErr;
    items = orderItems && orderItems.length > 0 ? orderItems : Array.isArray(activeOrder.items) ? activeOrder.items : [];
    prefetchedTicket = ticket;
  }

  // Only check settled state if there is NO active order, and only for a device
  // that was part of the order (see knownOrder above).
  if (!activeOrder && isValidUuid(knownOrder)) {
    const { data: settledOrders, error: settledErr } = await supabase
      .from('orders')
      .select('id, grand_total, total_amount, subtotal, status, created_at, session_id')
      .eq('business_id', resolvedBizId)
      .or(tableOr)
      .in('status', ['settled', 'SETTLED', 'completed', 'COMPLETED', 'paid', 'PAID'])
      .order('created_at', { ascending: false })
      .limit(10);
    if (settledErr) throw settledErr;

    if (settledOrders && settledOrders.length > 0) {
      const latestTime = new Date(settledOrders[0].created_at).getTime();
      const ageMs = Date.now() - latestTime;
      if (ageMs < 2 * 60 * 60 * 1000) {
        // Only this device's own dine-in visit (see own-visit.util.ts).
        const visit = ownVisitOrders(settledOrders, knownOrder);
        const clusterOrders = visit.visitOrders;
        const dbSum = visit.total;
        if (visit.own && dbSum > 0) {
          isSettled = true;
          settledTotal = dbSum;
          activeOrder = visit.own;

          // Report the cashback that was ACTUALLY credited for these orders.
          // The guest UI used to compute "you earned 7%" client-side from the
          // bill total and claim it was credited, which displayed a credit even
          // when none had been written to the wallet ledger.
          const { data: cashbackTxns, error: cashbackErr } = await supabase
            .from('wallet_transactions')
            .select('amount, order_id, transaction_type')
            .in('order_id', clusterOrders.map((o: any) => o.id))
            .eq('transaction_type', 'CASHBACK');
          if (cashbackErr) throw cashbackErr;
          cashbackCredited = (cashbackTxns || []).reduce(
            (acc: number, t: any) => acc + (Number(t.amount) || 0),
            0
          );
        }
      }
    }
  }

  const { data: dbSession, error: sessionErr } = sessionRes;
  if (sessionErr) throw sessionErr;

  // Active orders strictly override any settlement
  if (activeOrder && !['settled', 'SETTLED', 'closed', 'CLOSED', 'completed', 'COMPLETED'].includes(activeOrder.status)) {
    isSettled = false;
    settledTotal = 0;
    cashbackCredited = 0;
  } else if (settledTotal <= 0) {
    isSettled = false;
    settledTotal = 0;
    cashbackCredited = 0;
  }

  const hasActive = Boolean(activeOrder) && !isSettled;
  // "Bill requested" belongs to the party at the table now: it needs an open order, and when that order names its session,
  // the very same session. A session left behind by an earlier party never marks a new guest's bill as requested.
  const sameSession = !activeOrder?.session_id || activeOrder.session_id === dbSession?.id;
  if (hasActive && sameSession && dbSession?.status === 'bill_requested') isBillRequested = true;
  // The ticket was fetched with the dishes when the table had an open order; only a bill that arrived through the
  // settled path (no open order) would reach here without one, and that path never has a live ticket.
  const latestTicket = hasActive
    ? (prefetchedTicket ?? await resolveLatestKitchenTicket(supabase, resolvedBizId, table_number, normTable, activeOrder.id))
    : null;
  const normalizedItems = hasActive ? normalizeCumulativeItems(items) : [];
  const derivedKot = hasActive ? (latestTicket?.status ||
    (activeOrder?.status && ['preparing', 'ready', 'served'].includes(activeOrder.status.toLowerCase()) ? activeOrder.status.toUpperCase() : 'PENDING')) : null;

  return {
    success: true, has_active_order: hasActive, order: guestSafeOrder(activeOrder), items: normalizedItems,
    aggregated: aggregateOrderItems(normalizedItems), kot_status: derivedKot,
    ticket: latestTicket, is_bill_requested: isBillRequested, is_settled: isSettled, settled_total: settledTotal,
    cashback_credited: cashbackCredited,
  };
}
