import type { ReviewFilterOption, ReviewItem, ReviewSortOption, StarDistributionItem } from './review.types';

/** What the guest is told as they choose a rating. */
export const RATING_WORDS = ['', 'We are sorry to hear that', 'We can do better', 'Pleasant', 'Wonderful', 'Exceptional'] as const;

/** Only a real review counts: the average and the bars come from the venue's own reviews and nothing else. */
export function summarizeReviews(reviews: Array<Pick<ReviewItem, 'rating'>>): { total: number; overall: number; distribution: StarDistributionItem[] } {
  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating)) === stars).length;
    return { stars, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
  return { total, overall: total > 0 ? Math.round((sum / total) * 10) / 10 : 0, distribution };
}

export function filterReviews(reviews: ReviewItem[], filter: ReviewFilterOption): ReviewItem[] {
  switch (filter) {
    case 'photos': return reviews.filter((r) => (r.images?.length ?? 0) > 0);
    case '5star': return reviews.filter((r) => Math.round(r.rating) === 5);
    case '4star': return reviews.filter((r) => Math.round(r.rating) === 4);
    case '3below': return reviews.filter((r) => Math.round(r.rating) <= 3);
    default: return reviews;
  }
}

/** Newest first, or best first (newest first among equals). Never changes the list it is given. */
export function sortReviews(reviews: ReviewItem[], sort: ReviewSortOption): ReviewItem[] {
  const time = (r: ReviewItem) => Date.parse(r.createdAt || '') || 0;
  const copy = [...reviews];
  copy.sort((a, b) => (sort === 'highest' ? b.rating - a.rating || time(b) - time(a) : time(b) - time(a)));
  return copy;
}
