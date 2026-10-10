import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { matchScore, nameTokens, rankPhotos, EXACT } from '@/lib/services/catalog/image-match';
import { autoFillDishPhotos } from '@/lib/services/catalog/photo-autofill';
import { assignDishPhoto } from '@/lib/services/catalog/photo-assign';
import { searchDishPhotos } from '@/lib/services/catalog/photo-sources';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444';
const MISAL = 'cccccccc-1111-4222-8333-444444444441';
const SALAD_DISH = 'cccccccc-1111-4222-8333-444444444442';
const FOREIGN_DISH = 'cccccccc-1111-4222-8333-444444444443';
const MISAL_PHOTO = 'dddddddd-1111-4222-8333-444444444441';
const OTHER_PHOTO = 'dddddddd-1111-4222-8333-444444444442';
const vaultUrl = (n: string) => `https://vault.example/${n}.jpg`;

afterEach(() => { vi.unstubAllGlobals(); delete process.env.UNSPLASH_ACCESS_KEY; delete process.env.PEXELS_API_KEY; });

const seed = () => createFakeSupabase({
  catalog_items: [
    { id: MISAL, business_id: BIZ, name: 'Misal Pav', image_url: null },
    { id: SALAD_DISH, business_id: BIZ, name: 'Garden Green Salad', image_url: null },
    { id: FOREIGN_DISH, business_id: OTHER, name: 'Misal Pav', image_url: null },
  ],
  venue_photo_vault: [
    { id: MISAL_PHOTO, venue_id: BIZ, title: 'Misal pav bowl', category: 'Quick Bites', description: '', image_url: vaultUrl('misal'), is_active: true },
    { id: OTHER_PHOTO, venue_id: OTHER, title: 'Misal pav', category: '', description: '', image_url: vaultUrl('other'), is_active: true },
  ],
});

