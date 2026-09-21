import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, item_type, category, price, description, image_url } = body;

    if (!id || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership indirectly by checking if the user owns the business associated with this item's location
    const { data: catalogItem } = await supabase
      .from('catalog_items')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!catalogItem) {
      return NextResponse.json({ error: 'Catalog item not found' }, { status: 404 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', catalogItem.business_id)
      .eq('host_id', session.user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Unauthorized to modify this item' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('catalog_items')
      .update({
        name,
        item_type,
        category,
        price,
        description,
        image_url
      })
      .eq('id', id);

    if (updateError) {
      console.error('[Catalog Update Error]', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Catalog Update Route Exception]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
