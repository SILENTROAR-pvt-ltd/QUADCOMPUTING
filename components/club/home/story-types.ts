// Shapes the story API returns.
import type { PlaceRef } from '../places/types';

export interface StoryItem {
  id: string;
  media_type: 'image' | 'video';
  url: string | null;
  caption: string | null;
  verified_stay: boolean;
  created_at: string;
  expires_at: string;
  mine: boolean;
  seen: boolean;
  place: PlaceRef | null;
  viewers?: number;
}

export interface StoryGroup {
  member: { user_id: string; name: string; avatar_url: string | null };
  stories: StoryItem[];
  mine: boolean;
  seen: boolean;
  latest: string;
}
