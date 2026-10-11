import { adminDb } from '@/lib/supabase/admin';
import { clubApi, must, ok, query, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { listReports, resolveReport } from '@/lib/club/moderation/reports.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/admin/reports?status=open — the Red Flag queue, with a preview of each reported item. */
export const GET = clubApi('AdminReports', async (request) => {
  const db = adminDb();
  await requireStaff(db);
  const reports = await listReports(db, query(request).get('status') || 'open');
  const ids = (type: string) => reports.filter((r) => r.target_type === type).map((r) => r.target_id);
  const [messages, users] = await Promise.all([
    ids('message').length ? db.from('club_messages').select('id, sender_id, body, hidden').in('id', ids('message')).then(must) : [],
    ids('user').length ? db.from('viber_profiles').select('user_id, viber_id, status, muted_until, shadow_banned').in('user_id', ids('user')).then(must) : [],
  ]);
  return ok({
    reports: reports.map((r) => ({
      ...r,
      preview: r.target_type === 'message' ? (messages as any[]).find((m) => m.id === r.target_id) ?? null
        : r.target_type === 'user' ? (users as any[]).find((u) => u.user_id === r.target_id) ?? null : null,
    })),
  });
});

/** POST /api/club/admin/reports { report_id, outcome: actioned|dismissed, note? } */
export const POST = clubApi('AdminResolveReport', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db);
  const body = await readBody(request);
  return ok({ report: await resolveReport(db, user.id, String(body.report_id || ''), body.outcome, body.note) });
});
