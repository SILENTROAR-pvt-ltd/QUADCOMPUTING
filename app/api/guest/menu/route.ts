import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { loadVenueMenuWithSource } from '@/lib/services/guest-menu/venue-menu-cache';
import { isRoomTable } from '@/lib/guest/room-mode';

// Edge: the menu is the first thing a guest loads after a QR scan, and a Node cold start added most of its latency.
export const runtime = 'edge';

const categoryPriority = (cat?: string) => {
  const c = (cat || '').toLowerCase();
  if (c.includes('starter') || c.includes('appetizer')) return 1;
  if (c.includes('main') || c.includes('entree') || c.includes('pizza') || c.includes('pasta')) return 2;
  if (c.includes('dessert') || c.includes('sweet')) return 3;
  if (c.includes('beverage') || c.includes('drink') || c.includes('coffee')) return 4;
  if (c.includes('service') || c.includes('spa')) return 8;
  if (c.includes('accommodation') || c.includes('room') || c.includes('cabana') || c.includes('suite')) return 9;
  return 5;
};

function findMatchingTable(tables: any[], tableParam: string, businessId: string) {
  const norm = tableParam.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = (tables || []).find((t: any) => {
    const tNorm = (t.table_number || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return tNorm === norm || tNorm.includes(norm) || norm.includes(tNorm);
  });
  return match || null;
}

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    // Per-address cap before any venue lookup: an unknown identifier costs database queries, and the per-venue limit
    // below only runs once a venue has resolved.
    const perAddress = await enforceRateLimit(request, 'guest_menu_ip', 600, 60_000);
    if (perAddress) return perAddress;
    const { searchParams } = new URL(request.url);
    const tableParamRaw = searchParams.get('table') || searchParams.get('table_number') || 'T-01';
    const cafeParamRaw = searchParams.get('cafe_id') || searchParams.get('venue') || searchParams.get('business_id');

    const validation = await validateGuestAccess(cafeParamRaw, tableParamRaw);
    if (validation.error) return validation.error;
    const { businessId: cafeParam, tableNumber } = validation;
    const tableParam = tableNumber || 'T-01';
    // The whole menu is a large response and this route is public: cap it per venue address (a venue shares one).
    const limited = await enforceRateLimit(request, 'guest_menu_get', 300, 60_000, cafeParam);
    if (limited) return limited;

    // One shared read per venue (see venue-menu-cache): a rush of guests costs the database one read, not hundreds.
    const { value: menu, source } = await loadVenueMenuWithSource(adminDb(), cafeParam);
    const businessData = menu?.business;

    if (!businessData) {
      return NextResponse.json(
        { error: 'The requested venue could not be found or is currently offline.' },
        { status: 404 }
      );
    }

    const businessId = businessData.id;
    const businessName =
      (businessData as any).name ||
      (businessData as any).business_name ||
      (businessData as any).venue_name ||
      (businessData as any).branch_name ||
      'Venue';

    const venueTables = menu!.tables;
    // A hotel room orders from this same menu with its label ("RS-101") in the table's place. The menu is the same public
    // list for every table, so a room label needs no table of its own; the order itself is checked against the room's
    // session when it is placed. Any other name must still be one of the venue's real tables.
    const validTableData = isRoomTable(tableParam)
      ? { id: null, table_number: tableParam, seating_capacity: 1 }
      : findMatchingTable(venueTables, tableParam, businessId);

    if (!validTableData) {
      return NextResponse.json(
        { error: `Table '${tableParam}' not found at this venue.` },
        { status: 404 }
      );
    }

    let items: any[] = [];
    if (menu!.items.length > 0) {
      items = menu!.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price ? Number(item.price) : 0,
        category: item.category || 'General',
        type: item.item_type || (item.category?.toLowerCase().includes('accommodation') ? 'accommodation' : 'food'),
        // No stand-in photo: a stock salad image was shown for every dish and
        // service without its own picture, misrepresenting what guests order.
        // The cards render a neutral initial-letter tile instead.
        image_url: item.image_url || null,
        dietary: typeof item.dietary === 'string' ? item.dietary : null,
      }));
    }

    items.sort((a, b) => categoryPriority(a.category) - categoryPriority(b.category));



    return NextResponse.json({
      success: true,
      table: {
        id: validTableData.id,
        table_number: validTableData.table_number,
        seating_capacity: validTableData.seating_capacity || 4,
      },
      business: {
        id: businessId,
        name: businessName,
      },
      items,
    }, {
      // The same for every guest at this table, so the edge may keep it a few seconds and refresh behind them.
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=60',
        // HIT / SHARED / MISS: lets a load test count how many requests actually reached the database.
        'X-Menu-Cache': source,
      },
    });
  } catch (error: any) {
    console.error('[API Guest Menu GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'GuestMenuGET')

