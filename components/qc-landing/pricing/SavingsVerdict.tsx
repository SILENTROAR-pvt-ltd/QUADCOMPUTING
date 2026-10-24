'use client';

import React from 'react';
import type { PricingResult, Usage } from '@/lib/landing/pricing-math';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { inr } from '../qc-brand';
import { useCountUp } from '../useCountUp';

/**
 * The answer first: which plan fits these numbers, and what it keeps in the venue's pocket against the next choice, then
 * the same money as a daily figure and the ₹3 as a share of a bill (small, concrete numbers are easier to weigh).
 */
export function SavingsVerdict({ result, usage }: { result: PricingResult; usage: Usage }) {
  const { best, perBill, saving, feeShare } = result;
  const onPerBill = best === perBill;
  const kept = useCountUp(saving);
  const yearly = useCountUp(best.yearly);
  const name = best.plan.name.replace('QC² ', '');

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d9c193]">Best for your numbers</p>
      <p className={`${DISPLAY} mt-2 text-[2.2rem] font-light leading-none text-[#f6f3ec] sm:text-[2.6rem]`}>{name}</p>

      {onPerBill ? (
        <>
          <p className="mt-5 font-mono text-[2.4rem] font-semibold leading-none tabular-nums text-[#d9c193] sm:text-[3rem]">{inr(yearly)}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#f6f3ec]/70">
            a year at {usage.billsPerDay} bills a day, {inr(saving)} less than the cheapest yearly plan that fits. No bills, no charge.
          </p>
        </>
      ) : (
        <>
          <p className="mt-5 font-mono text-[2.4rem] font-semibold leading-none tabular-nums text-[#d9c193] sm:text-[3rem]">{inr(kept)}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#f6f3ec]/70">
            kept every year against ₹3 a bill ({inr(perBill.yearly)}). That is {inr(best.perDay)} a day for everything you picked
            {best.breakEvenPerDay ? <>, and it pays for itself from {Math.ceil(best.breakEvenPerDay)} bills a day</> : null}.
          </p>
          {best.plan.trialDays > 0 && (
            <p className="mt-3 inline-flex rounded-full border border-[#d9c193]/40 px-3 py-1 text-[11px] font-semibold text-[#d9c193]">First month free</p>
          )}
        </>
      )}

      <dl className="mt-7 grid grid-cols-2 gap-3 border-t border-[#f6f3ec]/10 pt-5">
        <div>
          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#f6f3ec]/45">₹3 of an average bill</dt>
          <dd className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[#f6f3ec]">{feeShare.toFixed(2)}%</dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#f6f3ec]/45">Your sales you keep</dt>
          <dd className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[#f6f3ec]">100%</dd>
        </div>
      </dl>
    </div>
  );
}
