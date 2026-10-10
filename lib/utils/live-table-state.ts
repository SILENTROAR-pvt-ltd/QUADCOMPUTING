// What a table is doing right now, for the live tables board. Pure functions, so the rules are tested.
export type TableVisualState = 'bill_requested' | 'live' | 'occupied' | 'settled' | 'vacant';

export interface TableStateInput {
  status?: string | null;
  activeSession?: { status?: string | null; grandTotal?: number | null; subtotal?: number | null; itemsCount?: number | null } | null;
}

export const SETTLED_WINDOW_MS = 3 * 60 * 60 * 1000;

/** "T-01", "Table 1", "t-01" all name the same table. */
export function normalizeTableNumber(raw: string | null | undefined): string {
  return String(raw ?? '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
}

export function tableVisualState(table: TableStateInput, settledAt: number | null, now = Date.now()): TableVisualState {
  const session = table.activeSession;
  if (session?.status === 'bill_requested') return 'bill_requested';
  if (session && (Number(session.itemsCount) > 0 || Number(session.grandTotal) > 0 || Number(session.subtotal) > 0)) return 'live';
  if (String(table.status ?? '').toUpperCase() === 'OCCUPIED') return 'occupied';
  if (settledAt !== null && now - settledAt <= SETTLED_WINDOW_MS) return 'settled';
  return 'vacant';
}

/** The latest settled bill time for each table, from the venue's order history. */
export function latestSettledByTable(orders: Array<{ table_number?: string | null; status?: string | null; updated_at?: string | null; created_at?: string | null }>): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of orders) {
    if (String(o.status ?? '').toLowerCase() !== 'settled') continue;
    const at = Date.parse(o.updated_at || o.created_at || '');
    if (!Number.isFinite(at)) continue;
    const key = normalizeTableNumber(o.table_number);
    if (key && at > (out.get(key) ?? 0)) out.set(key, at);
  }
  return out;
}
