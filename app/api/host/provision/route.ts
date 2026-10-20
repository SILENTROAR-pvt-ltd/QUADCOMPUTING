import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { hostOnboardingSchema } from '@/lib/validations/onboarding';
import { generateOwnerCafeId } from '@/lib/utils/ids';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { safeMessage } from '@/lib/utils/safe-message';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    // allowNoBusiness: a freshly signed-up host has zero businesses yet —
    // that's expected here. A missing/invalid session is still a hard 401
    // (see guards.ts) — there is no more "proceed without a real user" path.
    const auth = await requireHost(request, null, { allowNoBusiness: true });
    if (auth.error) return auth.error;
    const { user, supabase } = auth;

    const payload = await request.json();
    const validatedData = hostOnboardingSchema.parse(payload);
    const uniqueOwnerCafeId = generateOwnerCafeId();
    const hostId = user.id;

    // Each business is provisioned atomically via one RPC call — profile
    // upsert + business + location + wallet + subscription all in one
    // transaction. A failure (e.g. a real DB/constraint error) throws here
    // and is returned as a real error instead of a silent, fabricated success.
    const processedBusinesses = [];
    for (const business of validatedData.businesses) {
      const bizName = business.businessName;
      const slug = bizName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const qrCodeHash = `qr_${crypto.randomUUID().slice(0, 12)}`;

      // Server-side only: the function trusts p_host_id, so it is called with the service client and only with the session's own user id.
      const { data: rpcResult, error: rpcErr } = await adminDb().rpc('provision_host_business', {
        p_host_id: hostId,
        p_full_name: validatedData.fullName,
        p_gender: validatedData.gender,
        p_dob: validatedData.dob || null,
        p_owner_cafe_id: uniqueOwnerCafeId,
        p_categories: validatedData.categories,
        p_business_name: bizName,
        p_slug: slug,
        p_address: business.address,
        p_city: business.city,
        p_state: business.state,
        p_pincode: business.pincode,
        p_qr_code_hash: qrCodeHash,
        p_email: user.email || null,
      });

      if (rpcErr) throw rpcErr;
      if (!rpcResult?.success) {
        const err: any = new Error(rpcResult?.error || `Failed to provision "${bizName}"`);
        err.status = 409;
        throw err;
      }

      processedBusinesses.push({
        ...business,
        id: rpcResult.business_id,
        slug,
        locationId: rpcResult.location_id,
        qrCodeHash,
      });
    }

    const primaryBusinessId = processedBusinesses[0]?.id || '';
    const controlCenterUrl = primaryBusinessId
      ? `/host/control-center?business_id=${primaryBusinessId}`
      : '/host/control-center';

    return NextResponse.json({
      success: true,
      uniqueOwnerCafeId,
      businessId: primaryBusinessId,
      host: {
        id: hostId,
        uniqueOwnerCafeId,
        fullName: validatedData.fullName,
        gender: validatedData.gender,
        dob: validatedData.dob,
        categories: validatedData.categories,
      },
      businesses: processedBusinesses,
      dashboardUrl: controlCenterUrl,
      controlCenterUrl,
    });
  } catch (error: unknown) {
    // Supabase/Postgrest errors (e.g. from the RPC call above) are plain
    // objects with a `message`, not real Error instances — `error instanceof
    // Error` is false for them, which was silently collapsing every real DB
    // failure down to the generic 'Invalid payload' fallback.
    // The real error is logged below; the client gets the message only when it is a rule the host can act on.
    const message = safeMessage(error, 'We could not set up your venue. Please try again.');
    console.error('[HostProvisionPOST] Provisioning failed:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: (error as any)?.status || 400 },
    );
  }
}, 'HostProvisionPOST')
