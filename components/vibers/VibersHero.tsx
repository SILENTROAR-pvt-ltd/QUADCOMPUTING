import { ArrowDown, ArrowRight } from 'lucide-react';
import { AuraSphere } from './AuraSphere';
import { AURA_TEXT, CONTAINER } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const LINES = [
  { lead: 'Find your', word: 'vibe.' },
  { lead: 'Find your', word: 'people.' },
  { lead: 'Find', word: 'yourself.' },
];

export function VibersHero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden="true" className={`absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#ff7a59] ${s.aura}`} />
      <div aria-hidden="true" className={`absolute -right-20 top-40 h-96 w-96 rounded-full bg-[#8f7cf6] ${s.auraSlow}`} />

      <div className={`${CONTAINER} relative grid items-center gap-12 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.1fr_1fr]`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#1c1714]/10 bg-white/60 px-4 py-1.5 text-[12px] font-semibold text-[#1c1714]/75 backdrop-blur">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f0508a]" /> No filters. No pretending.
          </p>
          <h1 id="hero-title" className={`${DISPLAY} mt-7 text-[3.1rem] leading-[0.98] tracking-[-0.02em] text-[#1c1714] sm:text-[4.6rem] lg:text-[4.3rem] xl:text-[5.2rem]`}>
            {LINES.map((l) => (
              <span key={l.word} className="block">
                {l.lead} <em className={`pr-2 font-normal ${AURA_TEXT}`}>{l.word}</em>
              </span>
            ))}
          </h1>
          <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-[#1c1714]/70">
            The place where you don&apos;t have to fit in. <strong className="font-semibold text-[#1c1714]">You just have to be you.</strong>{' '}
            Verified stays, honest prices and people on your wavelength.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#join" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1c1714] px-7 text-sm font-semibold text-[#f7f2ea] transition-colors hover:bg-black">
              Join the movement <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href="#vibe" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#1c1714]/15 bg-white/50 px-7 text-sm font-semibold text-[#1c1714] transition-colors hover:border-[#1c1714]/40">
              Feel the vibe <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>
        <AuraSphere />
      </div>
    </section>
  );
}