describe('Matching a dish to a photo by its words', () => {
  it('ignores bracketed notes and stop words, and needs every word for an exact match', () => {
    expect(nameTokens('Puran Poli (Make To Order)')).toEqual(['puran', 'poli']);
    expect(matchScore('Misal Pav', 'Misal pav bowl')).toBe(EXACT);
    expect(matchScore('Misal Pav', 'Pav bhaji')).toBe(0.5);
    expect(matchScore('Misal Pav', 'Garden salad')).toBe(0);
  });

  it('ranks the best matches first and drops photos with no shared word', () => {
    const ranked = rankPhotos('Misal Pav', [
      { id: '1', source: 'vault', url: 'u1', title: 'Pav bhaji', text: '' },
      { id: '2', source: 'vault', url: 'u2', title: 'Misal pav', text: '' },
      { id: '3', source: 'vault', url: 'u3', title: 'Dessert', text: '' },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(['2', '1']);
    expect(ranked[0]?.score).toBe(EXACT);
  });
});

describe('Smart stock images', () => {
  it('says plainly that the Photo Vault needs its migration, instead of failing with a server error', async () => {
    const { PhotoVaultNotReady } = await import('@/lib/services/catalog/photo-sources');
    // A chainable query stub: dish lookups succeed, the Photo Vault table reports as missing.
    const db = {
      from: (table: string) => {
        const result = table === 'venue_photo_vault'
          ? { data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.venue_photo_vault'" } }
          : { data: [{ id: MISAL, name: 'Misal Pav' }], error: null };
        const builder: any = {};
        for (const m of ['select', 'eq', 'or', 'limit', 'is', 'in', 'not', 'order']) builder[m] = () => builder;
        builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
        return builder;
      },
    };
    await expect(autoFillDishPhotos(db, BIZ)).rejects.toBeInstanceOf(PhotoVaultNotReady);
  });

  it('assigns only exact matches from the venue’s own Photo Vault, and lists the rest for a person', async () => {
    const db = seed();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await autoFillDishPhotos(db, BIZ);
    expect(res.matched).toEqual([expect.objectContaining({ id: MISAL, image_url: vaultUrl('misal') })]);
    expect(res.unmatched).toEqual([expect.objectContaining({ id: SALAD_DISH })]);
    expect(db.tables.catalog_items.find((i: any) => i.id === SALAD_DISH)?.image_url).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never uses another venue’s photo, even with the same dish name', async () => {
    const db = seed();
    await autoFillDishPhotos(db, BIZ);
    expect(db.tables.catalog_items.find((i: any) => i.id === FOREIGN_DISH)?.image_url).toBeNull();
  });

  it('refuses a vault photo that belongs to another venue, and a dish from another venue', async () => {
    const db = seed();
    expect(await assignDishPhoto(db, BIZ, MISAL, { source: 'vault', vault_id: OTHER_PHOTO })).toMatchObject({ ok: false, status: 404 });
    expect(await assignDishPhoto(db, BIZ, FOREIGN_DISH, { source: 'vault', vault_id: MISAL_PHOTO })).toMatchObject({ ok: false, status: 404 });
  });

  it('sets the chosen vault photo on the venue’s own dish', async () => {
    const db = seed();
    const res = await assignDishPhoto(db, BIZ, MISAL, { source: 'vault', vault_id: MISAL_PHOTO });
    expect(res).toEqual({ ok: true, image_url: vaultUrl('misal') });
    expect(db.tables.catalog_items.find((i: any) => i.id === MISAL)?.image_url).toBe(vaultUrl('misal'));
  });

  it('only accepts stock photos from the stock library', async () => {
    const db = seed();
    expect(await assignDishPhoto(db, BIZ, MISAL, { source: 'unsplash', url: 'https://evil.example/x.jpg' })).toMatchObject({ ok: false, status: 400 });
    expect(await assignDishPhoto(db, BIZ, MISAL, { source: 'unsplash', url: 'https://images.unsplash.com/photo-1?w=800' })).toMatchObject({ ok: true });
  });

  it('needs no key: with none set, stock results come from Wikimedia Commons, with their licence as credit', async () => {
    const db = seed();
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ query: { pages: { '1': {
        pageid: 1, index: 1, title: 'File:Misal_pav.jpg',
        imageinfo: [{ thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Misal_pav.jpg/800px-Misal_pav.jpg?utm_source=commons.wikimedia.org', extmetadata: { Artist: { value: '<a>Jane</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }],
      } } } }),
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const photos = await searchDishPhotos(db, BIZ, 'Misal Pav', true);
    expect(String((fetchSpy.mock.calls[0] as any)[0])).toContain('commons.wikimedia.org/w/api.php');
    const stock = photos.filter((p) => p.source === 'unsplash');
    expect(stock[0]).toMatchObject({ id: '1', score: EXACT, credit: 'Jane · CC BY-SA 4.0' });
  });

  it('Smart Stock Images: a dish with no vault photo gets a stock photo only when every dish word matches', async () => {
    const full = { id: 'w1', source: 'unsplash' as const, url: 'https://upload.wikimedia.org/full.jpg', title: 'Garden green salad', text: '' };
    const partial = { id: 'w2', source: 'unsplash' as const, url: 'https://upload.wikimedia.org/partial.jpg', title: 'Garden salad', text: '' };

    const db = seed();
    const res = await autoFillDishPhotos(db, BIZ, undefined, vi.fn(async () => [partial, full]));
    expect(res.matched).toEqual([
      expect.objectContaining({ id: MISAL, method: 'exact' }),
      expect.objectContaining({ id: SALAD_DISH, method: 'stock', image_url: 'https://upload.wikimedia.org/full.jpg' }),
    ]);
    expect(res.unmatched).toEqual([]);
    expect(db.tables.catalog_items.find((i: any) => i.id === SALAD_DISH)?.image_url).toBe('https://upload.wikimedia.org/full.jpg');

    const partialOnly = seed();
    const res2 = await autoFillDishPhotos(partialOnly, BIZ, undefined, vi.fn(async () => [partial]));
    expect(res2.unmatched).toEqual([expect.objectContaining({ id: SALAD_DISH })]);
    expect(partialOnly.tables.catalog_items.find((i: any) => i.id === SALAD_DISH)?.image_url).toBeNull();
  });

  it('adds stock results, with their match scores, when a key is set', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'test-key';
    const db = seed();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ results: [
        { id: 's1', alt_description: 'misal pav in a steel plate', urls: { regular: 'https://images.unsplash.com/s1' }, user: { name: 'A' } },
        { id: 's2', alt_description: 'garden salad', urls: { regular: 'https://images.unsplash.com/s2' } },
      ] }),
    })));
    const photos = await searchDishPhotos(db, BIZ, 'Misal Pav', true);
    const stock = photos.filter((p) => p.source === 'unsplash');
    expect(stock.map((p) => p.id)).toEqual(['s1', 's2']);
    expect(stock[0]?.score).toBe(EXACT);
    expect(stock[1]?.score).toBe(0);
  });

  it('uses Pexels when its key is set, and only saves Pexels photos from the Pexels image host', async () => {
    process.env.PEXELS_API_KEY = 'pexels-key';
    const db = seed();
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ photos: [
        { id: 9, alt: 'misal pav with sprouts', src: { large: 'https://images.pexels.com/photos/9/large.jpg' }, photographer: 'P' },
        { id: 10, alt: 'garden salad', src: { large: 'https://evil.example/10.jpg' } },
      ] }),
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const photos = await searchDishPhotos(db, BIZ, 'Misal Pav', true);
    const [url, init] = fetchSpy.mock.calls[0] as any;
    expect(url).toContain('https://api.pexels.com/v1/search?');
    expect(init.headers.Authorization).toBe('pexels-key');
    const stock = photos.filter((p) => p.source === 'unsplash');
    expect(stock.map((p) => p.id)).toEqual(['9']);
    expect(await assignDishPhoto(db, BIZ, MISAL, { source: 'unsplash', url: stock[0]!.url })).toMatchObject({ ok: true });
    expect(await assignDishPhoto(db, BIZ, MISAL, { source: 'unsplash', url: 'https://evil.example/10.jpg' })).toMatchObject({ ok: false, status: 400 });
  });
});
