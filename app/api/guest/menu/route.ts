import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';



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
    const { searchParams } = new URL(request.url);
    const tableParamRaw = searchParams.get('table') || searchParams.get('table_number') || 'T-01';
    const cafeParamRaw = searchParams.get('cafe_id') || searchParams.get('venue') || searchParams.get('business_id');

    const validation = await validateGuestAccess(cafeParamRaw, tableParamRaw);
    if (validation.error) return validation.error;
    const { businessId: cafeParam, tableNumber } = validation;
    const tableParam = tableNumber || 'T-01';

    const supabase = adminDb();


    // Parallel fetch: business, all venue tables, and catalog items concurrently
    const [bizRes, tablesRes, itemsRes] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', cafeParam).maybeSingle(),
      supabase
        .from('restaurant_tables')
        .select('id, table_number, business_id, seating_capacity, status')
        .eq('business_id', cafeParam),
      supabase
        .from('catalog_items')
        .select('*')
        .or(`business_id.eq.${cafeParam},location_id.eq.${cafeParam}`)
        .eq('is_available', true),
    ]);

    const businessData = bizRes.data;

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

    const venueTables = tablesRes.data || [];
    const validTableData = findMatchingTable(venueTables, tableParam, businessId);

    if (!validTableData) {
      return NextResponse.json(
        { error: `Table '${tableParam}' not found at this venue.` },
        { status: 404 }
      );
    }

    let items: any[] = [];
    if (itemsRes.data && itemsRes.data.length > 0) {
      items = itemsRes.data.map((item: any) => ({
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
    });
  } catch (error: any) {
    console.error('[API Guest Menu GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'GuestMenuGET')

