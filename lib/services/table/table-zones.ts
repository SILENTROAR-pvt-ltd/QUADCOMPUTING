/**
 * Table zones: an optional area label ("Ground floor", "First floor", "Riverside", "Rooftop") that groups tables under a
 * heading. A zone never changes a table's identity: tables are still T-01, T-02 ... and unique per venue, so QR links,
 * bills and kitchen tickets are unaffected. A table with no zone simply sits under no heading.
 */

export const ZONE_MAX_LENGTH = 40;

/** A zone as typed, made safe to store: one line, single spaces, no control characters, at most 40 characters. Empty is null. */
export function cleanZone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  // eslint-disable-next-line no-control-regex
  const text = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, ZONE_MAX_LENGTH).trim();
  return text || null;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The spelling a venue already uses for this zone ("ground floor" typed, "Ground Floor" exists), else the clean input. */
export function matchZone(input: unknown, existing: Array<string | null | undefined>): string | null {
  const zone = cleanZone(input);
  if (!zone) return null;
  return existing.find((z): z is string => typeof z === 'string' && same(z, zone)) ?? zone;
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export interface ZoneGroup<T> {
  /** The zone's name, or null for tables that have none. */
  zone: string | null;
  tables: T[];
}

/**
 * The tables grouped under their zones. Zones are listed by their lowest table number (so the order follows how the floor
 * was set up, not the alphabet: "Ground floor" before "First floor" when its tables come first), with the tables that
 * have no zone last. Within a group, tables are in natural number order (T-2 before T-10).
 */
export function groupByZone<T extends { table_number?: string | null; zone?: string | null }>(tables: T[]): ZoneGroup<T>[] {
  const groups = new Map<string, T[]>();
  const none: T[] = [];
  for (const t of tables) {
    const zone = cleanZone(t.zone);
    if (!zone) { none.push(t); continue; }
    const key = zone.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const byNumber = (a: T, b: T) => natural(a.table_number ?? '', b.table_number ?? '');
  const out: ZoneGroup<T>[] = Array.from(groups.values())
    .map((list) => ({ zone: cleanZone(list[0].zone), tables: [...list].sort(byNumber) }))
    .sort((a, b) => natural(a.tables[0].table_number ?? '', b.tables[0].table_number ?? ''));
  if (none.length) out.push({ zone: null, tables: [...none].sort(byNumber) });
  return out;
}

/** Whether the venue uses zones at all (otherwise screens show the plain grid with no headings). */
export const hasZones = (tables: Array<{ zone?: string | null }>) => tables.some((t) => cleanZone(t.zone));

/** The distinct zone names in use, in the order groupByZone lists them. */
export const zoneNames = (tables: Array<{ table_number?: string | null; zone?: string | null }>): string[] =>
  groupByZone(tables).flatMap((g) => (g.zone ? [g.zone] : []));

/** The number part of a table name: "T-07" is 7, "Table 12" is 12, "VIP-1" is null. */
const numberOf = (name: string) => { const m = /^(?:table|t-)\s*0*(\d+)$/i.exec(name.trim()); return m ? Number(m[1]) : null; };

/**
 * The next `count` free table names, continuing after the highest T-number already in use (T-07, T-08 ...), so a second
 * area never collides with the first. Names come back as the app stores them: T-01 ... T-99, then T-100.
 */
export function nextTableNames(existing: string[], count: number): string[] {
  const used = new Set(existing.map(numberOf).filter((n): n is number => n !== null));
  let n = used.size ? Math.max(...Array.from(used)) : 0;
  const out: string[] = [];
  while (out.length < Math.max(0, count)) {
    n += 1;
    if (!used.has(n)) out.push(`T-${String(n).padStart(2, '0')}`);
  }
  return out;
}
