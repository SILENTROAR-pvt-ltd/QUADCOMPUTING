import { EyeOff, Hand, Repeat2 } from 'lucide-react';
import { AURA, AURA_TEXT, CONTAINER, KICKER, LEAD, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const POINTS = [
  { icon: EyeOff, title: 'Anonymous bonding', text: 'Share stories and memories with Vibers you met, without ever sharing your contact details or profiles.' },
  { icon: Hand, title: 'Your terms', text: 'When a connection feels safe and genuine, take it further. If the vibe doesn’t match, simply swipe it away.' },
  { icon: Repeat2, title: 'Community rebound', text: 'Exclusive tours and event invites. Reunite with old Vibers or meet new ones to explore the world together.' },
];

/** Decorative stack of connection cards that fan out on hover. */
function SwipeStack() {
  const card = 'absolute inset-x-[12%] top-[10%] bottom-[10%] rounded-[30px] border border-white/70 shadow-[0_30px_60px_-30px_rgba(28,23,20,0.45)]';
  return (
    <div aria-hidden="true" className={`relative mx-auto aspect-[4/5] w-full max-w-[380px] ${s.stack}`}>
      <div className={`${card} ${s.card} ${s.cardBack} rotate-[-6deg] bg-[#e9defa]`} />
      <div className={`${card} ${s.card} ${s.cardMid} rotate-[4deg] bg-[#ffe0d3]`} />
      <div className={`${card} flex flex-col justify-between bg-white p-7`}>
        <div className="flex items-center gap-3">
          <span className={`h-12 w-12 rounded-full ${AURA}`} />
          <div>
            <p className="text-[15px] font-bold text-[#1c1714]">A fellow Viber</p>
            <p className="text-[12px] text-[#1c1714]/55">Met at the house party</p>
          </div>
        </div>
        <p className={`${DISPLAY} text-2xl italic leading-snug text-[#1c1714]`}>&ldquo;That sunset walk was the best part of the trip.&rdquo;</p>
        <div className="flex gap-2 text-[12px] font-semibold">
          <span className="flex-1 rounded-full border border-[#1c1714]/15 py-2.5 text-center text-[#1c1714]/70">Swipe away</span>
          <span className="flex-1 rounded-full bg-[#1c1714] py-2.5 text-center text-[#f7f2ea]">Stay connected</span>
        </div>
      </div>
    </div>
  );
}

export function BeyondCheckout() {
  return (
    <section aria-labelledby="beyond-title" className={SECTION}>
      <div className={`${CONTAINER} ${s.reveal} grid items-center gap-14 lg:grid-cols-2`}>
        <SwipeStack />
        <div>
          <p className={KICKER}>Safe, post-stay networking</p>
          <h2 id="beyond-title" className={`${DISPLAY} mt-4 text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-[#1c1714] sm:text-[3.6rem]`}>
            Connections on <em className={`font-normal ${AURA_TEXT}`}>your terms.</em>
          </h2>
          <p className={`${LEAD} mt-5`}>The people you meet shouldn&apos;t vanish at check-out, and your privacy should never be the price.</p>
          <ul className="mt-9 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#c2410c] shadow-sm">
                  <p.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1c1714]">{p.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#1c1714]/65">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
