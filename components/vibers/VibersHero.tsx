import { ArrowDown, ArrowRight, BadgeCheck, ScanLine } from 'lucide-react';
import { LivePhone } from '@/components/landing-shots/LivePhone';
import { LiveSlides } from './LiveSlides';
import { MOOD } from './mood-photos';
import { ACCENT, BTN, CONTAINER, HIGHLIGHT, PRIMARY } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const LINES = [
  { lead: 'Find your', word: 'vibe.' },
  { lead: 'Find your', word: 'people.' },
  { lead: 'Find', word: 'yourself.' },
];

const SLIDES = [MOOD.stay[0], MOOD.journey[0], MOOD.people[0], MOOD.stay[1], MOOD.journey[1]];

export function VibersHero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className={`${CONTAINER} relative grid items-center gap-12 pb-16 pt-12 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-24`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#14261b]/10 bg-[#fbfaf6] px-4 py-1.5 text-[12px] font-semibold text-[#14261b]/75">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#2f9e57]" /> Verified stays · honest prices · real people
          </p>
          <h1 id="hero-title" className={`${DISPLAY} mt-7 text-[3rem] leading-[1] tracking-[-0.02em] text-[#14261b] sm:text-[4.4rem] lg:text-[4.1rem] xl:text-[4.9rem]`}>
            {LINES.map((l) => (
              <span key={l.word} className="block">{l.lead} <em className={ACCENT}>{l.word}</em></span>
            ))}
          </h1>
          <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-[#14261b]/70">
            The place where you don&apos;t have to fit in. <strong className="font-semibold text-[#14261b]">You just have to be you.</strong>{' '}
            Every Vibers property is visited and audited in person, and runs on Quad Computing, so your whole stay sits in your hands.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#join" className={`${BTN} ${PRIMARY}`}>Join the movement <ArrowRight aria-hidden="true" className="h-4 w-4" /></a>
            <a href="#story" className={`${BTN} border border-[#14261b]/15 bg-[#fbfaf6] text-[#14261b] hover:border-[#14261b]/40`}>
              Read the story <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <LiveSlides ids={SLIDES} className="aspect-[4/5] w-[86%] rounded-[36px] shadow-[0_40px_90px_-40px_rgba(20,38,27,0.6)] sm:aspect-[5/6]" />
          <div className={`absolute -right-1 bottom-[-6%] sm:right-0 ${s.float}`} style={{ ['--tilt' as string]: '3deg' }}>
            <LivePhone id="guest-menu" className="w-[160px] sm:w-[240px]" />
          </div>
          <div className={`absolute left-[-2%] top-[8%] hidden rounded-2xl border border-white/60 bg-[#fbfaf6]/90 p-3.5 shadow-lg backdrop-blur sm:block ${s.floatLate}`}>
            <p className="flex items-center gap-2 text-[12px] font-bold text-[#14261b]"><ScanLine aria-hidden="true" className="h-4 w-4 text-[#3c6b2b]" /> Scan, order, track live</p>
            <p className="mt-0.5 text-[11px] text-[#14261b]/60">from your table, no app to install</p>
          </div>
          <span className={`absolute left-[4%] bottom-[10%] inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold shadow-lg ${HIGHLIGHT}`}>
            <BadgeCheck aria-hidden="true" className="h-4 w-4" /> Audited in person
          </span>
        </div>
      </div>
    </section>
  );
}
