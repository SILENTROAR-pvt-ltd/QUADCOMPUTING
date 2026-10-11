// Pure validation of a property listing. Rates arrive in rupees per night and leave in paise.
import { cleanText } from '../identity/identity-rules';
import { containsProfanity } from '../identity/profanity';
import { toPaise } from '../money';

export const AMENITIES = [
  'wifi', 'bonfire', 'big_screen', 'pool', 'parking', 'kitchen', 'ac', 'bar', 'live_music', 'garden', 'rooftop',
  'pet_friendly', 'workspace', 'breakfast', 'shuttle',
] as const;

type Result = { ok: true; row: Record<string, unknown>; categories: string[]; businessId: string | null } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });

function coord(raw: unknown, limit: number): number | null | undefined {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= limit ? Math.round(n * 1e6) / 1e6 : undefined;
}

export function parseProperty(body: Record<string, any>, ownerId: string): Result {
  const name = cleanText(body.name, 120);
  if (!name || name.length < 2) return no('Enter the property name.');
  if (containsProfanity(name)) return no('Please rephrase the name.');
  const categories = Array.isArray(body.categories)
    ? Array.from(new Set(body.categories.map((c: unknown) => String(c).toLowerCase()).filter((c: string) => /^[a-z0-9_]{2,30}$/.test(c)))) as string[]
    : [];
  if (categories.length === 0) return no('Choose at least one category.');

  const capacity = Math.round(Number(body.capacity));
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10_000) return no('Capacity must be between 1 and 10,000 guests.');
  const priceMin = toPaise(body.price_min), priceMax = toPaise(body.price_max);
  if (priceMin == null || priceMax == null || priceMax < priceMin) return no('Set a nightly rate range where the maximum is at least the minimum.');

  const address = cleanText(body.address, 300), city = cleanText(body.city, 60), state = cleanText(body.state, 60);
  if (!address || !city || !state) return no('Enter the address, city and state.');
  const lat = coord(body.lat, 90), lng = coord(body.lng, 180);
  if (lat === undefined || lng === undefined) return no('The map pin is not valid.');

  const amenities = Array.isArray(body.amenities) ? body.amenities.filter((a: unknown) => (AMENITIES as readonly string[]).includes(String(a))) : [];
  const photos = Array.isArray(body.photo_paths) ? body.photo_paths.filter((p: unknown) => typeof p === 'string' && p.startsWith(`properties/${ownerId}/`)).slice(0, 12) : [];
  const businessId = typeof body.business_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.business_id) ? body.business_id : null;

  return {
    ok: true,
    categories,
    businessId,
    row: {
      name, categories, description: cleanText(body.description, 2000), capacity, photo_paths: photos, price_min: priceMin, price_max: priceMax,
      amenities: Array.from(new Set(amenities)), lat, lng, address, city, state, country: cleanText(body.country, 60) || 'India',
      house_rules: cleanText(body.house_rules, 2000), terms: cleanText(body.terms, 2000), business_id: businessId,
    },
  };
}
