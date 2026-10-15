/** Where the guest was before Google sign-in, so they land back on the same table. Same-site paths only. */
export const AUTH_NEXT_COOKIE = 'qc_auth_next';

export function safeNextPath(raw: unknown, fallback = '/'): string {
  if (typeof raw !== 'string') return fallback;
  let value = raw;
  try { value = decodeURIComponent(raw); } catch { return fallback; }
  // One leading slash only: "//host" and "/\host" are read by browsers as another site.
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return fallback;
  if (value.length > 600) return fallback;
  return value;
}

/** The path with the sign-in marker added, kept next to any query (table, cafe_id) it already has. */
export function withAuthMarker(path: string, marker: string): string {
  const url = new URL(path, 'http://local');
  url.searchParams.set('auth', marker);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function suggestHandle(name: string | null | undefined, email: string | null | undefined): string {
  const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
  const fromName = clean((name || '').replace(/\s+/g, ''));
  if (fromName.length >= 2) return fromName;
  const fromEmail = clean((email || '').split('@')[0] || '');
  return fromEmail.length >= 2 ? fromEmail : '';
}
