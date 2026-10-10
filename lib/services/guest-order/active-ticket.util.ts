export async function resolveLatestKitchenTicket(
  supabase: any,
  businessId: string,
  tableNumber: string,
  normTable: string,
  orderId?: string | null
) {
  let latestTicket: any = null;

  if (orderId) {
    const { data, error } = await supabase.from('kitchen_tickets').select('*')
      .eq('business_id', businessId).eq('order_id', orderId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (data) latestTicket = data;
  }
  if (!latestTicket && !orderId) {
    const { data, error } = await supabase.from('kitchen_tickets').select('*')
      .eq('business_id', businessId)
      .or(`table_or_room.eq.${tableNumber},table_or_room.eq.Table ${tableNumber},table_or_room.eq.T-${normTable},table_or_room.ilike.%${tableNumber}%`)
      .in('status', ['PENDING', 'PREPARING', 'READY']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (data) latestTicket = data;
  }

  return latestTicket;
}
