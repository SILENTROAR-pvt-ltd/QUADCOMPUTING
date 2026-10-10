// External stock photo libraries. Pexels is used when its key is set, then Unsplash, otherwise Wikimedia
// Commons, which needs no key. Every result must come from an allowed image host before it can be saved.
import type { PhotoCandidate } from './image-match';
import { searchWikimedia } from './wikimedia-search';

export type StockPhoto = PhotoCandidate & { credit?: string; downloadLocation?: string };

const STOCK_IMAGE_HOSTS = ['https://images.unsplash.com/', 'https://images.pexels.com/', 'https://upload.wikimedia.org/', 'https://thumb.wikimedia.org/'];
const UNSPLASH_API = 'https://api.unsplash.com/';

export function isStockImageUrl(url: unknown): url is string {
  return typeof url === 'string' && STOCK_IMAGE_HOSTS.some((host) => url.startsWith(host));
}

async function searchPexels(query: string, key: string, fetchImpl: typeof fetch): Promise<StockPhoto[]> {
  const res = await fetchImpl(`https://api.pexels.com/v1/search?per_page=12&query=${encodeURIComponent(query)}`, {
    headers: { Authorization: key },
    cache: 'no-store',
  } as RequestInit);
  if (!res.ok) throw new Error(`Stock photo search is unavailable (${res.status}).`);
  const json: any = await res.json();
  return (json.photos || [])
    .map((p: any) => ({
      id: String(p.id),
      source: 'unsplash' as const,
      url: p.src?.large || '',
      title: p.alt || '',
      text: p.alt || '',
      credit: p.photographer,
    }))
    .filter((p: StockPhoto) => isStockImageUrl(p.url));
}

async function searchUnsplash(query: string, key: string, fetchImpl: typeof fetch): Promise<StockPhoto[]> {
  const res = await fetchImpl(`${UNSPLASH_API}search/photos?per_page=12&query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
    cache: 'no-store',
  } as RequestInit);
  if (!res.ok) throw new Error(`Stock photo search is unavailable (${res.status}).`);
  const json: any = await res.json();
  return (json.results || [])
    .map((p: any) => ({
      id: String(p.id),
      source: 'unsplash' as const,
      url: p.urls?.regular || '',
      title: p.alt_description || p.description || '',
      text: [p.description, ...(p.tags || []).map((t: any) => t.title)].filter(Boolean).join(' '),
      credit: p.user?.name,
      downloadLocation: p.links?.download_location,
    }))
    .filter((p: StockPhoto) => isStockImageUrl(p.url));
}

/** Stock results for a dish name, from the first library that is configured. */
export async function searchStockLibrary(query: string, fetchImpl: typeof fetch = fetch): Promise<StockPhoto[]> {
  const pexels = process.env.PEXELS_API_KEY?.trim();
  const unsplash = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!query.trim()) return [];
  if (pexels) return searchPexels(query, pexels, fetchImpl);
  if (unsplash) return searchUnsplash(query, unsplash, fetchImpl);
  return searchWikimedia(query, fetchImpl);
}

export function isUnsplashDownload(downloadLocation?: string): downloadLocation is string {
  return Boolean(downloadLocation?.startsWith(UNSPLASH_API));
}
