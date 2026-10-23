// Adding and removing memory-vault photos for a host. The photo itself goes to the venue-vault bucket under the
// venue's gallery folder; the list (with captions and order) lives in businesses.menu_info.gallery.
import { GALLERY_MAX, galleryFolder, isGalleryUrl } from './gallery';
import { loadMenuInfo, saveMenuInfo, type MenuInfo } from './menu-info';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** About 3.5 MB of image: the host page shrinks photos before sending, so this only stops the unreasonable. */
const MAX_BASE64 = 4_800_000;
const PUBLIC_PATH = '/storage/v1/object/public/venue-vault/';

export interface GalleryUpload { mimeType: string; base64: string; caption?: string }
export interface GalleryDeps {
  upload: (path: string, bytes: Buffer, mimeType: string) => Promise<string>;
  remove: (path: string) => Promise<void>;
}
export type GalleryResult = { ok: true; info: MenuInfo } | { ok: false; status: number; error: string };

/** Stores one photo in the venue's gallery folder and adds it to the end of the vault. */
export async function addGalleryPhoto(db: any, businessId: string, input: GalleryUpload, deps: Pick<GalleryDeps, 'upload'>): Promise<GalleryResult> {
  const ext = EXT[input?.mimeType];
  if (!ext) return { ok: false, status: 400, error: 'Only JPG, PNG or WebP photos.' };
  if (typeof input.base64 !== 'string' || !input.base64 || input.base64.length > MAX_BASE64) {
    return { ok: false, status: 400, error: 'The photo is empty or too large. Please choose a smaller one.' };
  }
  const current = await loadMenuInfo(db, businessId);
  if (current.gallery.length >= GALLERY_MAX) return { ok: false, status: 409, error: `The vault holds ${GALLERY_MAX} photos. Remove one to add another.` };

  const path = `${galleryFolder(businessId)}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const url = await deps.upload(path, Buffer.from(input.base64, 'base64'), input.mimeType);
  const saved = await saveMenuInfo(db, businessId, { gallery: [...current.gallery, { url, caption: input.caption ?? '' }] });
  return saved.ok ? { ok: true, info: saved.value } : { ok: false, status: saved.status, error: saved.error };
}

/** Takes a photo out of the vault, then deletes the file (a file that cannot be deleted is left; the vault is what counts). */
export async function removeGalleryPhoto(db: any, businessId: string, url: string, deps: Pick<GalleryDeps, 'remove'>): Promise<GalleryResult> {
  if (!isGalleryUrl(url, businessId)) return { ok: false, status: 400, error: 'That photo is not in this venue’s vault.' };
  const current = await loadMenuInfo(db, businessId);
  const saved = await saveMenuInfo(db, businessId, { gallery: current.gallery.filter((p) => p.url !== url) });
  if (!saved.ok) return { ok: false, status: saved.status, error: saved.error };
  const path = url.slice(url.indexOf(PUBLIC_PATH) + PUBLIC_PATH.length).split('?')[0];
  await deps.remove(path).catch(() => undefined);
  return { ok: true, info: saved.value };
}
