// Google image search through the official Programmable Search API (needs GOOGLE_CSE_KEY and GOOGLE_CSE_CX).
// Results show Google's thumbnail; a picked photo is downloaded from its own address by url-ingest.
import type { StockPhoto } from './stock-providers';

export async function searchWebImages(query: string, fetchImpl: typeof fetch = fetch): Promise<StockPhoto[]> {
  const key = process.env.GOOGLE_CSE_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!key || !cx || !query.trim()) return [];
  const params = new URLSearchParams({ key, cx, q: query, searchType: 'image', num: '10', imgSize: 'large', safe: 'active' });
  const res = await fetchImpl(`https://www.googleapis.com/customsearch/v1?${params}`, { cache: 'no-store' } as RequestInit);
  if (!res.ok) throw new Error(`Web photo search is unavailable (${res.status}).`);
  const json: any = await res.json();
  return (json.items || [])
    .filter((i: any) => typeof i.link === 'string' && i.link.startsWith('https://'))
    .map((i: any) => ({
      id: String(i.link),
      source: 'web' as const,
      url: String(i.image?.thumbnailLink || i.link),
      sourceUrl: String(i.link),
      credit: i.displayLink ? String(i.displayLink) : undefined,
      title: String(i.title || ''),
      text: `${i.title || ''} ${i.snippet || ''}`,
    }));
}
