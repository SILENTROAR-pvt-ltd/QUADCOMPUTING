import { NextResponse } from 'next/server';
import { hostOnboardingSchema } from '@/lib/validations/onboarding';
import { createClient } from '@/lib/supabase/server';

function generateStrictOwnerCafeId(): string {
  const bytes = new Uint8Array(2);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const time = Math.floor(Date.now() / 1000).toString(36).toUpperCase().slice(-4).padStart(4, '0');
  // Ensures exact format: HOST-CF-[0-9A-F]{4}-[0-9A-Z]{4}
  return `HOST-CF-${hex}-${time}`;
}

export async function POST(request: Request) {
  let profileId: string | null = null;
  const businessIds: string[] = [];
  const locationIds: string[] = [];

  try {
    const payload = await request.json();
    const validation = hostOnboardingSchema.safeParse(payload);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid onboarding payload', issues: validation.error.flatten() },
        { status: 400 },
      );
    }

    const validatedData = validation.data;
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { success: false, error: 'Host authentication is required before provisioning' },
        { status: 401 },
      );
    }

    profileId = authData.user.id;
    const uniqueOwnerCafeId = generateStrictOwnerCafeId();

    // 1. Provision Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        owner_cafe_id: uniqueOwnerCafeId,
        role: 'host',
        full_name: validatedData.fullName,
        gender: validatedData.gender,
        dob: validatedData.dob,
        categories_handled: validatedData.categories,
        ecosystem_statement: null,
        revision: 1,
      })
      .select('id, owner_cafe_id, full_name, categories_handled, created_at')
      .single();

    if (profileError || !profile) {
      throw new Error(`Profile insert failed: ${profileError?.message || profileError?.details || profileError?.hint || 'Unknown Postgres Error'}`);
    }

    const provisionedBusinesses = [];
    
    for (const business of validatedData.businesses) {
      // 2. Provision Business
      const { data: businessRow, error: businessError } = await supabase
        .from('businesses')
        .insert({
          host_id: profile.id,
          categories: validatedData.categories,
          gst_number: business.gstNumber || null,
        })
        .select('id')
        .single();

      if (businessError || !businessRow) {
        throw new Error(`Business insert failed: ${businessError?.message || businessError?.details || businessError?.hint || 'Unknown Postgres Error'}`);
      }
      
      businessIds.push(businessRow.id);

      const qrCodeHash = `qr_${crypto.randomUUID().replace(/-/g, '')}`;
      
      // 3. Provision Location
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert({
          business_id: businessRow.id,
          branch_name: business.businessName,
          state: business.state,
          city: business.city,
          address: business.address,
          pincode: business.pincode,
          qr_code_hash: qrCodeHash,
        })
        .select('id')
        .single();

      if (locationError || !location) {
        throw new Error(`Location insert failed: ${locationError?.message || locationError?.details || locationError?.hint || 'Unknown Postgres Error'}`);
      }
      
      locationIds.push(location.id);
      provisionedBusinesses.push({ ...business, locationId: location.id, qrCodeHash });
    }

    return NextResponse.json({
      success: true,
      uniqueOwnerCafeId: profile.owner_cafe_id,
      businesses: provisionedBusinesses,
      controlCenterUrl: '/host/control-center',
    });
    
  } catch (error: unknown) {
    const supabase = createClient();
    
    // Rollback attempt
    for (const locationId of locationIds) {
      await supabase.from('locations').delete().eq('id', locationId);
    }
    for (const businessId of businessIds) {
      await supabase.from('businesses').delete().eq('id', businessId);
    }
    if (profileId) {
      await supabase.from('profiles').delete().eq('id', profileId);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown fatal error during provisioning';
    console.error('[API Provisioning Error]', errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
