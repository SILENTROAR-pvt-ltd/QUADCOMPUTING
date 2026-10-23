// What a host console leaves in this browser: the tab's session storage (cached workspace, master-PIN flag, sign-up
// state) and a few per-venue caches in local storage. Cleared whenever the account on this device changes (sign-out,
// or a new host signing up), so the next account never starts from the previous one's venue, menu or unlocked PIN.

const LOCAL_CACHE_PREFIXES = ['pos_tables_cache_', 'pos_catalog_cache_'];

export function clearHostCaches() {
  try { sessionStorage.clear(); } catch { /* storage unavailable: nothing was kept */ }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && LOCAL_CACHE_PREFIXES.some((p) => key.startsWith(p))) localStorage.removeItem(key);
    }
  } catch { /* storage unavailable: nothing was kept */ }
}
