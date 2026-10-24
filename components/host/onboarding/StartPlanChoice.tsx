'use client';

import { Check } from 'lucide-react';
import { PER_BILL_PLAN, purchasablePlan } from '@/lib/services/wallet/plans';
import type { StartPlan } from '@/lib/services/wallet/start-plan';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Each first-month option in a line: what it costs after the free month, and what it is for. */
function option(id: StartPlan) {
  if (id === 'rhodium_ppb') {
    return { title: `${PER_BILL_PLAN.name} · ${PER_BILL_PLAN.badge.toLowerCase()}`, price: `${inr(PER_BILL_PLAN.perBillFee)} a bill · ${inr(PER_BILL_PLAN.setupFee)} setup from your first top-up`, note: 'Everything, including rooms, Vibey and Viber Club' };
  }
  const p = purchasablePlan(id)!;
  return {
    title: `${p.name}, free for a month`,
    price: `then ${inr(p.price)} a year${p.setupFee ? ` + ${inr(p.setupFee)} setup` : ''}`,
    note: id === 'm2_pro' ? 'Menu, kitchen and billing, plus events, offers and delivery' : 'Menu, ordering, kitchen, billing and inventory',
  };
}

interface Props { value: StartPlan; hasStays: boolean; onChange: (plan: StartPlan) => void }

/** Sign-up: how the venue starts. Nothing is charged now; a plan can be bought or changed any time in Wallet. */
export function StartPlanChoice({ value, hasStays, onChange }: Props) {
  const ids: StartPlan[] = hasStays ? ['rhodium_ppb', 'm2_pro', 'm1_pro'] : ['m2_pro', 'm1_pro', 'rhodium_ppb'];
  return (
    <fieldset className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold text-neutral-950">Your first month</legend>
      <p className="mb-3 text-xs text-neutral-500">Nothing is charged today. You can buy or change a plan any time in Wallet.</p>
      <div className="grid gap-2.5">
        {ids.map((id) => {
          const o = option(id);
          const on = value === id;
          const noRooms = hasStays && id !== 'rhodium_ppb';
          return (
            <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${on ? 'border-neutral-950 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}>
              <input type="radio" name="startPlan" value={id} checked={on} onChange={() => onChange(id)} className="sr-only" />
              <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300'}`}>
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-neutral-950">{o.title}</span>
                <span className="block text-xs text-neutral-600">{o.price}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">{o.note}</span>
                {noRooms && <span className="mt-1 block text-xs font-medium text-amber-700">Rooms and stays come with {PER_BILL_PLAN.name} or Rhodium Pro.</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
