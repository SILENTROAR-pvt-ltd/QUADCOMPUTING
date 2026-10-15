import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { featuredIds, FEATURED_MAX, loadMenuInfo, saveMenuInfo } from './menu-info';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'ffffffff-1111-4222-8333-444444444444';
const id = (n: number) => `bbbbbbbb-1111-4222-8333-44444444444${n}`;

const db = (items: number[] = [1, 2, 3, 4, 5, 6]) => createFakeSupabase({
  businesses: [{ id: BIZ, menu_info: { tagline: 'Taste & quality', phones: [], timings: [], notes: [], address: '', delivery: '' } }],
  catalog_items: [
    ...items.map((n) => ({ id: id(n), business_id: BIZ, name: `Dish ${n}` })),
    { id: 'cccccccc-1111-4222-8333-444444444444', business_id: OTHER, name: 'Someone else\'s dish' },
  ],
});

describe('the dishes a host picks to show first', () => {
  it('keeps valid ids in the order chosen, without repeats, up to five', () => {
    expect(featuredIds([id(2), id(1), id(2), 'not-an-id', 42, id(3), id(4), id(5), id(6)])).toEqual([id(2), id(1), id(3), id(4), id(5)]);
    expect(featuredIds([id(1), id(2), id(3), id(4), id(5), id(6)])).toHaveLength(FEATURED_MAX);
    expect(featuredIds('nope')).toEqual([]);
  });

  it('saves the picks and reads them back in order', async () => {
    const d = db();
    const r = await saveMenuInfo(d, BIZ, { featured: [id(3), id(1)] });
    expect(r.ok && r.value.featured).toEqual([id(3), id(1)]);
    expect((await loadMenuInfo(d, BIZ)).featured).toEqual([id(3), id(1)]);
  });

  it('saving the picks leaves the venue\'s information alone, and saving the information leaves the picks alone', async () => {
    const d = db();
    await saveMenuInfo(d, BIZ, { featured: [id(2)] });
    expect((await loadMenuInfo(d, BIZ)).tagline).toBe('Taste & quality');

    await saveMenuInfo(d, BIZ, { tagline: 'New tagline', address: '', delivery: '', phones: [], timings: [], notes: [] });
    const after = await loadMenuInfo(d, BIZ);
    expect(after.tagline).toBe('New tagline');
    expect(after.featured).toEqual([id(2)]);
  });

  it('drops a dish that is not on this venue\'s own catalogue', async () => {
    const d = db();
    const r = await saveMenuInfo(d, BIZ, { featured: [id(1), 'cccccccc-1111-4222-8333-444444444444', id(99)] });
    expect(r.ok && r.value.featured).toEqual([id(1)]);
  });

  it('clears the picks when an empty list is saved', async () => {
    const d = db();
    await saveMenuInfo(d, BIZ, { featured: [id(1)] });
    const r = await saveMenuInfo(d, BIZ, { featured: [] });
    expect(r.ok && r.value.featured).toEqual([]);
  });
});
