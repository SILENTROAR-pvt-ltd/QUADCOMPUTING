'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mountain, Plus, Zap } from 'lucide-react';
import { FOCUS } from '../ui';
import { Fab, Sheet } from '../ui-extra';
import { MeetupSheet } from './MeetupForm';

const ROW = `flex w-full items-start gap-4 rounded-2xl bg-white p-4 text-left ring-1 ring-[#14261b]/[0.06] transition hover:bg-[#f2f0e8] ${FOCUS}`;

/** The header "Create" button: an instant meetup (live at once) or a trip or ticketed event (reviewed first). */
export function CreateMenu({ variant = 'header' }: { variant?: 'header' | 'fab' }) {
  const [menu, setMenu] = useState(false);
  const [meetup, setMeetup] = useState(false);
  return (
    <>
      {variant === 'fab' ? <Fab onClick={() => setMenu(true)} label="Create" /> : (
        <button type="button" onClick={() => setMenu(true)} aria-label="Create"
          className={`inline-flex h-11 items-center gap-1 rounded-full bg-[#c8da4a] px-3.5 text-sm font-bold text-[#14261b] shadow-[0_10px_22px_-14px_rgba(120,140,20,0.9)] transition hover:bg-[#bccf3b] ${FOCUS}`}>
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2.75} /><span className="hidden sm:inline">Create</span>
        </button>
      )}
      <Sheet open={menu} onClose={() => setMenu(false)} title="What do you want to do?" focusField={false}>
        <div className="space-y-2.5">
          <button type="button" className={ROW} onClick={() => { setMenu(false); setMeetup(true); }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#c8da4a] text-[#14261b]"><Zap aria-hidden="true" className="h-5 w-5" /></span>
            <span><span className="block font-semibold">Start a meetup</span><span className="mt-0.5 block text-sm text-[#14261b]/65">A coffee, a walk, a party or a developer meet. Live in seconds, free, no review.</span></span>
          </button>
          <Link href="/club/events/new" onClick={() => setMenu(false)} className={ROW}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#17301f] text-[#c8da4a]"><Mountain aria-hidden="true" className="h-5 w-5" /></span>
            <span><span className="block font-semibold">Plan a trip or ticketed event</span><span className="mt-0.5 block text-sm text-[#14261b]/65">Multi-day tours and paid events, with a budget and payments held safely. The club reviews it before it goes live.</span></span>
          </Link>
        </div>
      </Sheet>
      <MeetupSheet open={meetup} kind="coffee" onClose={() => setMeetup(false)} />
    </>
  );
}
