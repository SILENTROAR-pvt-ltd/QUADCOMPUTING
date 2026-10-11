import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, must, ok, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { logModeration } from '@/lib/club/moderation/moderation-log';

export const dynamic = 'force-dynamic';

/** POST /api/club/admin/staff { viber_id, role: club_admin|super_admin|null } — super admins grant or remove staff. */
export const POST = clubApi('AdminStaff', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db, 'super_admin');
  const body = await readBody(request);
  const handle = `@${String(body.viber_id || '').trim().replace(/^@+/, '').toLowerCase()}`;
  const account = must(await db.from('vibers_accounts').select('user_id').eq('handle', handle).maybeSingle()) as any;
  if (!account) fail(404, 'No Vibers account has that Viber ID.');
  if (account.user_id === user.id) fail(400, 'You cannot change your own role.');
  if (body.role === null || body.role === 'none') {
    must(await db.from('club_staff').delete().eq('user_id', account.user_id));
  } else if (body.role === 'club_admin' || body.role === 'super_admin') {
    must(await db.from('club_staff').upsert([{ user_id: account.user_id, role: body.role, created_by: user.id }], { onConflict: 'user_id' }));
  } else {
    fail(400, 'Choose club_admin, super_admin or none.');
  }
  await logModeration(db, { actorId: user.id, action: `staff_${body.role ?? 'none'}`, targetUserId: account.user_id });
  return ok();
});
