// What the browser gets for one reply under a Vibers Lobby post. Same author rules as posts.
import { authorView, type AuthorRow, type LobbyAuthorView } from './lobby-post-view';

export interface LobbyReplyRow {
  id: string;
  post_id: string;
  author_account_id: string | null;
  content: string;
  created_at: string;
}

export interface LobbyReplyView {
  id: string;
  content: string;
  created_at: string;
  mine: boolean;
  author: LobbyAuthorView | null;
}

export function toReplyView(row: LobbyReplyRow, authors: Map<string, AuthorRow>, viewerId: string | null): LobbyReplyView {
  return {
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    mine: Boolean(viewerId && row.author_account_id === viewerId),
    author: authorView(row.author_account_id ? authors.get(row.author_account_id) : undefined),
  };
}
