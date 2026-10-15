// The Vibers Lobby feed for one venue: newest first, filtered by kind, by "mine", or by text, and paged
// with a cursor. Only posts from this venue are ever read.
import type { LobbyKind } from '@/lib/guest/lobby-rules';
import { loadEngagement } from './lobby-engagement';
import { toPostView, type AuthorRow, type LobbyPostRow, type LobbyPostView } from './lobby-post-view';

export interface LobbyQuery {
  kind: 'all' | LobbyKind;
  mine: boolean;
  search: string | null;
  before: string | null;
  limit: number;
  viewerId: string | null;
}

export interface LobbyPage {
  posts: LobbyPostView[];
  has_more: boolean;
  next_before: string | null;
}

// Search text can't contain characters that would change the filter (wildcards, commas, brackets).
const SAFE_SEARCH = /^[A-Za-z0-9 .,!?@#'\-₹]{1,60}$/;

export function safeSearch(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return SAFE_SEARCH.test(t) ? t : null;
}

const EMPTY: LobbyPage = { posts: [], has_more: false, next_before: null };

export async function listLobbyPosts(db: any, businessId: string, q: LobbyQuery): Promise<LobbyPage> {
  if (q.mine && !q.viewerId) return EMPTY;

  let query = db
    .from('lobby_posts')
    .select('id, business_id, author_account_id, kind, content, table_number, media_path, created_at')
    .eq('business_id', businessId);
  // Wants are retired: the whole feed leaves them out (asking for them by name still works, for anyone who linked to one).
  if (q.kind !== 'all') query = query.eq('kind', q.kind);
  else query = query.neq('kind', 'want');
  if (q.mine) query = query.eq('author_account_id', q.viewerId);
  if (q.search) query = query.ilike('content', `*${q.search}*`);
  if (q.before) query = query.lt('created_at', q.before);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(q.limit + 1);
  if (error) throw error;

  const rows: LobbyPostRow[] = data || [];
  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;
  const [authors, engagement] = await Promise.all([
    loadLobbyAuthors(db, page),
    loadEngagement(db, page.map((r) => r.id), q.viewerId),
  ]);

  return {
    posts: page.map((r) => toPostView(r, authors, q.viewerId, engagement.get(r.id))),
    has_more: hasMore,
    next_before: hasMore && page.length ? page[page.length - 1].created_at : null,
  };
}

/** The current account of each author in these rows, keyed by account id. */
export async function loadLobbyAuthors(db: any, rows: Array<{ author_account_id: string | null }>): Promise<Map<string, AuthorRow>> {
  const ids = Array.from(new Set(rows.map((r) => r.author_account_id).filter((id): id is string => Boolean(id))));
  const out = new Map<string, AuthorRow>();
  if (ids.length === 0) return out;
  const { data, error } = await db
    .from('guest_accounts')
    .select('id, handle, display_name, avatar, photo_path')
    .in('id', ids);
  if (error) throw error;
  for (const a of data || []) out.set(a.id, a);
  return out;
}
