'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Live data for an admin panel: read now, then again every `everyMs` while the tab is visible, and on demand.
 * Keeps the last good answer on screen while a refresh is in flight or fails.
 */
export function useAdminData<T>(url: string | null, everyMs = 30_000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const live = useRef(true);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!live.current) return;
      if (!res.ok || !body?.success) { setError(body?.error || `Could not load (HTTP ${res.status}).`); return; }
      setData(body as T);
      setError(null);
      setUpdatedAt(Date.now());
    } catch {
      if (live.current) setError('Network error. Retrying shortly.');
    } finally {
      if (live.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    live.current = true;
    void load();
    const timer = everyMs > 0 ? setInterval(() => { if (document.visibilityState === 'visible') void load(); }, everyMs) : null;
    return () => { live.current = false; if (timer) clearInterval(timer); };
  }, [load, everyMs]);

  return { data, error, loading, updatedAt, refresh: load };
}

/** POST/PATCH to an admin route; returns the server's message or error. */
export async function adminSend(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<{ ok: boolean; message: string; data: any }> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    return { ok: res.ok && data?.success !== false, message: data?.message || data?.error || (res.ok ? 'Done.' : `Failed (HTTP ${res.status}).`), data };
  } catch {
    return { ok: false, message: 'Network error. Try again.', data: null };
  }
}
