import React from 'react';
import type { PrivateChatMessage } from '@/lib/store/guest-lobby.store';

/** One message in a private chat: the guest's own on the right in black, the other table's on the left, each with its time. */
export function ChatBubble({ message, mine }: { message: PrivateChatMessage; mine: boolean }) {
  const time = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[75%] break-words rounded-2xl px-4 py-2 text-xs font-normal leading-relaxed ${mine ? 'rounded-br-xs bg-black text-white' : 'rounded-bl-xs bg-zinc-100 text-zinc-900'}`}>
        {message.message}
      </div>
      <span className="mt-1 px-1 text-[10px] text-zinc-400">{time}</span>
    </div>
  );
}
