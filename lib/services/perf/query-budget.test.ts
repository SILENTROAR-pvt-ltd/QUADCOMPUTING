import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveHostSessions } from '@/lib/services/session/active-sessions.service';
import { fetchKitchenTickets, invalidateKitchenTicketsCache } from '@/lib/services/kitchen/get-tickets.service';
import { getHostTables, invalidateTablesCache } from '@/lib/services/table/get-tables.service';
import { clearVenueMenuCache, loadVenueMenu } from '@/lib/services/guest-menu/venue-menu-cache';

/**
 * Query budgets: how many database reads each hot endpoint costs under a rush, measured by running the real services
 * against a client that counts. These are the numbers the venue load report is built from; if one grows, this fails.
 */
function countingDb() {
  const calls: string[] = [];
  const db = {
    from(table: string) {
      const resolve = () => {
        calls.push(table);
        const rows = table === 'businesses' ? { id: 'b' } : [];
        return Promise.resolve({ data: rows, error: null });
      };
      const chain: any = new Proxy({}, {
        get: (_t, prop) => {
          if (prop === 'then') return (a: any, b: any) => resolve().then(a, b);
          if (prop === 'maybeSingle') return resolve;
          return () => chain;
        },
      });
      return chain;
    },
  };
  return { db, calls };
}

const venue = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const URL_FOR = (id: string) => `http://x/api/host/tables?business_id=${id}`;

beforeEach(() => {
  clearVenueMenuCache();
  invalidateKitchenTicketsCache();
  invalidateTablesCache();
});

describe('query budget per venue under a rush', () => {
  it('a push to four terminals costs one sessions read, not four', async () => {
    const { db, calls } = countingDb();
    await Promise.all([1, 2, 3, 4].map(() => getActiveHostSessions(db, venue(1))));
    expect(calls).toHaveLength(2); // orders + dine_in_sessions, once
  });

  it('kitchen tickets are read once per venue per window, for 40 venues in turn', async () => {
    const { db, calls } = countingDb();
    for (let round = 0; round < 3; round++) {
      for (let v = 1; v <= 40; v++) await fetchKitchenTickets(db, venue(v), null);
    }
    expect(calls).toHaveLength(40); // 120 reads before: one cache slot meant each venue evicted the next
  });

  it('a burst of terminals on one venue shares one ticket read', async () => {
    const { db, calls } = countingDb();
    await Promise.all(Array.from({ length: 6 }, () => fetchKitchenTickets(db, venue(1), null)));
    expect(calls).toHaveLength(1);
  });

  it('tables are two reads per venue per window', async () => {
    const { db, calls } = countingDb();
    for (let round = 0; round < 3; round++) {
      for (let v = 1; v <= 40; v++) await getHostTables(URL_FOR(venue(v)), db, venue(v));
    }
    expect(calls).toHaveLength(80);
  });

  it('300 guests opening the menu cost three reads', async () => {
    const { db, calls } = countingDb();
    await Promise.all(Array.from({ length: 300 }, () => loadVenueMenu(db, venue(1))));
    expect(calls).toHaveLength(3);
  });
});
