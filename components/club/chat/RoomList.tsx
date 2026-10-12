'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarHeart, Globe } from 'lucide-react';
import { Avatar, FOCUS, Spinner } from '../ui';
import { clubFetch } from '../api';

export interface RoomsData {
  global: { id: string; unread: number };
  rooms: Array<{ id: string; kind: 'dm' | 'event'; title: string; peer: { avatar_url: string | null; name: string } | null; unread: number }>;
}

function Unread({ n }: { n: number }) {
  return n > 0 ? <span className="ml-auto rounded-full bg-[#c8da4a] px-2 py-0.5 text-[10px] font-bold text-[#14261b]">{n > 98 ? '99+' : n}</span> : null;
}

const Tile = ({ icon: Icon }: { icon: typeof Globe }) => (
  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e1efe3] text-[#3c6b2b]"><Icon aria-hidden="true" className="h-5 w-5" /></span>
);

/** The inbox: the club chat, then DMs and plan rooms, each with its unread count. */
export function RoomList({ activeId, onLoaded }: { activeId: string | null; onLoaded?: (data: RoomsData) => void }) {
  const [data, setData] = useState<RoomsData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = () => clubFetch<RoomsData>('/rooms').then((r) => { if (r.ok) { setData(r.data); onLoaded?.(r.data); setError(''); } else setError(r.error); });
    void load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const item = (id: string) =>
    `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${id === activeId ? 'bg-[#14261b]/[0.07]' : 'hover:bg-[#14261b]/[0.04]'} ${FOCUS}`;
  const sub = (text: string, unread: number) => <span className={`block truncate text-xs ${unread ? 'font-semibold text-[#14261b]/85' : 'text-[#14261b]/60'}`}>{text}</span>;

  if (!data) return error ? <p role="alert" className="px-3 py-2 text-sm text-red-700">{error}</p> : <Spinner />;
  return (
    <nav aria-label="Chats" className="space-y-1">
      <Link href={`/club/chat/${data.global.id}`} className={item(data.global.id)} aria-current={data.global.id === activeId ? 'page' : undefined}>
        <Tile icon={Globe} />
        <span className="min-w-0"><span className="block truncate font-semibold">Club chat</span>{sub('Everyone in the club', data.global.unread)}</span>
        <Unread n={data.global.unread} />
      </Link>
      {data.rooms.map((r) => (
        <Link key={r.id} href={`/club/chat/${r.id}`} className={item(r.id)} aria-current={r.id === activeId ? 'page' : undefined}>
          {r.kind === 'dm' ? <Avatar url={r.peer?.avatar_url} name={r.title} size={48} /> : <Tile icon={CalendarHeart} />}
          <span className="min-w-0"><span className="block truncate font-semibold">{r.title}</span>{sub(r.kind === 'dm' ? 'Direct message' : 'Plan discussion', r.unread)}</span>
          <Unread n={r.unread} />
        </Link>
      ))}
      {data.rooms.length === 0 && <p className="px-3 py-3 text-xs leading-relaxed text-[#14261b]/60">Message someone from Community, or say you&apos;re interested in a plan, to start more chats.</p>}
    </nav>
  );
}
