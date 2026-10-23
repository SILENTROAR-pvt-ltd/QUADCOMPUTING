import Link from 'next/link';
import { Reveal } from './Reveal';
import { PlanFlow } from './PlanFlow';
import { PHOTOS } from './vibers-media';
import { BTN_IVORY, CONTAINER, KICKER_LIGHT, LEAD_LIGHT, TURN_LIGHT } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

const photo = (p: (typeof PHOTOS)[keyof typeof PHOTOS], cls: string) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" className={`${s.settle} h-full w-full object-cover ${cls}`} />
);

/** Vibers Club: staying in touch on your own terms after the trip, and hosting plans of your own, shown step by step. */
export function ClubConnect() {
  return (
    <section id="club" aria-labelledby="club-title" className={`${s.grain} relative scroll-mt-16 overflow-hidden bg-[#0f2a1e] py-28 text-[#f5f1e8] sm:py-36`}>
      <div className={`${CONTAINER} relative grid items-center gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24`}>
        <div>
          <Reveal><p className={KICKER_LIGHT}>Vibers Club</p></Reveal>
          <Reveal index={1}>
            <h2 id="club-title" className={`${DISPLAY} mt-6 text-[2.4rem] font-light leading-[1.06] sm:text-[3.1rem] lg:text-[3.5rem]`}>
              Connect <em className={TURN_LIGHT}>on your terms.</em>
            </h2>
          </Reveal>
          <Reveal index={2}>
            <p className={`${LEAD_LIGHT} mt-7`}>
              When your trip ends on a satisfying note, the connection does not have to. Stay in touch with the Vibers you
              met, or meet new ones, without sharing your direct contact or personal digital profile.
            </p>
            <p className={`${LEAD_LIGHT} mt-5`}>
              Club profiles add a layer of safety: you get to know your buddies a little closer first. Once you feel
              confident, you decide who enters your personal space.
            </p>
          </Reveal>
        </div>
        <div className="relative mx-auto grid w-full max-w-[520px] grid-cols-[1.1fr_0.9fr] items-end gap-4">
          <Reveal settle className="overflow-hidden rounded-t-[999px] rounded-b-[2px]">{photo(PHOTOS.clubRooftop, 'aspect-[3/4]')}</Reveal>
          <Reveal settle index={1} className="mb-16 overflow-hidden rounded-[2px]">{photo(PHOTOS.clubDinner, 'aspect-[4/5]')}</Reveal>
          <p className={`${DISPLAY} absolute -bottom-6 left-6 bg-[#f5f1e8] px-5 py-3 text-[1.05rem] italic text-[#10231a] shadow-[0_24px_50px_-28px_rgba(0,0,0,0.6)]`}>
            The trip ends. The plans don&rsquo;t have to.
          </p>
        </div>
      </div>

      <div className={`${CONTAINER} relative mt-28 border-t border-[#f5f1e8]/10 pt-16`}>
        <div className="grid items-end gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <Reveal><p className={`${DISPLAY} text-[2rem] font-light leading-[1.08] sm:text-[2.5rem]`}>Create your <em className={TURN_LIGHT}>own plan.</em></p></Reveal>
          <Reveal index={1}>
            <p className={LEAD_LIGHT}>
              In the Vibers Club community you are not just a guest. You are the host, and the control stays in your hands:
              you choose who joins your plan or moment.
            </p>
          </Reveal>
        </div>
        <Reveal index={2} className="mt-10"><PlanFlow /></Reveal>
        <Reveal index={2} className="mt-14 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className={`${DISPLAY} max-w-xl text-[1.35rem] italic text-[#f5f1e8]/85`}>Share your plans, stories, memories and mood, and let like-minded Vibers make your vibe louder.</p>
          <Link href="/join" className={BTN_IVORY}>Join Vibers Club</Link>
        </Reveal>
      </div>
    </section>
  );
}
