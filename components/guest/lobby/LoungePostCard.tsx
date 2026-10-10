// components/guest/lobby/LoungePostCard.tsx
'use client';

import React from 'react';
import type { LobbyPost } from './types';
import { useTypewriter } from './useTypewriter';
import { LoungeThreadDrawer } from './LoungeThreadDrawer';
import { LoungePostActions } from './LoungePostActions';
import { LoungePostMedia } from './LoungePostMedia';

interface LoungePostCardProps {
  post: LobbyPost;
  liked: boolean;
  isOwn: boolean;
  openThreadId: string | null;
  onLike: () => void;
  onToggleThread: () => void;
  onAddReply: (postId: string, content: string) => void;
  onOpenPhoto: (url: string) => void;
  currentUserName: string;
  currentUserTable: string;
}

export function LoungePostCard({
  post,
  liked,
  isOwn,
  openThreadId,
  onLike,
  onToggleThread,
  onAddReply,
  onOpenPhoto,
  currentUserName,
}: LoungePostCardProps) {
  const body = useTypewriter(post.content, !!post.isNew);
  const typing = post.isNew && body.length < post.content.length;
  const replyCount = post.replies?.length ?? 0;
  const isThreadOpen = openThreadId === post.id;
  const initial = (post.author || 'G').trim()[0]?.toUpperCase() ?? 'G';

  return (
    <div
      className={`group flex gap-2.5 sm:gap-3 w-full ${
        isOwn ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
      }`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
        isOwn ? 'bg-neutral-950 border-neutral-950' : 'bg-[#faf8f5] border-[#e8e2d5]'
      }`}>
        <span className={`font-serif text-xs font-semibold ${isOwn ? 'text-white' : 'text-neutral-700'}`}>{initial}</span>
      </div>

      {/* Bubble Column */}
      <div
        className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[76%] min-w-0 ${
          isOwn ? 'items-end' : 'items-start'
        }`}
      >
        {/* Subtle, Clutter-Free Meta */}
        <div
          className={`flex items-center gap-1.5 text-[11px] text-neutral-400 px-1 ${
            isOwn ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="font-medium text-neutral-700">{isOwn ? 'You' : post.author}</span>
          <span>·</span>
          <span>{post.table?.toLowerCase().includes('vip') ? 'Venue' : post.table}</span>
          <span>·</span>
          <span>{post.timestamp}</span>
        </div>

        {/* Message Bubble */}
        <div
          className={`relative rounded-2xl p-3 sm:p-3.5 transition-all duration-150 break-words ${
            isOwn
              ? 'bg-neutral-950 text-white rounded-tr-md'
              : 'bg-white text-neutral-900 border border-neutral-200 rounded-tl-md shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
          }`}
        >
          {post.imageUrl && (
            <LoungePostMedia imageUrl={post.imageUrl} onOpenPhoto={onOpenPhoto} />
          )}

          {(body || typing) && (
            <p className={`text-sm leading-relaxed font-sans break-words whitespace-pre-wrap ${isOwn ? 'text-white' : 'text-neutral-800'}`}>
              {body}
              {typing && (
                <span className={`inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle ${isOwn ? 'bg-white/70' : 'bg-neutral-400'}`} />
              )}
            </p>
          )}

          <LoungePostActions
            likes={post.likes}
            liked={liked}
            replyCount={replyCount}
            isOwn={isOwn}
            onLike={onLike}
            onToggleThread={onToggleThread}
          />
        </div>

        {/* Inline Thread Drawer */}
        {isThreadOpen && (
          <LoungeThreadDrawer
            postId={post.id}
            replies={post.replies || []}
            currentUserName={currentUserName}
            onClose={onToggleThread}
            onAddReply={onAddReply}
          />
        )}
      </div>
    </div>
  );
}

export default LoungePostCard;
