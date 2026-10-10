// The venue's reviews as the guest app shows them. A signed-in reviewer's current name and photo
// are read from their account; older reviews keep the name typed when they were written.
import { loadReviewAuthors } from './review-authors';

export async function listVenueReviews(db: any, businessId: string) {
  const { data, error } = await db
    .from('venue_reviews')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = data || [];
  const authors = await loadReviewAuthors(db, rows.map((r: any) => r.author_account_id));
  return rows.map((r: any) => {
    const author = authors.get(r.author_account_id);
    return {
      id: r.id,
      author: author?.name ?? r.author,
      authorHandle: author?.handle ?? null,
      avatarEmoji: author?.avatar ?? null,
      avatarUrl: author?.avatar_url ?? null,
      table: r.table_number,
      rating: Number(r.rating || 5),
      comment: r.comment,
      tags: r.tags || [],
      images: r.images || [],
      verified: r.verified ?? true,
      helpfulCount: Number(r.helpful_count || 0),
      timestamp: r.created_at
        ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recently',
    };
  });
}
