'use client';

import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';

interface LobbyPostActionsProps {
  post: LobbyPostView;
  repliesOpen: boolean;
  onLike: () => void;
  onToggleReplies: () => void;
}

const BUTTON = 'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer';
const IDLE = 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900';

/** Like and Reply under a post, each with its count. */
export function LobbyPostActions({ post, repliesOpen, onLike, onToggleReplies }: LobbyPostActionsProps) {
  return (
    <div className="mt-3 flex items-center gap-1 border-t border-neutral-100 pt-2">
      <button
        type="button"
        onClick={onLike}
        aria-pressed={post.liked}
        className={`${BUTTON} ${post.liked ? 'bg-rose-50 text-rose-600' : IDLE}`}
      >
        <Heart className={`h-3.5 w-3.5 ${post.liked ? 'fill-rose-500' : ''}`} />
        {post.liked ? 'Liked' : 'Like'}
        {post.likes > 0 && <span className="tabular-nums">{post.likes}</span>}
      </button>
      <button
        type="button"
        onClick={onToggleReplies}
        aria-expanded={repliesOpen}
        className={`${BUTTON} ${repliesOpen ? 'bg-neutral-100 text-neutral-950' : IDLE}`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Reply
        {post.replies > 0 && <span className="tabular-nums">{post.replies}</span>}
      </button>
    </div>
  );
}

export default LobbyPostActions;
