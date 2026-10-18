/**
 * Live check of table areas (zones) against the real database, on a disposable venue that is deleted at the end.
 * Works before and after migration 20261018000003 is applied: before it, tables are still created and the response says
 * the area was not saved; after it, areas are saved, matched case-insensitively, grouped, renamed and cleared.
 * OFF unless E2E_LIVE=1:   $env:E2E_LIVE='1'; npx vitest run --config vitest.e2e.config.ts tests/e2e/table-zones.e2e.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { liveEnv } from './support';
import { createHostTable } from '@/lib/services/table/table-crud.service';
import { renameZone, zoneColumnAvailable } from '@/lib/services/table/table-zone.service';
import { groupByZone, nextTableNames } from '@/lib/services/table/table-zones';

const LIVE = process.env.E2E_LIVE === '1';
const ENV = liveEnv();

describe.skipIf(!LIVE)('Table areas: tables are grouped under Ground floor, First floor, Riverside', () => {
  const db = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let biz = '';
  let ready = false;

  beforeAll(async () => {
    const { data, error } = await db.from('businesses').insert({ business_name: 'ZZ Zones Test', name: 'ZZ Zones Test', slug: `zz-zones-${Date.now().toString(36)}`, categories: ['Cafe'] }).select('id').single();
    if (error) throw new Error(error.message);
    biz = data.id;
    ready = await zoneColumnAvailable(db);
    console.log(`[table-zones] zone column in the database: ${ready ? 'yes' : 'NO (migration 20261018000003 not applied: checking the fallback)'}`);
  });
  afterAll(async () => {
    await db.from('restaurant_tables').delete().eq('business_id', biz);
    await db.from('businesses').delete().eq('id', biz);
    const { count } = await db.from('businesses').select('id', { count: 'exact', head: true }).eq('id', biz);
    console.log(`[table-zones] cleanup: venue rows left ${count}`);
  });

  const all = async () => ((await db.from('restaurant_tables').select(ready ? 'table_number, zone' : 'table_number').eq('business_id', biz).order('table_number')).data ?? []) as any[];

  it('creates tables numbered T-01, T-02 ... under an area, continuing the numbering for the next area', async () => {
    const first = nextTableNames([], 3);
    for (const name of first) expect((await createHostTable({ table_number: name, seating_capacity: 4, zone: 'Ground floor' }, null, db, biz)).table.table_number).toBe(name);
    const second = nextTableNames((await all()).map((t) => t.table_number), 2);
    expect(second).toEqual(['T-04', 'T-05']);
    for (const name of second) await createHostTable({ table_number: name, seating_capacity: 2, zone: 'first FLOOR' }, null, db, biz);
    await createHostTable({ table_number: 'T-06', seating_capacity: 6 }, null, db, biz);
    expect((await all()).map((t) => t.table_number)).toEqual(['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06']);
  });

  it('saves and groups the areas (or, before the database update, says they were not saved and loses nothing else)', async () => {
    const rows = await all();
    if (!ready) {
      expect(rows.every((r: any) => r.zone === undefined)).toBe(true);
      const out = await createHostTable({ table_number: 'T-07', seating_capacity: 4, zone: 'Riverside' }, null, db, biz);
      expect(out.zone_saved).toBe(false);
      return;
    }
    expect(rows.slice(0, 3).every((r: any) => r.zone === 'Ground floor')).toBe(true);
    expect(rows.slice(3, 5).every((r: any) => r.zone === 'first FLOOR')).toBe(true);
    const groups = groupByZone(rows as any[]);
    expect(groups.map((g) => g.zone)).toEqual(['Ground floor', 'first FLOOR', null]);
    expect(groups.map((g) => g.tables.length)).toEqual([3, 2, 1]);
    // "first floor" typed in another case is the same area, never a second heading.
    await createHostTable({ table_number: 'T-07', seating_capacity: 4, zone: 'First Floor' }, null, db, biz);
    expect((await all()).find((r: any) => r.table_number === 'T-07')?.zone).toBe('first FLOOR');
  });

  it('renames an area for all its tables, merges it into another, and can remove it', async () => {
    if (!ready) { expect(await renameZone(db, biz, 'Ground floor', 'Garden')).toMatchObject({ zone_saved: false }); return; }
    expect(await renameZone(db, biz, 'Ground floor', 'Garden')).toMatchObject({ renamed: 3, zone_saved: true });
    expect((await all()).filter((r: any) => r.zone === 'Garden')).toHaveLength(3);
    await renameZone(db, biz, 'Garden', 'FIRST floor'); // merged into the existing spelling
    expect((await all()).filter((r: any) => r.zone === 'first FLOOR')).toHaveLength(6);
    await renameZone(db, biz, 'first FLOOR', '');
    expect((await all()).every((r: any) => r.zone === null)).toBe(true);
  });
});
