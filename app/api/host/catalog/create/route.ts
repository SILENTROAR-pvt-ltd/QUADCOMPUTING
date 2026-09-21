import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CatalogItemId } from '@/types/catalog';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { branchId, name, description, price, imageUrl, itemType, category, inventoryCount, capacity, bedType, amenities } = body;

    if (!name || price == null || !branchId || !itemType || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const metadata = itemType === 'room' ? {
      capacity: capacity || null,
      bed_type: bedType || null,
      amenities: amenities || []
    } : null;

    // Resolve business_id from the linked location/branch
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('business_id')
      .eq('id', branchId)
      .single();

    if (locError || !location) {
      return NextResponse.json({ error: 'Invalid branch ID or ownership not confirmed.' }, { status: 400 });
    }

    // Insert Canonical Catalog Item
    const { data: item, error: insertError } = await supabase
      .from('catalog_items')
      .insert({
        business_id: location.business_id,
        location_id: branchId,
        item_type: itemType, 
        name,
        description,
        price,
        category,
        image_url: imageUrl || null,
        metadata,
        is_available: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Conditionally initialize inventory (e.g., for rooms or fixed stock items)
    if (inventoryCount !== undefined && inventoryCount !== null) {
      const { error: invError } = await supabase
        .from('inventory_stock')
        .insert({
          catalog_item_id: item.id,
          stock_quantity: inventoryCount,
          low_stock_threshold: 5,
        });
      if (invError) throw invError;
    }

    // Serialize returned entity back to the Canonical Zustand Schema for hydration
    const canonicalItem = {
      id: item.id as CatalogItemId,
      branchId: item.location_id,
      name: item.name,
      description: item.description || '',
      imageUrl: item.image_url,
      status: item.is_available ? 'active' : 'inactive',
      addons: [],
      createdAt: item.created_at,
      updatedAt: item.created_at,
      ...(item.item_type === 'food' && {
        kind: 'food_beverage',
        course: item.category,
        dietary: 'veg', // Default stub mapping
        price: { amountMinor: Math.round(Number(item.price) * 100), currency: 'INR' },
        prepTimeMinutes: null,
        allergens: [],
      }),
      ...(item.item_type === 'room' && {
        kind: 'accommodation',
        roomType: item.category,
        nightlyRate: { amountMinor: Math.round(Number(item.price) * 100), currency: 'INR' },
        capacity: item.metadata?.capacity || null,
        bedType: item.metadata?.bed_type || null,
        amenities: item.metadata?.amenities || [],
        occupancy: { adults: 2, children: 0 },
        inventoryCount: inventoryCount || 1,
      }),
    };

    return NextResponse.json({ data: canonicalItem });
  } catch (error) {
    console.error('[API Catalog POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
