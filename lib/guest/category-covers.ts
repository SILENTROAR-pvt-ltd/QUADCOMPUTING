// Which photo sits on each category chip: the venue's own dish photos, so "Beverages" shows one of its drinks and
// "Quick Bites" one of its bites. A category's cover is its first dish with a photo, in menu order (the same photo
// its card further down the page shows). "All dishes" gets a photo no category is already using, when there is one.

interface CoverSource {
  category?: string | null;
  image_url?: string | null;
}

const key = (category: string) => category.trim().toLowerCase();

/** Cover photo URLs keyed by lower-cased category; "dining" is the all-dishes chip. Categories without a photo are absent. */
export function categoryCovers(items: readonly CoverSource[]): Record<string, string> {
  const covers: Record<string, string> = {};
  const photos: string[] = [];
  for (const item of items) {
    const url = item.image_url?.trim();
    if (!url) continue;
    photos.push(url);
    const k = key(item.category || '');
    if (k && k !== 'dining' && !covers[k]) covers[k] = url;
  }
  const used = new Set(Object.values(covers));
  const all = photos.find((url) => !used.has(url)) ?? photos[0];
  if (all) covers.dining = all;
  return covers;
}

/**
 * A small square version of a dish photo for a chip, so the whole row costs about what one dish photo does (about
 * 9 KB a chip instead of about 50). Supabase Storage, Unsplash and Pexels resize on request; Wikimedia serves fixed
 * thumbnail widths. Anything else is used as it is. The chip falls back to the original if a small one fails.
 */
export function chipPhoto(url: string, px = 160): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('.supabase.co') && u.pathname.startsWith('/storage/v1/object/public/')) {
      u.pathname = u.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      u.search = `width=${px}&height=${px}&resize=cover&quality=70`;
      return u.toString();
    }
    if (/(^|\.)wikimedia\.org$/.test(u.hostname) && /\/thumb\/.+\/\d+px-[^/]+$/.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/\d+px-([^/]+)$/, '/250px-$1');
      u.search = '';
      return u.toString();
    }
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('w', String(px)); u.searchParams.set('h', String(px));
      u.searchParams.set('fit', 'crop'); u.searchParams.set('auto', 'format'); u.searchParams.set('q', '70');
      return u.toString();
    }
    if (u.hostname === 'images.pexels.com') {
      u.search = `auto=compress&cs=tinysrgb&fit=crop&w=${px}&h=${px}`;
      return u.toString();
    }
  } catch {
    // Not an absolute URL (a local path): use it as it is.
  }
  return url;
}
