import React from 'react';
import { BadgeCheck, CalendarHeart, Flag, Landmark, Radio, ScrollText } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';

const STEPS = [
  { n: '01', title: 'Apply', body: 'Tell us who you are: 18+, a verified mobile number, your city, and how you like to travel.' },
  { n: '02', title: 'Vibe check', body: 'A real person reviews every application. You can go by a masked club name; we still know who you are.' },
  { n: '03', title: 'Get your Visa', body: 'Your Club Visa carries your Viber ID: the same @handle you use at every Vibers property.' },
];

const PILLARS = [
  { icon: Radio, title: 'Live, not lurking', body: 'The club shows who is online right now. Close the tab and you are off the grid instantly.' },
  { icon: Flag, title: 'The Red Flag Protocol', body: 'Profanity filtering, a report button on everything, and staff who mute, shadow-ban or revoke passes.' },
  { icon: CalendarHeart, title: 'Host your own plan', body: 'Trips, jams, movie nights, drives. Sign the responsibility agreement, get approved, and fill your spots.' },
  { icon: Landmark, title: 'Verified stays', body: 'Negotiate group rates with verified partner properties. A deposit locks the deal and earns the Vibers Verified badge.' },
  { icon: ScrollText, title: 'Escrow, by the book', body: 'Every rupee runs through a double-entry ledger. Vendors are paid on schedule; the platform keeps a clear 10%.' },
  { icon: BadgeCheck, title: 'A clean finish', body: 'When a plan settles to zero, creators and properties get a signed, QR-verifiable No Objection Certificate.' },
];

/** How to get in (three steps) and what makes the club safe (six pillars). */
export function JoinSections() {
  return (
    <>
      <section aria-labelledby="steps-title" className="bg-[#e6e4d9]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#3c6b2b]">How to join</p>
          <h2 id="steps-title" className={`${CLUB_DISPLAY} mt-3 text-[40px] font-semibold leading-tight tracking-tight sm:text-5xl`}>Three steps <em className="font-medium text-[#3c6b2b]">in</em></h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-[30px] bg-[#fbfaf6] p-7 shadow-[0_18px_40px_-32px_rgba(20,38,27,0.55)]">
                <p className={`${CLUB_DISPLAY} text-5xl font-medium italic leading-none text-[#3c6b2b]`}>{s.n}</p>
                <h3 className={`${CLUB_DISPLAY} mt-5 text-2xl font-semibold`}>{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#14261b]/70">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section aria-labelledby="pillars-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 id="pillars-title" className={`${CLUB_DISPLAY} max-w-3xl text-[38px] font-semibold leading-[1.08] tracking-tight sm:text-5xl`}>
          Curated quality over open mass. <em className="font-medium text-[#3c6b2b]">Community over algorithms.</em>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[28px] bg-[#fbfaf6] p-6 shadow-[0_18px_40px_-32px_rgba(20,38,27,0.55)] transition hover:-translate-y-0.5">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e1efe3] text-[#2f5d1f]"><Icon aria-hidden="true" className="h-5 w-5" /></span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#14261b]/70">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
