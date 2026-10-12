// Profile details a member chooses: the kinds of traveller they are (up to five) and the social accounts
// to show as logos. The database checks the same rules; this module gives clear messages and tidies input.
export const TRAVELER_KINDS = [
  'solo', 'nomad', 'volunteer', 'influencer', 'creator', 'photographer', 'foodie', 'adventure',
  'backpacker', 'luxury', 'slow', 'wellness', 'culture', 'business', 'festival',
] as const;
export type TravelerKind = (typeof TRAVELER_KINDS)[number];
export const MAX_TRAVELER_KINDS = 5;

export interface SocialNetwork {
  key: 'instagram' | 'youtube' | 'x' | 'tiktok' | 'linkedin' | 'facebook' | 'website';
  label: string;
  /** What the member types: a handle without the @, or a full https link for the website. */
  kind: 'handle' | 'url';
  pattern?: RegExp;
  /** Builds the public link from the stored value. */
  link: (value: string) => string;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { key: 'instagram', label: 'Instagram', kind: 'handle', pattern: /^[A-Za-z0-9._]{1,30}$/, link: (v) => `https://instagram.com/${v}` },
  { key: 'youtube', label: 'YouTube', kind: 'handle', pattern: /^[A-Za-z0-9._-]{3,30}$/, link: (v) => `https://youtube.com/@${v}` },
  { key: 'x', label: 'X', kind: 'handle', pattern: /^[A-Za-z0-9_]{1,15}$/, link: (v) => `https://x.com/${v}` },
  { key: 'tiktok', label: 'TikTok', kind: 'handle', pattern: /^[A-Za-z0-9._]{2,24}$/, link: (v) => `https://tiktok.com/@${v}` },
  { key: 'linkedin', label: 'LinkedIn', kind: 'handle', pattern: /^[A-Za-z0-9-]{3,100}$/, link: (v) => `https://linkedin.com/in/${v}` },
  { key: 'facebook', label: 'Facebook', kind: 'handle', pattern: /^[A-Za-z0-9.]{3,50}$/, link: (v) => `https://facebook.com/${v}` },
  { key: 'website', label: 'Website', kind: 'url', link: (v) => v },
];

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_BIO = 300;
export const MAX_BIO_LINES = 5;

/** A few lines a member writes about themself: tidied, at most 300 characters and 5 lines. Empty clears it. */
export function cleanBio(raw: unknown): Result<string | null> {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false, error: 'Write your bio as plain text.' };
  const text = raw.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '')
    .split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > MAX_BIO) return { ok: false, error: `Keep your bio to ${MAX_BIO} characters.` };
  if (text.split('\n').length > MAX_BIO_LINES) return { ok: false, error: `Keep your bio to ${MAX_BIO_LINES} lines.` };
  return { ok: true, value: text || null };
}

export function cleanTravelerKinds(raw: unknown): Result<TravelerKind[]> {
  if (raw == null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: 'Choose traveller types from the list.' };
  const picked = Array.from(new Set(raw.map((x) => String(x))));
  if (picked.some((k) => !(TRAVELER_KINDS as readonly string[]).includes(k))) return { ok: false, error: 'Choose traveller types from the list.' };
  if (picked.length > MAX_TRAVELER_KINDS) return { ok: false, error: `Choose up to ${MAX_TRAVELER_KINDS} traveller types.` };
  return { ok: true, value: TRAVELER_KINDS.filter((k) => picked.includes(k)) };
}

/** A handle as typed: a pasted profile link is reduced to its last part, and a leading @ is dropped. */
export function normalizeHandle(raw: string): string {
  let v = raw.trim().split('?')[0].replace(/\/+$/, '');
  if (v.includes('/')) v = v.slice(v.lastIndexOf('/') + 1);
  return v.replace(/^@+/, '');
}

export function cleanSocialLinks(raw: unknown): Result<Partial<Record<SocialNetwork['key'], string>>> {
  if (raw == null) return { ok: true, value: {} };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Social links were not understood.' };
  const source = raw as Record<string, unknown>;
  const out: Partial<Record<SocialNetwork['key'], string>> = {};
  for (const net of SOCIAL_NETWORKS) {
    const typed = typeof source[net.key] === 'string' ? (source[net.key] as string).trim() : '';
    if (!typed) continue;
    if (net.kind === 'url') {
      let url: URL;
      try { url = new URL(typed); } catch { return { ok: false, error: 'Enter a full website address starting with https://.' }; }
      if (url.protocol !== 'https:' || typed.length > 200) return { ok: false, error: 'Enter a full website address starting with https://.' };
      out[net.key] = url.toString();
      continue;
    }
    const handle = normalizeHandle(typed);
    if (!net.pattern || !net.pattern.test(handle)) return { ok: false, error: `That ${net.label} handle does not look right. Use letters, numbers and the usual symbols.` };
    out[net.key] = handle;
  }
  return { ok: true, value: out };
}
