'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send } from 'lucide-react';
import type { ActivePrivateChat, PrivateChatMessage } from '@/lib/store/guest-lobby.store';

interface Props {
  chat: ActivePrivateChat;
  currentSessionId: string;
  currentUserName: string;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<void>;
}

export function PrivateChatModal({
  chat,
  currentSessionId,
  currentUserName,
  onClose,
  onSendMessage,
}: Props) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await onSendMessage(textToSend);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-xs">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 border-t sm:border border-zinc-200 shadow-xl text-zinc-900 flex flex-col h-[80vh] sm:h-[600px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-medium text-black">
              {chat.partner_name}
            </h3>
            <p className="text-xs text-zinc-400">
              {chat.partner_table} • Private Chat
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-black transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {chat.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-zinc-400 font-light">
              Connected with {chat.partner_name}. Say hello!
            </div>
          ) : (
            chat.messages.map((msg) => {
              const isMine = msg.sender_session_id === currentSessionId;
              const timeStr = msg.created_at
                ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-xs font-normal leading-relaxed break-words ${
                      isMine
                        ? 'bg-black text-white rounded-br-xs'
                        : 'bg-zinc-100 text-zinc-900 rounded-bl-xs'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 px-1">{timeStr}</span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="pt-3 border-t border-zinc-100 flex items-center gap-2">
          <input
            type="text"
            placeholder={`Message ${chat.partner_name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-600 focus:border-black focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
