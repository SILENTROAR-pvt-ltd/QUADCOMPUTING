'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, MessageSquare } from 'lucide-react';
import { Avatar, FOCUS } from '../ui';
import { GENERATION_LABEL } from '../api';
import { ReportButton } from '../ReportButton';

export interface LiveMember { user_id: string; name: string; handle: string | null; generation: string; city: string; vibe_line: string | null; avatar_url: string | null; account_type: string }

/** A member who is online now: face, name, generation, city, vibe line, and a way to say hi. */
export function MemberCard({ m, isMe, onMessage }: { m: LiveMember; isMe: boolean; onMessage: (id: string) => void }) {
  const profile = `/club/members/${m.user_id}`;
  return (
    <article className="flex gap-3.5 rounded-[28px] border border-[#14261b]/[0.05] bg-[#fbfaf6] p-4 shadow-[0_18px_40px_-32px_rgba(20,38,27,0.55)]">
      <Link href={profile} className={`relative h-fit shrink-0 rounded-full ${FOCUS}`} aria-label={`${m.name}'s profile`}>
        <Avatar url={m.avatar_url} name={m.name} size={52} />
        <span aria-hidden="true" className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#2f9e57]" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={profile} className="block truncate font-semibold hover:underline">{m.name}{isMe && <span className="font-normal text-[#14261b]/60"> · you</span>}</Link>
        <p className="truncate text-xs text-[#14261b]/60">{m.handle ? `@${m.handle}` : 'Club name only'}{m.account_type === 'business' ? ' · Business' : ''}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full bg-[#e1efe3] px-2 py-0.5 font-semibold text-[#2f5d1f]">{GENERATION_LABEL[m.generation]}</span>
          <span className="inline-flex items-center gap-0.5 text-[#14261b]/65"><MapPin aria-hidden="true" className="h-3 w-3" />{m.city}</span>
        </div>
        {m.vibe_line && <p className="mt-2 line-clamp-2 text-sm italic text-[#14261b]/75">“{m.vibe_line}”</p>}
        {!isMe && (
          <div className="mt-3 flex items-center gap-1">
            <button type="button" onClick={() => onMessage(m.user_id)} className={`inline-flex items-center gap-1.5 rounded-full bg-[#17301f] px-3.5 py-2 text-xs font-bold text-[#f6f4ec] transition hover:bg-[#22432c] ${FOCUS}`}>
              <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" /> Message
            </button>
            <ReportButton type="user" id={m.user_id} compact label={`Report ${m.name}`} />
          </div>
        )}
      </div>
    </article>
  );
}
