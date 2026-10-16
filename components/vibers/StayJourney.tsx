import { BellRing, DoorOpen, Smartphone, Sofa } from 'lucide-react';
import { SAMPLE_NOTE } from '@/components/landing-shots/ShotFrames';
import { LivePhone } from '@/components/landing-shots/LivePhone';
import { Chapter } from './Chapter';
import { ACCENT, CONTAINER, H2, LEAD, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const STEPS = [
  { icon: DoorOpen, title: 'Seamless check-in', text: 'Transparent check-in and check-out, with early check-in and late check-out at nominal, fair costs.' },
  { icon: Smartphone, title: 'In-room control', text: 'Scan the QR: the full menu, food orders with a live tracker, service calls, delivery and table booking, from your phone.' },
  { icon: BellRing, title: 'The community pulse', text: 'Today’s specials, movie nights, local walks, hidden-gem tours, live music, get-togethers and house parties.' },
  { icon: Sofa, title: 'Absolute freedom', text: 'Mark yourself “interested” and join in, or simply chill in your room. No pressure, ever.' },
];

export function StayJourney() {
  return (
    <section id="stay" aria-labelledby="stay-title" className={SECTION}>
      <div className={`${CONTAINER} ${s.reveal} grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]`}>
        <div>
          <Chapter n="03" label="Your stay" />
          <h2 id="stay-title" className={`${DISPLAY} ${H2}`}>
            Completely <em className={ACCENT}>hassle-free</em> stays.
          </h2>
          <p className={`${LEAD} mt-5 max-w-xl`}>From check-in to check-out, your whole experience sits in your hands. Nothing to install: it opens in your phone&apos;s browser.</p>

          <ol className="relative mt-10 space-y-7">
            <span aria-hidden="true" className={`absolute bottom-3 left-[21px] top-3 w-px bg-[#3c6b2b]/40 ${s.thread}`} />
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative flex gap-5">
                <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#14261b]/10 bg-[#fbfaf6] text-[#17301f] shadow-[0_10px_24px_-14px_rgba(20,38,27,0.5)]">
                  <step.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#14261b]/45">Step {i + 1}</p>
                  <h3 className={`${DISPLAY} text-2xl text-[#14261b]`}>{step.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#14261b]/65">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <figure className="mx-auto w-full max-w-[520px]">
          <div className="flex justify-center gap-4">
            <LivePhone id="guest-menu" className="w-[240px] sm:w-[250px] sm:translate-y-6" />
            <LivePhone id="guest-tracker" className="hidden w-[250px] -translate-y-2 sm:block" />
          </div>
          <figcaption className="mt-10 text-center text-[11px] text-[#14261b]/50">{SAMPLE_NOTE}</figcaption>
        </figure>
      </div>
    </section>
  );
}
