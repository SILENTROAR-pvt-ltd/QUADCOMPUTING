import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, idParam, ok, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { loadProperty, updateProperty } from '@/lib/club/marketplace/properties.service';
import { publicMembers } from '@/lib/club/membership/members';
import { signMedia } from '@/lib/club/media';

export const dynamic = 'force-dynamic';

/** GET /api/club/properties/:id — a verified listing (owners and staff also see pending ones). */
export const GET = clubApi('Property', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const property = await loadProperty(db, await idParam(ctx));
  const mine = property.owner_id === user.id;
  if (property.status !== 'verified' && !mine && !(await staffRole(db, user))) fail(404, 'Property not found.');
  const [owner] = await publicMembers(db, [property.owner_id]);
  const urls = await signMedia(db, property.photo_paths);
  return ok({
    property: { ...property, photos: property.photo_paths.map((p: string) => urls.get(p)).filter(Boolean), photo_paths: mine ? property.photo_paths : [] },
    owner: owner ?? null,
    mine,
  });
});

/** PATCH /api/club/properties/:id — the owner edits the listing; it goes back to staff for review. */
export const PATCH = clubApi('UpdateProperty', async (request, ctx) => {
  const db = adminDb();
  const { profile } = await requireMember(db, { speak: true });
  return ok({ property: await updateProperty(db, profile, await idParam(ctx), await readBody(request)) });
});
