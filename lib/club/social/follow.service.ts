// The follow graph: members follow members (Instagram-style). Followers and following are public counts;
// only approved members can be followed. You cannot follow yourself.
import { fail, must } from '../http';
import { publicMembers } from '../membership/members';
import { signMedia } from '../media';
import { allRows } from '../rows';
import type { ViberProfile } from '../types';

export interface Counts { followers: number; following: number }

export async function followingIds(db: any, userId: string): Promise<string[]> {
  const rows = await allRows(() => db.from('club_follows').select('followee_id').eq('follower_id', userId).order('followee_id'));
  return rows.map((r) => r.followee_id);
}

export async function followCounts(db: any, userId: string): Promise<Counts> {
  const [followers, following] = await Promise.all([
    allRows(() => db.from('club_follows').select('follower_id').eq('followee_id', userId).order('follower_id')),
    allRows(() => db.from('club_follows').select('followee_id').eq('follower_id', userId).order('followee_id')),
  ]);
  return { followers: followers.length, following: following.length };
}

export async function isFollowing(db: any, viewerId: string, memberId: string): Promise<boolean> {
  const row = must(await db.from('club_follows').select('followee_id').eq('follower_id', viewerId).eq('followee_id', memberId).maybeSingle());
  return Boolean(row);
}

/** Follow or unfollow an approved member. Returns whether you follow them now and their counts. */
export async function setFollow(db: any, follower: ViberProfile, memberId: string, on: boolean) {
  if (follower.user_id === memberId) fail(400, 'You cannot follow yourself.');
  const target = must(await db.from('viber_profiles').select('user_id').eq('user_id', memberId).eq('status', 'approved').maybeSingle());
  if (!target) fail(404, 'Member not found.');
  if (on) {
    const res = await db.from('club_follows').insert({ follower_id: follower.user_id, followee_id: memberId });
    if (res.error && res.error.code !== '23505') throw res.error;
  } else {
    must(await db.from('club_follows').delete().eq('follower_id', follower.user_id).eq('followee_id', memberId));
  }
  return { following: on, counts: await followCounts(db, memberId) };
}

/** Followers or following of a member, with whether you follow each of them. */
export async function networkOf(db: any, memberId: string, viewerId: string, list: 'followers' | 'following') {
  const owner = must(await db.from('viber_profiles').select('user_id').eq('user_id', memberId).eq('status', 'approved').maybeSingle());
  if (!owner) fail(404, 'Member not found.');
  const ids = list === 'followers'
    ? (await allRows(() => db.from('club_follows').select('follower_id').eq('followee_id', memberId).order('follower_id'))).map((r) => r.follower_id)
    : await followingIds(db, memberId);
  const members = await publicMembers(db, ids);
  const mine = new Set(await followingIds(db, viewerId));
  const urls = await signMedia(db, members.map((m) => m.avatar_url));
  return members
    .map((m) => ({ ...m, avatar_url: m.avatar_url ? urls.get(m.avatar_url) ?? null : null, follows: mine.has(m.user_id), is_viewer: m.user_id === viewerId }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
