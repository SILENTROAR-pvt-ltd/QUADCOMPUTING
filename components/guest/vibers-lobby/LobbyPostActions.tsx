'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';

interface LobbyPostActionsProps {
  post: LobbyPostView;
  repliesOpen: boolean;
  onLike: () => void;
  onToggleReplies: () => void;
}

const BUTTON = 'inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors cursor-pointer active:scale-95';
const IDLE = 'text-neutral-600 hover:bg-black/[0.04]';

/** Like and Comment under a post, each with its count. The heart pops when liked, and the count changes the moment it is tapped. */
export function LobbyPostActions({ post, repliesOpen, onLike, onToggleReplies }: LobbyPostActionsProps) {
  const calm = useReducedMotion();
  return (
    <div className="mt-2 flex items-center gap-1 border-t border-black/[0.06] pt-2">
      <button
        type="button"
        onClick={onLike}
        aria-pressed={post.liked}
        aria-label={post.liked ? `Unlike, ${post.likes} likes` : `Like, ${post.likes} likes`}
        className={`${BUTTON} ${post.liked ? 'bg-rose-50 text-rose-600' : IDLE}`}
      >
        <motion.span
          key={post.liked ? 'on' : 'off'}
          initial={calm || !post.liked ? false : { scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          className="inline-flex"
        >
          <Heart className={`h-[18px] w-[18px] ${post.liked ? 'fill-rose-500' : ''}`} aria-hidden />
        </motion.span>
        <span className="tabular-nums">{post.likes > 0 ? post.likes : 'Like'}</span>
      </button>
      <button
        type="button"
        onClick={onToggleReplies}
        aria-expanded={repliesOpen}
        aria-label={`Comments, ${post.replies}`}
        className={`${BUTTON} ${repliesOpen ? 'bg-black/[0.06] text-neutral-950' : IDLE}`}
      >
        <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
        <span className="tabular-nums">{post.replies > 0 ? post.replies : 'Comment'}</span>
      </button>
    </div>
  );
}

export default LobbyPostActions;
