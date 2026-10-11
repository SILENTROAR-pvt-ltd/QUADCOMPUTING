import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok } from '@/lib/club/http';
import { listCategories } from '@/lib/club/categories.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/categories — business categories open for applications and listings. */
export const GET = clubApi('Categories', async () => {
  const categories = await listCategories(adminDb());
  return ok({ categories: categories.map(({ slug, label }) => ({ slug, label })) });
});
