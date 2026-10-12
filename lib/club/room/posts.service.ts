// The Common Room: members post their plans and questions; the feed is newest first (or most liked
// in the last 30 days). A shadow-banned author's posts are seen only by them and by staff, a deleted
// post by nobody, and a post whose author is no longer an approved member is left out.
import { fail, must } from '../http';
import { publicMembers } from '../membership/members';
import { signMedia } from '../media';
import { allRows } from '../rows';
import { isRegion, parsePost } from './post-input';
import { resolvePlace } from '../social/places.service';
import { followingIds } from '../social/follow.service';
import type { ViberProfile } from '../types';

export const PAGE = 20;
const TOP_WINDOW_DAYS = 30;
const POST_COLUMNS = 'id, author_id, body, place, place_id, region, event_id, hidden, deleted_at, created_at';

export interface PostRow { id: string; author_id: string; body: string; place: string | null; place_id: string | null; region: string | null; event_id: string | null; hidden: boolean; deleted_at: string | null; created_at: string }

export const visibleTo = (p: Pick<PostRow, 'hidden' | 'deleted_at' | 'author_id'>, viewerId: string, staff = false) =>
  !p.deleted_at && (!p.hidden || p.author_id === viewerId || staff);

export async function loadPost(db: any, id: string, viewerId: string, staff = false): Promise<PostRow> {
  const post = must(await db.from('club_posts').select(POST_COLUMNS).eq('id', id).maybeSingle()) as PostRow | null;
  if (!post || !visibleTo(post, viewerId, staff)) fail(404, 'Post not found.');
  return post as PostRow;
}

export async function createPost(db: any, author: ViberProfile, body: Record<string, any>) {
  const parsed = parsePost(body);
  if (!parsed.ok) fail(400, parsed.error);
  const row = parsed.row;
  if (row.event_id) {
    const plan = must(await db.from('club_events').select('id, status').eq('id', row.event_id).maybeSingle()) as { status: string } | null;
    if (!plan || (plan.status !== 'approved' && plan.status !== 'completed')) fail(400, 'Only approved plans can be attached.');
  }
  // The place's name and region come from the list, so a post can only be tagged with a real place.
  const place = row.place_id ? await resolvePlace(db, row.place_id) : null;
  const post = must(await db.from('club_posts').insert({
    body: row.body, event_id: row.event_id, place_id: place?.id ?? null, place: place?.name ?? null, region: place?.region ?? null,
    author_id: author.user_id, hidden: Boolean(author.shadow_banned),
  }).select(POST_COLUMNS).single()) as PostRow;
  const [shaped] = await decoratePosts(db, [post], author.user_id);
  return shaped;
}

export interface FeedOptions {
  region?: string | null; q?: string | null; author?: string | null; before?: string | null;
  sort?: string | null; placeId?: string | null; following?: boolean; staff?: boolean;
}

