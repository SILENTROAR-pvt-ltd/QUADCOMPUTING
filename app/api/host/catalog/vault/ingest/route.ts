import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { ingestDishPhotos, uploadVaultObject, validateBatch, type IncomingPhoto } from '@/lib/services/catalog/vault-ingest';
import { generateJson, llmConfigured } from '@/lib/services/catalog/llm-json';

export const dynamic = 'force-dynamic';

/** Adds dish photos to the venue's Photo Vault. Each photo is read by the vision model when configured. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => null);
    const problem = validateBatch(body?.photos);
    if (problem) return NextResponse.json({ success: false, error: problem }, { status: 400 });

    // Each photo is one paid vision call: cap them per venue.
    const limit = await checkRateLimit({ key: `ratelimit:vault_ingest:${auth.businessId}`, limit: 60, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return rateLimitResponse(limit, 'Photo ingest limit reached (60 photos per hour). Please try again later.');

    const db = adminDb();
    const photos: IncomingPhoto[] = body.photos.map((p: any) => ({
      filename: String(p?.filename || 'photo'), mimeType: String(p?.mimeType || ''), base64: String(p?.base64 || ''),
    }));
    const results = await ingestDishPhotos(db, auth.businessId, photos, {
      generate: llmConfigured() ? generateJson : undefined,
      upload: (path, bytes, mime) => uploadVaultObject(db, path, bytes, mime),
    });
    return NextResponse.json({
      success: true,
      added: results.filter((r) => r.status === 'added').length,
      results,
      vision: llmConfigured() ? 'on' : 'off',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostCatalogVaultIngestPOST');
  }
}, 'HostCatalogVaultIngestPOST');
