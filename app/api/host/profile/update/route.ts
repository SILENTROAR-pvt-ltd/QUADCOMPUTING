import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required'),
  displayName: z.string().min(2, 'Display Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Must be 10 digits').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  dob: z.string().optional(),
  offersAccommodation: z.boolean().optional(),
  ecosystemStatement: z.string().optional(),
  categoriesHandled: z.array(z.string()),
  businesses: z.array(
    z.object({
      id: z.string().uuid(),
      businessName: z.string().min(2, 'Business Name is required'),
      gstNumber: z.string().optional().or(z.literal('')),
      bankName: z.string().optional().or(z.literal('')),
      bankAccountNumber: z.string().optional().or(z.literal('')),
      bankIfscCode: z.string().optional().or(z.literal('')),
      upiId: z.string().optional().or(z.literal('')),
    })
  )
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.user.id;
    const rawPayload = await request.json();
    
    const parsed = updateProfileSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
    }
    
    const payload = parsed.data;

    // 1. Update Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: payload.fullName, // this maps to displayName/fullName in UI
        gender: payload.gender || null,
        offers_accommodation: payload.offersAccommodation ?? false,
        dob: payload.dob || null,
        ecosystem_statement: payload.ecosystemStatement || null,
        categories_handled: payload.categoriesHandled,
      })
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Profile update failed: ${profileError.message}`);
    }

    // 2. Update Businesses (Looping through submitted businesses)
    for (const business of payload.businesses) {
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          // Notice we don't have a business name column in businesses (we use location branch names), 
          // but we can update GST, Categories, and Banking info here.
          categories: payload.categoriesHandled,
          gst_number: business.gstNumber || null,
          bank_name: business.bankName || null,
          bank_account_number: business.bankAccountNumber || null,
          bank_ifsc_code: business.bankIfscCode || null,
          upi_id: business.upiId || null,
        })
        .eq('id', business.id)
        .eq('host_id', userId); // Extra security check

      if (businessError) {
        throw new Error(`Business update failed: ${businessError.message}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Profile Update Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply enterprise changes.' },
      { status: 500 },
    );
  }
}
