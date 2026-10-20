import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { checkIdProof, storeIdProof } from '@/lib/services/stay/id-proof.service';
import { loadStayBusiness } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/stay/id-proof (multipart: venue, file)
 * Stores the guest's ID photo in the private bucket and answers with its path, which the check-in call then attaches
 * to the room. The path is random and tied to the venue; nothing can be read back through this route.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ success: false, error: 'Send the photo as a form upload.' }, { status: 400 });
    const validation = await validateGuestAccess(String(form.get('venue') || ''));
    if (validation.error) return validation.error;
    const businessId = validation.businessId;

    const limited = await enforceRateLimit(request, 'stay_id_upload', 10, 10 * 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();
    const business = await loadStayBusiness(db, businessId);
    if (!business?.self_checkin_enabled) {
      return NextResponse.json({ success: false, error: 'Self check-in is not open at this venue.', code: 'SELF_CHECKIN_OFF' }, { status: 403 });
    }

    const file = form.get('file');
    if (!(file instanceof Blob)) return NextResponse.json({ success: false, error: 'Take or choose a photo of the ID.' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkIdProof(bytes);
    if (!check.ok) return NextResponse.json({ success: false, error: check.error }, { status: check.status });

    const path = await storeIdProof(db, businessId, bytes, check.type, check.ext);
    return NextResponse.json({ success: true, id_proof_path: path }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'StayIdProofPOST');
  }
}, 'StayIdProofPOST');
