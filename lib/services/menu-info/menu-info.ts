// The venue's public menu information: tagline, address, delivery, phones, timings and house notes.
// Stored as JSON on businesses.menu_info. Validated on every save, and read leniently so a bad
// stored value never breaks the guest menu.

export interface MenuInfo {
  tagline: string;
  address: string;
  delivery: string;
  phones: string[];
  timings: string[];
  notes: string[];
  /** Catalogue item ids the host has picked to show first on the guest menu, in this order. */
  featured: string[];
}

export const EMPTY_MENU_INFO: MenuInfo = { tagline: '', address: '', delivery: '', phones: [], timings: [], notes: [], featured: [] };

/** Up to this many dishes can be picked as the venue's top picks. */
export const FEATURED_MAX = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LIMITS = { tagline: 120, address: 240, delivery: 160, phone: 25, phones: 4, timing: 60, timings: 6, note: 200, notes: 12 };
const PHONE = /^\+?[\d][\d\s\-()/]{5,}$/;
const MISSING_COLUMN = new Set(['42703', 'PGRST204']);

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, max: number, count: number) =>
  (Array.isArray(v) ? v.map((x) => text(x, max)).filter(Boolean) : []).slice(0, count);

/** Picked dish ids: valid, without repeats, in the order given, at most FEATURED_MAX. */
export function featuredIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const id = typeof x === 'string' ? x.trim().toLowerCase() : '';
    if (UUID.test(id) && !out.includes(id)) out.push(id);
  }
  return out.slice(0, FEATURED_MAX);
}

export function normalizeMenuInfo(input: unknown): { ok: true; value: MenuInfo } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Menu information must be an object.' };
  const i = input as Record<string, unknown>;
  const phones = list(i.phones, LIMITS.phone, LIMITS.phones);
  if (phones.some((p) => !PHONE.test(p))) {
    return { ok: false, error: 'A phone number may only contain digits, spaces, +, -, ( ) and /.' };
  }
  return {
    ok: true,
    value: {
      tagline: text(i.tagline, LIMITS.tagline),
      address: text(i.address, LIMITS.address),
      delivery: text(i.delivery, LIMITS.delivery),
      phones,
      timings: list(i.timings, LIMITS.timing, LIMITS.timings),
      notes: list(i.notes, LIMITS.note, LIMITS.notes),
      featured: featuredIds(i.featured),
    },
  };
}

/** What the guest sees: a stored value that no longer validates reads as empty rather than failing. */
export function readMenuInfo(raw: unknown): MenuInfo {
  const parsed = normalizeMenuInfo(raw);
  return parsed.ok ? parsed.value : EMPTY_MENU_INFO;
}

export async function loadMenuInfo(db: any, businessId: string): Promise<MenuInfo> {
  const { data, error } = await db.from('businesses').select('menu_info').eq('id', businessId).maybeSingle();
  if (error) {
    if (MISSING_COLUMN.has(error.code)) return EMPTY_MENU_INFO;
    throw error;
  }
  return readMenuInfo(data?.menu_info);
}

export type SaveMenuInfoResult = { ok: true; value: MenuInfo } | { ok: false; status: number; error: string };

/**
 * Saves menu information. Only the fields the caller sends change: the information card sends its text fields and the top-picks
 * card sends `featured`, and neither may wipe what the other saved.
 */
export async function saveMenuInfo(db: any, businessId: string, input: unknown): Promise<SaveMenuInfoResult> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, status: 400, error: 'Menu information must be an object.' };
  const sent = input as Record<string, unknown>;
  const current = await loadMenuInfo(db, businessId).catch(() => EMPTY_MENU_INFO);
  const parsed = normalizeMenuInfo({ ...current, ...sent });
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };

  // A top pick must be a dish on this venue's own catalogue: an id from anywhere else is dropped, not saved.
  if ('featured' in sent && parsed.value.featured.length) {
    const { data: found } = await db.from('catalog_items').select('id').eq('business_id', businessId).in('id', parsed.value.featured);
    const real = new Set((found || []).map((r: any) => String(r.id).toLowerCase()));
    parsed.value.featured = parsed.value.featured.filter((id) => real.has(id));
  }
  const { error } = await db.from('businesses').update({ menu_info: parsed.value }).eq('id', businessId);
  if (error) {
    if (MISSING_COLUMN.has(error.code)) {
      return { ok: false, status: 503, error: 'Menu information is not switched on yet. Apply migration 20261010000014 first.' };
    }
    throw error;
  }
  return { ok: true, value: parsed.value };
}
