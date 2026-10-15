import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import {
  getAccommodationsCategories,
  createAccommodationCategory,
  deleteAccommodationCategory,
  updateAccommodationCategory,
} from '@/lib/services/accommodation.service';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { user, businessId, supabase } = auth;

    const result = await getAccommodationsCategories(supabase, user.id, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Accommodations Categories GET]', error);
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'AccommodationsCategoriesGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { user, businessId, supabase } = auth;

    const body = await request.json();
    const result = await createAccommodationCategory(body, supabase, user.id, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Accommodations Categories POST Error]', error);
    const status = error.message?.includes('required') ? 400 : 500;
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status });
  }
}, 'AccommodationsCategoriesPOST');

export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { user, businessId, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');
    if (!categoryId) return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });

    const result = await deleteAccommodationCategory(categoryId, supabase, user.id, businessId);
    return NextResponse.json(result, { status: result.success ? 200 : result.status || 400 });
  } catch (error: any) {
    console.error('[API Accommodations Categories DELETE Error]', error);
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'AccommodationsCategoriesDELETE');

export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { user, businessId, supabase } = auth;

    const body = await request.json();
    const result = await updateAccommodationCategory(body, supabase, user.id, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Accommodations Categories PATCH Error]', error);
    return NextResponse.json({ success: false, error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'AccommodationsCategoriesPATCH');

export const PUT = PATCH;
