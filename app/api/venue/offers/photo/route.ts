import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { uploadVaultObject } from '@/lib/services/catalog/vault-ingest';
import { storeOfferPhoto } from '@/lib/services/offers/offer-photo';

export const dynamic = 'force-dynamic';

/**
 * POST /api/venue/offers/photo  { base64, mimeType } | { url }
 * Stores a photo for a live offer in the venue's own storage and returns its address, to save on the offer.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => null);
    if (!body || (!body.url && !body.base64)) {
      return NextResponse.json({ success: false, error: 'Choose a photo or paste a photo link.' }, { status: 400 });
    }

    const limit = await checkRateLimit({ key: `ratelimit:offer_photo:${auth.businessId}`, limit: 60, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return rateLimitResponse(limit, 'Photo limit reached for this hour. Please try again later.');

    const storage = adminDb();
    const result = await storeOfferPhoto(auth.businessId, body, {
      upload: (path, bytes, mime) => uploadVaultObject(storage, path, bytes, mime),
    });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, image_url: result.image_url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'VenueOfferPhotoPOST');
  }
}, 'VenueOfferPhotoPOST');
