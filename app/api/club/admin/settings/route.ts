import { adminDb } from '@/lib/supabase/admin';
import { clubApi, must, ok, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { getSettings, updateSetting } from '@/lib/club/settings';
import { displayNames } from '@/lib/club/membership/members';

export const dynamic = 'force-dynamic';

/** GET /api/club/admin/settings — platform fee, deposit share, payout approval, and the staff list. */
export const GET = clubApi('AdminSettings', async () => {
  const db = adminDb();
  const { role } = await requireStaff(db);
  const staff = must(await db.from('club_staff').select('user_id, role, created_at')) as any[];
  const names = await displayNames(db, staff.map((s) => s.user_id));
  return ok({ role, settings: await getSettings(db), staff: staff.map((s) => ({ ...s, display_name: names.get(s.user_id) ?? null })) });
});

/** POST /api/club/admin/settings { key, value } — super admins only. */
export const POST = clubApi('AdminSetting', async (request) => {
  const db = adminDb();
  await requireStaff(db, 'super_admin');
  const body = await readBody(request);
  await updateSetting(db, body.key, body.value);
  return ok({ settings: await getSettings(db) });
});
