// Staff actions against members and content: mute, shadow-ban, revoke or reinstate a visa, hide a
// message, story, Common Room post or comment. Each one is logged with the staff member who took it.
import { fail, must } from '../http';
import { cleanText } from '../identity/identity-rules';
import { logModeration } from './moderation-log';

export type MemberAction = 'mute' | 'unmute' | 'shadow_ban' | 'unshadow_ban' | 'revoke' | 'reinstate';
const MAX_MUTE_MINUTES = 30 * 24 * 60;

function patchFor(action: MemberAction, minutes: number, now: Date): Record<string, unknown> {
  switch (action) {
    case 'mute': return { muted_until: new Date(now.getTime() + minutes * 60_000).toISOString() };
    case 'unmute': return { muted_until: null };
    case 'shadow_ban': return { shadow_banned: true };
    case 'unshadow_ban': return { shadow_banned: false };
    case 'revoke': return { status: 'revoked' };
    case 'reinstate': return { status: 'approved' };
  }
}

export async function actOnMember(db: any, staffId: string, userId: string, body: Record<string, any>, now = new Date()) {
  const action = String(body.action || '') as MemberAction;
  if (!['mute', 'unmute', 'shadow_ban', 'unshadow_ban', 'revoke', 'reinstate'].includes(action)) fail(400, 'Unknown action.');
  const minutes = Math.round(Number(body.minutes) || 60);
  if (action === 'mute' && (minutes < 1 || minutes > MAX_MUTE_MINUTES)) fail(400, 'Mute for between 1 minute and 30 days.');
  if (userId === staffId) fail(400, 'You cannot moderate yourself.');

  let q = db.from('viber_profiles').update(patchFor(action, minutes, now)).eq('user_id', userId);
  if (action === 'reinstate') q = q.eq('status', 'revoked');
  if (action === 'revoke') q = q.eq('status', 'approved');
  const rows = must(await q.select('user_id, status, muted_until, shadow_banned')) as any[];
  if (rows.length === 0) fail(409, action === 'reinstate' ? 'Only a revoked visa can be reinstated.' : 'That member cannot take this action now.');

  if (action === 'revoke') must(await db.from('club_presence').delete().eq('user_id', userId));
  if (action === 'shadow_ban') {
    must(await db.from('club_stories').update({ hidden: true }).eq('user_id', userId).gt('expires_at', now.toISOString()));
    // Common Room posts too; a database without the Common Room yet simply has none to hide.
    const posts = await db.from('club_posts').update({ hidden: true }).eq('author_id', userId).is('deleted_at', null);
    if (posts.error && !['42P01', 'PGRST205'].includes(posts.error.code)) throw posts.error;
    const meetups = await db.from('club_meetups').update({ hidden: true }).eq('host_id', userId);
    if (meetups.error && !['42P01', 'PGRST205'].includes(meetups.error.code)) throw meetups.error;
  }
  await logModeration(db, { actorId: staffId, action, targetUserId: userId, note: cleanText(body.note, 500) });
  return rows[0];
}

const HIDEABLE: Record<string, string> = { message: 'club_messages', story: 'club_stories', post: 'club_posts', comment: 'club_post_comments', meetup: 'club_meetups' };

export async function hideContent(db: any, staffId: string, kind: unknown, id: string, hidden = true) {
  const table = typeof kind === 'string' ? HIDEABLE[kind] : undefined;
  if (!table) fail(400, 'Only messages, stories, posts, comments and meetups can be hidden.');
  const rows = must(await db.from(table).update({ hidden }).eq('id', id).select('id')) as any[];
  if (rows.length === 0) fail(404, 'Not found.');
  await logModeration(db, { actorId: staffId, action: hidden ? `hide_${kind}` : `unhide_${kind}`, targetType: String(kind), targetId: id });
}
