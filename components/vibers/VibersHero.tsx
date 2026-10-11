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
      <div aria-hidden="true" className={`absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#ff6a3d] ${s.aura}`} />
      <div aria-hidden="true" className={`absolute -right-20 top-40 h-96 w-96 rounded-full bg-[#7c3aed] ${s.auraSlow}`} />

      <div className={`${CONTAINER} relative grid items-center gap-12 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.1fr_1fr]`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#2a1250]/10 bg-white/60 px-4 py-1.5 text-[12px] font-semibold text-[#2a1250]/75 backdrop-blur">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#ff2e88]" /> No filters. No pretending.
          </p>
          <h1 id="hero-title" className={`${DISPLAY} mt-7 text-[3.1rem] leading-[0.98] tracking-[-0.02em] text-[#2a1250] sm:text-[4.6rem] lg:text-[4.3rem] xl:text-[5.2rem]`}>
            {LINES.map((l) => (
              <span key={l.word} className="block">
                {l.lead} <em className={`pr-2 font-normal ${AURA_TEXT}`}>{l.word}</em>
              </span>
            ))}
          </h1>
          <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-[#2a1250]/70">
            The place where you don&apos;t have to fit in. <strong className="font-semibold text-[#2a1250]">You just have to be you.</strong>{' '}
            Verified stays, honest prices and people on your wavelength.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#join" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]">
              Join the movement <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href="#vibe" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#2a1250]/15 bg-white/50 px-7 text-sm font-semibold text-[#2a1250] transition-colors hover:border-[#2a1250]/40">
              Feel the vibe <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>
        <AuraSphere />
      </div>
    </section>
  );
}
