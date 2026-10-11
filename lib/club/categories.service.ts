// Business categories (Hotel, Cafe, Restaurant, …) are records staff manage, not a fixed list.
import { fail, must } from './http';
import { cleanText } from './identity/identity-rules';

export async function listCategories(db: any, includeInactive = false) {
  let q = db.from('business_categories').select('id, slug, label, active, sort');
  if (!includeInactive) q = q.eq('active', true);
  return must(await q.order('sort', { ascending: true })) as Array<{ id: string; slug: string; label: string; active: boolean; sort: number }>;
}

export async function upsertCategory(db: any, body: Record<string, any>) {
  const label = cleanText(body.label, 40);
  if (!label) fail(400, 'Enter a category name.');
  const slug = String(body.slug || label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
  if (slug.length < 2) fail(400, 'The category name is too short.');
  const row = { slug, label, active: body.active !== false, sort: Math.round(Number(body.sort) || 0) };
  const res = await db.from('business_categories').upsert([row], { onConflict: 'slug' }).select('id, slug, label, active, sort').single();
  return must(res);
}
