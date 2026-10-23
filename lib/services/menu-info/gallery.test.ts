import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { GALLERY_MAX, galleryPhotos, isGalleryUrl } from './gallery';
import { addGalleryPhoto, removeGalleryPhoto } from './gallery-store';
import { loadMenuInfo, saveMenuInfo } from './menu-info';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'ffffffff-1111-4222-8333-444444444444';
const BASE = 'https://proj.supabase.co/storage/v1/object/public/venue-vault/';
const mine = (n: number) => `${BASE}${BIZ}/gallery/${n}.webp`;
const theirs = `${BASE}${OTHER}/gallery/1.webp`;

const db = (gallery: Array<{ url: string; caption: string }> = []) => createFakeSupabase({
  businesses: [{ id: BIZ, menu_info: { tagline: 'Taste & quality', phones: [], timings: [], notes: [], address: '', delivery: '', featured: [], gallery } }],
});

describe('the memory vault', () => {
  it('only accepts this venue-vault bucket’s gallery photos', () => {
    expect(isGalleryUrl(mine(1), BIZ)).toBe(true);
    expect(isGalleryUrl(theirs, BIZ)).toBe(false);
    expect(isGalleryUrl(`${BASE}${BIZ}/dishes/1.webp`, BIZ)).toBe(false);
    expect(isGalleryUrl('https://evil.example/x.jpg')).toBe(false);
    expect(isGalleryUrl(`http://proj.supabase.co/storage/v1/object/public/venue-vault/${BIZ}/gallery/1.webp`)).toBe(false);
    expect(isGalleryUrl(`${BASE}${BIZ}/gallery/../dishes/1.webp`, BIZ)).toBe(false);
  });

  it('keeps photos in order, without repeats, tidies captions and stops at the limit', () => {
    const many = Array.from({ length: GALLERY_MAX + 3 }, (_, i) => ({ url: mine(i), caption: `  Night   ${i} ` }));
    const out = galleryPhotos([{ url: mine(1), caption: 'a' }, { url: mine(1), caption: 'b' }, ...many]);
    expect(out[0]).toEqual({ url: mine(1), caption: 'a' });
    expect(out).toHaveLength(GALLERY_MAX);
    expect(out[1].caption).toBe('Night 0');
  });

  it('saving the vault drops another venue’s photos and leaves the rest of the information alone', async () => {
    const d = db();
    const r = await saveMenuInfo(d, BIZ, { gallery: [{ url: mine(1), caption: 'Courtyard' }, { url: theirs, caption: 'x' }] });
    expect(r.ok && r.value.gallery).toEqual([{ url: mine(1), caption: 'Courtyard' }]);
    expect((await loadMenuInfo(d, BIZ)).tagline).toBe('Taste & quality');
  });

  it('adds an uploaded photo to the end, in the venue’s own folder', async () => {
    const d = db([{ url: mine(1), caption: '' }]);
    const upload = vi.fn(async (path: string) => `${BASE}${path}`);
    const r = await addGalleryPhoto(d, BIZ, { mimeType: 'image/webp', base64: 'aGVsbG8=', caption: 'Live music' }, { upload });
    expect(r.ok).toBe(true);
    expect(upload.mock.calls[0][0].startsWith(`${BIZ}/gallery/`)).toBe(true);
    const gallery = (await loadMenuInfo(d, BIZ)).gallery;
    expect(gallery).toHaveLength(2);
    expect(gallery[1].caption).toBe('Live music');
  });

  it('refuses a file type it cannot show, and a full vault, before storing anything', async () => {
    const upload = vi.fn(async (path: string) => `${BASE}${path}`);
    expect((await addGalleryPhoto(db(), BIZ, { mimeType: 'image/gif', base64: 'aGVsbG8=' }, { upload })).ok).toBe(false);
    const full = db(Array.from({ length: GALLERY_MAX }, (_, i) => ({ url: mine(i), caption: '' })));
    const r = await addGalleryPhoto(full, BIZ, { mimeType: 'image/jpeg', base64: 'aGVsbG8=' }, { upload });
    expect(r.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it('removes a photo from the vault and deletes its file; another venue’s photo cannot be removed', async () => {
    const d = db([{ url: mine(1), caption: '' }, { url: mine(2), caption: '' }]);
    const remove = vi.fn(async () => undefined);
    const r = await removeGalleryPhoto(d, BIZ, mine(1), { remove });
    expect(r.ok && r.info.gallery.map((p) => p.url)).toEqual([mine(2)]);
    expect(remove).toHaveBeenCalledWith(`${BIZ}/gallery/1.webp`);
    expect((await removeGalleryPhoto(d, BIZ, theirs, { remove })).ok).toBe(false);
  });
});
