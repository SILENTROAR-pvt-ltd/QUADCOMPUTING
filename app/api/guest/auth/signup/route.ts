import { NextResponse } from 'next/server';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

/**
 * Retired. Guests now create one Vibers account (the same login as QC) that works at every property;
 * see /api/guest/auth/vibers-profile. A property-only @handle + PIN account can no longer be created.
 */
export const POST = withApiErrorBoundary(async function POST() {
  return NextResponse.json(
    { success: false, error: 'Create your Vibers account with your email and password instead. It works at every property.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}, 'GuestAuthSignup');
