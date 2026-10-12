// Shapes the Common Room API returns.
export interface PostAuthor {
  user_id: string;
  name: string;
  handle: string | null;
  generation: string;
  city: string;
  vibe_line?: string | null;
  avatar_url: string | null;
  account_type: string;
}

export interface PostPlan { id: string; title: string; kind: string; starts_at: string; venue: string | null; cover: string | null }

export interface Post {
  id: string;
  body: string;
  place: string | null;
  place_id: string | null;
  region: string | null;
  created_at: string;
  mine: boolean;
  hidden?: boolean;
  author: PostAuthor;
  likes: number;
  liked: boolean;
  comments: number;
  plan: PostPlan | null;
}

export interface PostComment { id: string; body: string; created_at: string; mine: boolean; author: PostAuthor }

export const REGIONS = ['india', 'asia', 'europe', 'americas', 'africa', 'oceania'] as const;
