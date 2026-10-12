import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, must, ok, readBody } from '@/lib/club/http';
import { loadProfile, PROFILE_COLUMNS, requireMember, sessionUser, staffRole } from '@/lib/club/auth';
import { existingViberId } from '@/lib/club/membership/identity.service';
import { unreadNotificationCount } from '@/lib/club/notifications.service';
import { usernamePatch } from '@/lib/club/membership/username.service';
import { checkAlias, cleanText } from '@/lib/club/identity/identity-rules';
import { cleanBio, cleanSocialLinks, cleanTravelerKinds } from '@/lib/club/identity/profile-details';
import { containsProfanity } from '@/lib/club/identity/profanity';
import { signMedia } from '@/lib/club/media';

export const dynamic = 'force-dynamic';

/** GET /api/club/me — who is signed in (same login as QC), their Club application or membership, and staff role. */
export const GET = clubApi('Me', async () => {
  const user = await sessionUser();
  if (!user) return ok({ signedIn: false });
  const db = adminDb();
  const profile = await loadProfile(db, user.id);
  const [viberId, role, unread, urls] = await Promise.all([
    existingViberId(db, user.id),
    staffRole(db, user),
    profile?.status === 'approved' ? unreadNotificationCount(db, user.id) : Promise.resolve(0),
    signMedia(db, [profile?.avatar_url]),
  ]);
  return ok({
    signedIn: true,
    user: { id: user.id, email: user.email ?? null },
    viberId,
    staffRole: role,
    unreadNotifications: unread,
    profile: profile ? { ...profile, dob: undefined, avatar_url: profile.avatar_url ? urls.get(profile.avatar_url) ?? null : null } : null,
  });
});

/** PATCH /api/club/me — a member edits their vibe line, club name (alias, masked or not), username and details. */
export const PATCH = clubApi('MeUpdate', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db);
  const body = await readBody(request);
  const patch: Record<string, unknown> = {};
  if ('vibe_line' in body) {
    const line = cleanText(body.vibe_line, 120);
    if (line && containsProfanity(line)) fail(400, 'Please rephrase your vibe line.');
    patch.vibe_line = line;
  }
  if ('bio' in body) {
    const bio = cleanBio(body.bio);
    if (!bio.ok) fail(400, bio.error);
    if (bio.value && containsProfanity(bio.value)) fail(400, 'Please rephrase your bio.');
    patch.bio = bio.value;
  }
  if ('alias' in body) {
    const alias = checkAlias(body.alias);
    if (!alias.ok) fail(400, alias.error);
    patch.alias = alias.alias;
    patch.alias_masked = Boolean(alias.alias && body.alias_masked);
  }
  if ('club_username' in body) Object.assign(patch, await usernamePatch(db, profile, body.club_username));
  if ('traveler_kinds' in body) {
    const kinds = cleanTravelerKinds(body.traveler_kinds);
    if (!kinds.ok) fail(400, kinds.error);
    patch.traveler_kinds = kinds.value;
  }
  if ('social' in body) {
    const social = cleanSocialLinks(body.social);
    if (!social.ok) fail(400, social.error);
    patch.social_links = social.value;
  }
  const res = await db.from('viber_profiles').update(patch).eq('user_id', user.id).select(PROFILE_COLUMNS).single();
  if (res.error?.code === '23505') {
    const usernameOnly = 'club_username' in patch && !('alias' in patch);
    fail(409, usernameOnly ? 'That username is taken. Please choose another.' : 'That club name is taken. Please choose another.');
  }
  return ok({ profile: must(res) });
});
