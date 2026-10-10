import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { isPinSet } from '@/lib/services/security/venue-pin';
import { readLocks } from '@/lib/services/security/protected-modules';

export const dynamic = 'force-dynamic';

const SECRET_COLUMNS = ['admin_pin', 'staff_pin', 'admin_pin_hash', 'staff_pin_hash'];
const noStore = { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', Pragma: 'no-cache', Expires: '0' };

/**
 * The host's profile, their current venue (the one in the URL), its address, whether PINs are
 * set, the lock settings and the venue wallet. PINs and their hashes never leave the server.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { user, business, supabase } = auth;

    const [{ data: profile }, { data: location }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('locations').select('*').eq('business_id', business.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    let walletInfo: any = null;
    try {
      const { getOrProvisionVenueWallet } = await import('@/lib/services/wallet/venue-wallet.service');
      walletInfo = await getOrProvisionVenueWallet(supabase, business.id);
    } catch (wErr) {
      console.warn('[Profile GET] Wallet auto-provisioning deferred:', wErr);
    }

    const safeBusiness: Record<string, unknown> = { ...business };
    for (const k of SECRET_COLUMNS) delete safeBusiness[k];

    return NextResponse.json({
      success: true,
      profile: profile || {},
      business: safeBusiness,
      location: location || {},
      isAdminPinSet: isPinSet(business, 'admin'),
      isStaffPinSet: isPinSet(business, 'staff'),
      protected_modules: readLocks(business?.protected_modules),
      wallet: walletInfo?.wallet || null,
      subscription: walletInfo?.subscription || null,
    }, { headers: noStore });
  } catch (error: any) {
    console.error('[API Profile GET Error]', error);
    return NextResponse.json({ success: false, error: 'Could not load your profile.' }, { status: 500 });
  }
}, 'HostProfileGET');
