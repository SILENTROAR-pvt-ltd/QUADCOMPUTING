import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { listVenueReviews } from '@/lib/services/reviews/review-view';

const VENUE = 'aaaaaaaa-1111-4222-8333-444444444444';
const ASHA = { id: 'acc-asha', handle: '@asha', display_name: 'Asha', avatar: '☕', photo_path: null };

function seed() {
  return createFakeSupabase({
    guest_accounts: [{ ...ASHA }],
    venue_reviews: [
      {
        id: 'rev-linked', business_id: VENUE, author: 'Typed earlier', author_account_id: 'acc-asha',
        table_number: 'T-03', rating: 5, comment: 'Lovely chai', tags: [], images: [], verified: false,
        helpful_count: 2, created_at: '2026-10-07T10:00:00Z',
      },
      {
        id: 'rev-anon', business_id: VENUE, author: 'Walk-in', author_account_id: null,
        table_number: 'T-05', rating: 4, comment: 'Good', tags: ['quiet'], images: [], verified: true,
        helpful_count: 0, created_at: '2026-10-06T10:00:00Z',
      },
      {
        id: 'rev-other-venue', business_id: 'bbbbbbbb-1111-4222-8333-444444444444', author: 'Elsewhere',
        author_account_id: null, table_number: 'T-01', rating: 3, comment: 'x', tags: [], images: [],
        verified: false, helpful_count: 0, created_at: '2026-10-06T09:00:00Z',
      },
    ],
  });
}

describe('Venue reviews: reviewer identity', () => {
  it('shows a signed-in reviewer their current name, handle and emoji', async () => {
    const reviews = await listVenueReviews(seed(), VENUE);
    const linked = reviews.find((r: any) => r.id === 'rev-linked')!;
    expect(linked.author).toBe('Asha');
    expect(linked.authorHandle).toBe('@asha');
    expect(linked.avatarEmoji).toBe('☕');
    expect(linked.avatarUrl).toBeNull();
    expect(linked.helpfulCount).toBe(2);
  });

  it('keeps the typed name for an anonymous review and never shows another venue', async () => {
    const reviews = await listVenueReviews(seed(), VENUE);
    const anon = reviews.find((r: any) => r.id === 'rev-anon')!;
    expect(anon.author).toBe('Walk-in');
    expect(anon.authorHandle).toBeNull();
    expect(anon.avatarUrl).toBeNull();
    expect(anon.verified).toBe(true);
    expect(reviews.map((r: any) => r.id)).not.toContain('rev-other-venue');
  });

  it('returns no reviews for a venue with none', async () => {
    expect(await listVenueReviews(seed(), 'cccccccc-1111-4222-8333-444444444444')).toEqual([]);
  });
});
