import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { listCategories, upsertCategory } from '@/lib/club/categories.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/admin/categories — all business categories, including retired ones. */
export const GET = clubApi('AdminCategories', async () => {
  const db = adminDb();
  await requireStaff(db);
  return ok({ categories: await listCategories(db, true) });
});

/** POST /api/club/admin/categories { label, slug?, active?, sort? } — add, rename or retire a category. */
export const POST = clubApi('AdminCategory', async (request) => {
  const db = adminDb();
  await requireStaff(db);
  return ok({ category: await upsertCategory(db, await readBody(request)) });
});
