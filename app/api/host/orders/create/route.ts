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

    const body = await request.json();
    const { items, subtotal, discountType, discountValue, discountAmount, taxAmount, grandTotal } = body;

    const { error: insertError } = await supabase.from('orders').insert({
      business_id: business.id,
      items: items,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      created_at: new Date().toISOString()
    });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Orders POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
