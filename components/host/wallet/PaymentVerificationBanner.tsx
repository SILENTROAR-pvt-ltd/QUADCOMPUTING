'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import type { VenueTopupRequest } from '@/types/wallet';
import { planById, VIBEY_ADDON } from '@/lib/services/wallet/plans';

/** The payment the venue filed and the platform has not reviewed yet. */
export function PaymentVerificationBanner({ pendingRequest }: { pendingRequest: VenueTopupRequest | null }) {
  if (!pendingRequest) return null;
  const plan = planById(pendingRequest.requested_plan_tier);
  const addon = pendingRequest.requested_plan_tier === VIBEY_ADDON.id;
  const isPlan = pendingRequest.request_type === 'plan_subscription' || Boolean(plan) || addon;
  const amount = Number(pendingRequest.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 flex items-start gap-3.5">
      <div className="h-10 w-10 rounded-xl bg-white border border-amber-200 text-amber-600 grid place-items-center shrink-0">
        <Clock className="w-5 h-5" />
      </div>
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">
          {!isPlan ? 'Verifying your wallet top-up' : addon ? 'Verifying your Vibey add-on payment' : plan ? `Verifying your ${plan.name} plan payment` : 'Verifying your plan payment'}
        </p>
        <p className="text-xs text-neutral-600">
          ₹{amount} · UTR <span className="font-mono font-medium text-neutral-900 break-all">{pendingRequest.utr_number}</span>
          {' · '}submitted {new Date(pendingRequest.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-neutral-500">
          {addon
            ? 'Vibey switches on for a year as soon as the payment is confirmed. Other payments wait until then.'
            : isPlan
            ? 'Your plan starts as soon as the payment is confirmed. Other plan changes and top-ups wait until then.'
            : 'The credit is added as soon as the payment is confirmed. Other top-ups and plan changes wait until then.'}
        </p>
      </div>
    </div>
  );
}
