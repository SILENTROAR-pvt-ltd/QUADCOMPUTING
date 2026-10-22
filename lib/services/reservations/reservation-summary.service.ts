// What the Reservations tab holds, for the sidebar's light: per kind (tables, rooms, events, offers), how many wait for
// the host to act, and how many arrived after `since` (the last time the host opened the tab). A kind whose table does not
// exist yet (its migration not applied) counts as zero, so the light never breaks the console.
export type ReservationKind = 'tables' | 'rooms' | 'events' | 'offers';
export interface KindSummary { waiting: number; fresh: number }
export type ReservationSummary = Record<ReservationKind, KindSummary> & { waiting: number; unread: number };

interface Source { kind: ReservationKind; table: string; venueColumn: string; waitingStatus: string }

const SOURCES: Source[] = [
  { kind: 'tables', table: 'venue_reservations', venueColumn: 'business_id', waitingStatus: 'requested' },
  { kind: 'rooms', table: 'stay_booking_requests', venueColumn: 'business_id', waitingStatus: 'requested' },
  { kind: 'events', table: 'event_guest_leads', venueColumn: 'business_id', waitingStatus: 'INTERESTED' },
  { kind: 'offers', table: 'venue_offer_requests', venueColumn: 'venue_id', waitingStatus: 'open' },
];

async function count(query: PromiseLike<{ count: number | null; error: any }>): Promise<number> {
  try {
    const { count: n, error } = await query;
    return error ? 0 : Number(n) || 0;
  } catch {
    return 0;
  }
}

/** Counts for every kind at once (two head-only counts per kind, all in parallel). */
export async function reservationSummary(db: any, businessId: string, since: string | null): Promise<ReservationSummary> {
  const rows = await Promise.all(SOURCES.map(async (s) => {
    const base = () => db.from(s.table).select('id', { count: 'exact', head: true }).eq(s.venueColumn, businessId);
    const [waiting, fresh] = await Promise.all([
      count(base().eq('status', s.waitingStatus)),
      since ? count(base().gt('created_at', since)) : Promise.resolve(0),
    ]);
    return [s.kind, { waiting, fresh }] as const;
  }));
  const kinds = Object.fromEntries(rows) as Record<ReservationKind, KindSummary>;
  return {
    ...kinds,
    waiting: rows.reduce((n, [, k]) => n + k.waiting, 0),
    unread: rows.reduce((n, [, k]) => n + k.fresh, 0),
  };
}
