import { CalendarClock, Receipt, Wallet } from 'lucide-react';
import { PAYG_BILL_FEE } from '@/lib/services/wallet/plans';
import { BrowserShot, SAMPLE_NOTE } from '@/components/landing-shots/ShotFrames';
import { LivePhone } from '@/components/landing-shots/LivePhone';
import { Chapter } from './Chapter';
import { ACCENT, CONTAINER, H2, LEAD, MARK, SECTION, SURFACE } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const HOW = [
  { icon: Receipt, title: 'Every settled bill', text: `adds its revenue to You earn, and ₹${PAYG_BILL_FEE} to We earn. Open or cancelled bills add nothing.` },
  { icon: CalendarClock, title: 'A slip every day', text: 'Each billing day runs 10 AM to 10 PM and closes with a due slip: every bill, filterable, printable. Tap any bill to see its invoice.' },
  { icon: Wallet, title: 'Paid from credit', text: 'Fees come out of the prepaid credit wallet. Anything credit does not cover shows as due until it is cleared.' },
];

/** Chapter 06: how money splits between a venue and Vibers Connect, shown on the real Dues screen. */
export function EarnTogether() {
  return (
    <section id="earn" aria-labelledby="earn-title" className={SECTION}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <Chapter n="06" label="You earn · We earn" />
        <h2 id="earn-title" className={`${DISPLAY} ${H2} max-w-3xl`}>
          You earn. We earn. <em className={ACCENT}>Nothing hidden.</em>
        </h2>
        <p className={`${LEAD} mt-5 max-w-2xl`}>A venue on pay-as-you-go always sees both sides of the deal, side by side, on one screen called Dues.</p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <article className={`${SURFACE} p-8 sm:p-10`}>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#14261b]/55">You earn</p>
            <p className={`${DISPLAY} mt-3 text-5xl text-[#14261b] sm:text-6xl`}><span className={MARK}>100%</span></p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#14261b]/70">of every bill. Your revenue from settled bills is yours: no commission on sales, ever.</p>
          </article>
          <article className="rounded-[28px] bg-[#17301f] p-8 text-[#f6f4ec] sm:p-10">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#c8da4a]">We earn</p>
            <p className={`${DISPLAY} mt-3 text-5xl sm:text-6xl`}>₹{PAYG_BILL_FEE} <span className="text-2xl italic text-[#f6f4ec]/70">a bill</span></p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#f6f4ec]/75">per settled bill. That is the whole pay-as-you-go fee, with no monthly charge. Yearly plans remove it.</p>
          </article>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <BrowserShot id="dues" url="Control centre · Dues" crop={1.6} />
            <p className="mt-3 text-center text-[11px] text-[#14261b]/50">{SAMPLE_NOTE}</p>
          </div>
          <div className="flex items-start gap-5">
            <ol className="flex-1 space-y-6">
              {HOW.map((h) => (
                <li key={h.title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e1efe3] text-[#17301f]"><h.icon aria-hidden="true" className="h-[18px] w-[18px]" /></span>
                  <p className="text-[14px] leading-relaxed text-[#14261b]/70"><strong className="block text-[15px] text-[#14261b]">{h.title}</strong>{h.text}</p>
                </li>
              ))}
            </ol>
            <LivePhone id="dues-phone" url="quadcomputing.app" className="hidden w-[180px] shrink-0 xl:block" />
          </div>
        </div>

        <BrowserShot id="slip" url="Dues · Daily slip, 10 AM to 10 PM" className="mx-auto mt-10 max-w-3xl" />
      </div>
    </section>
  );
}
