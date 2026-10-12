'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, MapPin, MessageSquare, Plus } from 'lucide-react';
import { Avatar, Button, Empty, FOCUS, Notice, Spinner } from '../ui';
import { Faces } from '../ui-extra';
import { clubFetch } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import { useClub } from '../club-context';
import { StoryViewer } from '../home/StoryViewer';
import type { StoryGroup } from '../home/story-types';
import { Composer } from '../room/Composer';
import { CommentsSheet } from '../room/CommentsSheet';
import { PostCard } from '../room/PostCard';
import { usePosts } from '../room/usePosts';
import type { Post } from '../room/types';
import { KIND_LABEL, type Place } from './types';
import { PlanButton } from './PlanButton';

interface Detail {
  place: Place;
  stats: { stories: number; posts: number; planning: number };
  planning: boolean;
  planners: { total: number; faces: Array<{ user_id: string; name: string; avatar_url: string | null }> };
}

/**
 * One place: what it is, who is planning to go, the live stories from here (people you follow first),
 * and the posts about it. Share a tip about the place from here.
 */
export function PlaceDetail({ id }: { id: string }) {
  const { me } = useClub();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [open, setOpen] = useState<Post | null>(null);
  const feed = usePosts({ q: '', sort: 'new', place: id });
  const { patch } = feed;
  const onCount = useCallback((postId: string, comments: number) => patch(postId, { comments }), [patch]);

  const loadDetail = useCallback(async () => {
    const res = await clubFetch<Detail>(`/places/${id}`);
    if (res.ok) { setDetail(res.data); setError(''); } else setError(res.error);
  }, [id]);
  const loadStories = useCallback(async () => {
    const res = await clubFetch<{ groups: StoryGroup[] }>(`/stories?place=${id}`);
    if (res.ok) setGroups(res.data.groups);
  }, [id]);

  useEffect(() => { void loadDetail(); void loadStories(); }, [loadDetail, loadStories]);

  if (error) return <Notice>{error}</Notice>;
  if (!detail) return <Spinner />;
  const p = detail.place;
  const kinds = p.kinds.map((k) => KIND_LABEL[k] ?? k);
  const asRef = { id: p.id, name: p.name, region: p.region, country: p.country };

  return (
    <div className="space-y-8">
      {/* Hero: the place's own picture, or a typographic cover when none is uploaded yet. */}
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#dfe9c4] via-[#9fbf7a] to-[#17301f] p-6 text-white sm:p-10">
        {p.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
        <div className="relative flex min-h-[260px] flex-col justify-end gap-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{p.country}</p>
          <h2 className={`${CLUB_DISPLAY} text-[44px] font-semibold leading-[1] tracking-tight sm:text-[64px]`}>{p.name}</h2>
          {p.blurb && <p className="max-w-xl text-[15px] text-white/90">{p.blurb}</p>}
          <div className="flex flex-wrap gap-1.5">{kinds.map((k) => <span key={k} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">{k}</span>)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <PlanButton placeId={p.id} planning={detail.planning} onChange={() => void loadDetail()} />
            <span className="flex items-center gap-1.5 text-sm text-white/90"><Eye aria-hidden="true" className="h-4 w-4" />{detail.planners.total} planning to go</span>
          </div>
        </div>
      </section>

      {/* Who is going: faces first, then a count. */}
      {detail.planners.total > 0 && (
        <section aria-label="Planning to go" className="flex items-center gap-3">
          <Faces people={detail.planners.faces} total={detail.planners.total} size={36} ring="ring-[#f1efe6]" />
          <p className="text-sm text-[#14261b]/75">{detail.planners.faces.slice(0, 2).map((f) => f.name).join(', ')}{detail.planners.total > 2 ? ` and ${detail.planners.total - 2} more` : ''} are planning to go</p>
        </section>
      )}

      {/* Live stories from this place, ranked for you. */}
      <section aria-labelledby="place-stories" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h3 id="place-stories" className={`${CLUB_DISPLAY} text-[24px] font-semibold`}>Live from {p.name}</h3>
          <span className="text-xs text-[#14261b]/55">{detail.stats.stories} {detail.stats.stories === 1 ? 'story' : 'stories'} · 24 hours</span>
        </div>
        {groups.length === 0 ? (
          <p className="rounded-[24px] bg-white/60 px-5 py-6 text-sm text-[#14261b]/65">No one has shared a story from {p.name} yet. Add one from the home tray and tag {p.name}.</p>
        ) : (
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {groups.map((g, i) => (
              <button key={g.member.user_id} type="button" onClick={() => setViewing(i)} aria-label={`${g.member.name}'s ${g.seen ? 'watched' : 'new'} story from ${p.name}`}
                className={`flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-2xl text-[11px] text-[#14261b]/80 ${FOCUS}`}>
                <span className={`rounded-full p-[2.5px] ${g.seen ? 'bg-[#14261b]/20' : 'bg-gradient-to-tr from-[#17301f] via-[#7fa34a] to-[#c8da4a]'}`}>
                  <span className="block rounded-full border-[3px] border-[#f1efe6]"><Avatar url={g.member.avatar_url} name={g.member.name} size={52} /></span>
                </span>
                <span className="w-full truncate text-center font-medium">{g.member.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Posts about this place. */}
      <section aria-labelledby="place-posts" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 id="place-posts" className={`${CLUB_DISPLAY} text-[24px] font-semibold`}>Tips and plans for {p.name}</h3>
          <Button tone="ink" onClick={() => setComposing(true)} className="h-10 px-5 text-xs"><Plus aria-hidden="true" className="h-4 w-4" /> Share a tip</Button>
        </div>
        {feed.error && <Notice>{feed.error.text}</Notice>}
        {feed.posts === null && <Spinner />}
        {feed.posts?.length === 0 && !feed.error && (
          <Empty title={`Nothing about ${p.name} yet`}><span className="flex items-center justify-center gap-1.5"><MessageSquare aria-hidden="true" className="h-4 w-4" /> Be the first to share what it is like.</span></Empty>
        )}
        <div className="space-y-4">
          {feed.posts?.map((post) => <PostCard key={post.id} post={post} onChange={feed.patch} onRemove={feed.remove} onComments={setOpen} />)}
        </div>
      </section>

      <p className="text-center text-xs text-[#14261b]/50">
        Looking for something else? <Link href={`/club/places?region=${p.region}`} className={`font-semibold text-[#3c6b2b] underline ${FOCUS}`}>More places in this region</Link>
        {me.profile?.city ? <> · You are in {me.profile.city}</> : null}
        {detail.stats.posts > 0 ? <> · {detail.stats.posts} posts this week</> : null}
      </p>

      <Composer open={composing} onClose={() => setComposing(false)} onPosted={feed.prepend} initialPlace={asRef} />
      <CommentsSheet post={open} onClose={() => setOpen(null)} onCount={onCount} />
      {viewing !== null && (
        <StoryViewer queue={groups} start={viewing} onClose={() => setViewing(null)} onChanged={() => void loadStories()} />
      )}
    </div>
  );
}
