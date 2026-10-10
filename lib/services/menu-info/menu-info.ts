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
}

export const EMPTY_MENU_INFO: MenuInfo = { tagline: '', address: '', delivery: '', phones: [], timings: [], notes: [] };

const LIMITS = { tagline: 120, address: 240, delivery: 160, phone: 25, phones: 4, timing: 60, timings: 6, note: 200, notes: 12 };
const PHONE = /^\+?[\d][\d\s\-()/]{5,}$/;
const MISSING_COLUMN = new Set(['42703', 'PGRST204']);

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, max: number, count: number) =>
  (Array.isArray(v) ? v.map((x) => text(x, max)).filter(Boolean) : []).slice(0, count);

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

export async function saveMenuInfo(db: any, businessId: string, input: unknown): Promise<SaveMenuInfoResult> {
  const parsed = normalizeMenuInfo(input);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const { error } = await db.from('businesses').update({ menu_info: parsed.value }).eq('id', businessId);
  if (error) {
    if (MISSING_COLUMN.has(error.code)) {
      return { ok: false, status: 503, error: 'Menu information is not switched on yet. Apply migration 20261010000014 first.' };
    }
    throw error;
  }
  return { ok: true, value: parsed.value };
}
