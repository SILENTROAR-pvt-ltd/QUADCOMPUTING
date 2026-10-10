// Wikimedia Commons: free, openly licensed photos, searched with no account or key. Each photo keeps
// its artist and licence so the picker can show credit.
import type { StockPhoto } from './stock-providers';

const API = 'https://commons.wikimedia.org/w/api.php';
const IMAGE_FILE = /\.(jpe?g|png|webp)$/i;
// Commons serves its thumbnails from either host; both are allowed.
const PHOTO_HOSTS = ['https://upload.wikimedia.org/', 'https://thumb.wikimedia.org/'];

const plain = (html: unknown): string => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export async function searchWikimedia(query: string, fetchImpl: typeof fetch = fetch): Promise<StockPhoto[]> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrlimit: '12',
    gsrsearch: query, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '800',
  });
  const get = () => fetchImpl(`${API}?${params}`, {
    headers: { 'User-Agent': 'QuadComputing/1.0 (menu photo pipeline)' },
    cache: 'no-store',
  } as RequestInit);
  let res = await get();
  if (res.status === 429) {
    // Wikimedia asks clients to wait; wait once (capped), then try again.
    await new Promise((resolve) => setTimeout(resolve, Math.min(Number(res.headers.get('retry-after')) || 5, 30) * 1000));
    res = await get();
  }
  if (!res.ok) throw new Error(`Stock photo search is unavailable (${res.status}).`);
  const json: any = await res.json();
  const pages: any[] = Object.values(json.query?.pages ?? {});
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((p) => {
      const info = p.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const title = String(p.title ?? '').replace(/^File:/, '').replace(IMAGE_FILE, '').replace(/[_-]+/g, ' ').trim();
      const artist = plain(meta.Artist?.value);
      const licence = plain(meta.LicenseShortName?.value);
      return {
        id: String(p.pageid),
        source: 'unsplash' as const,
        url: String(info?.thumburl ?? ''),
        title,
        text: `${title} ${plain(meta.ImageDescription?.value)}`,
        credit: [artist, licence].filter(Boolean).join(' · ') || undefined,
      };
    })
    .filter((p) => PHOTO_HOSTS.some((host) => p.url.startsWith(host)) && IMAGE_FILE.test(p.url.split('?')[0] ?? ''));
}
