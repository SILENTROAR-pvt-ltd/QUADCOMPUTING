// What the browser gets for one Vibers Lobby post. The author is read from the account as it is now,
// so a changed name or photo shows on older posts too. Nothing private (phone, PIN) is included.
import { avatarPublicUrl, mediaPublicUrl } from '@/lib/services/guest-auth/guest-avatar.service';
import type { LobbyKind } from '@/lib/guest/lobby-rules';

export const LOBBY_MEDIA_BUCKET = 'lobby-media';

export interface LobbyPostRow {
  id: string;
  business_id: string;
  author_account_id: string | null;
  kind: LobbyKind;
  content: string;
  table_number: string | null;
  media_path: string | null;
  created_at: string;
}

export interface AuthorRow {
  id: string;
  handle: string;
  display_name: string;
  avatar: string | null;
  photo_path: string | null;
}

export interface LobbyAuthorView {
  handle: string;
  name: string;
  avatar: string;
  avatar_url: string | null;
}

export interface LobbyEngagement {
  likes: number;
  liked: boolean;
  replies: number;
}

export const NO_ENGAGEMENT: LobbyEngagement = { likes: 0, liked: false, replies: 0 };

export interface LobbyPostView extends LobbyEngagement {
  id: string;
  kind: LobbyKind;
  content: string;
  table: string | null;
  created_at: string;
  media_url: string | null;
  mine: boolean;
  author: LobbyAuthorView | null;
}

export function authorView(author: AuthorRow | undefined): LobbyAuthorView | null {
  if (!author) return null;
  return {
    handle: author.handle,
    name: author.display_name,
    avatar: author.avatar || '☕',
    avatar_url: author.photo_path ? avatarPublicUrl(author.photo_path) : null,
  };
}

export function toPostView(
  row: LobbyPostRow,
  authors: Map<string, AuthorRow>,
  viewerId: string | null,
  engagement: LobbyEngagement = NO_ENGAGEMENT
): LobbyPostView {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    table: row.table_number,
    created_at: row.created_at,
    media_url: mediaPublicUrl(LOBBY_MEDIA_BUCKET, row.media_path),
    mine: Boolean(viewerId && row.author_account_id === viewerId),
    author: authorView(row.author_account_id ? authors.get(row.author_account_id) : undefined),
    ...engagement,
  };
}
