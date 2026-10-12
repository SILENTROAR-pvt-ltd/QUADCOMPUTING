'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, FOCUS } from '../ui';
import { clubFetch } from '../api';
import { useClub } from '../club-context';
import { StoryViewer } from './StoryViewer';
import { StoryAdd } from './StoryAdd';
import type { StoryGroup } from './story-types';

interface Tray { mine: StoryGroup | null; groups: StoryGroup[] }

/**
 * The story tray: your own story first, then people you follow and places you plan to visit, unseen
 * rings in colour and watched ones in grey. Tapping a person plays their stories, then the next person.
 */
export function StoriesRail() {
  const { me } = useClub();
  const [tray, setTray] = useState<Tray | null>(null);
  const [viewing, setViewing] = useState<{ queue: StoryGroup[]; start: number } | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await clubFetch<Tray>('/stories');
    if (res.ok) setTray({ mine: res.data.mine, groups: res.data.groups });
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const queue = tray ? [...(tray.mine ? [tray.mine] : []), ...tray.groups] : [];
  const openFrom = (group: StoryGroup) => {
    const start = queue.findIndex((g) => g.member.user_id === group.member.user_id);
    setViewing({ queue, start: Math.max(0, start) });
  };

  const name = me.profile?.alias || me.profile?.club_username || 'You';
  const ring = (seen: boolean) => (seen ? 'bg-[#14261b]/20' : 'bg-gradient-to-tr from-[#17301f] via-[#7fa34a] to-[#c8da4a]');
  return (
    <section aria-label="Stories">
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="relative w-[72px] shrink-0">
          <button type="button" onClick={() => (tray?.mine ? openFrom(tray.mine) : setAdding(true))} aria-label={tray?.mine ? 'View your story' : 'Add a story'}
            className={`flex w-full flex-col items-center gap-1.5 rounded-2xl text-[11px] text-[#14261b]/80 ${FOCUS}`}>
            <span className={`rounded-full p-[3px] ${tray?.mine ? ring(tray.mine.seen) : 'border-2 border-dashed border-[#14261b]/25'}`}>
              <span className="block rounded-full border-[3px] border-[#f1efe6]"><Avatar url={me.profile?.avatar_url} name={name} size={56} /></span>
            </span>
            <span>Your story</span>
          </button>
          <button type="button" onClick={() => setAdding(true)} aria-label="Add a story"
            className={`absolute right-1 top-9 grid h-6 w-6 place-items-center rounded-full border-2 border-[#f1efe6] bg-[#17301f] text-[#c8da4a] ${FOCUS}`}>
            <Plus aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </div>
        {tray?.groups.map((g) => {
          const place = g.stories[g.stories.length - 1]?.place;
          return (
            <button key={g.member.user_id} type="button" onClick={() => openFrom(g)} aria-label={`${g.member.name}'s ${g.seen ? 'watched' : 'new'} story${place ? ` from ${place.name}` : ''}`}
              className={`flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-2xl text-[11px] text-[#14261b]/80 ${FOCUS}`}>
              <span className={`rounded-full p-[2.5px] ${ring(g.seen)}`}>
                <span className="block rounded-full border-[3px] border-[#f1efe6]"><Avatar url={g.member.avatar_url} name={g.member.name} size={52} /></span>
              </span>
              <span className="w-full truncate text-center font-medium">{g.member.name.split(' ')[0]}</span>
              {place && <span className="w-full truncate text-center text-[10px] text-[#3c6b2b]">{place.name}</span>}
            </button>
          );
        })}
      </div>
      {tray && tray.groups.length === 0 && !tray.mine && (
        <p className="mt-2 text-xs text-[#14261b]/55">Stories from people you follow and places you plan to visit show up here.</p>
      )}
      {viewing && (
        <StoryViewer queue={viewing.queue} start={viewing.start} onClose={() => setViewing(null)} onChanged={load} />
      )}
      <StoryAdd open={adding} onClose={() => setAdding(false)} onPosted={load} />
    </section>
  );
}
