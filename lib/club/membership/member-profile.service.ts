// A member's travel profile as other members see it: public identity (masked if they chose so),
// member since, online now, counts of posts, plans hosted and plans joined, and upcoming plans hosted.
// A shadow-banned member's profile is visible only to themself.
import { fail, must } from '../http';
import { signMedia } from '../media';
import { PRESENCE_TIMEOUT_MS } from '../presence.service';
import { followCounts, isFollowing } from '../social/follow.service';
import { publicMembers } from './members';

/** Errors from a table that is not created yet (an older Club database) count as "nothing there". */
const MISSING = new Set(['42P01', 'PGRST205']);

async function countRows(make: () => any): Promise<number> {
  let total = 0;
  for (let from = 0; ; from += 1000) {
    const res = await make().range(from, from + 999);
    if (res.error) {
      if (MISSING.has(res.error.code)) return total;
      throw res.error;
    }
    total += res.data.length;
    if (res.data.length < 1000) return total;
  }
}

export async function memberProfile(db: any, memberId: string, viewerId: string, now = new Date()) {
  // Followers and following are public, as on Instagram; `follows` says whether you follow them.
  const [network, follows] = await Promise.all([
    followCounts(db, memberId),
    memberId === viewerId ? Promise.resolve(false) : isFollowing(db, viewerId, memberId),
  ]);
  const row = must(await db.from('viber_profiles').select('user_id, status, shadow_banned, business_name, reviewed_at, created_at, traveler_kinds, social_links, bio')
    .eq('user_id', memberId).maybeSingle()) as any;
  const self = memberId === viewerId;
  if (!row || row.status !== 'approved' || (row.shadow_banned && !self)) fail(404, 'Member not found.');
  const [member] = await publicMembers(db, [memberId]);
  if (!member) fail(404, 'Member not found.');

  const [posts, hosted, joined, presence, upcoming] = await Promise.all([
    countRows(() => {
      const q = db.from('club_posts').select('id').eq('author_id', memberId).is('deleted_at', null);
      return (self ? q : q.eq('hidden', false)).order('id');
    }),
    countRows(() => db.from('club_events').select('id').eq('creator_id', memberId).in('status', ['approved', 'completed']).order('id')),
    countRows(() => db.from('club_event_participants').select('event_id').eq('user_id', memberId).neq('status', 'cancelled').order('event_id')),
    db.from('club_presence').select('last_seen').eq('user_id', memberId).maybeSingle().then(must),
    db.from('club_events').select('id, title, kind, starts_at, venue, cover_paths').eq('creator_id', memberId).eq('status', 'approved')
      .gt('ends_at', now.toISOString()).order('starts_at', { ascending: true }).limit(6).then(must),
  ]);
  const plans = upcoming as any[];
  const urls = await signMedia(db, [member.avatar_url, ...plans.map((p) => p.cover_paths?.[0])]);
  const lastSeen = (presence as { last_seen: string } | null)?.last_seen;

  return {
    member: { ...member, avatar_url: member.avatar_url ? urls.get(member.avatar_url) ?? null : null },
    business_name: member.account_type === 'business' ? row.business_name : null,
    since: row.reviewed_at || row.created_at,
    online: Boolean(lastSeen && now.getTime() - Date.parse(lastSeen) < PRESENCE_TIMEOUT_MS),
    self,
    follows,
    network,
    details: { kinds: row.traveler_kinds ?? [], social: row.social_links ?? {}, bio: row.bio ?? null },
    stats: { posts, hosted, joined },
    plans: plans.map((p) => ({ id: p.id, title: p.title, kind: p.kind, starts_at: p.starts_at, venue: p.venue, cover: p.cover_paths?.[0] ? urls.get(p.cover_paths[0]) ?? null : null })),
  };
}
