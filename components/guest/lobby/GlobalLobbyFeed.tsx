// components/guest/lobby/GlobalLobbyFeed.tsx
'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import type { LobbyPublicMessage } from '@/lib/store/guest-lobby.store';
import { useSocialFeed } from './useSocialFeed';
import { LoungeComposer } from './LoungeComposer';
import { LoungePostCard } from './LoungePostCard';
import { LoungeHeader } from './LoungeHeader';
import { LobbyFeedSkeleton } from './LobbyFeedSkeleton';
import { LobbyFeedEmpty } from './LobbyFeedEmpty';
import { SocialMediaLightbox } from './SocialMediaLightbox';

export interface GlobalLobbyFeedProps {
  cafeId?: string;
  messages?: LobbyPublicMessage[];
  currentSessionId?: string;
  currentUserName?: string;
  currentUserTable?: string;
  onPostMessage?: (content: string) => Promise<void>;
  /** False while the guest is only browsing; the composer becomes a "Join" prompt. */
  canPost?: boolean;
  onRequestJoin?: () => void;
}

export function GlobalLobbyFeed({
  cafeId = '',
  messages: externalMessages,
  currentSessionId,
  currentUserName = 'You',
  currentUserTable = 'T-01',
  onPostMessage,
  canPost = true,
  onRequestJoin,
}: GlobalLobbyFeedProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const feed = useSocialFeed({
    cafeId,
    messages: externalMessages,
    currentSessionId,
    currentUserName,
    currentUserTable,
    onPostMessage,
    textareaRef,
  });

  const orderedPosts = useMemo(() => Array.from(feed.posts).reverse(), [feed.posts]);

  useEffect(() => {
    if (!feed.mounted) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed.posts.length, feed.mounted]);

  if (!feed.mounted) return <LobbyFeedSkeleton />;

  const activeTablesSet = new Set(feed.posts.map((p) => p.table));
  const activeTablesCount = activeTablesSet.size;
  const participants = Array.from(activeTablesSet).slice(0, 5);

  return (
    <>
      <div className="relative w-full rounded-3xl overflow-hidden border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-[calc(100dvh-17rem)] min-h-[420px] max-h-[760px]">
        <LoungeHeader activeTablesCount={activeTablesCount} participants={participants} />

        <div
          className="relative z-10 flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 overscroll-contain bg-[#faf9f6]/60"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {orderedPosts.length === 0 ? (
            <LobbyFeedEmpty />
          ) : (
            orderedPosts.map((post) => (
              <LoungePostCard
                key={post.id}
                post={post}
                liked={!!feed.likedIds[post.id]}
                isOwn={post.author === currentUserName}
                openThreadId={feed.openThreadId}
                onLike={() => feed.handleLike(post.id)}
                onToggleThread={() => feed.toggleThread(post.id)}
                onAddReply={feed.handleAddReply}
                onOpenPhoto={feed.setSelectedPhoto}
                currentUserName={currentUserName}
                currentUserTable={currentUserTable}
              />
            ))
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        <div className="relative z-10 shrink-0">
          {!canPost ? (
            <div className="border-t border-neutral-100 bg-white px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">You&apos;re browsing. Join to send messages.</p>
              <button type="button" onClick={onRequestJoin} className="shrink-0 rounded-2xl bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer">
                Join the chat
              </button>
            </div>
          ) : (
          <LoungeComposer
            newPost={feed.newPost}
            setNewPost={feed.setNewPost}
            imagePreview={feed.imagePreview}
            onClearImage={feed.clearImage}
            onSelectImage={feed.handleImageSelect}
            onSubmit={feed.handleSubmit}
            isSubmitting={feed.isSubmitting}
            textareaRef={textareaRef}
            currentUserName={currentUserName}
            currentUserTable={currentUserTable}
          />
          )}
        </div>
      </div>

      <SocialMediaLightbox
        imageUrl={feed.selectedPhoto}
        onClose={() => feed.setSelectedPhoto(null)}
      />
    </>
  );
}

export default GlobalLobbyFeed;
