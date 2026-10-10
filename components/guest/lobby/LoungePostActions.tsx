// components/guest/lobby/LoungePostActions.tsx
'use client';

import React from 'react';
import { Heart, MessageSquare } from 'lucide-react';

interface LoungePostActionsProps {
  likes: number;
  liked: boolean;
  replyCount: number;
  isOwn: boolean;
  onLike: () => void;
  onToggleThread: () => void;
}

export function LoungePostActions({
  likes,
  liked,
  replyCount,
  isOwn,
  onLike,
  onToggleThread,
}: LoungePostActionsProps) {
  // Own messages sit on a dark bubble, everyone else's on a white one.
  const idle = isOwn ? 'text-white/60 hover:text-white' : 'text-neutral-400 hover:text-neutral-900';
  const on = isOwn ? 'text-white' : 'text-rose-600';

  return (
    <div
      className={`flex items-center gap-3 pt-2 mt-1 border-t ${isOwn ? 'border-white/10 justify-end' : 'border-neutral-100 justify-start'}`}
    >
      <button
        type="button"
        onClick={onLike}
        className={`flex items-center gap-1 text-xs transition-colors cursor-pointer select-none active:scale-95 ${liked ? `${on} font-medium` : idle}`}
        aria-label={liked ? 'Unlike message' : 'Like message'}
        aria-pressed={liked}
      >
        <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
        {likes > 0 && <span>{likes}</span>}
      </button>

      <button
        type="button"
        onClick={onToggleThread}
        className={`flex items-center gap-1 text-xs transition-colors cursor-pointer select-none active:scale-95 ${idle}`}
        aria-label="Reply to message"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>{replyCount > 0 ? `${replyCount}` : 'Reply'}</span>
      </button>
    </div>
  );
}

export default LoungePostActions;
