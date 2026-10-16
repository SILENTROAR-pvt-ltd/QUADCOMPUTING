/**
 * Guests for a period, from the My Guests ledger: one visit per settled bill, keyed the way My Guests keys a guest
 * (Vibers handle, then phone, then name; "o:<bill>" for a walk-in who left no name). Pure.
 *
 *   known guests  = distinct keys that are a real person (h:, p:, n:)
 *   walk-ins      = bills from guests who left no name or phone (o: keys, one per bill)
 *   returning     = a known guest who had visited before this period, or more than once inside it
 *   new           = every other known guest
 */
export interface LedgerVisit { order_id: string; guest_key: string; spend: number | string; visited_at: string }
export interface LedgerGuest { guest_key: string; guest_name: string | null; visits?: number | null }

export interface TopGuest { key: string; name: string; visits: number; spend: number; lifetime_visits: number }
export interface GuestReport {
  source: 'ledger' | 'bills';
  known: number;
  walk_ins: number;
  new_guests: number;
  returning: number;
  returning_rate: number | null;
  top: TopGuest[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const isWalkIn = (key: string) => key.startsWith('o:');
const pretty = (key: string) => (key.startsWith('h:') ? key.slice(2) : key.startsWith('p:') ? `Guest ·${key.slice(-4)}` : key.slice(2).replace(/\b\w/g, (c) => c.toUpperCase()));

/**
 * `periodVisits` are the ledger visits for this period's settled bills; `history` every visit those guests have ever made
 * (it decides who is returning); `guests` their ledger rows, for names.
 */
export function guestReport(periodVisits: LedgerVisit[], history: LedgerVisit[], guests: LedgerGuest[], periodStartISO: string): GuestReport {
  const start = Date.parse(periodStartISO);
  const inPeriod = new Map<string, { visits: number; spend: number }>();
  let walk_ins = 0;
  for (const v of periodVisits) {
    if (isWalkIn(v.guest_key)) { walk_ins += 1; continue; }
    const row = inPeriod.get(v.guest_key) ?? { visits: 0, spend: 0 };
    row.visits += 1; row.spend += Number(v.spend) || 0;
    inPeriod.set(v.guest_key, row);
  }
  const before = new Set(history.filter((v) => Date.parse(v.visited_at) < start).map((v) => v.guest_key));
  const lifetime = new Map<string, number>();
  for (const v of history) lifetime.set(v.guest_key, (lifetime.get(v.guest_key) ?? 0) + 1);
  const names = new Map(guests.map((g) => [g.guest_key, g.guest_name]));

  let returning = 0;
  inPeriod.forEach((row, key) => { if (before.has(key) || row.visits >= 2) returning += 1; });
  const known = inPeriod.size;
  const top = Array.from(inPeriod.entries())
    .map(([key, row]) => {
      const name = String(names.get(key) ?? '').trim();
      const base = name && !/^walk-?in guest$/i.test(name) ? name : pretty(key);
      // Two guests can share a name; a signed-in guest's handle tells them apart.
      const label = key.startsWith('h:') && base !== key.slice(2) ? `${base} · ${key.slice(2)}` : base;
      return { key, name: label, visits: row.visits, spend: r2(row.spend), lifetime_visits: Math.max(row.visits, lifetime.get(key) ?? 0) };
    })
    .sort((a, b) => b.spend - a.spend || b.visits - a.visits)
    .slice(0, 5);

  return {
    source: 'ledger', known, walk_ins, new_guests: known - returning, returning,
    returning_rate: known ? Math.round((returning / known) * 1000) / 10 : null, top,
  };
}

/** The same report from the bills alone, for a venue whose ledger cannot be read: no history, so returning means 2+ visits. */
export function guestReportFromBills(bills: Array<{ id?: string; key: string | null; spend: number; created_at: string }>): GuestReport {
  const visits = bills.map((b, i) => ({ order_id: b.id ?? String(i), guest_key: b.key ?? `o:${b.id ?? i}`, spend: b.spend, visited_at: b.created_at }));
  return { ...guestReport(visits, visits, [], '1970-01-01T00:00:00Z'), source: 'bills' };
}
