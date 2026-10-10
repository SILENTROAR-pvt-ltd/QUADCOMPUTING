// Replies under a Vibers Lobby post. Reading is open to the venue's guests; writing needs a signed-in author.
import { cleanLobbyContent, lobbyReplyError, LOBBY_REPLIES_PAGE } from '@/lib/guest/lobby-rules';
import { loadLobbyAuthors } from './lobby-post-query';
import { postInVenue } from './lobby-engagement';
import type { AuthorRow } from './lobby-post-view';
import { toReplyView, type LobbyReplyRow, type LobbyReplyView } from './lobby-reply-view';
import type { WriteResult } from './lobby-post-write';

const COLUMNS = 'id, post_id, author_account_id, content, created_at';

export async function listReplies(
  db: any,
  businessId: string,
  viewerId: string | null,
  postId: string
): Promise<WriteResult<LobbyReplyView[]>> {
  if (!(await postInVenue(db, businessId, postId))) return { ok: false, status: 404, error: 'Post not found.' };

  const { data, error } = await db
    .from('lobby_post_replies')
    .select(COLUMNS)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(LOBBY_REPLIES_PAGE);
  if (error) throw error;

  const rows: LobbyReplyRow[] = data || [];
  const authors = await loadLobbyAuthors(db, rows);
  return { ok: true, value: rows.map((r) => toReplyView(r, authors, viewerId)) };
}

export async function addReply(
  db: any,
  author: AuthorRow,
  businessId: string,
  postId: string,
  raw: unknown
): Promise<WriteResult<LobbyReplyView>> {
  const content = cleanLobbyContent(raw);
  const error = lobbyReplyError(content);
  if (error) return { ok: false, status: 400, error };
  if (!(await postInVenue(db, businessId, postId))) return { ok: false, status: 404, error: 'Post not found.' };

  const { data, error: insertErr } = await db
    .from('lobby_post_replies')
    .insert({ post_id: postId, author_account_id: author.id, content })
    .select(COLUMNS)
    .single();
  if (insertErr) throw insertErr;
  return { ok: true, value: toReplyView(data, new Map([[author.id, author]]), author.id) };
}
