'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, MessageCircle, Search } from 'lucide-react';
import { Avatar, Badge, Empty, field } from '../ui';
import { clubFetch, GENERATION_LABEL } from '../api';
import { ReportButton } from '../ReportButton';
import { useClub } from '../club-context';

interface Member { user_id: string; name: string; viber_id: string | null; generation: string; city: string; vibe_line: string | null; avatar_url: string | null; account_type: string }

/** Who is in the club right now. Refreshes every 20 s; filters by generation, city and Viber ID. */
export function LiveGrid() {
  const { me } = useClub();
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [generation, setGeneration] = useState('');
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ generation, city, q });
    const res = await clubFetch(`/presence?${params}`);
    if (res.ok) setMembers(res.data.members);
  }, [generation, city, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    const every = setInterval(load, 20_000);
    return () => { clearTimeout(t); clearInterval(every); };
  }, [load]);

  const message = async (userId: string) => {
    const res = await clubFetch('/rooms/dm', { body: { user_id: userId } });
    if (res.ok) router.push(`/club/chat/${res.data.roomId}`);
  };

  return (
    <section aria-labelledby="live-now">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="live-now" className="flex items-center gap-2 text-lg font-semibold">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
          Live now {members && <span className="text-sm font-normal text-[#2a1250]/50">· {members.length}</span>}
        </h2>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Generation" className={`${field} w-auto py-2`} value={generation} onChange={(e) => setGeneration(e.target.value)}>
            <option value="">All generations</option>
            {Object.entries(GENERATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input aria-label="City" className={`${field} w-32 py-2`} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <span className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#2a1250]/40" />
            <input aria-label="Search by Viber ID or name" className={`${field} w-44 py-2 pl-8`} placeholder="@viber or name" value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m) => (
          <article key={m.user_id} className="flex gap-3 rounded-3xl border border-[#2a1250]/10 bg-white/85 p-4">
            <span className="relative">
              <Avatar url={m.avatar_url} name={m.name} size={48} />
              <span aria-hidden="true" className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.name}{m.user_id === me.user?.id && <span className="font-normal text-[#2a1250]/45"> · you</span>}</p>
              <p className="truncate text-xs text-[#2a1250]/55">{m.viber_id ?? 'Masked member'}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge tone="aura">{GENERATION_LABEL[m.generation]}</Badge>
                <span className="inline-flex items-center gap-0.5 text-[11px] text-[#2a1250]/55"><MapPin aria-hidden="true" className="h-3 w-3" />{m.city}</span>
              </div>
              {m.vibe_line && <p className="mt-2 line-clamp-2 text-sm italic text-[#2a1250]/70">“{m.vibe_line}”</p>}
              {m.user_id !== me.user?.id && (
                <div className="mt-2 flex items-center gap-1">
                  <button type="button" onClick={() => message(m.user_id)} className="inline-flex items-center gap-1 rounded-full bg-[#7c3aed] px-3 py-1 text-xs font-semibold text-white">
                    <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" /> Message
                  </button>
                  <ReportButton type="user" id={m.user_id} compact label={`Report ${m.name}`} />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {members && members.length === 0 && <div className="mt-4"><Empty title="Quiet right now">Nobody matches these filters. Members appear here while their club tab is open.</Empty></div>}
    </section>
  );
}
