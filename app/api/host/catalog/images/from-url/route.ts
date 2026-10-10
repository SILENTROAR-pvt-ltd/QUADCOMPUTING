import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { ingestDishImageUrl } from '@/lib/services/catalog/url-ingest';
import { uploadVaultObject } from '@/lib/services/catalog/vault-ingest';

export const dynamic = 'force-dynamic';

/** Puts a photo from a web address on one dish. Body: { item_id, url }. The photo is downloaded and kept on our storage. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => null);
    const itemId = String(body?.item_id || '');
    const url = String(body?.url || '').trim();
    if (!itemId || !url) {
      return NextResponse.json({ success: false, error: 'Choose a dish and paste a photo link.' }, { status: 400 });
    }

    const limit = await checkRateLimit({ key: `ratelimit:dish_url:${auth.businessId}`, limit: 120, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return rateLimitResponse(limit, 'Photo link limit reached for this hour. Please try again later.');

    const storage = adminDb();
    const result = await ingestDishImageUrl(auth.supabase, auth.businessId, itemId, url, {
      upload: (path, bytes, mime) => uploadVaultObject(storage, path, bytes, mime),
    });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, image_url: result.image_url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostCatalogImagesFromUrlPOST');
  }
}, 'HostCatalogImagesFromUrlPOST');
