import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { parseReading, describePhoto } from '@/lib/services/catalog/vault-describe';
import { parseProposals, verifyProposals, agentMatch, type DishRef, type PhotoRef, type Proposal } from '@/lib/services/catalog/dish-matcher-agent';
import { autoFillDishPhotos } from '@/lib/services/catalog/photo-autofill';
import { ingestDishPhotos, titleFromFilename, validateBatch, DISH_CATEGORY } from '@/lib/services/catalog/vault-ingest';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const MISAL = 'cccccccc-1111-4222-8333-444444444441';
const SALAD = 'cccccccc-1111-4222-8333-444444444442';
const TEA = 'cccccccc-1111-4222-8333-444444444443';
const P_MISAL = 'dddddddd-1111-4222-8333-444444444441';
const P_SALAD = 'dddddddd-1111-4222-8333-444444444442';
const P_TEA = 'dddddddd-1111-4222-8333-444444444443';

const dishes: DishRef[] = [
  { id: MISAL, name: 'Misal Pav', category: 'Quick Bites' },
  { id: SALAD, name: 'Garden Green Salad', category: 'Salads' },
  { id: TEA, name: 'Cutting Chai', category: 'Beverages' },
];
const photos: PhotoRef[] = [
  { id: P_MISAL, title: 'Spicy sprouts curry', description: 'a bowl of misal with pav', tags: [] },
  { id: P_SALAD, title: 'Fresh bowl', description: 'garden green salad with greens', tags: [] },
  { id: P_TEA, title: 'Tea glass', description: 'hot tea', tags: [] },
];

const proposal = (over: Partial<Proposal>): Proposal => ({ item_id: MISAL, photo_id: P_MISAL, confidence: 'high', reason: 'bowl of misal', ...over });

