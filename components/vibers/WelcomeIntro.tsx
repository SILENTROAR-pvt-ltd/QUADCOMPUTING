import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { WelcomeFan } from './WelcomeFan';
import { CONTAINER, H2, KICKER, TURN } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';

/**
 * The welcome, quiet and visual: one line of promise, then its three pillars as photo cards that fan out of a stack as
 * the reader arrives, and a single way on.
 */
export function WelcomeIntro() {
  return (
    <section id="welcome" aria-labelledby="welcome-title" className="relative scroll-mt-16 overflow-hidden bg-[#f5f1e8] py-24 text-[#10231a] sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(217,193,147,0.22),transparent_65%)]" />
      <div className={`${CONTAINER} relative text-center`}>
        <Reveal><p className={`${KICKER} justify-center after:h-px after:w-8 after:bg-[#b08d57]`}>Welcome to Vibers Connect</p></Reveal>
        <Reveal index={1}>
          <h2 id="welcome-title" className={`${DISPLAY} ${H2} mx-auto max-w-3xl`}>
            This is the place you were <em className={TURN}>looking for.</em>
          </h2>
        </Reveal>
        <Reveal index={2}>
          <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-[#10231a]/65">
            Your own space to meet like-minded Vibers and live your vibe, unfiltered.
          </p>
        </Reveal>
        <div className="mt-14 sm:mt-16">
          <WelcomeFan />
        </div>
        <Reveal index={1} className="mt-12 flex justify-center sm:mt-16">
          <a href="#vibe" className="group inline-flex h-12 items-center gap-3 rounded-full bg-[#0f2a1e] pl-6 pr-1.5 text-[13px] font-semibold tracking-[0.04em] text-[#f5f1e8] transition-colors hover:bg-[#173a2a]">
            Who is a Viber
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f1e8] text-[#0f2a1e] transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
