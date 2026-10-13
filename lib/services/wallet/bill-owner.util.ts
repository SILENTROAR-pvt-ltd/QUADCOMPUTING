// Whose cashback a table bill is. Each dish records the signed-in guest who ordered it (order_items.guest_handle,
// from their verified sign-in; null for a guest without an account or a row from before the column existed).
// Cashback is 7% of the whole bill, so it may go to one guest only when that guest ordered every dish on it.
// A bill shared with anyone else has no owner, and no cashback is credited for it.

export interface BillOwner {
  /** The one signed-in guest who ordered every dish, or null. */
  handle: string | null;
  /** Every signed-in guest who ordered something on this bill. */
  handles: string[];
  /** True when at least one dish has no signed-in owner. */
  hasUnclaimed: boolean;
}

const clean = (h: unknown): string | null => {
  if (typeof h !== 'string') return null;
  const t = h.trim();
  if (!t) return null;
  return t.startsWith('@') ? t : `@${t}`;
};

export function billOwner(items: ReadonlyArray<{ guest_handle?: string | null } | null | undefined>): BillOwner {
  const byKey = new Map<string, string>();
  let hasUnclaimed = false;
  for (const item of items || []) {
    const handle = clean(item?.guest_handle);
    if (!handle) { hasUnclaimed = true; continue; }
    const key = handle.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, handle);
  }
  const handles = Array.from(byKey.values());
  return { handle: handles.length === 1 && !hasUnclaimed ? handles[0] : null, handles, hasUnclaimed };
}

/** True when signed-in guests ordered on this bill but it is not one guest's alone: no cashback may be credited. */
export const isSharedSignedInBill = (o: BillOwner) => o.handles.length > 0 && !o.handle;
