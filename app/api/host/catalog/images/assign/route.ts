import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { assignDishPhoto, type AssignInput } from '@/lib/services/catalog/photo-assign';

export const dynamic = 'force-dynamic';

/** Puts one chosen photo on one dish. Body: { item_id, source: 'vault', vault_id } or { item_id, source: 'unsplash', url }. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => null);
    const itemId = typeof body?.item_id === 'string' ? body.item_id : '';
    if (!itemId) return NextResponse.json({ error: 'Choose a dish.' }, { status: 400 });

    const input: AssignInput | null = body?.source === 'vault'
      ? { source: 'vault', vault_id: String(body.vault_id || '') }
      : body?.source === 'unsplash'
        ? { source: 'unsplash', url: String(body.url || ''), download_location: body.download_location }
        : null;
    if (!input) return NextResponse.json({ error: 'Choose a photo source.' }, { status: 400 });

    const result = await assignDishPhoto(auth.supabase, auth.businessId, itemId, input);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, image_url: result.image_url });
  } catch (error) {
    return handleApiError(error, request, 'HostCatalogImagesAssignPOST');
  }
}, 'HostCatalogImagesAssignPOST');
