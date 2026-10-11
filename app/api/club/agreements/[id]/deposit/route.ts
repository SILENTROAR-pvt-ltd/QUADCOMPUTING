import { adminDb } from '@/lib/supabase/admin';
import { clubApi, idParam, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { startDeposit } from '@/lib/club/payments/checkout.service';
import { razorpayGateway } from '@/lib/club/payments/razorpay';

export const dynamic = 'force-dynamic';

/** POST /api/club/agreements/:id/deposit — the creator starts paying the deal deposit. */
export const POST = clubApi('Deposit', async (_request, ctx) => {
  const db = adminDb();
  const { profile } = await requireMember(db);
  return ok(await startDeposit(db, razorpayGateway(), profile, await idParam(ctx)));
});
