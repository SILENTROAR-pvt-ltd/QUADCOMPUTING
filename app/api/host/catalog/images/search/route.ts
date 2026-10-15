import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { searchDishPhotos, stockSearchConfigured, PhotoVaultNotReady } from '@/lib/services/catalog/photo-sources';

export const dynamic = 'force-dynamic';

/** Photos for one dish: the venue's own first, then stock results. `q` overrides the dish name. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const url = new URL(request.url);
    const itemId = url.searchParams.get('item_id') || '';
    const query = (url.searchParams.get('q') || '').trim();
    let name = query;
    if (!name && itemId) {
      const { data } = await supabase.from('catalog_items').select('name')
        .eq('id', itemId).eq('business_id', businessId).maybeSingle();
      name = data?.name || '';
    }
    if (!name) return NextResponse.json({ error: 'Name the dish to search for.' }, { status: 400 });

    const stock = stockSearchConfigured();
    const candidates = await searchDishPhotos(supabase, businessId, name, stock);
    return NextResponse.json(
      { success: true, query: name, stock_search: stock, candidates },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof PhotoVaultNotReady) {
      return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 503 });
    }
    return handleApiError(error, request, 'HostCatalogImagesSearchGET');
  }
}, 'HostCatalogImagesSearchGET');
