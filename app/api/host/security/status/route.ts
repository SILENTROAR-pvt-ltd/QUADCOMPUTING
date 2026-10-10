import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { isPinSet } from '@/lib/services/security/venue-pin';
import { loadPinRow } from '@/lib/services/security/venue-pin.service';
import { readLocks } from '@/lib/services/security/protected-modules';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };

/** Whether master and staff PINs are set, and which sections the master PIN locks. Never the PINs. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const row = await loadPinRow(auth.businessId);
    const isAdminPinSet = isPinSet(row, 'admin');
    const isStaffPinSet = isPinSet(row, 'staff');
    return NextResponse.json({
      success: true,
      isAdminPinSet, isStaffPinSet,
      isAdminPinActive: isAdminPinSet, isStaffPinActive: isStaffPinSet, hasAdminPin: isAdminPinSet,
      protectedModules: readLocks(row?.protected_modules),
    }, { headers: noStore });
  } catch (error) {
    console.error('[API Security Status Error]', error);
    return NextResponse.json({ error: 'Internal Server Error', isAdminPinSet: false, isStaffPinSet: false, isAdminPinActive: false, hasAdminPin: false }, { status: 500 });
  }
}, 'HostSecurityStatusGET');
