import React from 'react';
import { PAYG_BILL_FEE } from '@/lib/services/wallet/plans';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, H2, KICKER, LEAD, SECTION, TURN } from '../qc-brand';
import { PlanCards } from './PlanCards';
import { PricingProof } from './PricingProof';
import { PlanCompare } from './PlanCompare';

/** Pricing, from the same catalogue checkout uses: the four plans, the Dues screen that keeps it honest, and every line compared. */
export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className={`${SECTION} bg-[#f6f3ec] text-[#0c0f0d]`}>
      <div className={CONTAINER}>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal><p className={`${KICKER} justify-center after:h-px after:w-8 after:bg-[#b08d57]`}>Pricing</p></Reveal>
          <Reveal index={1}><h2 id="pricing-title" className={`${DISPLAY} ${H2}`}>You earn. <em className={TURN}>We earn ₹{PAYG_BILL_FEE} a bill.</em></h2></Reveal>
          <Reveal index={2}>
            <p className={`${LEAD} mt-6`}>Pay only when you sell, or take a yearly plan and pay nothing per bill. Every feature runs on the same product underneath.</p>
          </Reveal>
        </div>

        <Reveal index={1}><div className="mt-14"><PlanCards /></div></Reveal>
        <Reveal index={1}><div className="mt-24"><PricingProof /></div></Reveal>

        <div className="mt-24">
          <h3 className={`${DISPLAY} text-[2rem] font-light leading-tight`}>Every plan, <em className={TURN}>line by line.</em></h3>
          <p className="mt-2 max-w-2xl text-[14px] text-[#0c0f0d]/60">Prices include GST.</p>
          <div className="mt-6"><PlanCompare /></div>
        </div>
      </div>
    </section>
  );
}
