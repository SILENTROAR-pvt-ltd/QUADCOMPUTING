import { adminDb } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { clubApi, fail, ok, query } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { readUpload, signMedia, storeMedia } from '@/lib/club/media';

export const dynamic = 'force-dynamic';

const FOLDERS: Record<string, Array<'image' | 'video'>> = {
  chat: ['image'], stories: ['image', 'video'], events: ['image'], meetups: ['image'], properties: ['image'], avatars: ['image'],
};

/**
 * POST /api/club/uploads?kind=chat|stories|events|meetups|properties|avatars — the raw file as the body.
 * Returns its storage path (to attach to a message, story, plan or listing) and a preview URL.
 */
export const POST = clubApi('Upload', async (request) => {
  const db = adminDb();
  const { user, profile } = await requireMember(db, { speak: true });
  const kind = query(request).get('kind') || '';
  const allow = FOLDERS[kind];
  if (!allow) fail(400, 'Unknown upload type.');
  if (kind === 'properties' && profile.account_type !== 'business') fail(403, 'Only business members can upload property photos.');
  const limited = await enforceRateLimit(request, 'club_upload', 40, 10 * 60_000, user.id);
  if (limited) return limited;

  const { bytes, kind: media } = await readUpload(request, allow);
  const path = await storeMedia(db, kind, user.id, bytes, media);
  if (kind === 'avatars') await db.from('viber_profiles').update({ avatar_url: path }).eq('user_id', user.id);
  const urls = await signMedia(db, [path]);
  return ok({ path, url: urls.get(path) ?? null, type: media.type });
});
