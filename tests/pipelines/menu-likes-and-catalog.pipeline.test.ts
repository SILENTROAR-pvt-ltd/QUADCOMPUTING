import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444';
const DISH = 'cccccccc-1111-4222-8333-444444444444';
const FOREIGN_DISH = 'dddddddd-1111-4222-8333-444444444444';
const ctx = vi.hoisted(() => ({ db: null as any, viewer: null as any }));

vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, supabase: ctx.db, user: { id: 'host-1' } }),
}));
vi.mock('@/lib/auth/guest-validate', async () => {
  const actual: any = await vi.importActual('@/lib/auth/guest-validate');
  return { ...actual, validateGuestAccess: async () => ({ businessId: BIZ, error: null }) };
});
vi.mock('@/lib/services/guest-auth/guest-account.service', () => ({ accountForRequest: async () => ctx.viewer }));
vi.mock('@/lib/middleware/rate-limiter', async () => {
  const actual: any = await vi.importActual('@/lib/middleware/rate-limiter');
  return { ...actual, enforceRateLimit: async () => null };
});

import { loadDishLikes, toggleDishLike } from '@/lib/services/guest-menu/dish-likes.service';
import { GET as likesGET, POST as likesPOST } from '@/app/api/guest/menu/likes/route';
import { POST as updatePOST } from '@/app/api/host/catalog/update/route';

const seed = () => createFakeSupabase({
  catalog_items: [
    { id: DISH, business_id: BIZ, name: 'Misal Pav', item_type: 'food', category: 'Quick Bites', price: 200, image_url: null, metadata: {} },
    { id: FOREIGN_DISH, business_id: OTHER, name: 'Elsewhere', item_type: 'food', category: 'Mains', price: 300, metadata: {} },
  ],
  dish_likes: [],
});
const likeReq = (body: unknown) => new Request(`http://x/api/guest/menu/likes?cafe_id=${BIZ}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

beforeEach(() => { ctx.db = seed(); ctx.viewer = null; });

describe('Dish likes', () => {
  it('one like per guest, counted per dish, and taken back on a second tap', async () => {
    expect(await toggleDishLike(ctx.db, 'acc-1', BIZ, DISH)).toEqual({ ok: true, value: { liked: true, likes: 1 } });
    expect(await toggleDishLike(ctx.db, 'acc-2', BIZ, DISH)).toEqual({ ok: true, value: { liked: true, likes: 2 } });
    expect(await toggleDishLike(ctx.db, 'acc-1', BIZ, DISH)).toEqual({ ok: true, value: { liked: false, likes: 1 } });

    const view = await loadDishLikes(ctx.db, BIZ, 'acc-2');
    expect(view).toEqual({ available: true, counts: { [DISH]: 1 }, mine: [DISH] });
  });

  it('cannot like a dish from another venue', async () => {
    expect(await toggleDishLike(ctx.db, 'acc-1', BIZ, FOREIGN_DISH)).toMatchObject({ ok: false, status: 404 });
    expect(ctx.db.tables.dish_likes).toHaveLength(0);
  });

  it('hides hearts instead of failing before the likes table exists', async () => {
    const missing = { from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: null, error: { code: 'PGRST205', message: 'not found' } }) }) }) }) };
    expect(await loadDishLikes(missing, BIZ, null)).toEqual({ available: false, counts: {}, mine: [] });
  });

  it('anyone at the table sees counts; liking needs a signed-in guest', async () => {
    const res = await likesPOST(likeReq({ item_id: DISH }));
    expect(res.status).toBe(401);
    expect(ctx.db.tables.dish_likes).toHaveLength(0);

    ctx.viewer = { id: 'acc-9' };
    const ok = await likesPOST(likeReq({ item_id: DISH }));
    expect(await ok.json()).toMatchObject({ success: true, liked: true, likes: 1 });

    const counts = await (await likesGET(new Request(`http://x/api/guest/menu/likes?cafe_id=${BIZ}`))).json();
    expect(counts).toMatchObject({ success: true, available: true, signedIn: true, counts: { [DISH]: 1 }, mine: [DISH] });
  });
});

describe('Editing a catalog item', () => {
  it('saves the image and food details sent by the food form (camelCase fields)', async () => {
    const res = await updatePOST(new Request('http://x/api/host/catalog/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: DISH, name: 'Misal Pav', price: 220, itemType: 'food', imageUrl: 'https://img.example/misal.jpg', dietType: 'veg', prepTimeMinutes: 12 }),
    }));
    expect(res.status).toBe(200);
    expect(ctx.db.tables.catalog_items[0]).toMatchObject({
      price: 220, item_type: 'food', image_url: 'https://img.example/misal.jpg',
      metadata: expect.objectContaining({ dietary: 'veg', prep_time_minutes: 12 }),
    });
  });
});
