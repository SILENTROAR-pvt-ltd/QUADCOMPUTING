import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import {
  getHostTables,
  createHostTable,
  updateHostTable,
  deleteHostTable,
} from '@/lib/services/table.service';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

/**
 * GET /api/host/tables
 * Fetch all tables for the host's business.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const result = await getHostTables(request.url, supabase, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tables GET]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}, 'HostTablesGET');

/**
 * POST /api/host/tables
 * Create a new restaurant table.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { user, businessId, supabase } = auth;

    const body = await request.json();
    if (body.business_id && body.business_id !== businessId) {
      return NextResponse.json(
        { error: 'Forbidden: Business ID mismatch' },
        { status: 403 }
      );
    }

    const result = await createHostTable(body, user, supabase, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tables POST]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('required') ? 400 : 500 }
    );
  }
}, 'HostTablesPOST');

/**
 * PATCH /api/host/tables
 * Update table status or active state.
 */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { user, businessId, supabase } = auth;

    const body = await request.json();
    if (body.business_id && body.business_id !== businessId) {
      return NextResponse.json(
        { error: 'Forbidden: Business ID mismatch' },
        { status: 403 }
      );
    }

    const result = await updateHostTable(body, user, supabase, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tables PATCH]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('required') ? 400 : 500 }
    );
  }
}, 'HostTablesPATCH');

/**
 * DELETE /api/host/tables
 * Deactivate (soft-delete) a table.
 */
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { user, businessId, supabase } = auth;

    const body = await request.json();
    if (body.business_id && body.business_id !== businessId) {
      return NextResponse.json(
        { error: 'Forbidden: Business ID mismatch' },
        { status: 403 }
      );
    }

    const result = await deleteHostTable(body, user, supabase, businessId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tables DELETE]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}, 'HostTablesDELETE');
