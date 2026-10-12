'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { EyeOff, Heart, MessageSquare } from 'lucide-react';
import { Avatar, FOCUS } from '../ui';
import { clubFetch, timeAgo } from '../api';
import { PlanAttachment, PostBody } from './PostBody';
import { PostMenu } from './PostMenu';
import type { Post } from './types';

interface Props { post: Post; onChange: (id: string, change: Partial<Post>) => void; onRemove: (id: string) => void; onComments: (post: Post) => void }

const pill = `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition active:scale-95 ${FOCUS}`;

/** One Common Room post: who, when, what (the place in olive), an attached plan, likes and comments. */
export function PostCard({ post, onChange, onRemove, onComments }: Props) {
  const liking = useRef(false);
  const profile = `/club/members/${post.author.user_id}`;

  const like = async () => {
    if (liking.current) return;
    liking.current = true;
    const on = !post.liked;
    const before = { liked: post.liked, likes: post.likes };
    onChange(post.id, { liked: on, likes: Math.max(0, post.likes + (on ? 1 : -1)) });
    const res = await clubFetch<{ likes: number; liked: boolean }>(`/posts/${post.id}/like`, { body: { on } });
    onChange(post.id, res.ok ? { likes: res.data.likes, liked: res.data.liked } : before);
    liking.current = false;
  };

  return (
    <article className="rounded-[28px] border border-[#14261b]/[0.05] bg-[#fbfaf6] p-5 shadow-[0_18px_40px_-32px_rgba(20,38,27,0.55)]">
      <header className="flex items-start gap-3">
        <Link href={profile} className={`rounded-full ${FOCUS}`} aria-label={`${post.author.name}'s profile`}><Avatar url={post.author.avatar_url} name={post.author.name} size={44} /></Link>
        <div className="min-w-0 flex-1">
          <Link href={profile} className="block truncate text-[15px] font-semibold hover:underline">{post.author.name}</Link>
          <p className="text-[13px] text-[#14261b]/60">{timeAgo(post.created_at)}{post.author.account_type === 'business' ? ' · Business' : ''}</p>
        </div>
        <PostMenu post={post} onRemoved={() => onRemove(post.id)} />
      </header>
      {post.hidden && <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] text-amber-800"><EyeOff aria-hidden="true" className="h-3 w-3" /> Only you can see this post</p>}
      <PostBody body={post.body} place={post.place} placeId={post.place_id} region={post.region} />
      {post.plan && <PlanAttachment plan={post.plan} />}
      <footer className="mt-4 flex items-center gap-2">
        <button type="button" onClick={like} aria-pressed={post.liked} aria-label={`${post.liked ? 'Unlike' : 'Like'} · ${post.likes} likes`}
          className={`${pill} ${post.liked ? 'bg-[#c8da4a] text-[#14261b]' : 'bg-[#f2f0e8] text-[#14261b]/80 hover:bg-[#e9e7dc]'}`}>
          <Heart aria-hidden="true" className="h-[18px] w-[18px]" fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
        </button>
        <button type="button" onClick={() => onComments(post)} aria-label={`Comments · ${post.comments}`} className={`${pill} bg-[#f2f0e8] text-[#14261b]/80 hover:bg-[#e9e7dc]`}>
          <MessageSquare aria-hidden="true" className="h-[18px] w-[18px]" /> {post.comments}
        </button>
      </footer>
    </article>
  );
}
