import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, readBody } from '@/lib/club/http';
import { requireUser } from '@/lib/club/auth';
import { verifyOtp } from '@/lib/club/otp/otp.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/otp/verify { phone, code } — confirms the code; the phone counts as verified for 30 minutes. */
export const POST = clubApi('OtpVerify', async (request) => {
  const user = await requireUser();
  const limited = await enforceRateLimit(request, 'club_otp_verify', 10, 10 * 60_000, user.id);
  if (limited) return limited;
  const body = await readBody(request);
  await verifyOtp(adminDb(), user.id, body.phone, body.code);
  return ok({ verified: true });
});
