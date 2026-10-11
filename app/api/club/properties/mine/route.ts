import { adminDb } from '@/lib/supabase/admin';
import { clubApi, must, ok } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { PROPERTY_COLUMNS } from '@/lib/club/marketplace/properties.service';
import { offersForOwner } from '@/lib/club/marketplace/agreements.service';
import { hostedVenues } from '@/lib/club/qc-bridge';
import { signMedia } from '@/lib/club/media';

export const dynamic = 'force-dynamic';

/** GET /api/club/properties/mine — the member's listings, offers on them, and QC venues they can link. */
export const GET = clubApi('MyProperties', async () => {
  const db = adminDb();
  const { user, profile } = await requireMember(db);
  if (profile.account_type !== 'business') return ok({ properties: [], offers: [], venues: [] });
  const [properties, offers, venues] = await Promise.all([
    db.from('property_marketplace').select(PROPERTY_COLUMNS).eq('owner_id', user.id).order('created_at', { ascending: false }).then(must),
    offersForOwner(db, user.id),
    hostedVenues(db, user.id),
  ]);
  const urls = await signMedia(db, (properties as any[]).map((p) => p.photo_paths[0]));
  return ok({ properties: (properties as any[]).map((p) => ({ ...p, photo: p.photo_paths[0] ? urls.get(p.photo_paths[0]) ?? null : null })), offers, venues });
});
