import { describe, it, expect, vi } from 'vitest';

// The venue's public menu is also the menu a hotel guest orders from in their room, where the "table" is the room's
// label (RS-101). It once refused that label as an unknown table, so room mode opened on "Menu unavailable".

vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ({}) }));
vi.mock('@/lib/middleware/rate-limiter', () => ({ enforceRateLimit: async () => null }));
vi.mock('@/lib/auth/guest-validate', () => ({ validateGuestAccess: async (_cafe: string, table?: string) => ({ businessId: 'biz-1', tableNumber: table, error: null }) }));
vi.mock('@/lib/services/guest-menu/venue-menu-cache', () => ({
  loadVenueMenuWithSource: async () => ({
    source: 'MISS',
    value: {
      business: { id: 'biz-1', name: 'Bombay Rasoi' },
      tables: [{ id: 't1', table_number: 'T-01', seating_capacity: 4 }],
      items: [{ id: 'd1', name: 'Dal', price: 40, category: 'Mains', item_type: 'food' }],
    },
  }),
}));

const ask = async (table: string) => {
  const { GET } = await import('@/app/api/guest/menu/route');
  const res = await GET(new Request(`http://localhost/api/guest/menu?cafe_id=biz-1&table=${encodeURIComponent(table)}`));
  return { status: res.status, body: await res.json() };
};

describe('the menu for a room', () => {
  it('serves the same menu to a room label as to a real table', async () => {
    const room = await ask('RS-suite1');
    expect(room.status).toBe(200);
    expect(room.body.table).toMatchObject({ id: null, table_number: 'RS-suite1' });
    expect(room.body.items.map((i: any) => i.name)).toEqual(['Dal']);
    expect((await ask('T-01')).status).toBe(200);
  });

  it('still refuses a name that is neither a table of the venue nor a room', async () => {
    const res = await ask('ZZ-99');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found at this venue/);
  });
});