describe('Reading a photo with the vision model', () => {
  it('accepts the expected shape and rejects anything else', () => {
    expect(parseReading(JSON.stringify({ title: 'Misal Pav', dish_names: ['Misal Pav'], tags: ['sprouts'], description: 'A bowl.', is_food: true })))
      .toMatchObject({ title: 'Misal Pav', dish_names: ['Misal Pav'], is_food: true });
    expect(parseReading('not json')).toBeNull();
    expect(parseReading(JSON.stringify({ title: 'x' }))).toBeNull();
  });

  it('calls the model once with the image and the schema', async () => {
    const generate = vi.fn(async () => JSON.stringify({ title: 'Chai', dish_names: ['Cutting Chai'], tags: [], description: 'Tea.', is_food: true }));
    const reading = await describePhoto(generate, 'BASE64', 'image/jpeg');
    expect(reading?.dish_names).toEqual(['Cutting Chai']);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe('The matching agent and its verifier', () => {
  it('accepts a verified high-confidence pair', () => {
    const v = verifyProposals([proposal({})], dishes, photos);
    expect(v.accepted).toHaveLength(1);
    expect(v.rejected).toHaveLength(0);
  });

  it('rejects low confidence, unknown ids and missing reasons', () => {
    const v = verifyProposals([
      proposal({ confidence: 'medium' }),
      proposal({ item_id: 'nope' }),
      proposal({ photo_id: 'nope' }),
      proposal({ reason: '' }),
    ], dishes, photos);
    expect(v.accepted).toEqual([]);
    expect(v.rejected.map((r) => r.why)).toEqual(['confidence is medium', 'unknown dish', 'unknown photo', 'no reason given']);
  });

  it('never lets one photo serve two dishes, or one dish take two photos', () => {
    const v = verifyProposals([
      proposal({}),
      proposal({ item_id: SALAD, photo_id: P_MISAL }),
      proposal({ item_id: MISAL, photo_id: P_TEA }),
    ], dishes, photos);
    expect(v.accepted.map((a) => a.item_id)).toEqual([MISAL]);
    expect(v.rejected.map((r) => r.why)).toEqual(['photo already used for another dish', 'dish already matched']);
  });

  it('parses the model answer, and treats anything else as no proposals', () => {
    expect(parseProposals(JSON.stringify([{ item_id: MISAL, photo_id: P_MISAL, confidence: 'high', reason: 'x' }]))).toHaveLength(1);
    expect(parseProposals('{"oops":true}')).toBeNull();
  });

  it('runs in batches and never reuses a photo across batches', async () => {
    const many: DishRef[] = Array.from({ length: 45 }, (_, i) => ({ id: `dish-${i}`, name: `Dish ${i}`, category: 'Mains' }));
    const generate = vi.fn(async () => JSON.stringify([]));
    await agentMatch(many, photos, generate);
    expect(generate).toHaveBeenCalledTimes(2);
  });
});

describe('Auto-fill: exact match first, then the verified agent', () => {
  it('assigns exact matches without any model call, and agent matches only when verified', async () => {
    const db = createFakeSupabase({
      catalog_items: [
        { id: MISAL, business_id: BIZ, name: 'Misal Pav', category: 'Quick Bites', image_url: null },
        { id: SALAD, business_id: BIZ, name: 'Garden Green Salad', category: 'Salads', image_url: null },
        { id: TEA, business_id: BIZ, name: 'Cutting Chai', category: 'Beverages', image_url: null },
      ],
      venue_photo_vault: [
        { id: P_MISAL, venue_id: BIZ, title: 'Misal pav bowl', category: 'Dish photos', description: '', tags: [], image_url: 'https://v/misal.jpg', is_active: true },
        { id: P_SALAD, venue_id: BIZ, title: 'Fresh bowl', category: 'Dish photos', description: 'bowl with greens', tags: [], image_url: 'https://v/salad.jpg', is_active: true },
        { id: P_TEA, venue_id: BIZ, title: 'Tea glass', category: 'Dish photos', description: 'hot tea', tags: [], image_url: 'https://v/tea.jpg', is_active: true },
      ],
    });
    const generate = vi.fn(async () => JSON.stringify([
      { item_id: SALAD, photo_id: P_SALAD, confidence: 'high', reason: 'a green salad' },
      { item_id: TEA, photo_id: P_TEA, confidence: 'low', reason: 'maybe' },
    ]));
    const res = await autoFillDishPhotos(db, BIZ, generate);
    const byId = Object.fromEntries(res.matched.map((m) => [m.id, m.method]));
    expect(byId[MISAL]).toBe('exact');
    expect(byId[SALAD]).toBe('agent');
    expect(byId[TEA]).toBeUndefined();
    expect(res.unmatched.map((u) => u.id)).toEqual([TEA]);
    expect(res.rejected[0]?.why).toBe('confidence is low');
    expect(db.tables.catalog_items.find((i: any) => i.id === SALAD)?.image_url).toBe('https://v/salad.jpg');
  });
});

describe('Dish photo ingest', () => {
  const png = (name: string) => ({ filename: name, mimeType: 'image/png', base64: 'aGVsbG8=' });

  it('validates the batch and reads titles from file names when no model is configured', async () => {
    expect(validateBatch([])).toMatch(/at least one/);
    expect(validateBatch(new Array(11).fill(png('x.png')))).toMatch(/up to 10/);
    expect(titleFromFilename('misal_pav-bowl.jpg')).toBe('misal pav bowl');

    const db = createFakeSupabase({ venue_photo_vault: [] });
    const rows = await ingestDishPhotos(db, BIZ, [png('misal-pav.png')], { upload: async (p) => `https://store/${p}` });
    expect(rows[0]).toMatchObject({ status: 'added', title: 'misal pav' });
    expect(db.tables.venue_photo_vault[0]).toMatchObject({ category: DISH_CATEGORY, is_active: true, title: 'misal pav' });
  });

  it('stores what the model sees, and refuses photos that are not food', async () => {
    const db = createFakeSupabase({ venue_photo_vault: [] });
    const generate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({ title: 'Misal Pav', dish_names: ['Misal Pav'], tags: ['sprouts'], description: 'A bowl.', is_food: true }))
      .mockResolvedValueOnce(JSON.stringify({ title: 'Car', dish_names: [], tags: [], description: 'A car.', is_food: false }));
    const rows = await ingestDishPhotos(db, BIZ, [png('a.png'), png('b.png')], { generate, upload: async (p) => `https://store/${p}` });
    expect(rows.map((r) => r.status)).toEqual(['added', 'failed']);
    expect(db.tables.venue_photo_vault).toHaveLength(1);
    expect(db.tables.venue_photo_vault[0].tags).toEqual(['Misal Pav', 'sprouts']);
  });

  it('refuses a file type that is not an image format we accept', async () => {
    const db = createFakeSupabase({ venue_photo_vault: [] });
    const rows = await ingestDishPhotos(db, BIZ, [{ filename: 'x.gif', mimeType: 'image/gif', base64: 'aGk=' }], { upload: async () => 'u' });
    expect(rows[0]).toMatchObject({ status: 'failed' });
    expect(db.tables.venue_photo_vault).toHaveLength(0);
  });
});
