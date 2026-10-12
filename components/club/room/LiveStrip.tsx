'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Faces } from '../ui-extra';
import { clubFetch } from '../api';
import { useClub } from '../club-context';

interface Online { user_id: string; name: string; avatar_url: string | null }

/** "N vibers online now" with a few faces, linking to Community. Refreshes every 30 s. */
export function LiveStrip() {
  const { me } = useClub();
  const [online, setOnline] = useState<Online[] | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => clubFetch('/presence').then((r) => { if (live && r.ok) setOnline(r.data.members); });
    void load();
    const t = setInterval(load, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const others = (online || []).filter((m) => m.user_id !== me.user?.id);
  if (!online) return null;
  return (
    <Link href="/club/community" className="group flex items-center gap-3 rounded-full bg-[#17301f] py-2.5 pl-4 pr-2.5 text-[#f6f4ec] shadow-[0_16px_34px_-22px_rgba(23,48,31,0.9)] transition hover:bg-[#1c3826]">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c8da4a] opacity-70 motion-reduce:hidden" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#c8da4a]" />
      </span>
      {others.length > 0 && <Faces people={others.slice(0, 3)} total={others.length} size={28} ring="ring-[#17301f]" />}
      <span className="min-w-0 flex-1 truncate text-sm">
        {others.length > 0
          ? <><span className="font-semibold text-[#c8da4a]">{others.length} {others.length === 1 ? 'viber' : 'vibers'}</span> online now</>
          : <span className="text-[#f6f4ec]/80">You are the first one here. Say hi in the club chat.</span>}
      </span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c8da4a] text-[#14261b] transition group-hover:translate-x-0.5"><ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
    </Link>
  );
}
