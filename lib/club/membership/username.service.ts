// The Club username: a public handle a member picks inside the Club, changeable once every
// USERNAME_COOLDOWN_DAYS. It is never the shared Viber ID.
import { fail, must } from '../http';
import { checkClubUsername, USERNAME_COOLDOWN_DAYS } from '../identity/identity-rules';
import type { ViberProfile } from '../types';

const DAY_MS = 86_400_000;

/**
 * The columns to write for a requested username, or {} when it is unchanged. Throws (409) while the
 * cooldown runs, or when the name is another member's Viber handle.
 */
export async function usernamePatch(
  db: any,
  profile: Pick<ViberProfile, 'club_username' | 'username_changed_at'>,
  raw: unknown,
  now = new Date(),
): Promise<Record<string, unknown>> {
  const name = checkClubUsername(raw);
  if (!name.ok) fail(400, name.error);
  if (name.username === (profile.club_username ?? null)) return {};

  const changed = profile.username_changed_at ? new Date(profile.username_changed_at).getTime() : 0;
  const again = changed + USERNAME_COOLDOWN_DAYS * DAY_MS;
  if (changed && again > now.getTime()) {
    const when = new Date(again).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    fail(409, `You can change your username again on ${when}.`, 'username_cooldown');
  }
  // Nobody may pose as another member's Viber account, so a Viber handle is never a Club username.
  if (name.username) {
    const clash = must(await db.from('vibers_accounts').select('user_id').eq('handle', `@${name.username}`).limit(1)) as any[];
    if (clash.length) fail(409, 'That username is taken. Please choose another.');
  }
  return { club_username: name.username, username_changed_at: now.toISOString() };
}
