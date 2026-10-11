'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { AURA } from '@/components/club/theme';
import { Avatar, Notice } from '../ui';
import { clubFetch, uploadMedia } from '../api';
import { useClub } from '../club-context';
import { StoryViewer, type StoryGroup } from './StoryViewer';

/** 24-hour stories from members, newest first, with an "add yours" bubble. */
export function StoriesRail() {
  const { me } = useClub();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [open, setOpen] = useState<StoryGroup | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await clubFetch('/stories');
    if (res.ok) setGroups(res.data.groups);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const add = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    setBusy(true);
    const up = await uploadMedia('stories', f);
    if (!up.ok) { setBusy(false); return setError(up.error); }
    const caption = window.prompt('Add a caption (optional)') || '';
    const res = await clubFetch('/stories', { body: { media_path: up.data.path, caption } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    void load();
  };

  return (
    <section aria-label="Stories">
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        <button type="button" onClick={() => file.current?.click()} disabled={busy} className="flex w-16 shrink-0 flex-col items-center gap-1 text-[11px] text-[#2a1250]/65">
          <span className="relative">
            <Avatar url={me.profile?.avatar_url} name={me.profile?.alias || me.viberId || 'You'} size={60} />
            <span className={`absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white ${AURA} text-white`}><Plus className="h-3.5 w-3.5" /></span>
          </span>
          {busy ? 'Posting…' : 'Your story'}
        </button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="hidden" onChange={(e) => { void add(e.target.files?.[0]); e.target.value = ''; }} />
        {groups.map((g) => (
          <button key={g.member.user_id} type="button" onClick={() => setOpen(g)} className="flex w-16 shrink-0 flex-col items-center gap-1 text-[11px] text-[#2a1250]/75">
            <span className={`rounded-full p-[2px] ${AURA}`}><span className="block rounded-full border-2 border-white"><Avatar url={g.member.avatar_url} name={g.member.name} size={56} /></span></span>
            <span className="w-full truncate text-center">{g.member.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
      {error && <div className="mt-2"><Notice>{error}</Notice></div>}
      {open && <StoryViewer group={open} onClose={() => setOpen(null)} onChanged={load} />}
    </section>
  );
}
