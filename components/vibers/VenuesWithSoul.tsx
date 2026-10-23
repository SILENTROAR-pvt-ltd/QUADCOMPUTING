import { Reveal } from './Reveal';
import { RaveFeature } from './RaveFeature';
import { ExperienceRail } from './ExperienceRail';
import { ExperienceOrbs } from './ExperienceCard';
import { TICKER } from './vibers-experiences';
import { CONTAINER, H2, KICKER, LEAD, SECTION, TURN } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

/**
 * The promise about venues (only places with a common space and a soul) and what happens there: rave culture first,
 * then a rail of experiences to filter by vibe, and a slow ticker of everything on offer.
 */
export function VenuesWithSoul() {
  return (
    <section id="venues" aria-labelledby="venues-title" className={`${SECTION} overflow-hidden bg-[#f5f1e8] pb-0 text-[#10231a] sm:pb-0`}>
      <div className={CONTAINER}>
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <Reveal><p className={KICKER}>Our promise</p></Reveal>
            <Reveal index={1}><h2 id="venues-title" className={`${DISPLAY} ${H2}`}>Venues <em className={TURN}>with soul.</em></h2></Reveal>
          </div>
          <Reveal index={2}>
            <p className={LEAD}>
              We do not onboard every property to grow our numbers. We partner only with venues that have room to explore
              the vibe beyond the five-star, hotelier culture: places with a common space where like-minded Vibers can
              actually meet. A stay beyond the paisa-vasool mindset.
            </p>
          </Reveal>
        </div>

        <RaveFeature />

        <div className="mt-20 sm:mt-24">
          <div className="relative md:min-h-[190px]">
            <ExperienceOrbs />
            <Reveal><p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#10231a]/55">What happens at a Vibers Connect point</p></Reveal>
            <Reveal index={1}>
              <h3 className={`${DISPLAY} mb-8 mt-3 text-[1.9rem] font-light leading-tight sm:text-[2.4rem]`}>Pick your <em className={TURN}>kind of day.</em></h3>
            </Reveal>
          </div>
          <ExperienceRail />
        </div>
      </div>

      <div aria-hidden="true" className="mt-20 overflow-hidden border-y border-[#10231a]/10 py-6 sm:mt-24 sm:py-8">
        <div className={s.marquee}>
          {[0, 1].map((copy) => (
            <p key={copy} className={`${DISPLAY} flex shrink-0 items-center whitespace-nowrap text-[2rem] font-light italic text-[#10231a]/80 sm:text-[2.8rem]`}>
              {TICKER.map((w) => (
                <span key={w} className="flex items-center">
                  <span className="px-6 sm:px-9">{w}</span>
                  <span className="text-[0.55em] not-italic text-[#b08d57]">&#10022;</span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
