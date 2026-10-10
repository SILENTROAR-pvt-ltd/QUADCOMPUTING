const ORDER_STATUS_MAP: Record<string, string> = {
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  PENDING: 'open',
};

const IS_UUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function syncOrderOnKotChange(
  supabase: any,
  businessId: string,
  status: string,
  targetOrderId?: string | null,
  targetTable?: string | null
) {
  const mapped = ORDER_STATUS_MAP[status];
  if (!mapped || !businessId) return;

  const nowIso = new Date().toISOString();
  try {
    if (targetOrderId && IS_UUID(targetOrderId)) {
      await supabase.from('orders').update({ status: mapped }).eq('id', targetOrderId);
      await supabase.from('order_items').update({ kot_status: status.toLowerCase() }).eq('order_id', targetOrderId);
    } else if (targetTable) {
      const clean = targetTable.replace(/\s*\([^)]*\)/g, '').trim();
      const norm = clean.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
      await supabase
        .from('orders')
        .update({ status: mapped })
        .eq('business_id', businessId)
        .or(`table_number.eq.${clean},table_number.eq.Table ${clean},table_number.eq.T-${norm}`)
        .not('status', 'in', '("settled","SETTLED","closed","CLOSED","cancelled","CANCELLED")');
    }
  } catch (err) {
    console.warn('[Orders DB sync warning]:', err);
  }
}
