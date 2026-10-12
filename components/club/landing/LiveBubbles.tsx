'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Avatar } from '../ui';
import { GENERATION_LABEL } from '../api';

interface Bubble { key: string; name: string; generation: string; avatar_url: string | null; vibe_line: string | null }

/**
 * Members online right now (first names or club names only), as a floating card on the hero. Tap a
 * face for a preview that leads into the club chat. Nobody online shows a quiet line, never fake faces.
 */
export function LiveBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[] | null>(null);
  const [open, setOpen] = useState<Bubble | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => fetch('/api/club/bubbles', { cache: 'no-store' }).then((r) => r.json()).then((d) => live && setBubbles(d?.bubbles ?? [])).catch(() => live && setBubbles([]));
    load();
    const t = setInterval(load, 20_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const shown = (bubbles || []).slice(0, 5);
  return (
    <div className="relative w-[260px] rounded-[24px] bg-white/90 p-4 shadow-[0_24px_48px_-24px_rgba(20,38,27,0.6)] backdrop-blur-md" aria-label={`${bubbles?.length ?? 0} members online now`}>
      <p className="flex items-center gap-2 text-xs font-semibold text-[#14261b]">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2f9e57] opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#2f9e57]" /></span>
        Online in the club now
      </p>
      {shown.length > 0 ? (
        <div className="mt-3 flex items-center">
          {shown.map((b) => (
            <button key={b.key} type="button" onClick={() => setOpen(b)} aria-label={`${b.name}, ${GENERATION_LABEL[b.generation] || ''}`} className="-ml-2 rounded-full ring-2 ring-white transition hover:-translate-y-0.5 first:ml-0">
              <Avatar url={b.avatar_url} name={b.name} size={38} />
            </button>
          ))}
          {(bubbles?.length ?? 0) > shown.length && <span className="-ml-2 grid h-[38px] w-[38px] place-items-center rounded-full bg-[#c8da4a] text-xs font-bold text-[#14261b] ring-2 ring-white">+{(bubbles?.length ?? 0) - shown.length}</span>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#14261b]/65">{bubbles === null ? 'Checking who is around…' : 'Members light up here when they’re online ✨'}</p>
      )}
      {open && (
        <div role="dialog" aria-label={`${open.name}'s preview`} className="absolute left-0 top-full z-10 mt-2 w-full rounded-[22px] bg-white p-4 shadow-2xl">
          <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1 text-[#14261b]/50 hover:bg-[#f2f0e8] hover:text-[#14261b]"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3">
            <Avatar url={open.avatar_url} name={open.name} size={44} ring />
            <div><p className="font-semibold">{open.name}</p><p className="text-xs text-[#14261b]/60">{GENERATION_LABEL[open.generation]} · <span className="text-[#2f9e57]">online now</span></p></div>
          </div>
          {open.vibe_line && <p className="mt-2.5 text-sm italic text-[#14261b]/75">“{open.vibe_line}”</p>}
          <Link href="/club/chat" className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#17301f] text-sm font-semibold text-[#f6f4ec]">Say hi in the club chat</Link>
          <p className="mt-1.5 text-center text-[11px] text-[#14261b]/55">Members only. Sign in or apply first.</p>
        </div>
      )}
    </div>
  );
}
