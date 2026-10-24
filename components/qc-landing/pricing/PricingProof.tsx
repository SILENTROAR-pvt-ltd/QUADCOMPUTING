import React from 'react';
import Image from 'next/image';
import { BadgePercent, CalendarCheck, Gift, Scale } from 'lucide-react';
import { SCREENSHOTS } from '@/lib/landing/screenshots';
import { LivePhone } from '@/components/landing-shots/LivePhone';
import { PAYG_BILL_FEE, PLANS, SETUP_FEE } from '@/lib/services/wallet/plans';
import { quote } from '@/lib/landing/pricing-math';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { BrowserWindow } from '../StageVideo';
import { DEMO_NOTE, TURN } from '../qc-brand';

// A month of 30 open days: the bills a day from which each yearly plan costs less than ₹3 a bill.
const from = (i: number) => Math.ceil(quote(PLANS[i], { billsPerDay: 1, daysPerMonth: 30, avgBill: 600, needs: [] }).breakEvenPerDay ?? 0);
const short = (name: string) => name.replace('QC² ', '');

const FACTS = [
  { icon: BadgePercent, big: `${((PAYG_BILL_FEE / 600) * 100).toFixed(1)}%`, text: `₹${PAYG_BILL_FEE} on a ₹600 bill. No commission on your sales, ever.` },
  { icon: Scale, big: `${from(0)} a day`, text: `bills, and ${short(PLANS[0].name)} costs less than ₹3 a bill. ${short(PLANS[1].name)} from ${from(1)}, ${short(PLANS[2].name)} from ${from(2)}.` },
  { icon: Gift, big: '1 month', text: `free on ${short(PLANS[0].name)} and ${short(PLANS[1].name)} before the year starts.` },
  { icon: CalendarCheck, big: `₹${SETUP_FEE}`, text: 'once: your profile, menu entered for you, design and table QR codes.' },
];

/** Every rupee in the open: the real Dues screen (you earn, we earn) with the phone version, and four plain numbers. */
export function PricingProof() {
  const shot = SCREENSHOTS.dues;
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
      <div className="relative lg:pb-8 lg:pr-14">
        <BrowserWindow url="Control centre · Dues" ratio={1.45}>
          <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(min-width: 1024px) 700px, 100vw" className="absolute inset-x-0 top-0 h-auto w-full" />
        </BrowserWindow>
        <div className="absolute -bottom-4 right-0 hidden w-[150px] lg:block">
          <LivePhone id="dues-phone" url="quadcomputing.app" className="w-full drop-shadow-[0_30px_40px_rgba(12,15,13,0.35)]" />
        </div>
        <p className="mt-3 text-[11px] text-[#0c0f0d]/45">{DEMO_NOTE}</p>
      </div>

      <div>
        <h3 className={`${DISPLAY} text-[2.1rem] font-light leading-tight`}>Every rupee, <em className={TURN}>in the open.</em></h3>
        <p className="mt-3 text-[14.5px] leading-relaxed text-[#0c0f0d]/65">
          Dues shows what you earned beside what we earned, a slip for every billing day and every invoice a tap away. No surprises at the end of the month.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {FACTS.map((f) => (
            <li key={f.big} className="rounded-2xl border border-[#e6dfcf] bg-[#fbf9f4] p-4">
              <f.icon aria-hidden="true" className="h-4 w-4 text-[#8a6d3f]" />
              <p className={`${DISPLAY} mt-2 text-[1.9rem] leading-none`}>{f.big}</p>
              <p className="mt-1.5 text-[12.5px] leading-snug text-[#0c0f0d]/65">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
