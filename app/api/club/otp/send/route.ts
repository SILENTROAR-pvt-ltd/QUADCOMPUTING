import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, ok, readBody } from '@/lib/club/http';
import { requireUser } from '@/lib/club/auth';
import { sendOtp } from '@/lib/club/otp/otp.service';
import { smsProvider } from '@/lib/club/otp/sms-providers';

export const dynamic = 'force-dynamic';

/** POST /api/club/otp/send { phone } — texts a 6-digit code to verify the applicant's mobile. */
export const POST = clubApi('OtpSend', async (request) => {
  const user = await requireUser();
  const limited = await enforceRateLimit(request, 'club_otp_send', 8, 60 * 60_000, user.id);
  if (limited) return limited;
  const body = await readBody(request);
  const { phone } = await sendOtp(adminDb(), user.id, body.phone, smsProvider());
  return ok({ phone: `+${phone.slice(0, 2)} •••••${phone.slice(-3)}` });
});
