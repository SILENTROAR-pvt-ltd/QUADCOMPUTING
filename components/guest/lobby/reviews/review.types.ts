// components/guest/lobby/reviews/review.types.ts

export interface ReviewItem {
  id: string;
  author: string;
  table: string;
  rating: number; // 1-5
  comment: string;
  timestamp: string;
  tags: string[];
  verified: boolean;
  images?: string[];
  helpfulCount?: number;
  /** The reviewer's account, when the review was written signed in. */
  authorHandle?: string | null;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
}

export interface ScoreMetric {
  key: string;
  label: string;
  score: number;
  maxScore: number;
}

export interface StarDistributionItem {
  stars: number;
  count: number;
  percentage: number;
}

export interface ReviewSubmissionPayload {
  author: string;
  table: string;
  rating: number;
  comment: string;
  tags: string[];
  images?: string[];
}

export type ReviewFilterOption = 'all' | 'photos' | '5star' | '4star' | 'helpful';
export type ReviewSortOption = 'latest' | 'highest' | 'helpful';
