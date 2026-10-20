import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { verifyRedemptionCode } from '@/lib/services/wallet/redemption.service';
import { WalletStoreError } from '@/lib/services/wallet/cashback.service';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const body = await request.json();
    // The venue is the signed-in session's, whatever the body names. verifyRedemptionCode resolves the venue from
    // business_id first, so both names are bound here; a code of another venue then fails its venue check.
    if ((body.cafe_id && body.cafe_id !== businessId) || (body.business_id && body.business_id !== businessId)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Business mismatch' }, { status: 403 });
    }
    body.cafe_id = businessId;
    body.business_id = businessId;

    // Not replayed from the idempotency cache: a cached "verified" answer would outlive the
    // code being used on a bill. verifyRedemptionCode is itself safe to repeat (its status
    // change is conditional), so each call reads the live row.
    const result = await verifyRedemptionCode(adminDb(), body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[API Host Wallet Redeem POST]', error);
    if (error instanceof WalletStoreError) {
      return NextResponse.json({ success: false, error: 'Wallet is temporarily unavailable. Please try again.', code: error.code }, { status: 503 });
    }
    return NextResponse.json({ success: false, error: 'Could not verify the code. Please try again.' }, { status: 500 });
  }
}, 'HostWalletRedeemPOST');

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const db = adminDb();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const tableNumber = searchParams.get('table_number');
    const nowIso = new Date().toISOString();

    if (code) {
      const { data, error } = await db
        .from('wallet_redemptions')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('business_id', businessId)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ success: true, redemption: data || null });
    }

    const { data: active, error } = await db
      .from('wallet_redemptions')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['pending', 'verified'])
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    if (tableNumber) {
      const strip = (t: string) => t.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
      const normT = strip(tableNumber);
      const match = (active || []).find((rec: any) => strip(rec.table_number || '') === normT) || null;
      return NextResponse.json({ success: true, redemption: match });
    }

    return NextResponse.json({ success: true, count: active?.length ?? 0 });
  } catch (error: any) {
    console.error('[API Host Wallet Redeem GET]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}, 'HostWalletRedeemGET');
