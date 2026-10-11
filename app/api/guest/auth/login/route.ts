import { NextResponse } from 'next/server';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

/**
 * Retired. Guests sign in with their Vibers account (email + password, the same login as QC). An old
 * @handle + PIN account is brought across once, by entering its PIN while creating the Vibers profile.
 */
export const POST = withApiErrorBoundary(async function POST() {
  return NextResponse.json(
    { success: false, error: 'Sign in with your Vibers account email and password. Used a handle and PIN before? Create your account and enter that PIN once to bring your wallet.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}, 'GuestAuthLogin');
