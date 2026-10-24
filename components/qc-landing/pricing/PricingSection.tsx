'use client';

import React, { useMemo, useState } from 'react';
import { priceFor, type Usage } from '@/lib/landing/pricing-math';
import { PAYG_BILL_FEE } from '@/lib/services/wallet/plans';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, H2, KICKER, LEAD, SECTION, TURN } from '../qc-brand';
import { UsageControls } from './UsageControls';
import { SavingsVerdict } from './SavingsVerdict';
import { CostBars } from './CostBars';
import { PlanCards } from './PlanCards';
import { PlanCompare } from './PlanCompare';

// A café doing about forty bills a day, most days of the month: where most venues start.
const START: Usage = { billsPerDay: 40, daysPerMonth: 28, avgBill: 650, needs: [] };

/**
 * Pricing as a question the venue answers with its own numbers: the calculator prices a year on every plan from the same
 * catalogue checkout uses, and the cards and the table below follow its answer.
 */
export function PricingSection() {
  const [usage, setUsage] = useState<Usage>(START);
  const result = useMemo(() => priceFor(usage), [usage]);

  return (
    <section id="pricing" aria-labelledby="pricing-title" className={`${SECTION} bg-[#f6f3ec] text-[#0c0f0d]`}>
      <div className={CONTAINER}>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal><p className={`${KICKER} justify-center after:h-px after:w-8 after:bg-[#b08d57]`}>Pricing</p></Reveal>
          <Reveal index={1}><h2 id="pricing-title" className={`${DISPLAY} ${H2}`}>You earn. <em className={TURN}>We earn ₹{PAYG_BILL_FEE} a bill.</em></h2></Reveal>
          <Reveal index={2}>
            <p className={`${LEAD} mt-6`}>
              Pay only when you sell, or lock in the year and pay nothing per bill. Move the sliders to your own numbers: the
              plan that keeps the most in your pocket lights up.
            </p>
          </Reveal>
        </div>

        <Reveal index={1}>
          <div className="mt-14 grid gap-10 rounded-[28px] bg-[#0c0f0d] p-6 text-[#f6f3ec] sm:p-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
            <UsageControls usage={usage} result={result} onChange={setUsage} />
            <div className="space-y-9">
              <SavingsVerdict result={result} usage={usage} />
              <CostBars result={result} usage={usage} />
            </div>
          </div>
        </Reveal>

        <div className="mt-16"><PlanCards result={result} /></div>

        <div className="mt-20">
          <h3 className={`${DISPLAY} text-[2rem] font-light leading-tight`}>Every plan, <em className={TURN}>line by line.</em></h3>
          <p className="mt-2 max-w-2xl text-[14px] text-[#0c0f0d]/60">Prices include GST. The dark row follows the calculator, so you can see your own year on every plan.</p>
          <div className="mt-6"><PlanCompare result={result} /></div>
        </div>
      </div>
    </section>
  );
}
