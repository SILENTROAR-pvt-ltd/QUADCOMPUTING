import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, must, ok, query, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { approveApplication, listApplications, rejectApplication } from '@/lib/club/membership/review.service';
import { displayNames } from '@/lib/club/membership/members';
import { ageOn } from '@/lib/club/identity/identity-rules';

export const dynamic = 'force-dynamic';

const STATUSES = new Set(['pending', 'approved', 'rejected', 'revoked']);

/** GET /api/club/admin/applications?status= — applications with real identity (staff only). */
export const GET = clubApi('AdminApplications', async (request) => {
  const db = adminDb();
  await requireStaff(db);
  const status = query(request).get('status') || 'pending';
  const rows = await listApplications(db, STATUSES.has(status) ? status : 'pending', 100);
  const ids = rows.map((r) => r.user_id);
  const names = await displayNames(db, ids);
  const cats = ids.length ? (must(await db.from('viber_profile_categories').select('user_id, category_id').in('user_id', ids)) as any[]) : [];
  const labels = cats.length ? (must(await db.from('business_categories').select('id, label').in('id', cats.map((c) => c.category_id))) as any[]) : [];
  const label = new Map(labels.map((l) => [l.id, l.label]));
  return ok({
    applications: rows.map((r) => ({
      ...r, display_name: names.get(r.user_id) ?? null, age: ageOn(r.dob),
      categories: cats.filter((c) => c.user_id === r.user_id).map((c) => label.get(c.category_id)).filter(Boolean),
    })),
  });
});

/** POST /api/club/admin/applications { user_id, decision: approve|reject, note? } */
export const POST = clubApi('AdminReviewApplication', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db);
  const body = await readBody(request);
  const userId = String(body.user_id || '');
  if (body.decision === 'approve') return ok({ profile: await approveApplication(db, user.id, userId) });
  if (body.decision === 'reject') return ok({ profile: await rejectApplication(db, user.id, userId, body.note) });
  fail(400, 'Choose approve or reject.');
});
