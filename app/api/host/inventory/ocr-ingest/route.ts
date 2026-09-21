import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Since this is a simulation, we don't actually process the FormData image.
    // In a real app, we would use Vision AI to extract line items.
    
    // SIMULATED OCR EXTRACTED ITEMS:
    const simulatedExtract = [
      { item_name: 'Premium Coffee Beans', unit: 'kg', quantity: 15, cost: 800 },
      { item_name: 'Whole Milk', unit: 'ltr', quantity: 50, cost: 65 },
      { item_name: 'Sugar (White)', unit: 'kg', quantity: 10, cost: 45 },
      { item_name: 'Brown Napkins', unit: 'pcs', quantity: 1000, cost: 0.5 }
    ];

    const addedItems = [];

    for (const line of simulatedExtract) {
      // Upsert logic based on item name (simple matching for simulation)
      let { data: existing } = await supabase
        .from('raw_inventory_items')
        .select('*')
        .eq('business_id', business.id)
        .ilike('item_name', line.item_name)
        .maybeSingle();

      let targetItem;

      if (existing) {
        // Update existing stock
        const newStock = Number(existing.current_stock) + line.quantity;
        const { data: updated, error: updateError } = await supabase
          .from('raw_inventory_items')
          .update({ 
            current_stock: newStock, 
            cost_per_unit: line.cost, // Update to latest price
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (!updateError) targetItem = updated;
      } else {
        // Insert new stock
        const { data: inserted, error: insertError } = await supabase
          .from('raw_inventory_items')
          .insert({
            business_id: business.id,
            item_name: line.item_name,
            unit: line.unit,
            current_stock: line.quantity,
            cost_per_unit: line.cost,
            category: 'Raw Supply'
          })
          .select()
          .single();
        
        if (!insertError) targetItem = inserted;
      }

      if (targetItem) {
        // Log the purchase
        await supabase.from('inventory_logs').insert({
          business_id: business.id,
          item_id: targetItem.id,
          change_amount: line.quantity,
          action_type: 'PURCHASE',
          notes: 'Auto-ingested via Bill OCR'
        });
        addedItems.push(targetItem);
      }
    }

    return NextResponse.json({ success: true, message: 'OCR Extracted and inserted', addedItems });
  } catch (error: any) {
    console.error('[API OCR Ingest]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
