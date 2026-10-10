import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { cleanReviewInput, insertVenueReview } from '@/lib/services/reviews/review-write';

const VENUE = 'aaaaaaaa-1111-4222-8333-444444444444';

describe('Venue reviews: what a guest may submit', () => {
  it('bounds the rating, text, tags and photos, and defaults the author', () => {
    const clean = cleanReviewInput({
      rating: 9,
      comment: 'x'.repeat(1500),
      tags: Array.from({ length: 12 }, () => 'y'.repeat(40)),
      images: Array.from({ length: 7 }, () => 'z'.repeat(600)),
      author: '   ',
    });
    expect(clean.rating).toBe(5);
    expect(clean.comment).toHaveLength(1000);
    expect(clean.tags).toHaveLength(10);
    expect(clean.tags[0]).toHaveLength(30);
    expect(clean.images).toHaveLength(5);
    expect(clean.images[0]).toHaveLength(500);
    expect(clean.author).toBe('Guest');
  });

  it('defaults a missing or invalid rating to 5 and rejects non-list tags', () => {
    const clean = cleanReviewInput({ rating: 'abc', tags: 'quiet', images: null });
    expect(clean.rating).toBe(5);
    expect(clean.tags).toEqual([]);
    expect(clean.images).toEqual([]);
  });
});

describe('Venue reviews: saving', () => {
  const input = { author: 'Walk-in', rating: 4, comment: 'Good', tags: [], images: [] };

  it('links a signed-in review to its account and saves it unverified', async () => {
    const db = createFakeSupabase({ venue_reviews: [] });
    const id = await insertVenueReview(db, VENUE, 'T-07', { ...input, author: 'Asha' }, 'acc-asha');
    const row = db.tables.venue_reviews.find((r) => r.id === id)!;
    expect(row.author_account_id).toBe('acc-asha');
    expect(row.author).toBe('Asha');
    expect(row.verified).toBe(false);
    expect(row.table_number).toBe('T-07');
  });

  it('saves an anonymous review without naming the account column', async () => {
    const db = createFakeSupabase({ venue_reviews: [] });
    const id = await insertVenueReview(db, VENUE, 'T-07', input, null);
    const row = db.tables.venue_reviews.find((r) => r.id === id)!;
    expect(row).not.toHaveProperty('author_account_id');
  });

  it('reports a failed insert instead of returning an id', async () => {
    const db = createFakeSupabase({ venue_reviews: [] }, { failOn: { 'venue_reviews.insert': () => true } });
    await expect(insertVenueReview(db, VENUE, 'T-07', input, null)).rejects.toBeDefined();
  });
});
