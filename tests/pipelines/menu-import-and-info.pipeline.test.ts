import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { normalizeMenuInfo, readMenuInfo, saveMenuInfo, loadMenuInfo, EMPTY_MENU_INFO } from '@/lib/services/menu-info/menu-info';
// @ts-expect-error plain ES module shared with the import script
import { planMenuImport, menuRows } from '../../scripts/lib/menu-import.mjs';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const menu = JSON.parse(readFileSync(path.join(process.cwd(), 'data/menus/bombay-rasoi.json'), 'utf8'));

const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db }));
vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, supabase: ctx.db, user: { id: 'host-1' } }),
}));
vi.mock('@/lib/auth/guest-validate', async () => {
  const actual: any = await vi.importActual('@/lib/auth/guest-validate');
  return { ...actual, validateGuestAccess: async () => ({ businessId: BIZ, error: null }) };
});
import { GET as guestInfoGET } from '@/app/api/guest/menu/info/route';
import { GET as hostInfoGET, PUT as hostInfoPUT } from '@/app/api/host/menu-info/route';

describe('The Bombay Rasoi menu file', () => {
  it('imports 93 items: 82 with a printed price, 11 hidden until priced', () => {
    const plan = planMenuImport(menu, []);
    expect(plan.errors).toEqual([]);
    expect(plan.inserts).toHaveLength(93);
    expect(plan.inserts.filter((i: any) => i.is_available)).toHaveLength(82);
    expect(plan.hidden).toHaveLength(11);
    expect(plan.hidden).toEqual(expect.arrayContaining(['Aloo Zeera', 'Poori Bhaji', 'Khaman Dhokla']));
  });

  it('keeps every printed price exactly, and never invents one', () => {
    const rows = menuRows(menu);
    const byName = Object.fromEntries(rows.map((r: any) => [r.name, r]));
    expect(byName['Misal Pav']).toMatchObject({ price: 150, category: 'Quick Bites' });
    expect(byName['Puran Poli (Make To Order)']).toMatchObject({ price: 100, made_to_order: true });
    expect(byName['Khaman Dhokla']).toMatchObject({ price: null, made_to_order: true });
    expect(byName['Veg Grill Sandwich']).toMatchObject({ price: 100, station: 'Grill' });
    expect(byName['Cutting Chai']).toMatchObject({ price: 10, station: 'Bar' });
    for (const r of rows as any[]) expect(r.price === null || r.price > 0).toBe(true);
  });

  it('updates an item that already exists, and does not duplicate it', () => {
    const existing = [{ id: 'misal-1', name: 'Misal Pav', price: 200, is_available: true, metadata: {} }];
    const plan = planMenuImport(menu, existing);
    expect(plan.inserts.find((i: any) => i.name === 'Misal Pav')).toBeUndefined();
    expect(plan.updates).toEqual([expect.objectContaining({ id: 'misal-1', priceChanged: true, patch: expect.objectContaining({ price: 150, category: 'Quick Bites' }) })]);
  });

  it('keeps a hidden item hidden when the menu re-prices it, unless it never had a price', () => {
    const existing = [
      { id: 'a', name: 'Poha', price: 90, is_available: false, metadata: {} },
      { id: 'b', name: 'Aloo Zeera', price: 0, is_available: false, metadata: { needs_price: true } },
    ];
    const plan = planMenuImport(menu, existing);
    const poha = plan.updates.find((u: any) => u.id === 'a');
    const zeera = plan.updates.find((u: any) => u.id === 'b');
    expect(poha.patch.is_available).toBeUndefined();
    expect(zeera.patch.is_available).toBeUndefined(); // no price printed: left as it is
    expect(plan.updates.some((u: any) => u.patch.is_available === true && u.id === 'a')).toBe(false);
  });

  it('refuses a menu with a duplicate item and writes nothing', () => {
    const broken = { sections: [
      { category: 'A', items: [{ name: 'Tea', price: 10 }] },
      { category: 'B', items: [{ name: 'tea', price: 20 }] },
    ] };
    const plan = planMenuImport(broken, []);
    expect(plan.errors[0]).toMatch(/appears twice/);
    expect(plan.inserts).toEqual([]);
  });
});

describe('Menu information', () => {
  it('trims, caps and validates what the host types', () => {
    const ok = normalizeMenuInfo({ tagline: '  We Believe   to Serve  ', phones: ['+91 9004192103', ' '], notes: Array.from({ length: 20 }, (_, i) => `n${i}`) });
    expect(ok).toMatchObject({ ok: true, value: { tagline: 'We Believe to Serve', phones: ['+91 9004192103'] } });
    if (ok.ok) expect(ok.value.notes).toHaveLength(12);
    expect(normalizeMenuInfo({ phones: ['call me'] })).toMatchObject({ ok: false });
    expect(normalizeMenuInfo('nope')).toMatchObject({ ok: false });
  });

  it('shows an empty menu info rather than failing when stored data is damaged', () => {
    expect(readMenuInfo({ phones: ['<script>'] })).toEqual(EMPTY_MENU_INFO);
    expect(readMenuInfo(null)).toEqual(EMPTY_MENU_INFO);
  });

  it('saves for the venue and reads back the same', async () => {
    ctx.db = createFakeSupabase({ businesses: [{ id: BIZ, name: 'Bombay Rasoi' }] });
    const saved = await saveMenuInfo(ctx.db, BIZ, menu.info);
    expect(saved.ok).toBe(true);
    expect(await loadMenuInfo(ctx.db, BIZ)).toMatchObject({ tagline: menu.info.tagline, timings: menu.info.timings, notes: menu.info.notes });
  });

  it('asks for the migration rather than failing when the column is missing', async () => {
    const db = { from: () => ({ update: () => ({ eq: async () => ({ error: { code: '42703', message: 'no column' } }) }) }) };
    expect(await saveMenuInfo(db, BIZ, menu.info)).toMatchObject({ ok: false, status: 503 });
  });

  it('guests read the info without signing in; the host edits it', async () => {
    ctx.db = createFakeSupabase({ businesses: [{ id: BIZ, name: 'Bombay Rasoi', menu_info: {} }] });
    const put = await hostInfoPUT(new Request('http://x/api/host/menu-info', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ info: menu.info }),
    }));
    expect(put.status).toBe(200);
    const get = await guestInfoGET(new Request(`http://x/api/guest/menu/info?cafe_id=${BIZ}`));
    expect(await get.json()).toMatchObject({ success: true, info: { tagline: menu.info.tagline, phones: menu.info.phones } });
    const host = await hostInfoGET(new Request('http://x/api/host/menu-info'));
    expect(await host.json()).toMatchObject({ success: true, info: { delivery: menu.info.delivery } });
  });
});
