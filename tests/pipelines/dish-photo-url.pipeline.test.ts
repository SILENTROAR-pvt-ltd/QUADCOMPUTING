import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { assertPublicHttpsUrl, fetchPublicImage, isPublicAddress, UnsafeUrlError } from '@/lib/services/catalog/safe-fetch';
import { ingestDishImageUrl } from '@/lib/services/catalog/url-ingest';
import { searchWebImages } from '@/lib/services/catalog/web-images';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444';
const DISH = 'cccccccc-1111-4222-8333-444444444441';
const PUBLIC = async () => ['93.184.216.34'];
const PRIVATE = async () => ['10.0.0.5'];
const photo = (type = 'image/jpeg', body = 'jpgbytes') => new Response(Buffer.from(body), { status: 200, headers: { 'content-type': type } });

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_CSE_KEY;
  delete process.env.GOOGLE_CSE_CX;
});

describe('Photo links are downloaded safely', () => {
  it('accepts only public https addresses', async () => {
    expect(isPublicAddress('93.184.216.34')).toBe(true);
    for (const ip of ['127.0.0.1', '10.1.1.1', '169.254.169.254', '192.168.1.5', '172.20.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
      expect(isPublicAddress(ip)).toBe(false);
    }
    await expect(assertPublicHttpsUrl('http://93.184.216.34/a.jpg', PUBLIC)).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicHttpsUrl('https://169.254.169.254/latest', PUBLIC)).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicHttpsUrl('https://photos.example/a.jpg', PRIVATE)).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicHttpsUrl('https://user:pw@photos.example/a.jpg', PUBLIC)).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicHttpsUrl('https://photos.example/a.jpg', PUBLIC)).resolves.toBeInstanceOf(URL);
  });

  it('downloads a photo, and refuses a redirect to a private address and any non-photo file', async () => {
    const got = await fetchPublicImage('https://photos.example/a.jpg', vi.fn(async () => photo()) as any, PUBLIC);
    expect(got.mimeType).toBe('image/jpeg');
    expect(got.bytes.toString()).toBe('jpgbytes');

    const redirect = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://10.0.0.5/a.jpg' } }));
    await expect(fetchPublicImage('https://photos.example/a.jpg', redirect as any, PUBLIC)).rejects.toBeInstanceOf(UnsafeUrlError);

    await expect(fetchPublicImage('https://photos.example/page', vi.fn(async () => photo('text/html')) as any, PUBLIC))
      .rejects.toThrow(/not a JPG, PNG or WebP/);
  });
});

describe('A photo link goes onto one of the venue’s dishes', () => {
  it('stores the venue’s own copy, refuses unsafe links with 400, and never touches another venue’s dish', async () => {
    const db = createFakeSupabase({ catalog_items: [{ id: DISH, business_id: BIZ, name: 'Aloo Matar', image_url: null }] });
    const upload = vi.fn(async (path: string) => `https://storage.example/${path}`);
    const ok = await ingestDishImageUrl(db, BIZ, DISH, 'https://photos.example/a.jpg', { fetchImpl: vi.fn(async () => photo()) as any, resolve: PUBLIC, upload });
    expect(ok).toMatchObject({ ok: true });
    expect(upload.mock.calls[0]?.[0]).toMatch(new RegExp(`^${BIZ}/dishes/.*\\.jpg$`));
    expect(db.tables.catalog_items.find((i: any) => i.id === DISH)?.image_url).toMatch(/^https:\/\/storage\.example\//);

    const unsafe = await ingestDishImageUrl(db, BIZ, DISH, 'http://photos.example/a.jpg', { fetchImpl: vi.fn() as any, resolve: PUBLIC, upload });
    expect(unsafe).toMatchObject({ ok: false, status: 400 });

    const foreign = await ingestDishImageUrl(db, OTHER, DISH, 'https://photos.example/a.jpg', { fetchImpl: vi.fn(async () => photo()) as any, resolve: PUBLIC, upload });
    expect(foreign).toMatchObject({ ok: false, status: 404 });
  });
});

describe('Google image results', () => {
  it('only search when a key and search engine ID are set, and keep the page address for download', async () => {
    const fetchSpy = vi.fn();
    expect(await searchWebImages('Aloo Gobhi', fetchSpy as any)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();

    process.env.GOOGLE_CSE_KEY = 'k';
    process.env.GOOGLE_CSE_CX = 'cx';
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [
      { title: 'Aloo Gobhi', link: 'https://restaurant.example/aloo.jpg', displayLink: 'restaurant.example', image: { thumbnailLink: 'https://encrypted-tbn0.gstatic.com/t' }, snippet: 'Dry aloo gobhi' },
      { title: 'no link' },
    ] }) });
    const out = await searchWebImages('Aloo Gobhi', fetchSpy as any);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('customsearch/v1');
    expect(out).toEqual([expect.objectContaining({
      source: 'web', url: 'https://encrypted-tbn0.gstatic.com/t', sourceUrl: 'https://restaurant.example/aloo.jpg', credit: 'restaurant.example',
    })]);
  });
});
