// Creating and deleting Vibers Lobby posts. Only a signed-in guest writes, and only the author deletes.
import { randomUUID } from 'node:crypto';
import { PHOTO_TYPES } from '@/lib/guest/avatar-options';
import { cleanLobbyContent, lobbyPostError, LOBBY_MEDIA_MAX_BYTES } from '@/lib/guest/lobby-rules';
import { detectPhotoType, type PhotoStore } from '@/lib/services/guest-auth/guest-avatar.service';
import { toPostView, type AuthorRow, type LobbyPostView } from './lobby-post-view';

export type WriteResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const COLUMNS = 'id, business_id, author_account_id, kind, content, table_number, media_path, created_at';

export interface NewPost {
  kind: unknown;
  content: unknown;
  table: unknown;
  media: Uint8Array | null;
}

function tableOf(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().slice(0, 12);
  return /^[A-Za-z0-9 -]{1,12}$/.test(t) ? t : null;
}

export async function createLobbyPost(
  db: any,
  store: PhotoStore,
  author: AuthorRow,
  businessId: string,
  post: NewPost
): Promise<WriteResult<LobbyPostView>> {
  const content = cleanLobbyContent(post.content);
  const hasMedia = Boolean(post.media && post.media.length);
  const error = lobbyPostError({ kind: post.kind, content, hasMedia });
  if (error) return { ok: false, status: 400, error };

  let mediaPath: string | null = null;
  if (post.media && hasMedia) {
    if (post.media.length > LOBBY_MEDIA_MAX_BYTES) return { ok: false, status: 413, error: 'That photo is too large. Try a smaller one.' };
    const type = detectPhotoType(post.media);
    if (!type) return { ok: false, status: 415, error: 'Upload a JPEG, PNG or WebP photo.' };
    mediaPath = `${author.id}/${randomUUID()}.${PHOTO_TYPES[type]}`;
    await store.put(mediaPath, post.media, type);
  }

  const { data, error: insertErr } = await db
    .from('lobby_posts')
    .insert({
      business_id: businessId,
      author_account_id: author.id,
      kind: post.kind,
      content,
      table_number: tableOf(post.table),
      media_path: mediaPath,
    })
    .select(COLUMNS)
    .single();
  if (insertErr) {
    if (mediaPath) await store.remove([mediaPath]).catch(() => {});
    throw insertErr;
  }
  return { ok: true, value: toPostView(data, new Map([[author.id, author]]), author.id) };
}

export async function deleteLobbyPost(
  db: any,
  store: PhotoStore,
  viewerId: string,
  businessId: string,
  postId: string
): Promise<WriteResult<null>> {
  const { data: row, error } = await db
    .from('lobby_posts')
    .select(COLUMNS)
    .eq('id', postId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  // Not yours looks the same as "no such post".
  if (!row || row.author_account_id !== viewerId) return { ok: false, status: 404, error: 'Post not found.' };

  const { error: delErr } = await db.from('lobby_posts').delete().eq('id', postId).eq('author_account_id', viewerId);
  if (delErr) throw delErr;
  if (row.media_path) await store.remove([row.media_path]).catch(() => {});
  return { ok: true, value: null };
}
