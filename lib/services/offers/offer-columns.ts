// The live offers' columns, with the photo when the database has it. Until migration 20261022000005 adds image_url, a
// read or write that names it fails; it is then run again without it, so offers keep working without photos.
export const OFFER_COLUMNS = 'id, venue_id, title, description, category, discount_badge, valid_until, is_active, created_at, updated_at';
const WITH_IMAGE = `${OFFER_COLUMNS}, image_url`;

const missingImageColumn = (error: any) =>
  Boolean(error) && (error.code === '42703' || error.code === 'PGRST204' || /image_url/.test(String(error.message || '')));

/** Runs `query` with the photo column, and once more without it if this database does not have it yet. */
export async function withOfferImage<T>(query: (columns: string, hasImage: boolean) => PromiseLike<{ data: T; error: any }>): Promise<{ data: T; error: any }> {
  const first = await query(WITH_IMAGE, true);
  if (!missingImageColumn(first.error)) return first;
  return query(OFFER_COLUMNS, false);
}
