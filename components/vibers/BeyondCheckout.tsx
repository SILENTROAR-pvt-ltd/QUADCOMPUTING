import { EyeOff, Hand, Repeat2 } from 'lucide-react';
import { Chapter } from './Chapter';
import { ACCENT, CONTAINER, H2, LEAD, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const POINTS = [
  { icon: EyeOff, title: 'Anonymous bonding', text: 'Share stories and memories with Vibers you met, without ever sharing your contact details or profiles.' },
  { icon: Hand, title: 'Your terms', text: 'When a connection feels safe and genuine, take it further. If the vibe doesn’t match, simply swipe it away.' },
  { icon: Repeat2, title: 'Community rebound', text: 'Exclusive tours and event invites. Reunite with old Vibers or meet new ones to explore the world together.' },
];

/** Decorative stack of connection cards that fan out on hover. */
function SwipeStack() {
  const card = 'absolute inset-x-[12%] top-[10%] bottom-[10%] rounded-[30px] border border-white/70 shadow-[0_30px_60px_-30px_rgba(20,38,27,0.45)]';
  return (
    <div aria-hidden="true" className={`relative mx-auto aspect-[4/5] w-full max-w-[380px] ${s.stack}`}>
      <div className={`${card} ${s.card} ${s.cardBack} rotate-[-6deg] bg-[#e1efe3]`} />
      <div className={`${card} ${s.card} ${s.cardMid} rotate-[4deg] bg-[#eef3c4]`} />
      <div className={`${card} flex flex-col justify-between bg-[#fbfaf6] p-7`}>
        <div className="flex items-center gap-3">
          <span className={`${DISPLAY} grid h-12 w-12 place-items-center rounded-full bg-[#17301f] text-xl italic text-[#c8da4a]`}>V</span>
          <div>
            <p className="text-[15px] font-bold text-[#14261b]">A fellow Viber</p>
            <p className="text-[12px] text-[#14261b]/55">Met at the house party</p>
          </div>
        </div>
        <p className={`${DISPLAY} text-2xl italic leading-snug text-[#14261b]`}>&ldquo;That sunset walk was the best part of the trip.&rdquo;</p>
        <div className="flex gap-2 text-[12px] font-semibold">
          <span className="flex-1 rounded-full border border-[#14261b]/15 py-2.5 text-center text-[#14261b]/70">Swipe away</span>
          <span className="flex-1 rounded-full bg-[#17301f] py-2.5 text-center text-[#f6f4ec]">Stay connected</span>
        </div>
      </div>
    </div>
  );
}

export function BeyondCheckout() {
  return (
    <section aria-labelledby="beyond-title" className={`${SECTION} bg-[#e1efe3]/60`}>
      <div className={`${CONTAINER} ${s.reveal} grid items-center gap-14 lg:grid-cols-2`}>
        <SwipeStack />
        <div>
          <Chapter n="07" label="Safe, post-stay networking" />
          <h2 id="beyond-title" className={`${DISPLAY} ${H2}`}>
            Connections on <em className={ACCENT}>your terms.</em>
          </h2>
          <p className={`${LEAD} mt-5`}>The people you meet shouldn&apos;t vanish at check-out, and your privacy should never be the price.</p>
          <ul className="mt-9 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fbfaf6] text-[#17301f] shadow-sm">
                  <p.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-[#14261b]">{p.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#14261b]/65">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
