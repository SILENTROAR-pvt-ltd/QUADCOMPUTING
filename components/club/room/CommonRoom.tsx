'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Empty, Notice, Spinner } from '../ui';
import { Fab } from '../ui-extra';
import { clubFetch } from '../api';
import { useClub } from '../club-context';
import { CLUB_DISPLAY } from '../fonts';
import { StoriesRail } from '../home/StoriesRail';
import { Composer } from './Composer';
import { CommentsSheet } from './CommentsSheet';
import { FeedFilters } from './FeedFilters';
import { LiveStrip } from './LiveStrip';
import { PostCard } from './PostCard';
import { usePosts, type FeedSort } from './usePosts';
import type { Post } from './types';

/** "Where to next, Asha?" in the editorial serif, like a travel magazine cover line. */
function Greeting() {
  const { me } = useClub();
  const first = String(me.profile?.alias || me.profile?.club_username || 'traveller').replace(/^@/, '').split(/[\s_]/)[0];
  const [hello, setHello] = useState('Hello');
  useEffect(() => { const h = new Date().getHours(); setHello(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'); }, []);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3c6b2b]">{hello}</p>
      <p className={`${CLUB_DISPLAY} mt-1 text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[42px]`}>
        Where to <em className="font-medium text-[#3c6b2b]">next</em>, <span className="capitalize">{first}</span>?
      </p>
    </div>
  );
}

/** The club home: stories, who is online, and the Common Room feed of plans, tips and questions. */
export function CommonRoom() {
  const linked = useSearchParams()?.get('post') || null;
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<FeedSort>('new');
  const [composing, setComposing] = useState(false);
  const [open, setOpen] = useState<Post | null>(null);
  const feed = usePosts({ q, sort });
  const { patch } = feed;
  const onCount = useCallback((id: string, comments: number) => patch(id, { comments }), [patch]);

  // A notification link (/club?post=…) opens that post's comments.
  useEffect(() => {
    if (!linked) return;
    void clubFetch(`/posts/${linked}`).then((r) => r.ok && setOpen(r.data.post));
  }, [linked]);

  const notReady = feed.error?.code === 'not_ready';
  const empty = feed.posts?.length === 0 && !feed.error;
  return (
    <div className="space-y-5">
      <Greeting />
      <StoriesRail />
      <LiveStrip />
      <FeedFilters q={q} setQ={setQ} sort={sort} setSort={setSort} />
      {notReady && <Notice tone="info">The Common Room is not switched on yet. An admin needs to run the latest Club database update (supabase/club_setup_all.sql).</Notice>}
      {feed.error && !notReady && <Notice>{feed.error.text}</Notice>}
      {feed.posts === null && <Spinner />}
      {empty && (
        <Empty title={sort === 'following' ? 'Nothing from people you follow yet' : q ? 'Nothing here yet' : 'Be the first to post'}>
          {sort === 'following' ? 'Follow people from their profile, or browse places and see who is going.' : q ? 'Try another search.' : 'Share where you are headed, ask for tips, or find people to go with.'}
        </Empty>
      )}
      <div className="space-y-4">{feed.posts?.map((p) => <PostCard key={p.id} post={p} onChange={feed.patch} onRemove={feed.remove} onComments={setOpen} />)}</div>
      {feed.hasMore && <div className="text-center"><Button tone="quiet" busy={feed.loadingMore} onClick={feed.loadMore}>Show older posts</Button></div>}
      {!notReady && <Fab onClick={() => setComposing(true)} label="New post" />}
      <Composer open={composing} onClose={() => setComposing(false)} onPosted={feed.prepend} />
      <CommentsSheet post={open} onClose={() => setOpen(null)} onCount={onCount} />
    </div>
  );
}
