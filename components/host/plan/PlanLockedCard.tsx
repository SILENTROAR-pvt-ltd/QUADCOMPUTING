'use client';

import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { cheapestPlanFor, VIBEY_ADDON, type Feature } from '@/lib/services/wallet/plans';
import { requestOpenTab } from '@/lib/host/open-tab-request';

const WHAT: Record<Feature, string> = {
  core: 'This section',
  events: 'Live events',
  offers: 'Offers',
  delivery: 'Delivery',
  retention: 'Repeat-visit boosters',
  rooms: 'Rooms and stays',
  viber_connect: 'Viber Connect',
  viber_club: 'Viber Club',
  vibey: 'Vibey AI',
};

/**
 * Shown where a section's plan does not include it: what it is part of, and the way to Wallet. What the venue already
 * set up stays saved, and anything already running (a booked stay, an order on its way) is finished as usual.
 */
export function PlanLockedCard({ feature }: { feature: Feature }) {
  const plan = cheapestPlanFor(feature);
  const addon = feature === 'vibey' ? `, or add Vibey to your plan for ₹${VIBEY_ADDON.price.toLocaleString('en-IN')} a year` : '';
  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-white border border-amber-200 text-amber-700 grid place-items-center"><Lock className="w-5 h-5" /></div>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Available on {plan.name}</p>
          <p className="text-sm font-semibold text-neutral-900">{WHAT[feature]} {feature === 'rooms' || feature === 'offers' ? 'are' : 'is'} not part of your current plan</p>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Upgrade in Wallet to use it{addon}. Anything you set up stays saved and comes back on upgrade; whatever is
            already running is finished as usual.
          </p>
        </div>
      </div>
      <button type="button" onClick={() => requestOpenTab('wallet')}
        className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-black shrink-0">
        See plans <ArrowRight className="w-3.5 h-3.5" aria-hidden />
      </button>
    </section>
  );
}
