'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';
import { PER_BILL_PLAN, type Feature, type PlanInfo } from '@/lib/services/wallet/plans';
import { ADDON_LABEL, COMPARE_COLUMNS, COMPARE_ROWS, featureState } from '@/lib/services/wallet/plan-compare-rows';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** A feature cell: included, available as the Vibey add-on, or not on this plan. */
function FeatureCell({ plan, feature }: { plan: PlanInfo; feature: Feature }) {
  const state = featureState(plan, feature);
  if (state === 'included') return <Check aria-label="Included" className="h-4 w-4 text-emerald-600" />;
  if (state === 'addon') {
    return <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">{ADDON_LABEL}</span>;
  }
  return <Minus aria-label="Not included" className="h-4 w-4 text-neutral-300" />;
}

export function PlanCompareTable() {
  return (
    <section className="rounded-2xl border border-neutral-200/90 bg-white shadow-xs">
      <div className="px-5 pt-5 sm:px-6">
        <h3 className="font-serif text-lg font-medium tracking-tight text-neutral-900">Compare plans</h3>
        <p className="text-xs text-neutral-500">Every plan runs on the same QC² foundation. Prices include GST.</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="border-y border-neutral-100 bg-neutral-50/70">
              <th scope="col" className="px-5 py-3 font-semibold text-neutral-500 sm:px-6">What you get</th>
              {COMPARE_COLUMNS.map((p) => (
                <th key={p.id} scope="col" className={`px-3 py-3 font-semibold text-neutral-900 ${p === PER_BILL_PLAN ? 'bg-neutral-900/[0.04]' : ''}`}>
                  {p === PER_BILL_PLAN && <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-700">{p.badge}</span>}
                  {p.name}
                  <span className="block font-normal text-neutral-500">{p === PER_BILL_PLAN ? `${inr(p.perBillFee)} / bill` : `${inr(p.price)} / year`}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((r) => (
              <tr key={r.label} className="border-b border-neutral-100 last:border-0">
                <th scope="row" className="px-5 py-2.5 font-medium text-neutral-700 sm:px-6">{r.label}</th>
                {COMPARE_COLUMNS.map((p) => (
                  <td key={p.id} className={`px-3 py-2.5 text-neutral-700 ${p === PER_BILL_PLAN ? 'bg-neutral-900/[0.04]' : ''}`}>
                    {'feature' in r ? <FeatureCell plan={p} feature={r.feature} /> : r.text(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
