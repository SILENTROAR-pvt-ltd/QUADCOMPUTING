export const CLOSED_STATUSES = [
  'settled', 'SETTLED', 'completed', 'COMPLETED',
  'cancelled', 'CANCELLED', 'billed', 'BILLED',
  'closed', 'CLOSED', 'paid', 'PAID',
];


export const normalizeTable = (t: string) => {
  return (t || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^table\s*/i, '')
    .replace(/^t-/i, '')
    .trim()
    .toUpperCase();
};

export function getTableVariants(rawTable: string): string[] {
  if (!rawTable) return [];
  const raw = rawTable.trim(), norm = normalizeTable(raw);
  const unpad = norm.replace(/^0+/, '') || norm;
  const pad = norm.length === 1 ? `0${norm}` : norm;
  const set = new Set<string>([raw, norm, unpad, pad, `T-${norm}`, `T-${unpad}`, `T-${pad}`, `Table ${norm}`, `Table ${unpad}`, `Table ${pad}`, `Table ${raw}`]);
  return Array.from(set).filter(Boolean);
}

export function buildTableOrFilter(rawTable: string, col = 'table_number'): string {
  return getTableVariants(rawTable).map((v) => `${col}.eq.${v}`).join(',');
}

export function createSessionEntry(o: any, linkedSession: any, tNum: string) {
  const subtotal = Number(o.subtotal) || Number(o.grand_total) || 0;
  const grandTotal = Number(o.grand_total) || subtotal;
  const itemsCount = Array.isArray(o.items) ? o.items.length : Array.isArray(o.raw_items) ? o.raw_items.length : 0;
  const isBillReq = linkedSession?.status === 'bill_requested';

  return {
    sessionId: linkedSession?.id || o.session_id || `sess_${o.id}`,
    orderId: o.id,
    status: isBillReq ? 'bill_requested' : 'open',
    subtotal,
    grandTotal,
    itemsCount,
    updatedAt: o.updated_at || o.created_at || new Date().toISOString(),
    guestSessionId: linkedSession?.guest_session_id || o.session_id || null,
    tableNumber: tNum,
    customerName: o.customer_name || 'Guest',
  };
}

