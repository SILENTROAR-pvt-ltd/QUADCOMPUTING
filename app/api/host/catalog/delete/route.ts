import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { executeCatalogDelete } from '@/lib/services/catalog-delete.service';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  return handleDelete(request, auth);
}, 'HostCatalogDeletePOST');

export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  return handleDelete(request, auth);
}, 'HostCatalogDeleteDELETE');

async function handleDelete(request: Request, auth: any) {
  try {
    const { businessId, supabase } = auth;

    const result = await executeCatalogDelete(request, supabase, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Catalog Delete Fatal Error]', error);
    const status = error.message?.includes('Missing') ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}
