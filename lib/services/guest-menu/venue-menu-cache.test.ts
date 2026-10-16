import { beforeEach, describe, expect, it } from 'vitest';
import { clearVenueMenuCache, FRESH_MS, loadVenueMenu, STALE_MS } from './venue-menu-cache';

/** A fake client that counts reads per table and can be told to fail. */
function fakeDb(opts: { fail?: boolean; noVenue?: boolean } = {}) {
  const reads: string[] = [];
  const state = { fail: Boolean(opts.fail) };
  const rows: Record<string, any> = {
    businesses: opts.noVenue ? null : { id: 'b1', business_name: 'Bombay Rasoi' },
    restaurant_tables: [{ id: 't1', table_number: 'T-01' }],
    catalog_items: [{ id: 'i1', name: 'Dal' }],
  };
  const db = {
    from(table: string) {
      reads.push(table);
      const result = () => Promise.resolve(state.fail ? { data: null, error: { message: 'boom' } } : { data: rows[table], error: null });
      const chain: any = { select: () => chain, eq: () => chain, or: () => chain, maybeSingle: result, then: (a: any, b: any) => result().then(a, b) };
      return chain;
    },
  };
  return { db, reads, state };
}

beforeEach(() => clearVenueMenuCache());

describe('the venue menu cache', () => {
  it('reads the database once for a whole rush of guests', async () => {
    const { db, reads } = fakeDb();
    const guests = await Promise.all(Array.from({ length: 300 }, () => loadVenueMenu(db, 'b1')));
    expect(guests.every((g) => g?.items[0].name === 'Dal')).toBe(true);
    expect(reads).toHaveLength(3); // businesses, restaurant_tables, catalog_items: once, not 900 times
  });

  it('serves from memory while fresh and reads again after FRESH_MS', async () => {
    const { db, reads } = fakeDb();
    await loadVenueMenu(db, 'b1', 1_000);
    await loadVenueMenu(db, 'b1', 1_000 + FRESH_MS - 1);
    expect(reads).toHaveLength(3);
    await loadVenueMenu(db, 'b1', 1_000 + FRESH_MS + 1);
    expect(reads).toHaveLength(6);
  });

  it('serves the last good menu when the database fails, but not forever', async () => {
    const { db, state } = fakeDb();
    const good = await loadVenueMenu(db, 'b1', 1_000);
    state.fail = true;
    expect(await loadVenueMenu(db, 'b1', 1_000 + FRESH_MS + 1)).toBe(good);
    await expect(loadVenueMenu(db, 'b1', 1_000 + STALE_MS + 1)).rejects.toThrow('boom');
  });

  it('never remembers a failed read as an empty menu, nor a missing venue', async () => {
    const failing = fakeDb({ fail: true });
    await expect(loadVenueMenu(failing.db, 'b1')).rejects.toThrow();
    const missing = fakeDb({ noVenue: true });
    expect(await loadVenueMenu(missing.db, 'b2')).toBeNull();
    expect(await loadVenueMenu(missing.db, 'b2')).toBeNull();
    expect(missing.reads).toHaveLength(6);
  });
});
