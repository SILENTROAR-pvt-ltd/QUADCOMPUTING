import React from 'react';
import { Heart, Pencil, UserRound, Users } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';
import { Phone } from './Phone';
import { MockExplore, MockRoom } from './MockScreens';
import { MockProfile, MockTrips } from './MockScreens2';
import styles from '../club.module.css';

const FEATURES = [
  { icon: Pencil, title: 'Post your plans', body: 'Share where you are headed in the Common Room and get tips from people who have been.' },
  { icon: Users, title: 'See whose trips overlap', body: 'Every plan shows who is going, with faces and dates, so you never travel alone by accident.' },
  { icon: Heart, title: 'Join in a tap', body: 'Swipe through upcoming plans nearby. One tap and you are in the plan’s chat with the host.' },
  { icon: UserRound, title: 'Build your travel profile', body: 'Your verified profile and Club Visa go with you to every Vibers property.' },
];

const PHONES = [
  { key: 'room', el: <Phone tab={0}><MockRoom /></Phone>, offset: 'translate-y-10', delay: '0s' },
  { key: 'explore', el: <Phone tab={1}><MockExplore /></Phone>, offset: '-translate-y-6', delay: '-2s' },
  { key: 'trips', el: <Phone tab={2}><MockTrips /></Phone>, offset: 'translate-y-16', delay: '-4s' },
  { key: 'profile', el: <Phone tab={3}><MockProfile /></Phone>, offset: '-translate-y-2', delay: '-1s' },
];

/** What the club feels like inside: four features, then a tilted collage of the app's screens. */
export function Posters() {
  return (
    <section aria-labelledby="inside-title" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#3c6b2b]">Inside the club</p>
        <h2 id="inside-title" className={`${CLUB_DISPLAY} mt-3 max-w-2xl text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-6xl`}>
          Your trip is better <em className="font-medium text-[#3c6b2b]">together</em>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[28px] bg-[#fbfaf6] p-6 shadow-[0_18px_40px_-32px_rgba(20,38,27,0.55)]">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#17301f] text-[#c8da4a]"><Icon aria-hidden="true" className="h-5 w-5" /></span>
              <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#14261b]/70">{body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <div aria-hidden="true" className="relative h-[560px] overflow-hidden rounded-[44px] bg-gradient-to-br from-[#dfe9d3] via-[#e7ecdc] to-[#d3e2c8] sm:h-[640px]">
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] scale-[0.78] gap-7 sm:scale-90 lg:scale-100">
            {PHONES.map((p) => (
              <div key={p.key} className={p.offset}><div className={styles.float} style={{ animationDelay: p.delay }}>{p.el}</div></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
