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

    const userId = session.user.id;

    // Resolve business_id from the host
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', userId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'No registered business found for host.' }, { status: 404 });
    }

    // Fetch items with empty images
    const { data: items, error: fetchError } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('business_id', business.id)
      .or('image_url.is.null,image_url.eq.');

    if (fetchError) {
      throw fetchError;
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, updatedItems: [] });
    }

    const updatedItems = [];

    // Batch process
    for (const item of items) {
      const categoryLower = (item.category || '').toLowerCase();
      const nameLower = (item.name || '').toLowerCase();
      
      let pool = [
        'https://images.unsplash.com/photo-1544025162-811114215b2e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1473093295043-cdd814d0e601?auto=format&fit=crop&w=800&q=80'
      ]; // Default Food

      if (item.item_type === 'room' || categoryLower.includes('suite') || categoryLower.includes('room') || nameLower.includes('suite')) {
        pool = [
          'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
        ];
      } else if (categoryLower.includes('coffee') || categoryLower.includes('beverage') || nameLower.includes('espresso') || nameLower.includes('drink')) {
        pool = [
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1461023058943-0708e5214e72?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80'
        ];
      } else if (categoryLower.includes('bakery') || categoryLower.includes('dessert') || nameLower.includes('cake') || nameLower.includes('muffin') || nameLower.includes('marshmallow')) {
        pool = [
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=800&q=80'
        ];
      } else if (item.item_type === 'service' || categoryLower.includes('service')) {
        pool = [
          'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80'
        ];
      }

      // Consistently hash string to a number so items with the same name get the same image if we ever retry or reset.
      let hash = 0;
      for (let i = 0; i < item.name.length; i++) {
        hash = item.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const stockImageUrl = pool[Math.abs(hash) % pool.length];

      // Update in DB
      const { data: updatedItem, error: updateError } = await supabase
        .from('catalog_items')
        .update({ image_url: stockImageUrl })
        .eq('id', item.id)
        .select()
        .single();
      
      if (!updateError && updatedItem) {
        // Serialize to Canonical Schema
        const canonicalItem = {
          id: updatedItem.id as CatalogItemId,
          branchId: updatedItem.location_id,
          name: updatedItem.name,
          description: updatedItem.description || '',
          imageUrl: updatedItem.image_url,
          status: updatedItem.is_available ? 'active' : 'inactive',
          addons: [],
          createdAt: updatedItem.created_at,
          updatedAt: updatedItem.created_at,
          ...(updatedItem.item_type === 'food' && {
            kind: 'food_beverage',
            course: updatedItem.category,
            dietary: 'veg',
            price: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },
            prepTimeMinutes: null,
            allergens: [],
          }),
          ...(updatedItem.item_type === 'room' && {
            kind: 'accommodation',
            roomType: updatedItem.category,
            nightlyRate: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },
            capacity: updatedItem.metadata?.capacity || null,
            bedType: updatedItem.metadata?.bed_type || null,
            amenities: updatedItem.metadata?.amenities || [],
            occupancy: { adults: 2, children: 0 },
            inventoryCount: 1,
          }),
          ...(updatedItem.item_type === 'service' && {
            kind: 'service',
            serviceType: updatedItem.category,
            price: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },
          }),
        };
        updatedItems.push(canonicalItem);
      }
    }

    return NextResponse.json({ success: true, count: updatedItems.length, updatedItems });
  } catch (error: any) {
    console.error('[API Auto-Fill Images]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
