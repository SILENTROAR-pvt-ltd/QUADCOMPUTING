// Likes and reply counts for Vibers Lobby posts, and the like toggle. Every post is checked against
// its venue first, so a guest can't like or read counts for another venue's post.
import type { LobbyEngagement } from './lobby-post-view';
import type { WriteResult } from './lobby-post-write';

const UNIQUE_VIOLATION = '23505';

export async function postInVenue(db: any, businessId: string, postId: string): Promise<boolean> {
  const { data, error } = await db
    .from('lobby_posts')
    .select('id')
    .eq('id', postId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Like and reply counts for these posts, and which of them the viewer has liked. */
export async function loadEngagement(db: any, postIds: string[], viewerId: string | null): Promise<Map<string, LobbyEngagement>> {
  const out = new Map<string, LobbyEngagement>();
  if (postIds.length === 0) return out;
  for (const id of postIds) out.set(id, { likes: 0, liked: false, replies: 0 });

  const [likes, replies] = await Promise.all([
    db.from('lobby_post_likes').select('post_id, account_id').in('post_id', postIds),
    db.from('lobby_post_replies').select('post_id').in('post_id', postIds),
  ]);
  if (likes.error) throw likes.error;
  if (replies.error) throw replies.error;

  for (const row of likes.data || []) {
    const e = out.get(row.post_id);
    if (!e) continue;
    e.likes += 1;
    if (viewerId && row.account_id === viewerId) e.liked = true;
  }
  for (const row of replies.data || []) {
    const e = out.get(row.post_id);
    if (e) e.replies += 1;
  }
  return out;
}

/** Likes a post, or takes the like back. One like per guest per post. */
export async function toggleLobbyLike(
  db: any,
  viewerId: string,
  businessId: string,
  postId: string
): Promise<WriteResult<{ liked: boolean; likes: number }>> {
  if (!(await postInVenue(db, businessId, postId))) return { ok: false, status: 404, error: 'Post not found.' };

  const { data: existing, error } = await db
    .from('lobby_post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('account_id', viewerId)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    const { error: delErr } = await db.from('lobby_post_likes').delete().eq('post_id', postId).eq('account_id', viewerId);
    if (delErr) throw delErr;
  } else {
    const { error: insErr } = await db.from('lobby_post_likes').insert({ post_id: postId, account_id: viewerId });
    // A double tap that lands twice is the same like, not an error.
    if (insErr && insErr.code !== UNIQUE_VIOLATION) throw insErr;
  }

  const counts = (await loadEngagement(db, [postId], viewerId)).get(postId);
  return { ok: true, value: { liked: !existing, likes: counts?.likes ?? 0 } };
}
