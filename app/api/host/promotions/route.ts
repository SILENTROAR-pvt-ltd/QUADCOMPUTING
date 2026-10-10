import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const POST = withApiErrorBoundary(async function POST(req: Request) {
  try {
    const auth = await requireHost(req);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const supabase = adminDb();

    // Parse request payload
    const body = await req.json();
    const { code, title, type, value, is_active } = body;

    // Insert into Supabase promotions table
    const { data: promotion, error: insertError } = await supabase
      .from('promotions')
      .insert({
        business_id: businessId,
        title: title || code,
        code: code || title,
        discount_type: type === '%' || type === 'percentage' || type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT',
        discount_value: parseFloat(value),
        is_active: is_active ?? true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase Promo Insert Error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, promotion }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}, 'HostPromotionsPOST');

export const DELETE = withApiErrorBoundary(async function DELETE(req: Request) {
  try {
    const auth = await requireHost(req);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const supabase = adminDb();

    const id = new URL(req.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (deleteError) {
      console.error('Supabase Promo Delete Error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}, 'HostPromotionsDELETE');
