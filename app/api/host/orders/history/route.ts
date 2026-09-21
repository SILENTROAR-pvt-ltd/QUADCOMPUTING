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

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('[API Orders History GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