/** The feed: everyone's posts (new or top), only people you follow (`following`), or one place. */
export async function listPosts(db: any, viewerId: string, opts: FeedOptions = {}, now = new Date()) {
  const top = opts.sort === 'top';
  let q = db.from('club_posts').select(POST_COLUMNS).is('deleted_at', null);
  if (isRegion(opts.region)) q = q.eq('region', opts.region);
  if (opts.placeId) q = q.eq('place_id', opts.placeId);
  if (opts.author) q = q.eq('author_id', opts.author);
  if (opts.following) {
    const ids = Array.from(new Set([viewerId, ...(await followingIds(db, viewerId))]));
    q = q.in('author_id', ids);
  }
  const term = String(opts.q || '').replace(/[%_,()*\\"]/g, ' ').trim().slice(0, 60);
  if (term) q = q.or(`body.ilike.*${term}*,place.ilike.*${term}*`);
  if (top) q = q.gte('created_at', new Date(now.getTime() - TOP_WINDOW_DAYS * 86_400_000).toISOString());
  else if (opts.before) q = q.lt('created_at', opts.before);
  const rows = must(await q.order('created_at', { ascending: false }).limit(top ? 200 : PAGE)) as PostRow[];

  let posts = await decoratePosts(db, rows.filter((p) => visibleTo(p, viewerId, opts.staff)), viewerId);
  if (top) posts = posts.sort((a, b) => b.likes - a.likes || Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, PAGE);
  return { posts, nextBefore: !top && rows.length === PAGE ? rows[rows.length - 1].created_at : null };
}

export async function getPost(db: any, id: string, viewerId: string, staff = false) {
  const [post] = await decoratePosts(db, [await loadPost(db, id, viewerId, staff)], viewerId);
  if (!post) fail(404, 'Post not found.');
  return post;
}

export async function deletePost(db: any, id: string, userId: string, staff = false) {
  let q = db.from('club_posts').update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null);
  if (!staff) q = q.eq('author_id', userId);
  const rows = must(await q.select('id')) as any[];
  if (rows.length === 0) fail(404, 'Post not found.');
}

export async function toggleLike(db: any, id: string, userId: string, on: boolean) {
  await loadPost(db, id, userId);
  if (on) {
    const res = await db.from('club_post_likes').insert({ post_id: id, user_id: userId });
    if (res.error && res.error.code !== '23505') throw res.error;
  } else {
    must(await db.from('club_post_likes').delete().eq('post_id', id).eq('user_id', userId));
  }
  const likes = await allRows(() => db.from('club_post_likes').select('user_id').eq('post_id', id).order('user_id'));
  return { likes: likes.length, liked: likes.some((l) => l.user_id === userId) };
}

/** Authors as members see them, like and comment counts, and the attached plan with its cover. */
export async function decoratePosts(db: any, rows: PostRow[], viewerId: string) {
  const ids = rows.map((p) => p.id);
  if (ids.length === 0) return [];
  const planIds = Array.from(new Set(rows.map((p) => p.event_id).filter((x): x is string => Boolean(x))));
  const [likes, comments, authors, plans] = await Promise.all([
    allRows(() => db.from('club_post_likes').select('post_id, user_id').in('post_id', ids).order('post_id')),
    allRows(() => db.from('club_post_comments').select('post_id, author_id, hidden').in('post_id', ids).is('deleted_at', null).order('post_id')),
    publicMembers(db, rows.map((p) => p.author_id)),
    planIds.length ? db.from('club_events').select('id, title, kind, starts_at, venue, cover_paths, status').in('id', planIds).then(must) : Promise.resolve([]),
  ]);
  const byAuthor = new Map(authors.map((a) => [a.user_id, a]));
  const byPlan = new Map((plans as any[]).filter((e) => e.status === 'approved' || e.status === 'completed').map((e) => [e.id, e]));
  const urls = await signMedia(db, [...authors.map((a) => a.avatar_url), ...Array.from(byPlan.values()).map((e) => e.cover_paths?.[0])]);
  const likeCount = tally(likes);
  const likedByMe = new Set(likes.filter((l) => l.user_id === viewerId).map((l) => l.post_id));
  const commentCount = tally(comments.filter((c) => !c.hidden || c.author_id === viewerId));

  return rows.flatMap((p) => {
    const author = byAuthor.get(p.author_id);
    if (!author) return [];
    const plan = p.event_id ? byPlan.get(p.event_id) : null;
    const mine = p.author_id === viewerId;
    return [{
      id: p.id, body: p.body, place: p.place, place_id: p.place_id, region: p.region, created_at: p.created_at, mine, hidden: mine ? p.hidden : undefined,
      author: { ...author, avatar_url: author.avatar_url ? urls.get(author.avatar_url) ?? null : null },
      likes: likeCount.get(p.id) ?? 0,
      liked: likedByMe.has(p.id),
      comments: commentCount.get(p.id) ?? 0,
      plan: plan ? { id: plan.id, title: plan.title, kind: plan.kind, starts_at: plan.starts_at, venue: plan.venue, cover: plan.cover_paths?.[0] ? urls.get(plan.cover_paths[0]) ?? null : null } : null,
    }];
  });
}

function tally(rows: Array<{ post_id: string }>) {
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.post_id, (out.get(r.post_id) ?? 0) + 1);
  return out;
}
