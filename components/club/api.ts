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
export async function uploadMedia(kind: 'chat' | 'stories' | 'events' | 'meetups' | 'properties' | 'avatars', file: Blob) {
  return clubFetch<{ path: string; url: string | null; type: 'image' | 'video' }>(`/uploads?kind=${kind}`, { raw: file, contentType: file.type || 'application/octet-stream' });
}

export const rupees = (paise: number | null | undefined) =>
  `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** "12 Oct · 6:00 pm" for a same-day plan, "12 Oct – 14 Oct" for a longer one. */
export function dateSpan(start: string, end?: string | null) {
  if (!end || day(start) === day(end)) return `${day(start)} · ${new Date(start).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
  return `${day(start)} – ${day(end)}`;
}

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago", then the date. */
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.floor(Math.max(0, now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} day${days === 1 ? '' : 's'} ago` : day(iso);
}

export const GENERATION_LABEL: Record<string, string> = {
  gen_alpha: 'Gen Alpha', gen_z: 'Gen Z', millennial: 'Millennial', gen_x: 'Gen X', boomer: 'Boomer',
};

export const REGION_LABEL: Record<string, string> = {
  india: 'India', asia: 'Asia', europe: 'Europe', americas: 'The Americas', africa: 'Africa', oceania: 'Oceania',
};
