// Which workspace sections ask for the master PIN. Settings and money (profile, wallet) are always
// locked once a master PIN exists, so staff cannot change bank details or the PIN itself.

export const ALWAYS_LOCKED = ['profile', 'wallet'] as const;

export const DEFAULT_LOCKS: Record<string, boolean> = {
  profile: true, wallet: true, dashboard: true, catalog: true, inventory: true, expenses: true, accommodations: true,
  billing: false, tables: false, kitchen: false,
};

/** The saved lock settings merged over the defaults; stored as JSON text by older versions. */
export function readLocks(raw: unknown): Record<string, boolean> {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
  }
  const out: Record<string, boolean> = { ...DEFAULT_LOCKS };
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (k in DEFAULT_LOCKS) out[k] = Boolean(v);
  }
  for (const k of ALWAYS_LOCKED) out[k] = true;
  return out;
}

/** What to store: known sections only, with the always-locked ones forced on. */
export const cleanLocks = readLocks;
