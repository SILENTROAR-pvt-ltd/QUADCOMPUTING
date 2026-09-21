import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
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
    if (sessionError || !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', session.user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: items, error } = await supabase
      .from('raw_inventory_items')
      .select('*')
      .eq('business_id', business.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('[API Inventory GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    if (sessionError || !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', session.user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    const { itemName, category, unit, currentStock, threshold, costPerUnit } = body;

    const { data: item, error } = await supabase
      .from('raw_inventory_items')
      .insert({
        business_id: business.id,
        item_name: itemName,
        category: category || 'Raw Stock',
        unit: unit || 'kg',
        current_stock: currentStock || 0,
        threshold: threshold || 5,
        cost_per_unit: costPerUnit || 0
      })
      .select()
      .single();

    if (error) throw error;

    // Log the initial addition
    if (currentStock > 0) {
      await supabase.from('inventory_logs').insert({
        business_id: business.id,
        item_id: item.id,
        change_amount: currentStock,
        action_type: 'MANUAL_ADJUSTMENT',
        notes: 'Initial Stock Entry'
      });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('[API Inventory POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
    if (sessionError || !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, current_stock, cost_per_unit, threshold } = body;
    if (!id) return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });

    const updates: any = { updated_at: new Date().toISOString() };
    if (current_stock !== undefined) updates.current_stock = current_stock;
    if (cost_per_unit !== undefined) updates.cost_per_unit = cost_per_unit;
    if (threshold !== undefined) updates.threshold = threshold;

    const { data: updatedItem, error } = await supabase
      .from('raw_inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: updatedItem });
  } catch (error: any) {
    console.error('[API Inventory PATCH]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
