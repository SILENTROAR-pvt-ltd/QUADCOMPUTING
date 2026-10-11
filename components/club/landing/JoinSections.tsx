import React from 'react';
import Link from 'next/link';
import { BadgeCheck, CalendarHeart, Flag, Landmark, Radio, ScrollText } from 'lucide-react';
import { DISPLAY } from '@/components/vibers/vibers-fonts';

// Each card gets its own bright tint, so the page reads like a sunset, not a spreadsheet.
const STEPS = [
  { n: '01', title: 'Apply', tint: 'bg-[#fff0e8] border-[#ffd2bf]', num: 'text-[#c2410c]', body: 'Tell us who you are: 18+, a verified mobile number, your city, and how you like to travel.' },
  { n: '02', title: 'Vibe check', tint: 'bg-[#ffeaf3] border-[#ffc2dc]', num: 'text-[#be185d]', body: 'A real person reviews every application. You can go by a masked club name; we still know who you are.' },
  { n: '03', title: 'Get your Pass', tint: 'bg-[#f3ebff] border-[#dccbff]', num: 'text-[#6d28d9]', body: 'Your holographic Viber Pass carries your Viber ID: the same @handle you use at every Vibers property.' },
];

const PILLARS = [
  { icon: Radio, tone: 'bg-[#dcfce7] text-[#047857]', title: 'Live, not lurking', body: 'The club home shows who is online right now. Close the tab and you are off the grid instantly.' },
  { icon: Flag, tone: 'bg-[#ffe4ef] text-[#be185d]', title: 'The Red Flag Protocol', body: 'Profanity filtering, a report button on everything, and staff who mute, shadow-ban or revoke passes.' },
  { icon: CalendarHeart, tone: 'bg-[#fff0e8] text-[#c2410c]', title: 'Host your own plan', body: 'Trips, jams, movie nights, drives. Sign the responsibility agreement, get approved, and fill your spots.' },
  { icon: Landmark, tone: 'bg-[#e0f2fe] text-[#0369a1]', title: 'Verified stays', body: 'Negotiate group rates with verified partner properties. A deposit locks the deal and earns the Vibers Verified badge.' },
  { icon: ScrollText, tone: 'bg-[#f3ebff] text-[#6d28d9]', title: 'Escrow, by the book', body: 'Every rupee runs through a double-entry ledger. Vendors are paid on schedule; the platform keeps a clear 10%.' },
  { icon: BadgeCheck, tone: 'bg-[#fef3c7] text-[#b45309]', title: 'A clean finish', body: 'When a plan settles to zero, creators and properties get a signed, QR-verifiable No Objection Certificate.' },
];

export function JoinSections() {
  return (
    <>
      <section className="border-y border-[#2a1250]/[0.07] bg-white/60">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className={`rounded-3xl border p-6 ${s.tint}`}>
              <p className={`text-xs font-bold tracking-[0.2em] ${s.num}`}>{s.n}</p>
              <h2 className={`${DISPLAY} mt-2 text-2xl`}>{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#2a1250]/65">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className={`${DISPLAY} max-w-2xl text-3xl leading-tight sm:text-4xl`}>Curated quality over open mass. <em>Community over algorithms.</em></h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, tone, title, body }) => (
            <div key={title} className="rounded-3xl border border-[#2a1250]/10 bg-white/85 p-6 shadow-[0_12px_40px_-26px_rgba(124,58,237,0.35)] transition hover:-translate-y-0.5">
              <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#2a1250]/65">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-[#2a1250]/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 text-sm text-[#2a1250]/55 sm:flex-row sm:items-center sm:px-6">
          <p>Vibers Club is part of <Link href="/" className="font-semibold text-[#2a1250] underline-offset-4 hover:underline">Vibers Connect</Link>.</p>
          <p>Properties run on <Link href="/quad-computing" className="font-semibold text-[#2a1250] underline-offset-4 hover:underline">Quad Computing</Link>.</p>
        </div>
      </footer>
    </>
  );
}
