import { Infinity as Forever, Scale, Wallet } from 'lucide-react';
import { AURA_TEXT, CONTAINER, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const POINTS = [
  { icon: Wallet, title: 'True cashback', text: 'Every expense at a Vibers Connect property and its connected services earns a flat 7% cashback voucher.' },
  { icon: Forever, title: 'No tricks, no expiry', text: 'Vouchers live in a secure digital wallet with zero expiry, ready for any future booking or bill at that property.' },
  { icon: Scale, title: 'Un-accelerated pricing', text: 'Prices stay genuine. Your 7% is a real benefit on fair rates, never a fake discount on inflated ones.' },
];

export function SevenPercentPromise() {
  return (
    <section id="promise" aria-labelledby="promise-title" className={`${SECTION} overflow-hidden bg-[#1d1420] text-[#f7f2ea]`}>
      <div aria-hidden="true" className={`absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-[#ff7a59] ${s.aura}`} />
      <div aria-hidden="true" className={`absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#8f7cf6] ${s.auraSlow}`} />

      <div className={`${CONTAINER} ${s.reveal} relative grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]`}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#ff9b80]">Genuine loyalty</p>
          <h2 id="promise-title" className={`${DISPLAY} mt-4 text-[2.6rem] leading-[1.02] tracking-[-0.02em] sm:text-[3.6rem]`}>
            The <em className="font-normal">7%</em> promise.
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[#f7f2ea]/70">
            We believe in long-term relationships, not short-term profits.
          </p>
          <p aria-hidden="true" className={`${DISPLAY} mt-6 text-[9rem] leading-none tracking-[-0.05em] sm:text-[12rem] ${AURA_TEXT}`}>7%</p>
        </div>

        <ul className="space-y-4">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-7">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10">
                <p.icon aria-hidden="true" className="h-5 w-5 text-[#ffb59f]" />
              </span>
              <div>
                <h3 className={`${DISPLAY} text-2xl`}>{p.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#f7f2ea]/70">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
