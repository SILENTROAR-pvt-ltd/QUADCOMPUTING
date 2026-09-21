import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.user.id;
    const payload = await request.json();

    const { displayName, ecosystemStatement, phone, dob, gender, offersAccommodation } = payload;

    if (!displayName) {
      return NextResponse.json({ success: false, error: 'Display name is required' }, { status: 400 });
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: displayName,
        phone: phone || null,
        dob: dob || null,
        gender: gender || null,
        offers_accommodation: offersAccommodation ?? false,
        ecosystem_statement: ecosystemStatement || null,
        revision: supabase.rpc('increment', { row_id: userId }), // Optional: could just omit if no RPC
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(updateError.message);
    }
    
    // Increment revision safely
    try {
      await supabase.rpc('increment_profile_revision', { profile_id: userId });
    } catch {
      // Safe fail if RPC does not exist
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Profile Update Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 },
    );
  }
}
