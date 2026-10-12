// Live presence. The club home sends a heartbeat every 20 s while its tab is visible, and a leave
// when the tab is hidden or closed. Anyone without a heartbeat in the last 45 s is offline.
import { must } from './http';
import { publicMembers } from './membership/members';
import { signMedia } from './media';
import type { Generation, PublicMember } from './types';

export const PRESENCE_TIMEOUT_MS = 45_000;

export async function heartbeat(db: any, userId: string, now = new Date()) {
  must(await db.from('club_presence').upsert([{ user_id: userId, last_seen: now.toISOString() }], { onConflict: 'user_id' }));
}

export async function leave(db: any, userId: string) {
  must(await db.from('club_presence').delete().eq('user_id', userId));
}

export interface PresenceFilter { generation?: Generation | null; city?: string | null; q?: string | null }

/** Members online now, as the viewer may see them. Shadow-banned members are visible only to themselves. */
export async function onlineMembers(db: any, viewerId: string, filter: PresenceFilter = {}, now = new Date()): Promise<PublicMember[]> {
  const since = new Date(now.getTime() - PRESENCE_TIMEOUT_MS).toISOString();
  const rows = must(await db.from('club_presence').select('user_id').gte('last_seen', since).order('last_seen', { ascending: false }).limit(300)) as any[];
  const ids = rows.map((r) => r.user_id);
  if (ids.length === 0) return [];
  const hidden = new Set((must(await db.from('viber_profiles').select('user_id').in('user_id', ids).eq('shadow_banned', true)) as any[]).map((r) => r.user_id));
  const members = (await publicMembers(db, ids.filter((id) => !hidden.has(id) || id === viewerId)));

  const q = (filter.q || '').trim().toLowerCase().replace(/^@/, '');
  const city = (filter.city || '').trim().toLowerCase();
  const list = members.filter((m) =>
    (!filter.generation || m.generation === filter.generation) &&
    (!city || m.city.toLowerCase().includes(city)) &&
    (!q || m.name.toLowerCase().includes(q) || (m.handle || '').toLowerCase().includes(q)),
  );
  const urls = await signMedia(db, list.map((m) => m.avatar_url));
  return list.map((m) => ({ ...m, avatar_url: m.avatar_url ? urls.get(m.avatar_url) ?? null : null }));
}

/** The public landing's floating bubbles: first names or club names only, no IDs, no cities. */
export async function publicBubbles(db: any, now = new Date(), limit = 24) {
  const members = (await onlineMembers(db, '', {}, now)).slice(0, limit);
  return members.map((m) => ({ key: m.user_id.slice(0, 8), name: m.name.split(/\s+/)[0], generation: m.generation, avatar_url: m.avatar_url, vibe_line: m.vibe_line }));
}
