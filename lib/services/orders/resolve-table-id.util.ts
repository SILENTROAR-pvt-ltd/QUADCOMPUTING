import { isUuid } from './order-uuid.util';

export async function resolveTableTarget(
  supabase: any,
  businessId: string,
  rawTableId?: unknown,
  rawTableNumber?: unknown
): Promise<{ tableId: string | null; tableNumber: string }> {
  if (isUuid(rawTableId)) {
    return {
      tableId: rawTableId,
      tableNumber: String(rawTableNumber || 'Takeaway / Counter'),
    };
  }

  const search = String(rawTableId || rawTableNumber || '').trim();
  if (!search || search.toLowerCase().includes('takeaway') || search.toLowerCase().includes('counter')) {
    return { tableId: null, tableNumber: 'Takeaway / Counter' };
  }

  const norm = search.replace(/\s*\([^)]*\)/g, '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();

  try {
    const { data: tableRow } = await supabase
      .from('restaurant_tables')
      .select('id, table_number')
      .eq('business_id', businessId)
      .or(`table_number.eq.${norm},table_number.eq.T-${norm},table_number.eq.Table ${norm}`)
      .limit(1)
      .maybeSingle();

    if (tableRow?.id && isUuid(tableRow.id)) {
      return {
        tableId: tableRow.id,
        tableNumber: tableRow.table_number || String(rawTableNumber || `T-${norm}`),
      };
    }
  } catch {}

  return {
    tableId: null,
    tableNumber: String(rawTableNumber || rawTableId || norm || 'Takeaway / Counter'),
  };
}
