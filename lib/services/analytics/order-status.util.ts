export function computeOrderAndInventoryStatus(orders: any[], tickets: any[], rawItems: any[], rawPromos: any[]) {
  // One lookup per order instead of a scan of every ticket per order.
  const ticketByOrder = new Map<string, any>();
  for (const t of tickets) if (t?.order_id && !ticketByOrder.has(t.order_id)) ticketByOrder.set(t.order_id, t);

  const live = orders.filter((o: any) => String(o.status ?? '').toLowerCase() !== 'cancelled');
  let completed_orders = 0;
  let pending_kitchen = 0;

  for (const order of live) {
    const ticket = ticketByOrder.get(order.id);
    if (ticket) {
      if (ticket.status === 'SERVED') completed_orders++;
      else if (['PENDING', 'PREPARING', 'READY'].includes(ticket.status)) pending_kitchen++;
    } else if (order.payment_method || String(order.status ?? '').toLowerCase() === 'settled') {
      completed_orders++;
    }
  }

  const critical_items = (rawItems || [])
    .filter((i: any) => i.current_stock <= (i.threshold || 10))
    .map((i: any) => ({
      id: i.id,
      name: i.item_name,
      current_stock: i.current_stock,
      unit: i.unit,
      reorder_level: i.threshold || 10,
    }));

  const active_promotions = (rawPromos || []).map((p: any) => ({
    id: p.id,
    name: p.title,
    discount_type: p.discount_type === 'PERCENTAGE' || p.discount_type === 'percentage' ? 'PERCENTAGE' : 'FLAT',
    value: p.discount_value,
  }));

  return { total_orders: live.length, completed_orders, pending_kitchen, critical_items, active_promotions };
}
