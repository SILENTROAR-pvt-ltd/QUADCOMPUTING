import type { MenuItem } from '../types';

/**
 * The photos for the menu's banner, from the venue's own menu: the host's top picks first, then one dish from each
 * category so the film shows the range. Only dishes on the menu with a photo; at most `max`.
 */
export function bannerPhotos(items: MenuItem[], featured: string[] = [], max = 4): string[] {
  const withPhoto = items.filter((i) => i.image_url && i.available !== false);
  const byId = new Map(withPhoto.map((i) => [String(i.id).toLowerCase(), i]));
  const out: string[] = [];
  const add = (src?: string) => { if (src && !out.includes(src) && out.length < max) out.push(src); };
  featured.forEach((id) => add(byId.get(id.toLowerCase())?.image_url));
  const seen = new Set<string>();
  for (const i of withPhoto) {
    const cat = (i.category || '').trim().toLowerCase();
    if (seen.has(cat)) continue;
    seen.add(cat);
    add(i.image_url);
  }
  withPhoto.forEach((i) => add(i.image_url));
  return out;
}
