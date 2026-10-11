import { adminDb } from '@/lib/supabase/admin';
import { clubApi, must, ok, query, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { PROPERTY_COLUMNS, reviewProperty } from '@/lib/club/marketplace/properties.service';
import { signMedia } from '@/lib/club/media';

export const dynamic = 'force-dynamic';

/** GET /api/club/admin/properties?status=pending — listings waiting for verification. */
export const GET = clubApi('AdminProperties', async (request) => {
  const db = adminDb();
  await requireStaff(db);
  const status = query(request).get('status') || 'pending';
  const rows = must(await db.from('property_marketplace').select(PROPERTY_COLUMNS).eq('status', status)
    .order('created_at', { ascending: true }).limit(100)) as any[];
  const urls = await signMedia(db, rows.flatMap((p) => p.photo_paths.slice(0, 3)));
  return ok({ properties: rows.map((p) => ({ ...p, photos: p.photo_paths.slice(0, 3).map((x: string) => urls.get(x)).filter(Boolean) })) });
});

/** POST /api/club/admin/properties { property_id, decision: verified|rejected|suspended, note? } */
export const POST = clubApi('AdminReviewProperty', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db);
  const body = await readBody(request);
  return ok({ property: await reviewProperty(db, user.id, String(body.property_id || ''), body.decision, body.note) });
});
