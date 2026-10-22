import { describe, it, expect, vi } from 'vitest';
import { isOwnOfferPhoto, readOfferImage, storeOfferPhoto } from './offer-photo';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'cccccccc-1111-4222-8333-444444444444';
const BASE = 'https://proj.supabase.co';
const own = `${BASE}/storage/v1/object/public/venue-vault/${BIZ}/offers/1-a.jpg`;
const upload = vi.fn(async (path: string) => `${BASE}/storage/v1/object/public/venue-vault/${path}`);

describe('an offer photo', () => {
  it('stores an uploaded photo in the venue\'s own offers folder', async () => {
    const r = await storeOfferPhoto(BIZ, { base64: Buffer.from('jpegbytes').toString('base64'), mimeType: 'image/jpeg' }, { upload });
    expect(r.ok && r.image_url).toMatch(new RegExp(`/venue-vault/${BIZ}/offers/\\d+-\\w+\\.jpg$`));
  });

  it('refuses a file that is not a photo, or an empty one', async () => {
    expect(await storeOfferPhoto(BIZ, { base64: 'AAAA', mimeType: 'application/pdf' }, { upload })).toMatchObject({ ok: false, status: 400 });
    expect(await storeOfferPhoto(BIZ, { base64: '', mimeType: 'image/png' }, { upload })).toMatchObject({ ok: false, status: 400 });
  });

  it('downloads a photo link through the safe fetcher and refuses a private address', async () => {
    const r = await storeOfferPhoto(BIZ, { url: 'https://10.0.0.5/x.jpg' }, { upload, resolve: async () => ['10.0.0.5'] });
    expect(r).toMatchObject({ ok: false, status: 400 });
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/png' } }));
    const ok = await storeOfferPhoto(BIZ, { url: 'https://images.example.com/buffet.png' }, { upload, fetchImpl: fetchImpl as any, resolve: async () => ['93.184.216.34'] });
    expect(ok.ok && ok.image_url).toMatch(/\/offers\/.+\.png$/);
  });

  it('saves only an address in this venue\'s own offers folder', () => {
    expect(isOwnOfferPhoto(own, BIZ, BASE)).toBe(true);
    expect(isOwnOfferPhoto(own.replace(BIZ, OTHER), BIZ, BASE)).toBe(false);
    expect(isOwnOfferPhoto('https://evil.example.com/x.jpg', BIZ, BASE)).toBe(false);
    expect(isOwnOfferPhoto(`${BASE}/storage/v1/object/public/venue-vault/${BIZ}/offers/../../x.jpg`, BIZ, BASE)).toBe(false);
    expect(readOfferImage(undefined, BIZ, BASE)).toEqual({});
    expect(readOfferImage('', BIZ, BASE)).toEqual({ value: null });
    expect(readOfferImage(own, BIZ, BASE)).toEqual({ value: own });
    expect(readOfferImage('https://elsewhere.com/a.jpg', BIZ, BASE)).toEqual({ invalid: true });
  });
});
