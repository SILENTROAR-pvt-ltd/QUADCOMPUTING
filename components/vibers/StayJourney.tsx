import Link from 'next/link';
import { ArrowUpRight, BellRing, DoorOpen, Smartphone, Sofa } from 'lucide-react';
import { AURA, AURA_TEXT, CONTAINER, KICKER, LEAD, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const STEPS = [
  { icon: DoorOpen, title: 'Seamless check-in', text: 'Transparent check-in and check-out, with early check-in and late check-out at nominal, fair costs.' },
  { icon: Smartphone, title: 'In-room control', text: 'The full service catalogue, food orders with a genuine rating system, service calls and transparent payments, from your phone.' },
  { icon: BellRing, title: 'The community pulse', text: 'Today’s specials, movie nights, local walks, hidden-gem tours, live music, get-togethers and house parties.' },
  { icon: Sofa, title: 'Absolute freedom', text: 'Mark yourself “interested” and join in, or simply chill in your room. No pressure, ever.' },
];

export function StayJourney() {
  return (
    <section id="stay" aria-labelledby="stay-title" className={SECTION}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <p className={KICKER}>The transparent digital ecosystem</p>
        <h2 id="stay-title" className={`${DISPLAY} mt-4 max-w-3xl text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-[#1c1714] sm:text-[3.6rem]`}>
          Completely <em className={`font-normal ${AURA_TEXT}`}>hassle-free</em> stays.
        </h2>
        <p className={`${LEAD} mt-5 max-w-2xl`}>From check-in to check-out, your whole experience sits in your hands.</p>

        <div className="relative mt-14">
          <span aria-hidden="true" className={`absolute left-6 right-6 top-6 hidden h-[2px] rounded-full ${AURA} opacity-60 lg:block`} />
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-[#1c1714]/10 bg-white text-[#1c1714] shadow-[0_10px_24px_-14px_rgba(28,23,20,0.5)]">
                <step.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.2em] text-[#1c1714]/45">Step {i + 1}</p>
              <h3 className={`${DISPLAY} mt-1 text-2xl text-[#1c1714]`}>{step.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#1c1714]/65">{step.text}</p>
            </li>
          ))}
          </ol>
        </div>

        <Link href="/quad-computing"
          className="group mt-16 flex flex-col justify-between gap-6 rounded-[32px] border border-[#1c1714]/[0.08] bg-[#1c1714] p-8 text-[#f7f2ea] transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:p-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#ff9b80]">The engine behind every stay</p>
            <p className={`${DISPLAY} mt-2 text-3xl sm:text-4xl`}>Quad Computing, <em className="font-normal">by Vibers Connect</em></p>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#f7f2ea]/70">
              The operating system our properties run on: billing, live tables, kitchen tickets, rooms, inventory and reports.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f7f2ea] px-6 py-3 text-sm font-semibold text-[#1c1714]">
            Explore Quad Computing <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
