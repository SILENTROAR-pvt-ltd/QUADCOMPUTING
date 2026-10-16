'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import type { ActivePrivateChat } from '@/lib/store/guest-lobby.store';
import { ChatBubble } from './interaction/ChatBubble';

interface Props {
  chat: ActivePrivateChat;
  currentSessionId: string;
  currentUserName: string;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<void>;
}

/** A private chat with another table: the conversation (kept at the latest message) and a box to reply. */
export function PrivateChatModal({ chat, currentSessionId, onClose, onSendMessage }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement | null>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const out = text.trim();
    if (!out || sending) return;
    setText('');
    setSending(true);
    try { await onSendMessage(out); } catch { setText(out); } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/30 backdrop-blur-xs sm:items-center">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="flex h-[80dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl sm:h-[600px] sm:rounded-3xl sm:border">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-medium text-black">{chat.partner_name}</h3>
            <p className="text-xs text-zinc-400">{chat.partner_table} • Private Chat</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close chat" className="-mr-2 grid h-10 w-10 cursor-pointer place-items-center text-zinc-400 hover:text-black"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain py-4 pr-1">
          {chat.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-xs font-light text-zinc-400">Connected with {chat.partner_name}. Say hello!</div>
          ) : (
            chat.messages.map((m) => <ChatBubble key={m.id} message={m} mine={m.sender_session_id === currentSessionId} />)
          )}
          <div ref={end} />
        </div>

        <form onSubmit={send} className="flex items-center gap-2 border-t border-zinc-100 pt-3">
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${chat.partner_name}...`} aria-label="Your message"
            className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-[16px] text-zinc-900 transition-colors placeholder:text-zinc-500 focus:border-black focus:outline-none sm:text-xs" />
          <button type="submit" disabled={!text.trim() || sending} aria-label="Send"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black text-white transition-colors hover:bg-zinc-800 active:scale-95 disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
