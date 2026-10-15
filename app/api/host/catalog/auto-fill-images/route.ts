import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { adminDb } from '@/lib/supabase/admin';
import { runSmartPhotos } from '@/lib/services/catalog/smart-photos';
import { PhotoVaultNotReady } from '@/lib/services/catalog/photo-sources';
import { uploadVaultObject } from '@/lib/services/catalog/vault-ingest';
import { generateJson, llmConfigured } from '@/lib/services/catalog/llm-json';

export const dynamic = 'force-dynamic';

/**
 * Matches dishes without a photo: the venue's Photo Vault first (exact word matches, then the verified
 * agent when a model key is set), then stock photos (exact word matches only). Call again while has_more is true.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const useAgent = llmConfigured();
    if (useAgent) {
      const limit = await checkRateLimit({ key: `ratelimit:photo_agent:${auth.businessId}`, limit: 30, windowMs: 60 * 60 * 1000 });
      if (!limit.allowed) return rateLimitResponse(limit, 'Matching limit reached for this hour. Exact matches still work; try again later.');
    }
    const storage = useAgent ? adminDb() : null;
    const agent = storage ? { generate: generateJson, upload: (p: string, b: Buffer, m: string) => uploadVaultObject(storage, p, b, m) } : undefined;
    const result = await runSmartPhotos(auth.supabase, auth.businessId, useAgent ? generateJson : undefined, agent);
    return NextResponse.json({ ...result, agent: useAgent ? 'on' : 'off' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof PhotoVaultNotReady) {
      return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 503 });
    }
    return handleApiError(error, request, 'HostCatalogAutoFillImagesPOST');
  }
}, 'HostCatalogAutoFillImagesPOST');
