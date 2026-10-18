import { describe, expect, it } from 'vitest';
import { cleanZone, groupByZone, hasZones, matchZone, nextTableNames, zoneNames, ZONE_MAX_LENGTH } from './table-zones';

const t = (table_number: string, zone?: string | null) => ({ table_number, zone });

describe('cleanZone', () => {
  it('makes a typed zone safe to store', () => {
    expect(cleanZone('  First   floor ')).toBe('First floor');
    expect(cleanZone('Ground\nfloor\t')).toBe('Ground floor');
    expect(cleanZone('x'.repeat(100))).toHaveLength(ZONE_MAX_LENGTH);
    for (const empty of ['', '   ', null, undefined, '\n']) expect(cleanZone(empty)).toBeNull();
  });
});

describe('matchZone', () => {
  it('reuses the spelling the venue already has, so one area is never two headings', () => {
    expect(matchZone('ground floor', ['Ground Floor', 'Riverside'])).toBe('Ground Floor');
    expect(matchZone('Rooftop', ['Ground Floor'])).toBe('Rooftop');
    expect(matchZone('  ', ['Ground Floor'])).toBeNull();
  });
});

describe('groupByZone', () => {
  it('lists zones by their first table, tables in number order, and the unzoned last', () => {
    const groups = groupByZone([t('T-10', 'First floor'), t('T-02', 'Ground floor'), t('T-11', 'First floor'), t('T-01', 'Ground floor'), t('T-20'), t('T-03', 'ground floor')]);
    expect(groups.map((g) => g.zone)).toEqual(['Ground floor', 'First floor', null]);
    expect(groups[0].tables.map((x) => x.table_number)).toEqual(['T-01', 'T-02', 'T-03']);
    expect(groups[1].tables.map((x) => x.table_number)).toEqual(['T-10', 'T-11']);
    expect(groups[2].tables.map((x) => x.table_number)).toEqual(['T-20']);
  });

  it('puts T-2 before T-10 (natural order)', () => {
    const [g] = groupByZone([t('T-10', 'A'), t('T-2', 'A')]);
    expect(g.tables.map((x) => x.table_number)).toEqual(['T-2', 'T-10']);
  });

  it('is one plain group when no table has a zone', () => {
    const groups = groupByZone([t('T-02'), t('T-01', ''), t('T-03', '  ')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].zone).toBeNull();
    expect(hasZones([t('T-01'), t('T-02', null)])).toBe(false);
    expect(hasZones([t('T-01'), t('T-02', 'Riverside')])).toBe(true);
  });

  it('names the zones in use', () => {
    expect(zoneNames([t('T-05', 'Riverside'), t('T-01', 'Ground'), t('T-02', 'ground')])).toEqual(['Ground', 'Riverside']);
  });
});

describe('nextTableNames', () => {
  it('continues after the highest number, so a new area never collides with an old one', () => {
    expect(nextTableNames(['T-01', 'T-02', 'T-06'], 3)).toEqual(['T-07', 'T-08', 'T-09']);
    expect(nextTableNames([], 3)).toEqual(['T-01', 'T-02', 'T-03']);
  });

  it('understands the other ways a table was named, and ignores names with no number', () => {
    expect(nextTableNames(['Table 4', 'T-2', 'VIP-1'], 2)).toEqual(['T-05', 'T-06']);
  });

  it('goes past 99 and makes nothing for a count of zero', () => {
    expect(nextTableNames(['T-99'], 2)).toEqual(['T-100', 'T-101']);
    expect(nextTableNames(['T-01'], 0)).toEqual([]);
  });
});
