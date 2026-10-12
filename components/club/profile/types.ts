import type { PostAuthor } from '../room/types';
import type { TravelerKind } from '@/lib/club/identity/profile-details';

/** GET /api/club/members/:id */
export interface MemberProfileData {
  member: PostAuthor;
  business_name: string | null;
  since: string;
  online: boolean;
  self: boolean;
  /** Whether you follow this member (always false on your own profile). */
  follows: boolean;
  network: { followers: number; following: number };
  /** The traveller types they chose, and the social accounts they filled in (handles or links). */
  details: { kinds: TravelerKind[]; social: Partial<Record<string, string>>; bio: string | null };
  stats: { posts: number; hosted: number; joined: number };
  plans: Array<{ id: string; title: string; kind: string; starts_at: string; venue: string | null; cover: string | null }>;
}

export interface NetworkMember {
  user_id: string;
  name: string;
  city: string;
  avatar_url: string | null;
  follows: boolean;
  is_viewer: boolean;
}
