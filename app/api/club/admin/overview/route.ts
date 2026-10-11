import { adminDb } from '@/lib/supabase/admin';
import { clubApi, must, ok } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';

export const dynamic = 'force-dynamic';

const count = async (q: any) => (must(await q.limit(500)) as any[]).length;

/** GET /api/club/admin/overview — what is waiting for staff. */
export const GET = clubApi('AdminOverview', async () => {
  const db = adminDb();
  const { role } = await requireStaff(db);
  const [applications, events, properties, reports, payouts] = await Promise.all([
    count(db.from('viber_profiles').select('user_id').eq('status', 'pending')),
    count(db.from('club_events').select('id').eq('status', 'submitted')),
    count(db.from('property_marketplace').select('id').eq('status', 'pending')),
    count(db.from('club_reports').select('id').eq('status', 'open')),
    count(db.from('club_payouts').select('id').in('status', ['pending_approval', 'approved'])),
  ]);
  return ok({ role, waiting: { applications, events, properties, reports, payouts } });
});
