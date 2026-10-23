// The venue's memory vault: photos of the place itself (the room, the evenings, the people) that the host adds from
// Menu & Catalogue and guests see at the foot of the menu. Kept inside businesses.menu_info beside the top picks, so it
// needs no table of its own. A photo must live in this venue's own gallery folder of the venue-vault storage bucket.

export interface GalleryPhoto { url: string; caption: string }

export const GALLERY_MAX = 12;
export const GALLERY_CAPTION_MAX = 80;

/** Where a venue's gallery photos are stored inside the venue-vault bucket. */
export const galleryFolder = (businessId: string) => `${businessId}/gallery/`;

const PUBLIC_PATH = '/storage/v1/object/public/venue-vault/';

/** True for a public venue-vault URL inside a gallery folder (of `businessId` when given). */
export function isGalleryUrl(url: string, businessId?: string): boolean {
  if (typeof url !== 'string' || !url.startsWith('https://') || url.length > 600) return false;
  const at = url.indexOf(PUBLIC_PATH);
  if (at < 0) return false;
  const path = url.slice(at + PUBLIC_PATH.length).split('?')[0];
  if (path.includes('..')) return false;
  return businessId ? path.startsWith(galleryFolder(businessId)) : /^[0-9a-f-]{36}\/gallery\/[^/]+$/i.test(path);
}

/** The gallery as stored: valid photos only, without repeats, captions tidied, at most GALLERY_MAX, in the order given. */
export function galleryPhotos(v: unknown, businessId?: string): GalleryPhoto[] {
  if (!Array.isArray(v)) return [];
  const out: GalleryPhoto[] = [];
  for (const x of v) {
    const url = typeof x?.url === 'string' ? x.url.trim() : '';
    if (!isGalleryUrl(url, businessId) || out.some((p) => p.url === url)) continue;
    const caption = typeof x?.caption === 'string' ? x.caption.replace(/\s+/g, ' ').trim().slice(0, GALLERY_CAPTION_MAX) : '';
    out.push({ url, caption });
  }
  return out.slice(0, GALLERY_MAX);
}
