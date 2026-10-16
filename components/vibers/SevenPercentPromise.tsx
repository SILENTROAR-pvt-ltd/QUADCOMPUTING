import { Infinity as Forever, Scale, Wallet } from 'lucide-react';
import { Chapter } from './Chapter';
import { CONTAINER, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const POINTS = [
  { icon: Wallet, title: 'True cashback', text: 'Every expense at a Vibers Connect property and its connected services earns a flat 7% cashback voucher.' },
  { icon: Forever, title: 'No tricks, no expiry', text: 'Vouchers live in a secure digital wallet with zero expiry, ready for any future booking or bill at that property.' },
  { icon: Scale, title: 'Un-accelerated pricing', text: 'Prices stay genuine. Your cashback is a real benefit on fair rates, never a fake discount on inflated ones.' },
];

export function SevenPercentPromise() {
  return (
    <section id="promise" aria-labelledby="promise-title" className={`${SECTION} overflow-hidden bg-[#17301f] text-[#f6f4ec]`}>
      <div className={`${CONTAINER} ${s.reveal} relative grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]`}>
        <div>
          <Chapter n="04" label="Genuine loyalty" light />
          <h2 id="promise-title" className={`${DISPLAY} mt-4 text-[2.4rem] leading-[1.04] tracking-[-0.02em] sm:text-[3.4rem]`}>
            The <em className="font-normal italic text-[#c8da4a]">7%</em> promise.
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[#f6f4ec]/70">
            We believe in long-term relationships, not short-term profits.
          </p>
        </div>

        <ul className="space-y-4">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:p-7">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#c8da4a] text-[#14261b]">
                <p.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h3 className={`${DISPLAY} text-2xl`}>{p.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#f6f4ec]/70">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
