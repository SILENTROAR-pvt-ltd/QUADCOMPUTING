// Messages: profanity is starred out, a shadow-banned sender's messages are seen only by them (and
// staff), images are member uploads from this sender only, and pages load newest first.
import { fail, must } from '../http';
import { maskProfanity } from '../identity/profanity';
import { publicMembers } from '../membership/members';
import { signMedia } from '../media';
import type { ViberProfile } from '../types';

export const REACTIONS = ['❤️', '🔥', '😂', '👏', '🙌', '😮', '😢', '👍'];
const PAGE = 40;

export async function sendMessage(db: any, roomId: string, sender: ViberProfile, body: Record<string, any>) {
  const text = typeof body.body === 'string' ? maskProfanity(body.body.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim()).slice(0, 2000) : '';
  const image = typeof body.image_path === 'string' && body.image_path.startsWith(`chat/${sender.user_id}/`) ? body.image_path : null;
  if (!text && !image) fail(400, 'Write a message or attach a photo.');
  const row = must(await db.from('club_messages').insert({
    room_id: roomId, sender_id: sender.user_id, body: text, image_path: image, hidden: Boolean(sender.shadow_banned),
  }).select('id, room_id, sender_id, body, image_path, created_at').single());
  await markRead(db, roomId, sender.user_id);
  return row;
}

export async function listMessages(db: any, roomId: string, viewerId: string, opts: { before?: string | null; staff?: boolean } = {}) {
  let q = db.from('club_messages').select('id, room_id, sender_id, body, image_path, hidden, created_at')
    .eq('room_id', roomId).is('deleted_at', null).order('created_at', { ascending: false }).limit(PAGE);
  if (opts.before) q = q.lt('created_at', opts.before);
  const rows = (must(await q) as any[]).filter((m) => !m.hidden || m.sender_id === viewerId || opts.staff);

  const ids = rows.map((m) => m.id);
  const reactions = ids.length ? (must(await db.from('club_message_reactions').select('message_id, user_id, emoji').in('message_id', ids)) as any[]) : [];
  const senders = new Map((await publicMembers(db, rows.map((m) => m.sender_id))).map((m) => [m.user_id, m]));
  const urls = await signMedia(db, [...rows.map((m) => m.image_path), ...Array.from(senders.values()).map((s) => s.avatar_url)]);

  const messages = rows.map((m) => {
    const mine = reactions.filter((r) => r.message_id === m.id);
    const counts = REACTIONS.map((emoji) => ({ emoji, count: mine.filter((r) => r.emoji === emoji).length, mine: mine.some((r) => r.emoji === emoji && r.user_id === viewerId) }))
      .filter((r) => r.count > 0);
    const sender = senders.get(m.sender_id);
    return {
      id: m.id, body: m.body, created_at: m.created_at, mine: m.sender_id === viewerId, image_url: m.image_path ? urls.get(m.image_path) ?? null : null,
      sender: sender ? { ...sender, avatar_url: sender.avatar_url ? urls.get(sender.avatar_url) ?? null : null } : null, reactions: counts,
    };
  });
  return { messages: messages.reverse(), nextBefore: rows.length === PAGE ? rows[rows.length - 1].created_at : null };
}

export async function markRead(db: any, roomId: string, userId: string, now = new Date()) {
  const updated = must(await db.from('club_room_members').update({ last_read_at: now.toISOString() })
    .eq('room_id', roomId).eq('user_id', userId).select('user_id')) as any[];
  if (updated.length === 0) {
    const res = await db.from('club_room_members').insert({ room_id: roomId, user_id: userId, last_read_at: now.toISOString() });
    if (res.error && res.error.code !== '23505') throw res.error;
  }
}

/** Unread messages per room for this member (others' visible messages since they last read). */
export async function unreadCounts(db: any, userId: string): Promise<Record<string, number>> {
  const memberships = must(await db.from('club_room_members').select('room_id, last_read_at').eq('user_id', userId).limit(100)) as any[];
  const out: Record<string, number> = {};
  for (const m of memberships) {
    const rows = must(await db.from('club_messages').select('id').eq('room_id', m.room_id).neq('sender_id', userId)
      .eq('hidden', false).is('deleted_at', null).gt('created_at', m.last_read_at).limit(99)) as any[];
    if (rows.length) out[m.room_id] = rows.length;
  }
  return out;
}

export async function toggleReaction(db: any, messageId: string, userId: string, emoji: unknown, on: boolean) {
  if (!REACTIONS.includes(String(emoji))) fail(400, 'That reaction is not available.');
  if (!on) return must(await db.from('club_message_reactions').delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji));
  const res = await db.from('club_message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
  if (res.error && res.error.code !== '23505') throw res.error;
}
