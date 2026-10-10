// Concurrent GETs for the same URL share one request. Several panels on one screen read the same
// host endpoints (sessions, tickets) at the same moment; this sends one request instead of several.
// Nothing is remembered once the request settles, so a read after a change always hits the server.

export interface SharedResult<T> { ok: boolean; data: T | null }

const inflight = new Map<string, Promise<SharedResult<any>>>();

export function sharedGet<T = any>(url: string): Promise<SharedResult<T>> {
  const pending = inflight.get(url);
  if (pending) return pending as Promise<SharedResult<T>>;

  const request = fetch(url, { cache: 'no-store' })
    .then(async (res): Promise<SharedResult<T>> => ({
      ok: res.ok,
      data: res.ok ? ((await res.json().catch(() => null)) as T | null) : null,
    }))
    .catch((): SharedResult<T> => ({ ok: false, data: null }))
    .finally(() => { inflight.delete(url); });

  inflight.set(url, request);
  return request;
}
