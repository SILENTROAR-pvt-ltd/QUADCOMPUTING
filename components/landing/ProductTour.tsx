import { Check } from 'lucide-react';
import { BrowserShot, SAMPLE_NOTE } from '@/components/landing-shots/ShotFrames';
import { LivePhone } from '@/components/landing-shots/LivePhone';
import { CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';
import { TOUR_STEPS } from './product-tour-steps';

/** The control centre, A to Z: real screens, one per step, alternating sides, each with what it tells the owner. */
export function ProductTour() {
  return (
    <section id="tour" aria-labelledby="tour-title" className={`${SECTION} border-t border-black/[0.06] bg-white`}>
      <div className={CONTAINER}>
        <p className={EYEBROW}>Product tour</p>
        <h2 id="tour-title" className={H2}>The control centre, A to Z.</h2>
        <p className={LEAD}>
          These are real Quad Computing screens, filled with a sample café&apos;s data. Every number on them comes from the same
          maths your venue&apos;s numbers will.
        </p>

        <nav aria-label="Tour steps" className="mt-8 flex flex-wrap gap-2">
          {TOUR_STEPS.map((s) => (
            <a key={s.id} href={`#tour-${s.id}`} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#faf9f6] px-3 py-1.5 text-[12px] font-semibold text-black transition-colors hover:border-black">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-black text-[10px] text-white">{s.letter}</span>{s.title}
            </a>
          ))}
        </nav>

        <ol className="mt-16 space-y-20 sm:space-y-28">
          {TOUR_STEPS.map((s, i) => (
            <li key={s.id} id={`tour-${s.id}`} className="grid scroll-mt-24 items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className={`lg:col-span-5 ${i % 2 ? 'lg:order-2' : ''}`}>
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3b]">
                  <span className="font-editorial grid h-9 w-9 place-items-center rounded-full border border-[#c8a96a] text-base normal-case tracking-normal text-black">{s.letter}</span>
                  Step {s.letter}
                </p>
                <h3 className="font-editorial mt-4 text-2xl leading-tight text-black sm:text-[2rem]">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">{s.lead}</p>
                <ul className="mt-6 space-y-3">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[14px] text-zinc-800">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6d3b]" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`relative lg:col-span-7 ${i % 2 ? 'lg:order-1' : ''}`}>
                <BrowserShot id={s.shot} url={s.url} crop={s.crop} />
                {s.id === 'dues' && (
                  <div className="absolute -bottom-10 -right-3 hidden md:block"><LivePhone id="dues-phone" url="quadcomputing.app" className="w-[160px]" /></div>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-16 text-center text-[11px] text-zinc-500">{SAMPLE_NOTE}</p>
      </div>
    </section>
  );
}
