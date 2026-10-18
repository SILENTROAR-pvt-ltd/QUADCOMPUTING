import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHostTable } from './table-crud.service';
import { renameZone } from './table-zone.service';

const BIZ = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

/** A fake database over restaurant_tables: rows in memory, and a switch for whether the `zone` column exists yet. */
function fakeDb(rows: any[], hasZoneColumn: boolean) {
  const inserted: any[] = [];
  const builder = (table: string) => {
    const q: any = { op: 'select', cols: '*', filters: [] as Array<[string, string, any]>, patch: null };
    const match = (r: any) => q.filters.every(([c, k, v]: any) => (k === 'eq' ? r[c] === v : r[c] != null));
    const run = () => {
      if (table !== 'restaurant_tables') return { data: null, error: null };
      if (!hasZoneColumn && (/zone/.test(q.cols) || (q.patch && 'zone' in q.patch) || (q.row && 'zone' in q.row))) {
        return { data: null, error: { code: '42703', message: 'column restaurant_tables.zone does not exist' } };
      }
      if (q.op === 'insert') { const row = { id: `t${rows.length + 1}`, ...q.row }; rows.push(row); inserted.push(row); return { data: row, error: null }; }
      const hit = rows.filter(match);
      if (q.op === 'update') { hit.forEach((r) => Object.assign(r, q.patch)); return { data: hit.map((r) => ({ id: r.id })), error: null }; }
      return { data: hit.map((r) => ({ ...r })), error: null };
    };
    q.select = (cols?: string) => { if (cols) q.cols = cols; return q; };
    q.eq = (c: string, v: any) => { q.filters.push([c, 'eq', v]); return q; };
    q.not = (c: string) => { q.filters.push([c, 'notnull', null]); return q; };
    q.limit = () => q;
    q.insert = (row: any) => { q.op = 'insert'; q.row = row; return q; };
    q.update = (patch: any) => { q.op = 'update'; q.patch = patch; return q; };
    q.upsert = async () => ({ data: null, error: null });
    q.single = async () => run();
    q.maybeSingle = async () => run();
    q.then = (res: any, rej: any) => Promise.resolve(run()).then(res, rej);
    return q;
  };
  return { from: builder, rows, inserted };
}

describe('table zones in the database', () => {
  let hour = 0;
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  // The "column missing" answer is remembered for a minute; each test starts an hour after the last one.
  const later = () => { hour += 1; vi.setSystemTime(new Date(Date.UTC(2026, 9, 18, 10 + hour, 0, 0))); };

  it('saves a new table under its zone, in the spelling the venue already uses', async () => {
    later();
    const db = fakeDb([{ id: 'x', business_id: BIZ, table_number: 'T-01', zone: 'Ground Floor' }], true);
    const out = await createHostTable({ table_number: 'T-02', seating_capacity: 4, zone: 'ground floor' }, null, db, BIZ);
    expect(out.zone_saved).toBe(true);
    expect(db.inserted[0]).toMatchObject({ table_number: 'T-02', zone: 'Ground Floor', business_id: BIZ });
  });

  it('still creates the table, and says the zone was not saved, before the database has the column', async () => {
    later();
    const db = fakeDb([], false);
    const out = await createHostTable({ table_number: 'T-05', seating_capacity: 2, zone: 'Riverside' }, null, db, BIZ);
    expect(out.zone_saved).toBe(false);
    expect(db.inserted).toHaveLength(1);
    expect(db.inserted[0]).not.toHaveProperty('zone');
    expect(db.inserted[0].table_number).toBe('T-05');
  });

  it('keeps naming tables T-nn and sends no zone when none is given', async () => {
    later();
    const db = fakeDb([], true);
    const out = await createHostTable({ table_number: '7', seating_capacity: 4 }, null, db, BIZ);
    expect(out.zone_saved).toBe(true);
    expect(db.inserted[0].table_number).toBe('T-07');
    expect(db.inserted[0]).not.toHaveProperty('zone');
  });

  it('renames a zone for every table in it, and can merge it into another', async () => {
    later();
    const rows = [
      { id: 'a', business_id: BIZ, table_number: 'T-01', zone: 'Ground' },
      { id: 'b', business_id: BIZ, table_number: 'T-02', zone: 'Ground' },
      { id: 'c', business_id: BIZ, table_number: 'T-03', zone: 'Riverside' },
      { id: 'd', business_id: 'other', table_number: 'T-01', zone: 'Ground' },
    ];
    const db = fakeDb(rows, true);
    expect(await renameZone(db, BIZ, 'Ground', 'Ground floor')).toMatchObject({ renamed: 2, zone_saved: true });
    expect(rows.map((r) => r.zone)).toEqual(['Ground floor', 'Ground floor', 'Riverside', 'Ground']); // another venue's table is untouched
    await renameZone(db, BIZ, 'Ground floor', 'riverside');
    expect(rows.slice(0, 3).map((r) => r.zone)).toEqual(['Riverside', 'Riverside', 'Riverside']);
    await renameZone(db, BIZ, 'Riverside', '');
    expect(rows.slice(0, 3).map((r) => r.zone)).toEqual([null, null, null]);
  });

  it('does nothing, and says so, when the database has no zone column yet', async () => {
    later();
    expect(await renameZone(fakeDb([], false), BIZ, 'Ground', 'Floor')).toMatchObject({ renamed: 0, zone_saved: false });
  });
});
