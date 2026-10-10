import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { pickPhotoFor } from '@/lib/services/catalog/web-photo-agent';
import { agentWebPass } from '@/lib/services/catalog/web-photo-pass';
import { runSmartPhotos } from '@/lib/services/catalog/smart-photos';
import type { StockPhoto } from '@/lib/services/catalog/stock-providers';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const DISH = 'cccccccc-1111-4222-8333-444444444441';
const DISH_REF = { id: DISH, name: 'Aloo Gobhi', category: 'Main Course' };
const PUBLIC = async () => ['93.184.216.34'];
const web = (id: string, title: string, site: string): StockPhoto => ({
  id, source: 'web', url: `https://thumb.example/${id}.jpg`, sourceUrl: `https://${site}/${id}.jpg`, title, text: title, credit: site,
});
const agentSays = (obj: object) => vi.fn(async () => JSON.stringify(obj));
const photo = () => new Response(Buffer.from('jpg'), { status: 200, headers: { 'content-type': 'image/jpeg' } });

describe('The photo agent picks only a high-confidence, real candidate', () => {
  it('never shows stock-photo sites to the agent, and accepts a high-confidence pick with its reason', async () => {
    const list = [web('1', 'Aloo Gobhi', 'shutterstock.com'), web('2', 'Dry aloo gobhi', 'restaurant.example')];
    const gen = agentSays({ candidate: 1, confidence: 'high', reason: 'Shows the dish itself' });
    const r = await pickPhotoFor(DISH_REF, list, gen);
    expect(r).toMatchObject({ ok: true, photo: { id: '2' }, reason: 'Shows the dish itself' });
    expect(String((gen.mock.calls[0] as any)[0].prompt)).not.toContain('shutterstock');
  });

  it('refuses medium confidence, numbers that are not listed, a missing reason, and an answer that is not JSON', async () => {
    const list = [web('2', 'Dry aloo gobhi', 'restaurant.example')];
    expect(await pickPhotoFor(DISH_REF, list, agentSays({ candidate: 1, confidence: 'medium', reason: 'x' }))).toMatchObject({ ok: false });
    expect(await pickPhotoFor(DISH_REF, list, agentSays({ candidate: 9, confidence: 'high', reason: 'x' }))).toMatchObject({ ok: false });
    expect(await pickPhotoFor(DISH_REF, list, agentSays({ candidate: 0, confidence: 'high', reason: 'x' }))).toMatchObject({ ok: false });
    expect(await pickPhotoFor(DISH_REF, list, agentSays({ candidate: 1, confidence: 'high', reason: '' }))).toMatchObject({ ok: false });
    expect(await pickPhotoFor(DISH_REF, list, vi.fn(async () => 'not json'))).toMatchObject({ ok: false });
  });

  it('does not ask the agent at all when every candidate is from a blocked site', async () => {
    const gen = agentSays({ candidate: 1, confidence: 'high', reason: 'x' });
    expect(await pickPhotoFor(DISH_REF, [web('1', 'Aloo Gobhi', 'alamy.com')], gen)).toMatchObject({ ok: false });
    expect(gen).not.toHaveBeenCalled();
  });
});

describe('The agent pass saves the chosen photo', () => {
  it('stores a web photo as the venue’s own copy, and records the agent as the method', async () => {
    const db = createFakeSupabase({ catalog_items: [{ id: DISH, business_id: BIZ, name: 'Aloo Gobhi', image_url: null }] });
    const upload = vi.fn(async (p: string) => `https://storage.example/${p}`);
    const res = await agentWebPass(db, BIZ, [DISH_REF], {
      generate: agentSays({ candidate: 1, confidence: 'high', reason: 'the dish' }),
      search: async () => [web('2', 'Aloo Gobhi', 'restaurant.example')],
      fetchImpl: vi.fn(async () => photo()) as any, upload, resolve: PUBLIC,
    });
    expect(res.matched).toEqual([expect.objectContaining({ id: DISH, method: 'agent' })]);
    expect(upload.mock.calls[0]?.[0]).toMatch(new RegExp(`^${BIZ}/dishes/`));
    expect(db.tables.catalog_items.find((i: any) => i.id === DISH)?.image_url).toMatch(/^https:\/\/storage\.example\//);
  });

  it('sets a stock photo from its library address, and leaves a dish alone when the agent is unsure', async () => {
    const db = createFakeSupabase({ catalog_items: [{ id: DISH, business_id: BIZ, name: 'Aloo Gobhi', image_url: null }] });
    const stock: StockPhoto = { id: 'w', source: 'unsplash', url: 'https://upload.wikimedia.org/aloo.jpg', title: 'Aloo Gobhi', text: '' };
    const ok = await agentWebPass(db, BIZ, [DISH_REF], { generate: agentSays({ candidate: 1, confidence: 'high', reason: 'the dish' }), search: async () => [stock], upload: vi.fn() as any });
    expect(ok.matched).toHaveLength(1);
    expect(db.tables.catalog_items.find((i: any) => i.id === DISH)?.image_url).toBe('https://upload.wikimedia.org/aloo.jpg');

    const db2 = createFakeSupabase({ catalog_items: [{ id: DISH, business_id: BIZ, name: 'Aloo Gobhi', image_url: null }] });
    const unsure = await agentWebPass(db2, BIZ, [DISH_REF], { generate: agentSays({ candidate: 1, confidence: 'low', reason: 'maybe' }), search: async () => [stock], upload: vi.fn() as any });
    expect(unsure.matched).toHaveLength(0);
    expect(unsure.rejected).toEqual([expect.objectContaining({ id: DISH })]);
    expect(db2.tables.catalog_items.find((i: any) => i.id === DISH)?.image_url).toBeNull();
  });
});

describe('Smart Stock Images runs the agent only for dishes still without a photo', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('uses the agent when a model is set, and skips it when none is set', async () => {
    // The built-in stock search is stubbed to find nothing, so this test never reaches the network.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    const db = createFakeSupabase({ catalog_items: [{ id: DISH, business_id: BIZ, name: 'Aloo Gobhi', image_url: null }], venue_photo_vault: [] });
    const gen = agentSays({ candidate: 1, confidence: 'high', reason: 'the dish' });
    const withAgent = await runSmartPhotos(db, BIZ, gen, {
      generate: gen, search: async () => [web('2', 'Aloo Gobhi', 'restaurant.example')],
      fetchImpl: vi.fn(async () => photo()) as any, upload: async (p: string) => `https://storage.example/${p}`, resolve: PUBLIC,
    });
    expect(withAgent.matched.map((m) => m.method)).toEqual(['agent']);
    expect(withAgent.unmatched).toEqual([]);

    const db2 = createFakeSupabase({ catalog_items: [{ id: DISH, business_id: BIZ, name: 'Aloo Gobhi', image_url: null }], venue_photo_vault: [] });
    const noAgent = await runSmartPhotos(db2, BIZ, undefined, undefined);
    expect(noAgent.matched).toEqual([]);
    expect(noAgent.unmatched).toEqual([expect.objectContaining({ id: DISH })]);
  });
});
