// How Vibers Club decides what comes first. Pure functions, so the rules read plainly and can be tested.
//
// Stories, for each viewer, rank by:
//   - people you follow                 (strongest)
//   - places you planned to visit
//   - the place you live (your city)
//   - not yet seen                      (Instagram-style: unseen rings first)
//   - recency, fading across 24 hours
// Places rank by live stories, posts in the last week, and how many people plan to go.

export const WEIGHTS = {
  followedAuthor: 100,
  followedPlace: 60,
  homePlace: 40,
  unseen: 15,
  recencyMax: 20,
  recencyWindowHours: 24,
  trendStory: 3,
  trendPost: 2,
  trendPlanning: 1,
} as const;

export interface RankContext {
  viewerId: string;
  followees: ReadonlySet<string>;
  followedPlaces: ReadonlySet<string>;
  homePlaceId: string | null;
  now: number;
}

export interface RankableStory {
  authorId: string;
  placeId: string | null;
  postedAt: number;
  seen: boolean;
}

export function storyScore(s: RankableStory, ctx: RankContext): number {
  let score = 0;
  if (ctx.followees.has(s.authorId)) score += WEIGHTS.followedAuthor;
  if (s.placeId && ctx.followedPlaces.has(s.placeId)) score += WEIGHTS.followedPlace;
  if (s.placeId && s.placeId === ctx.homePlaceId) score += WEIGHTS.homePlace;
  if (!s.seen) score += WEIGHTS.unseen;
  const hoursOld = Math.max(0, (ctx.now - s.postedAt) / 3_600_000);
  score += Math.max(0, WEIGHTS.recencyMax * (1 - hoursOld / WEIGHTS.recencyWindowHours));
  return score;
}

/** A person's stories are ranked by their best story. */
export function groupScore(stories: RankableStory[], ctx: RankContext): number {
  return stories.reduce((best, s) => Math.max(best, storyScore(s, ctx)), 0);
}

export function placeTrendScore(p: { stories: number; posts: number; planning: number }): number {
  return p.stories * WEIGHTS.trendStory + p.posts * WEIGHTS.trendPost + p.planning * WEIGHTS.trendPlanning;
}
