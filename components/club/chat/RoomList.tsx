'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarHeart, Globe2 } from 'lucide-react';
import { Avatar } from '../ui';
import { clubFetch } from '../api';

export interface RoomsData {
  global: { id: string; unread: number };
  rooms: Array<{ id: string; kind: 'dm' | 'event'; title: string; peer: { avatar_url: string | null; name: string } | null; unread: number }>;
}

function Unread({ n }: { n: number }) {
  return n > 0 ? <span className="ml-auto rounded-full bg-[#7c3aed] px-2 py-0.5 text-[10px] font-bold text-white">{n > 98 ? '99+' : n}</span> : null;
}

/** The global club chat, then DMs and plan rooms, each with its unread count. */
export function RoomList({ activeId, onLoaded }: { activeId: string | null; onLoaded?: (data: RoomsData) => void }) {
  const [data, setData] = useState<RoomsData | null>(null);
  useEffect(() => {
    const load = () => clubFetch<RoomsData>('/rooms').then((r) => { if (r.ok) { setData(r.data); onLoaded?.(r.data); } });
    void load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const item = (id: string) =>
    `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${id === activeId ? 'bg-[#7c3aed] text-white' : 'hover:bg-[#2a1250]/[0.04]'}`;

  return (
    <nav aria-label="Chats" className="space-y-1">
      {data && (
        <Link href="/club/chat" className={item(data.global.id)} aria-current={data.global.id === activeId ? 'page' : undefined}>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3ebff] text-[#2a1250]"><Globe2 className="h-4 w-4" /></span>
          <span className="font-semibold">Club chat</span><Unread n={data.global.unread} />
        </Link>
      )}
      {data?.rooms.map((r) => (
        <Link key={r.id} href={`/club/chat/${r.id}`} className={item(r.id)} aria-current={r.id === activeId ? 'page' : undefined}>
          {r.kind === 'dm'
            ? <Avatar url={r.peer?.avatar_url} name={r.title} size={36} />
            : <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3ebff] text-[#2a1250]"><CalendarHeart className="h-4 w-4" /></span>}
          <span className="min-w-0 truncate">{r.title}</span><Unread n={r.unread} />
        </Link>
      ))}
      {data && data.rooms.length === 0 && <p className="px-3 py-2 text-xs text-[#2a1250]/50">Message someone from Live now, or join a plan, to start more chats.</p>}
    </nav>
  );
}
