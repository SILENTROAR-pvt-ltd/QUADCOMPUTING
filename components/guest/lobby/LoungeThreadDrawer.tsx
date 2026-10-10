// components/guest/lobby/LoungeThreadDrawer.tsx
'use client';

import React, { useState } from 'react';
import { CornerDownRight, Send, X } from 'lucide-react';
import type { ThreadReply } from './types';

interface LoungeThreadDrawerProps {
  postId: string;
  replies: ThreadReply[];
  currentUserName: string;
  onClose: () => void;
  onAddReply: (postId: string, content: string) => void;
}

export function LoungeThreadDrawer({
  postId,
  replies,
  currentUserName,
  onClose,
  onAddReply,
}: LoungeThreadDrawerProps) {
  const [replyText, setReplyText] = useState('');

  const sendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onAddReply(postId, replyText.trim());
    setReplyText('');
  };

  return (
    <div className="w-full mt-1.5 bg-white border border-neutral-200 rounded-2xl p-3 space-y-2.5 animate-in fade-in duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
        <span className="font-serif text-xs font-normal text-neutral-900">
          Replies {replies.length > 0 && `(${replies.length})`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-900 transition-colors p-1 cursor-pointer"
          aria-label="Close thread"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Replies List */}
      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
        {replies.length === 0 ? (
          <p className="text-xs text-neutral-400 italic py-1">No replies yet.</p>
        ) : (
          replies.map((r) => (
            <div key={r.id} className="flex items-start gap-2 text-xs">
              <CornerDownRight className="w-3 h-3 text-neutral-300 shrink-0 mt-1" />
              <div className="bg-[#faf9f6] border border-neutral-100 rounded-xl px-2.5 py-2 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mb-0.5">
                  <span className="font-medium text-neutral-800">{r.author}</span>
                  <span>·</span>
                  <span>{r.table}</span>
                  <span>·</span>
                  <span>{r.timestamp}</span>
                </div>
                <p className="text-neutral-800 leading-relaxed break-words">{r.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Input Form */}
      <form onSubmit={sendReply} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={`Reply as ${currentUserName}...`}
          className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white"
          maxLength={200}
          aria-label="Write a reply"
        />
        <button
          type="submit"
          disabled={!replyText.trim()}
          className="px-2.5 py-1.5 rounded-xl bg-neutral-950 text-white font-medium text-xs hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          aria-label="Send reply"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
}

export default LoungeThreadDrawer;
