'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PER_BILL_PLAN, PLANS, type PlanInfo } from '@/lib/services/wallet/plans';
import type { PricingResult } from '@/lib/landing/pricing-math';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { BTN_INK, inr } from '../qc-brand';

const CARDS = [PER_BILL_PLAN, ...PLANS];

function priceLine(p: PlanInfo) {
  if (p.perBillFee) return { big: inr(p.perBillFee), unit: 'per settled bill', note: 'No monthly or yearly fee' };
  return { big: inr(p.price), unit: 'a year', note: `≈ ${inr(p.price / 365)} a day${p.trialDays ? ' · first month free' : ''}` };
}

/**
 * The four plans side by side, in the catalogue's own words. The one the calculator picked wears a gold ring and says so,
 * and moves as the reader's numbers change; "Most adopted" stays where the catalogue puts it.
 */
export function PlanCards({ result }: { result: PricingResult }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((p) => {
        const best = result.best.plan.id === p.id;
        const price = priceLine(p);
        return (
          <li key={p.id} className={`relative flex flex-col rounded-[22px] border bg-[#fbf9f4] p-6 transition-all duration-500 ${best ? 'border-[#b08d57] shadow-[0_0_0_3px_rgba(217,193,147,0.35),0_30px_60px_-40px_rgba(12,15,13,0.6)] xl:-translate-y-2' : 'border-[#e6dfcf]'}`}>
            {best && <p className="absolute -top-3 left-6 rounded-full bg-[#b08d57] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Best for your numbers</p>}
            <div className="flex items-start justify-between gap-2">
              {/* A non-breaking hyphen, so "M²-Pro" never splits across lines. */}
              <h3 className={`${DISPLAY} text-[1.6rem] font-medium leading-tight text-[#0c0f0d]`}>{p.name.replace('-', '‑')}</h3>
              <span className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-wide ${p === PER_BILL_PLAN ? 'bg-[#0c0f0d] text-[#f6f3ec]' : 'border border-[#0c0f0d]/10 text-[#0c0f0d]/60'}`}>{p.badge}</span>
            </div>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className={`${DISPLAY} text-[2.6rem] leading-none text-[#0c0f0d]`}>{price.big}</span>
              <span className="text-[13px] text-[#0c0f0d]/55">{price.unit}</span>
            </p>
            <p className="mt-1.5 text-[12.5px] font-medium text-[#8a6d3f]">{price.note}</p>
            <p className="text-[12px] text-[#0c0f0d]/50">+ {inr(p.setupFee)} setup once: profile, menu, design and QR</p>
            <ul className="mt-5 flex-1 space-y-2.5 border-t border-[#e6dfcf] pt-5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug text-[#0c0f0d]/80">
                  <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a6d3f]" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/onboarding/host" className={`mt-6 w-full ${best ? BTN_INK : 'inline-flex h-12 items-center justify-center rounded-full border border-[#0c0f0d]/20 text-[13px] font-semibold text-[#0c0f0d] transition-colors hover:border-[#0c0f0d]'}`}>
              Start with {p.name.replace('QC² ', '')}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
