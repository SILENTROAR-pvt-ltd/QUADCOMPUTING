// Browser-side fetch wrapper for mutations. It never throws and always reports what happened, so a
// caller can't show "saved" for a request the server rejected (fetch only rejects on network errors;
// a 4xx/5xx resolves normally, which is how failed saves kept being reported as successes).
export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Human-readable message: the server's `error`, or a generic fallback. */
  error: string | null;
}

const FALLBACK: Record<number, string> = {
  400: 'That request was not valid.',
  401: 'Your session expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'That item no longer exists.',
  409: 'That action conflicts with the current state. Refresh and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  503: 'The service is temporarily unavailable. Please try again.',
};

export async function apiRequest<T = any>(url: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => null)) as any;
    // Some routes answer 200 with { success: false }.
    const ok = res.ok && data?.success !== false;
    return {
      ok,
      status: res.status,
      data,
      error: ok ? null : data?.error || FALLBACK[res.status] || 'Something went wrong. Please try again.',
    };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Network error. Check your connection and try again.' };
  }
}

export function jsonRequest(method: string, body: unknown, headers: Record<string, string> = {}): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) };
}
