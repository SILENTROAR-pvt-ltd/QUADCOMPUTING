// Cleans and stores a guest's review. Stored text is capped, and "verified" is never taken from the client.

export interface ReviewInput {
  author: string;
  rating: number;
  comment: string;
  tags: string[];
  images: string[];
}

export function cleanReviewInput(body: any): ReviewInput {
  return {
    author: String(body.author || 'Guest').trim().slice(0, 60) || 'Guest',
    rating: Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5))),
    comment: String(body.comment || '').slice(0, 1000),
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 10).map((t: unknown) => String(t).slice(0, 30)) : [],
    images: Array.isArray(body.images) ? body.images.slice(0, 5).map((u: unknown) => String(u).slice(0, 500)) : [],
  };
}

/** The insert is the source of truth: a failure must surface, never report a review that was not saved. */
export async function insertVenueReview(
  db: any,
  businessId: string,
  tableNumber: string,
  input: ReviewInput,
  accountId: string | null
): Promise<string> {
  const { data, error } = await db
    .from('venue_reviews')
    .insert({
      business_id: businessId,
      author: input.author,
      // Only signed-in reviews name the column, so anonymous reviews save before it exists.
      ...(accountId ? { author_account_id: accountId } : {}),
      table_number: tableNumber,
      rating: input.rating,
      comment: input.comment,
      tags: input.tags,
      images: input.images,
      verified: false,
      helpful_count: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data.id as string;
}
