// Comments on Common Room posts: oldest first, profanity starred out, a shadow-banned commenter seen
// only by themself and staff. The post's author is notified of each new comment (not their own).
import { fail, must } from '../http';
import { publicMembers } from '../membership/members';
import { signMedia } from '../media';
import { notify } from '../notifications.service';
import { COMMENT_MAX, cleanBody } from './post-input';
import { loadPost } from './posts.service';
import type { ViberProfile } from '../types';

const LIMIT = 200;
const COMMENT_COLUMNS = 'id, post_id, author_id, body, hidden, created_at';

export async function listComments(db: any, postId: string, viewerId: string, staff = false) {
  await loadPost(db, postId, viewerId, staff);
  const rows = (must(await db.from('club_post_comments').select(COMMENT_COLUMNS).eq('post_id', postId).is('deleted_at', null)
    .order('created_at', { ascending: true }).limit(LIMIT)) as any[]).filter((c) => !c.hidden || c.author_id === viewerId || staff);
  const authors = new Map((await publicMembers(db, rows.map((c) => c.author_id))).map((m) => [m.user_id, m]));
  const urls = await signMedia(db, Array.from(authors.values()).map((a) => a.avatar_url));
  return rows.flatMap((c) => {
    const author = authors.get(c.author_id);
    if (!author) return [];
    return [{ id: c.id, body: c.body, created_at: c.created_at, mine: c.author_id === viewerId, author: { ...author, avatar_url: author.avatar_url ? urls.get(author.avatar_url) ?? null : null } }];
  });
}

export async function addComment(db: any, postId: string, author: ViberProfile, body: Record<string, any>) {
  const post = await loadPost(db, postId, author.user_id);
  const text = cleanBody(body.body);
  if (!text) fail(400, 'Write a comment first.');
  if (text.length > COMMENT_MAX) fail(400, `Keep comments under ${COMMENT_MAX} characters.`);
  const row = must(await db.from('club_post_comments').insert({ post_id: postId, author_id: author.user_id, body: text, hidden: Boolean(author.shadow_banned) })
    .select(COMMENT_COLUMNS).single());

  if (post.author_id !== author.user_id && !author.shadow_banned) {
    const [me] = await publicMembers(db, [author.user_id]);
    await notify(db, [post.author_id], {
      kind: 'post_comment', title: `${me?.name ?? 'A member'} commented on your post`, body: text.slice(0, 140), link: `/club?post=${postId}`,
    });
  }
  return row;
}

export async function deleteComment(db: any, commentId: string, userId: string, staff = false) {
  let q = db.from('club_post_comments').update({ deleted_at: new Date().toISOString() }).eq('id', commentId).is('deleted_at', null);
  if (!staff) q = q.eq('author_id', userId);
  const rows = must(await q.select('id')) as any[];
  if (rows.length === 0) fail(404, 'Comment not found.');
}
