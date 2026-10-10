export async function resolveSessionKotStatus(supabase: any, rawT: string, normT: string, dineInSessionId: string | null) {
  let kotStatus = null, ticketNumber = null;
  if (!dineInSessionId) return { kotStatus, ticketNumber };

  try {
    const closedIn = '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","closed","CLOSED","paid","PAID")';
    const { data: order } = await supabase.from('orders').select('id, status').eq('session_id', dineInSessionId)
      .not('status', 'in', closedIn).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (order?.id) {
      const { data: kt } = await supabase.from('kitchen_tickets').select('ticket_number, status')
        .eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (kt) { kotStatus = kt.status; ticketNumber = kt.ticket_number; }
    }
  } catch {}

  if (!kotStatus && dineInSessionId) {
    try {
      const { findKitchenTicketForTableOrOrder } = await import('@/lib/store/active-order-store');
      const inMemKt = findKitchenTicketForTableOrOrder(null, rawT);
      if (inMemKt && !['SERVED', 'CANCELLED', 'COMPLETED'].includes(inMemKt.status)) {
        kotStatus = inMemKt.status; ticketNumber = inMemKt.ticket_number;
      }
    } catch {}
  }

  return { kotStatus, ticketNumber };
}
