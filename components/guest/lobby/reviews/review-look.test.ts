import { describe, it, expect } from 'vitest';
import { filterReviews, sortReviews, summarizeReviews } from './review-look';
import type { ReviewItem } from './review.types';

const r = (id: string, rating: number, createdAt: string, images: string[] = []): ReviewItem => ({
  id, author: id, table: 'T-01', rating, comment: 'x', timestamp: '', tags: [], verified: true, images, createdAt,
});

describe('review summary', () => {
  it('has no score at all for a venue with no reviews', () => {
    expect(summarizeReviews([])).toMatchObject({ total: 0, overall: 0 });
  });

  it('averages the real ratings to one decimal, and the bars add up', () => {
    const s = summarizeReviews([{ rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 3 }]);
    expect(s.total).toBe(4);
    expect(s.overall).toBe(4.3);
    expect(s.distribution.map((d) => d.count)).toEqual([2, 1, 1, 0, 0]);
    expect(s.distribution.reduce((n, d) => n + d.percentage, 0)).toBe(100);
  });
});

describe('review filters and order', () => {
  const list = [r('a', 5, '2026-10-10T10:00:00Z'), r('b', 3, '2026-10-12T10:00:00Z', ['x.jpg']), r('c', 4, '2026-10-11T10:00:00Z'), r('d', 2, '2026-10-13T10:00:00Z')];

  it('filters by stars and by photos', () => {
    expect(filterReviews(list, '5star').map((x) => x.id)).toEqual(['a']);
    expect(filterReviews(list, '4star').map((x) => x.id)).toEqual(['c']);
    expect(filterReviews(list, '3below').map((x) => x.id)).toEqual(['b', 'd']);
    expect(filterReviews(list, 'photos').map((x) => x.id)).toEqual(['b']);
    expect(filterReviews(list, 'all')).toHaveLength(4);
  });

  it('puts the newest first, or the best first, without touching the original list', () => {
    expect(sortReviews(list, 'latest').map((x) => x.id)).toEqual(['d', 'b', 'c', 'a']);
    expect(sortReviews(list, 'highest').map((x) => x.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(list.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
