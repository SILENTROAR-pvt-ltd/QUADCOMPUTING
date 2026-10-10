import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import {
  fetchHostCatalog,
  createCatalogItem,
  deleteCatalogItem,
} from '@/lib/services/catalog.service';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const result = await fetchHostCatalog(request.url, supabase, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Catalog GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'HostCatalogGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json();
    if (body.business_id && body.business_id !== businessId) {
      return NextResponse.json({ error: 'Forbidden: Business ID mismatch' }, { status: 403 });
    }
    body.business_id = businessId;

    const canonicalItem = await createCatalogItem(body, supabase);
    return NextResponse.json({ data: canonicalItem });
  } catch (error: any) {
    console.error('[API Catalog POST]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('Missing') || error.message?.includes('Invalid') ? 400 : 500 }
    );
  }
}, 'HostCatalogPOST');

export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const url = new URL(request.url);
    let itemId = url.searchParams.get('id');

    if (!itemId) {
      const body = await request.json().catch(() => ({}));
      itemId = body.id;
    }

    if (!itemId) {
      return NextResponse.json({ error: 'Missing item id' }, { status: 400 });
    }

    const result = await deleteCatalogItem(itemId, supabase, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Catalog DELETE]', error);
    const status = error?.status === 400 || error?.status === 404 ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}, 'HostCatalogDELETE');
