import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { sharedGet, sharedSet } from '@/lib/cache/shared-cache';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolvedBusinessSuccess {
  success: true;
  businessId: string;
  business: {
    id: string;
    business_name: string;
    name?: string;
    slug?: string;
    [key: string]: any;
  };
  error: null;
}

export interface ResolvedBusinessFailure {
  success: false;
  businessId: null;
  business: null;
  error: NextResponse;
}

export type ResolvedBusinessResult = ResolvedBusinessSuccess | ResolvedBusinessFailure;

// A guest phone polls the order and session status every few seconds, and each poll resolved the venue with a database
// query. A venue's identity (id, name, slug) changes rarely, so a successful lookup is remembered for a minute on this
// server instance. An identifier that matched nothing is remembered too, for the same minute, here and in the shared
// cache: an unknown identifier used to cost a service-role query on every request, with no limit in front of it.
// Off under tests, which swap the database between cases.
const VENUE_CACHE_MS = 60_000;
const MISS_CACHE_MS = 60_000;
const VENUE_CACHE_MAX = 500;
const venueCache = new Map<string, { at: number; value: ResolvedBusinessSuccess }>();
const missCache = new Map<string, number>();
const cacheEnabled = () => process.env.NODE_ENV !== 'test';

/** Forget remembered venues (a test, or a deploy that edits a venue and wants it visible at once). */
export function clearBusinessCache() { venueCache.clear(); missCache.clear(); }

export function normalizeSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const remember = (map: Map<string, any>, key: string, value: any) => {
  if (map.size >= VENUE_CACHE_MAX) map.delete(map.keys().next().value as string);
  map.set(key, value);
};

const found = (row: any): ResolvedBusinessSuccess => ({
  success: true,
  businessId: row.id,
  business: {
    ...row,
    name: row.business_name || row.name || 'Venue',
    business_name: row.business_name || row.name || 'Venue',
  },
  error: null,
});

const notFound = (identifier: string): ResolvedBusinessFailure => ({
  success: false,
  businessId: null,
  business: null,
  error: NextResponse.json(
    { error: `Venue '${identifier}' not found`, code: 'VENUE_NOT_FOUND' },
    { status: 404 }
  ),
});

/**
 * resolveBusinessId()
 * Maps an incoming venue identifier to the verified businesses.id UUID.
 *
 * Rules:
 * - A UUID resolves only by id. A slug resolves only by an exact match on businesses.slug (after normalisation).
 *   There is no lookup by name: names are not unique, and a venue was reachable under another venue's name
 *   through a first-match scan. In-app QR codes carry the UUID.
 * - NO hardcoded UUID fallbacks.
 * - Missing/empty -> 400 JSON response.
 * - Not found in DB -> 404 JSON response, remembered for a minute.
 * - Never throws unhandled 500 error.
 */
export async function resolveBusinessId(
  rawIdentifier: string | null | undefined
): Promise<ResolvedBusinessResult> {
  const identifier = (rawIdentifier || '').trim();

  if (!identifier) {
    return {
      success: false,
      businessId: null,
      business: null,
      error: NextResponse.json(
        { error: 'Venue identifier (cafe_id or slug) is required', code: 'VENUE_IDENTIFIER_REQUIRED' },
        { status: 400 }
      ),
    };
  }

  const isUuid = UUID_REGEX.test(identifier);
  const key = isUuid ? `id:${identifier.toLowerCase()}` : `slug:${normalizeSlug(identifier)}`;
  const now = Date.now();

  if (cacheEnabled()) {
    const hit = venueCache.get(key);
    if (hit && now - hit.at < VENUE_CACHE_MS) return { ...hit.value, business: { ...hit.value.business } };
    const missedAt = missCache.get(key);
    if (missedAt && now - missedAt < MISS_CACHE_MS) return notFound(identifier);
    // A miss another instance has already paid for. Only for a name: a venue id is one indexed lookup in the database,
    // cheaper than asking the shared store first, which put a ~70 ms network call in front of every guest request a new
    // server instance answered.
    if (!isUuid && (await sharedGet<null>(`venue:miss:${key}`)) === null) {
      remember(missCache, key, now);
      return notFound(identifier);
    }
  }

  let row: any = null;
  try {
    const supabase = adminDb();
    const q = supabase.from('businesses').select('*');
    const { data, error } = await (isUuid ? q.eq('id', identifier) : q.eq('slug', key.slice('slug:'.length))).maybeSingle();
    if (!error && data) row = data;
  } catch {
    // A database error is answered as not found below; nothing is remembered for it.
    return notFound(identifier);
  }

  if (row) {
    const value = found(row);
    if (cacheEnabled()) remember(venueCache, key, { at: now, value });
    return { ...value, business: { ...value.business } };
  }

  if (cacheEnabled()) {
    remember(missCache, key, now);
    void sharedSet(`venue:miss:${key}`, null, MISS_CACHE_MS);
  }
  return notFound(identifier);
}
