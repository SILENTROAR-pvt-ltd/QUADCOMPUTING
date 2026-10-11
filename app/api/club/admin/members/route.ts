import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, must, ok, query, readBody } from '@/lib/club/http';
import { PROFILE_COLUMNS, requireStaff } from '@/lib/club/auth';
import { actOnMember, hideContent } from '@/lib/club/moderation/actions.service';
import { displayNames } from '@/lib/club/membership/members';

export const dynamic = 'force-dynamic';

/** GET /api/club/admin/members?q= — find a member by Viber ID or alias; staff see real identities. */
export const GET = clubApi('AdminMembers', async (request) => {
  const db = adminDb();
  await requireStaff(db);
  const q = (query(request).get('q') || '').trim().toLowerCase().replace(/[^a-z0-9_ @-]/g, '').slice(0, 30);
  let sel = db.from('viber_profiles').select(PROFILE_COLUMNS).neq('status', 'pending');
  if (q) sel = sel.or(`viber_id.ilike.*${q.replace(/^@/, '')}*,alias.ilike.*${q}*`);
  const rows = must(await sel.order('created_at', { ascending: false }).limit(50)) as any[];
  const names = await displayNames(db, rows.map((r) => r.user_id));
  return ok({ members: rows.map((r) => ({ ...r, display_name: names.get(r.user_id) ?? null })) });
});

/**
 * POST /api/club/admin/members
 *   { user_id, action: mute|unmute|shadow_ban|unshadow_ban|revoke|reinstate, minutes?, note? }
 *   { content: message|story, id, hidden }
 */
export const POST = clubApi('AdminModerate', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db);
  const body = await readBody(request);
  if (body.content) {
    if (typeof body.id !== 'string') fail(400, 'Choose what to hide.');
    await hideContent(db, user.id, body.content, body.id, body.hidden !== false);
    return ok();
  }
  return ok({ member: await actOnMember(db, user.id, String(body.user_id || ''), body) });
});
