// What members see of each other. A masked member shows only their club name (alias); their real name
// and handle stay hidden from everyone but staff. The public handle is the Club username when the member
// chose one, otherwise their Viber ID.
import { must } from '../http';
import type { PublicMember, ViberProfile } from '../types';

export const MEMBER_COLUMNS = 'user_id, viber_id, club_username, alias, alias_masked, generation, city, vibe_line, avatar_url, account_type, status, shadow_banned';

export function toPublicMember(p: Pick<ViberProfile, 'user_id' | 'viber_id' | 'club_username' | 'alias' | 'alias_masked' | 'generation' | 'city' | 'vibe_line' | 'avatar_url' | 'account_type'>, displayName: string | null): PublicMember {
  const masked = Boolean(p.alias_masked && p.alias);
  const handle = p.club_username || (p.viber_id ? p.viber_id.replace(/^@/, '') : null);
  return {
    user_id: p.user_id,
    name: masked ? (p.alias as string) : p.alias || displayName || handle || 'Member',
    handle: masked ? null : handle,
    generation: p.generation,
    city: p.city,
    vibe_line: p.vibe_line,
    avatar_url: p.avatar_url,
    account_type: p.account_type,
  };
}

/** Display names from the shared Vibers accounts, keyed by user id. */
export async function displayNames(db: any, userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = must(await db.from('vibers_accounts').select('user_id, display_name').in('user_id', userIds)) as any[];
  return new Map(rows.map((r) => [r.user_id, r.display_name]));
}

/** Approved members by id, as other members may see them. */
export async function publicMembers(db: any, userIds: string[]): Promise<PublicMember[]> {
  const ids = Array.from(new Set(userIds));
  if (ids.length === 0) return [];
  const rows = must(await db.from('viber_profiles').select(MEMBER_COLUMNS).in('user_id', ids).eq('status', 'approved')) as any[];
  const names = await displayNames(db, ids);
  return rows.map((r) => toPublicMember(r, names.get(r.user_id) ?? null));
}

/** Every approved member, read in pages (the API returns at most 1,000 rows per request). */
export async function approvedMemberIds(db: any, page = 1000): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += page) {
    const rows = must(await db.from('viber_profiles').select('user_id').eq('status', 'approved')
      .order('user_id').range(from, from + page - 1)) as any[];
    out.push(...rows.map((r) => r.user_id));
    if (rows.length < page) return out;
  }
}
