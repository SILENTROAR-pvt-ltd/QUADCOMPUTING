'use client';

// The one way Club pages talk to /api/club. Never throws: every call resolves to ok or a readable error.
export type ApiResult<T = any> = { ok: true; data: T } | { ok: false; error: string; code?: string; status: number };

export async function clubFetch<T = any>(path: string, init: { method?: string; body?: unknown; raw?: BodyInit; contentType?: string } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/club${path}`, {
      method: init.method || (init.body !== undefined || init.raw ? 'POST' : 'GET'),
      headers: init.raw ? { 'Content-Type': init.contentType || 'application/octet-stream' } : init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success !== false) return { ok: true, data };
    return { ok: false, error: data?.error || 'Something went wrong. Please try again.', code: data?.code, status: res.status };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection and try again.', status: 0 };
  }
}

/** Uploads one file to Club media and returns its storage path and a preview URL. */
export async function uploadMedia(kind: 'chat' | 'stories' | 'events' | 'properties' | 'avatars', file: Blob) {
  return clubFetch<{ path: string; url: string | null; type: 'image' | 'video' }>(`/uploads?kind=${kind}`, { raw: file, contentType: file.type || 'application/octet-stream' });
}

export const rupees = (paise: number | null | undefined) =>
  `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const GENERATION_LABEL: Record<string, string> = {
  gen_alpha: 'Gen Alpha', gen_z: 'Gen Z', millennial: 'Millennial', gen_x: 'Gen X', boomer: 'Boomer',
};
