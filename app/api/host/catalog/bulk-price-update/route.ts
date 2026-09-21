import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.user.id;
    const { locationIds, category, mode, value } = await request.json();

    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid locationIds' }, { status: 400 });
    }

    if (!['percentage', 'flat'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (typeof value !== 'number' || isNaN(value)) {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }

    // Map 'food_beverage' back to 'food' for DB
    const dbCategory = category === 'food_beverage' ? 'food' : (category === 'accommodation' ? 'room' : category);

    // Ensure the locations belong to businesses owned by the user
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', userId);

    const businessIds = businesses?.map(b => b.id) || [];
    if (businessIds.length === 0) {
      return NextResponse.json({ error: 'Unauthorized to modify these locations' }, { status: 403 });
    }

    // Now verify the locationIds belong to these businesses
    const { data: validLocations } = await supabase
      .from('locations')
      .select('id')
      .in('business_id', businessIds)
      .in('id', locationIds);

    const validLocationIds = validLocations?.map(l => l.id) || [];
    if (validLocationIds.length === 0) {
      return NextResponse.json({ error: 'No valid locations found for this host' }, { status: 403 });
    }

    // Build the query to get all items to update
    let query = supabase.from('catalog_items').select('id, price').in('location_id', validLocationIds).eq('is_available', true);
    if (dbCategory !== 'All') {
      query = query.eq('item_type', dbCategory);
    }

    const { data: items, error: selectError } = await query;
    if (selectError) {
      throw selectError;
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Note: Supabase JS doesn't support complex arithmetic updates natively like `price = price + X` across multiple rows dynamically
    // without an RPC call. Since we want to support this dynamically and safely, we can either:
    // 1. Create an RPC function (best for scaling).
    // 2. Fetch all items, calculate new prices in Node, and upsert batch.
    // For MVP, we will fetch, calculate, and batch update (upsert).

    const updates = items.map((item) => {
      let newPrice = item.price;
      if (mode === 'percentage') {
        newPrice = item.price * (1 + value / 100);
      } else if (mode === 'flat') {
        newPrice = item.price + value;
      }
      // Ensure price never drops below 0 and round to 2 decimals
      newPrice = Math.max(0, Math.round(newPrice * 100) / 100);

      return {
        id: item.id,
        price: newPrice
      };
    });

    // Batch update using upsert (requires matching all unique constraints if any, but ID is enough if it's primary key and we only pass ID and price? Actually no, upsert might require all NOT NULL fields unless we do multiple updates).
    // To be safe without an RPC, we will update them concurrently or use RPC.
    // Let's use Promise.all for a small catalog, this is safe for ~500 items.
    const CHUNK_SIZE = 50;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(u => 
          supabase.from('catalog_items').update({ price: u.price }).eq('id', u.id)
        )
      );
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error: any) {
    console.error('[Bulk Price Update API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
