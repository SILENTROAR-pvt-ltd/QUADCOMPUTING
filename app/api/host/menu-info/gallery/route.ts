import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { uploadVaultObject } from '@/lib/services/catalog/vault-ingest';
import { addGalleryPhoto, removeGalleryPhoto } from '@/lib/services/menu-info/gallery-store';

export const dynamic = 'force-dynamic';

/** POST: adds one photo to the venue's memory vault ({ mimeType, base64, caption? }). Returns the updated menu information. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const limit = await checkRateLimit({ key: `ratelimit:gallery_upload:${auth.businessId}`, limit: 40, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return rateLimitResponse(limit, 'Photo upload limit reached (40 per hour). Please try again later.');

    const body = await request.json().catch(() => null);
    const db = adminDb();
    const result = await addGalleryPhoto(db, auth.businessId, {
      mimeType: String(body?.mimeType || ''), base64: String(body?.base64 || ''), caption: typeof body?.caption === 'string' ? body.caption : '',
    }, { upload: (path, bytes, mime) => uploadVaultObject(db, path, bytes, mime) });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, info: result.info }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostGalleryPOST');
  }
}, 'HostGalleryPOST');

/** DELETE: takes a photo out of the vault ({ url }) and deletes its file. Returns the updated menu information. */
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => null);
    const db = adminDb();
    const result = await removeGalleryPhoto(db, auth.businessId, String(body?.url || ''), {
      remove: async (path) => { await db.storage.from('venue-vault').remove([path]); },
    });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, info: result.info }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostGalleryDELETE');
  }
}, 'HostGalleryDELETE');
