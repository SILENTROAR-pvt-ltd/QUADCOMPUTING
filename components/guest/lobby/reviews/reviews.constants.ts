// components/guest/lobby/reviews/reviews.constants.ts
import { ReviewItem, ScoreMetric, StarDistributionItem } from './review.types';

export const INITIAL_METRICS: ScoreMetric[] = [
  { key: 'ambiance', label: 'Ambiance', score: 0, maxScore: 5.0 },
  { key: 'service', label: 'Service', score: 0, maxScore: 5.0 },
  { key: 'acoustics', label: 'Acoustics', score: 0, maxScore: 5.0 },
  { key: 'beverages', label: 'Craft Beverages', score: 0, maxScore: 5.0 },
];

export const INITIAL_STAR_DISTRIBUTION: StarDistributionItem[] = [
  { stars: 5, count: 0, percentage: 0 },
  { stars: 4, count: 0, percentage: 0 },
  { stars: 3, count: 0, percentage: 0 },
  { stars: 2, count: 0, percentage: 0 },
  { stars: 1, count: 0, percentage: 0 },
];

// Venue-neutral: these apply to any cafe, restaurant or stay.
export const AVAILABLE_REVIEW_TAGS: string[] = [
  'Food',
  'Service',
  'Atmosphere',
  'Value for money',
  'Cleanliness',
  'Drinks',
  'Music',
  'Family friendly',
];

export const INITIAL_REVIEWS: ReviewItem[] = [];
