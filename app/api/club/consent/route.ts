import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { activeConsent } from '@/lib/club/events/events.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/consent — the current responsibility and consent agreement creators sign. */
export const GET = clubApi('Consent', async () => {
  const db = adminDb();
  await requireMember(db);
  return ok({ consent: await activeConsent(db) });
});
