// Stories: 24-hour images or short clips. A member checked in at a verified partner property gets
// a verified-stay badge on what they post there.
import { fail, must } from './http';
import { maskProfanity } from './identity/profanity';
import { currentPartnerStay } from './qc-bridge';
import { publicMembers } from './membership/members';
import { signMedia } from './media';
import type { ViberProfile } from './types';

export async function postStory(db: any, author: ViberProfile, body: Record<string, any>) {
  const path = typeof body.media_path === 'string' ? body.media_path : '';
  if (!path.startsWith(`stories/${author.user_id}/`)) fail(400, 'Upload the photo or clip first.');
  const mediaType = /\.(mp4|webm|mov)$/i.test(path) ? 'video' : 'image';
  const caption = typeof body.caption === 'string' ? maskProfanity(body.caption.trim()).slice(0, 300) || null : null;
  const stay = await currentPartnerStay(db, author.viber_id, author.phone);
  return must(await db.from('club_stories').insert({
    user_id: author.user_id, media_path: path, media_type: mediaType, caption, verified_stay: Boolean(stay),
    stay_business_id: stay, hidden: Boolean(author.shadow_banned), expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
  }).select('id, media_type, caption, verified_stay, expires_at, created_at').single());
}

/** Live stories grouped by member, newest member first; the viewer's own are always included. */
export async function liveStories(db: any, viewerId: string, now = new Date()) {
  const rows = (must(await db.from('club_stories').select('id, user_id, media_path, media_type, caption, verified_stay, hidden, expires_at, created_at')
    .gt('expires_at', now.toISOString()).order('created_at', { ascending: false }).limit(200)) as any[])
    .filter((s) => !s.hidden || s.user_id === viewerId);
  const members = new Map((await publicMembers(db, rows.map((s) => s.user_id))).map((m) => [m.user_id, m]));
  const urls = await signMedia(db, [...rows.map((s) => s.media_path), ...Array.from(members.values()).map((m) => m.avatar_url)]);

  const groups = new Map<string, any>();
  for (const s of rows) {
    const member = members.get(s.user_id);
    if (!member) continue;
    if (!groups.has(s.user_id)) groups.set(s.user_id, { member: { ...member, avatar_url: member.avatar_url ? urls.get(member.avatar_url) ?? null : null }, stories: [] });
    groups.get(s.user_id).stories.push({
      id: s.id, media_type: s.media_type, url: urls.get(s.media_path) ?? null, caption: s.caption, verified_stay: s.verified_stay,
      created_at: s.created_at, mine: s.user_id === viewerId,
    });
  }
  return Array.from(groups.values());
}

export async function deleteStory(db: any, userId: string, storyId: string) {
  const rows = must(await db.from('club_stories').update({ expires_at: new Date().toISOString() })
    .eq('id', storyId).eq('user_id', userId).select('id')) as any[];
  if (rows.length === 0) fail(404, 'Story not found.');
}
