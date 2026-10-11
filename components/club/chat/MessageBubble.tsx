'use client';

import React, { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { Avatar } from '../ui';
import { clubFetch } from '../api';
import { ReportButton } from '../ReportButton';

export const REACTIONS = ['❤️', '🔥', '😂', '👏', '🙌', '😮', '😢', '👍'];

export interface ChatMessage {
  id: string;
  body: string;
  created_at: string;
  mine: boolean;
  image_url: string | null;
  sender: { user_id: string; name: string; viber_id: string | null; avatar_url: string | null } | null;
  reactions: Array<{ emoji: string; count: number; mine: boolean }>;
}

export function MessageBubble({ m, onChanged }: { m: ChatMessage; onChanged: () => void }) {
  const [picking, setPicking] = useState(false);
  const react = async (emoji: string, on: boolean) => {
    setPicking(false);
    const res = await clubFetch(`/messages/${m.id}/reactions`, { body: { emoji, on } });
    if (res.ok) onChanged();
  };
  const name = m.sender?.name || 'Former member';
  const time = new Date(m.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={`group flex gap-2 ${m.mine ? 'flex-row-reverse' : ''}`}>
      {!m.mine && <Avatar url={m.sender?.avatar_url} name={name} size={32} />}
      <div className={`flex max-w-[80%] flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
        {!m.mine && <p className="mb-0.5 text-[11px] font-semibold text-[#2a1250]/60">{name}</p>}
        <div className={`rounded-2xl px-3.5 py-2 text-sm ${m.mine ? 'rounded-br-md bg-[#7c3aed] text-white' : 'rounded-bl-md border border-[#2a1250]/10 bg-white'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.image_url && <img src={m.image_url} alt="Shared photo" className="mb-1.5 max-h-72 rounded-xl object-cover" />}
          {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {m.reactions.map((r) => (
            <button key={r.emoji} type="button" onClick={() => react(r.emoji, !r.mine)} aria-pressed={r.mine}
              className={`rounded-full border px-1.5 py-0.5 text-xs ${r.mine ? 'border-[#7c3aed] bg-[#2a1250]/[0.06]' : 'border-[#2a1250]/10 bg-white'}`}>
              {r.emoji} {r.count}
            </button>
          ))}
          <span className="text-[10px] text-[#2a1250]/40">{time}</span>
          <span className="relative opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <button type="button" onClick={() => setPicking((v) => !v)} aria-label="Add reaction" className="rounded-full p-1 text-[#2a1250]/45 hover:bg-[#2a1250]/[0.05]"><SmilePlus className="h-3.5 w-3.5" /></button>
            {picking && (
              <span className={`absolute bottom-7 z-10 flex gap-0.5 rounded-full border border-[#2a1250]/10 bg-white p-1 shadow-lg ${m.mine ? 'right-0' : 'left-0'}`}>
                {REACTIONS.map((e) => <button key={e} type="button" onClick={() => react(e, true)} className="rounded-full px-1 text-base hover:bg-[#2a1250]/[0.05]">{e}</button>)}
              </span>
            )}
          </span>
          {!m.mine && <span className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"><ReportButton type="message" id={m.id} compact label="Report message" /></span>}
        </div>
      </div>
    </div>
  );
}
