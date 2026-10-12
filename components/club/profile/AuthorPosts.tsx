'use client';

import React, { useCallback, useState } from 'react';
import { Button, Empty, Notice, Spinner } from '../ui';
import { SectionTitle } from '../ui-extra';
import { CommentsSheet } from '../room/CommentsSheet';
import { PostCard } from '../room/PostCard';
import { usePosts } from '../room/usePosts';
import type { Post } from '../room/types';

/** One member's Common Room posts, newest first. */
export function AuthorPosts({ userId, self }: { userId: string; self: boolean }) {
  const feed = usePosts({ q: '', sort: 'new', author: userId });
  const [open, setOpen] = useState<Post | null>(null);
  const { patch } = feed;
  const onCount = useCallback((id: string, comments: number) => patch(id, { comments }), [patch]);

  return (
    <section id="posts" aria-labelledby="posts-title" className="scroll-mt-20">
      <SectionTitle id="posts-title" title={self ? 'Your posts' : 'Posts'} />
      {feed.error && feed.error.code !== 'not_ready' && <Notice>{feed.error.text}</Notice>}
      {feed.posts === null && <Spinner />}
      {feed.posts?.length === 0 && !feed.error && <Empty title={self ? 'Nothing posted yet' : 'No posts yet'}>{self ? 'Share your next plan in the Common Room.' : 'When they post in the Common Room, it shows up here.'}</Empty>}
      <div>{feed.posts?.map((p) => <PostCard key={p.id} post={p} onChange={feed.patch} onRemove={feed.remove} onComments={setOpen} />)}</div>
      {feed.hasMore && <div className="mt-4 text-center"><Button tone="quiet" busy={feed.loadingMore} onClick={feed.loadMore}>Show older posts</Button></div>}
      <CommentsSheet post={open} onClose={() => setOpen(null)} onCount={onCount} />
    </section>
  );
}
