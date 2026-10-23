import { Reveal } from './Reveal';
import { MomentReel } from './MomentReel';
import { PHOTOS } from './vibers-media';
import { CONTAINER, H2, KICKER, LEAD, SECTION, TURN } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

/**
 * Who a Viber is, in the founder's words: not a tourist chasing the postcard view, but someone who fills a place with
 * their own vibe, and meets themselves in it. A sunset in an arch, and a phone catching a moment, beside the words.
 */
export function WhoIsAViber() {
  const p = PHOTOS.viber;
  return (
    <section id="vibe" aria-labelledby="vibe-title" className={`${SECTION} bg-[#f5f1e8] text-[#10231a]`}>
      <div className={`${CONTAINER} grid items-center gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-24`}>
        <div className="relative mx-auto w-full max-w-[460px]">
          <Reveal settle className="relative overflow-hidden rounded-t-full border border-[#b08d57]/40 p-2.5">
            <div className="overflow-hidden rounded-t-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" className={`${s.settle} aspect-[3/4] h-full w-full object-cover object-[60%_50%]`} />
            </div>
          </Reveal>
          <Reveal index={2} className="absolute -bottom-10 -right-4 w-[42%] sm:-right-10">
            <MomentReel />
          </Reveal>
        </div>

        <div>
          <Reveal><p className={KICKER}>Who is a Viber?</p></Reveal>
          <Reveal index={1}>
            <h2 id="vibe-title" className={`${DISPLAY} ${H2}`}>Not a tourist. <em className={TURN}>A little different.</em></h2>
          </Reveal>
          <Reveal index={2}>
            <p className={`${LEAD} mt-7`}>
              A Viber is not someone who packs a bag, books a ticket, clicks the postcard view and posts it for likes.
              That is a tourist, and there is nothing wrong with it.
            </p>
            <p className={`${LEAD} mt-5`}>
              A Viber walks into any random place and fills it with their own vibe. Nothing artificial, nothing
              performed. They live the way they want to live in that moment. And when that energy meets another Viber,
              something happens: the day turns into a blast.
            </p>
          </Reveal>
          <Reveal index={3}>
            <blockquote className="mt-10 border-l border-[#b08d57] pl-6">
              <p className={`${DISPLAY} text-[1.5rem] font-light italic leading-snug text-[#10231a] sm:text-[1.75rem]`}>
                They capture the moment on camera, then go beyond it, and record it in their soul, their mind and their heart.
              </p>
              <footer className="mt-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8a6d3f]">That is the moment you meet yourself</footer>
            </blockquote>
          </Reveal>
          <Reveal index={4}>
            <p className="mt-8 text-[15px] leading-relaxed text-[#10231a]/70">
              We call it <span className={`${DISPLAY} text-[1.2rem] italic text-[#10231a]`}>inner peace</span>, and we call the people who find it <span className={`${DISPLAY} text-[1.2rem] italic text-[#10231a]`}>Vibers</span>.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
