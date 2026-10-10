export const isValidUuid = (val?: string | null): boolean => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const CLOSED_STATUSES = ['SETTLED', 'settled', 'COMPLETED', 'completed', 'CANCELLED', 'cancelled', 'billed'];

export function normalizeCumulativeItems(cumulativeRawItems: any[]) {
  return (cumulativeRawItems || []).map((it: any, idx: number) => {
    const name = it.item_name || it.name || it.title || 'Curated Dish';
    const quantity = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);
    const price = Number(it.price ?? it.unit_price ?? it.total_item_price ?? 0) || 0;

    return {
      id: it.id || `item_${idx}`,
      item_id: it.item_id || it.id || null,
      name,
      item_name: name,
      price,
      quantity,
      qty: quantity,
      total_price: price * quantity,
      notes: it.notes || null,
      kot_status: it.kot_status || 'pending',
      created_at: it.created_at || new Date().toISOString(),
    };
  });
}

export function getTableVariants(rawTable: string): string[] {
  if (!rawTable) return [];
  const raw = rawTable.trim();
  const norm = raw.replace(/\s*\([^)]*\)/g, '').replace(/^table\s*/i, '').replace(/^t-/i, '').trim().toUpperCase();
  const unpad = norm.replace(/^0+/, '') || norm;
  const pad = norm.length === 1 ? `0${norm}` : norm;
  const set = new Set<string>([raw, norm, unpad, pad, `T-${norm}`, `T-${unpad}`, `T-${pad}`, `Table ${norm}`, `Table ${unpad}`, `Table ${pad}`, `Table ${raw}`]);
  return Array.from(set).filter(Boolean);
}

export function buildTableOrFilter(rawTable: string, col = 'table_number'): string {
  return getTableVariants(rawTable).map((v) => `${col}.eq.${v}`).join(',');
}
