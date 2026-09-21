import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }); } catch (error) {}
          },
        },
      }
    );

    // 1. Authenticate Request
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No valid items provided for insertion.' }, { status: 400 });
    }

    // 2. Resolve Host Topology
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'No registered business found for host.' }, { status: 404 });
    }

    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('business_id', business.id)
      .limit(1);

    const locationId = locations && locations.length > 0 ? locations[0].id : null;

    // 3. Format Catalog Items Payload
    const catalogPayload = items.map((item: any) => ({
      business_id: business.id,
      location_id: locationId,
      item_type: item.item_type || 'food',
      name: item.name,
      description: item.description || '',
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      category: item.category,
      image_url: item.image_url || item.imageUrl || null,
      is_available: true
    }));

    // 4. Bulk Insert Catalog Items
    const { data: insertedItems, error: catalogError } = await supabase
      .from('catalog_items')
      .insert(catalogPayload)
      .select('id');

    if (catalogError) {
      console.error('Catalog Insert Error:', catalogError);
      return NextResponse.json({ error: catalogError.message }, { status: 400 });
    }

    // 5. Bulk Insert Inventory Stock (if items have stock > 0, else default to 0)
    if (insertedItems && insertedItems.length > 0) {
      const inventoryPayload = insertedItems.map((record: any, index: number) => {
        const correspondingItem = items[index];
        return {
          catalog_item_id: record.id,
          stock_quantity: correspondingItem.stock ? parseInt(correspondingItem.stock, 10) : 0,
          low_stock_threshold: 5
        };
      });

      const { error: inventoryError } = await supabase
        .from('inventory_stock')
        .insert(inventoryPayload);

      if (inventoryError) {
        console.error('Inventory Insert Error:', inventoryError);
        // We do not fail the request completely if inventory fails, but we log it.
      }
    }

    return NextResponse.json({ success: true, count: insertedItems?.length || 0 });
  } catch (error: any) {
    console.error('Bulk Ingest Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
