import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DonutChart } from '@/components/host/workspaces/dashboard/reports/DonutChart';
import { PER_BILL_PLAN } from '@/lib/services/wallet/plans';
import { Panel } from '../ui/Panel';
import { count } from '../ui/format';
import type { OverviewAnswer } from './types';

// Categorical slots in their validated order; the legend under the ring writes every value, so colour is never alone.
const PLAN_SLICES = [
  { id: 'yewe', label: PER_BILL_PLAN.name, color: '#2a78d6' },
  { id: 'm1', label: 'QC² M¹-Pro', color: '#eb6834' },
  { id: 'm2', label: 'QC² M²-Pro', color: '#1baf7a' },
  { id: 'rhodium', label: 'Rhodium Pro', color: '#eda100' },
  { id: 'legacy', label: 'Earlier plans', color: '#e87ba4' },
] as const;

/** How many venues are on each plan right now, with trials, grace weeks, suspensions and Vibey add-ons beneath. */
export function PlanMixCard({ plans }: { plans: OverviewAnswer['plans'] }) {
  const slices = PLAN_SLICES.map((s) => ({ ...s, value: plans.mix[s.id] || 0 })).filter((s) => s.value > 0 || s.id !== 'legacy');
  return (
    <Panel title="Plan mix" note="Venues by the plan in force now">
      <DonutChart slices={slices} format={(n) => `${n} venue${n === 1 ? '' : 's'}`} centerLabel="venues" />
      <p className="mt-3 text-[12px] text-neutral-500">{plans.trials} on a free month · {plans.grace} in grace · {plans.suspended} suspended · {plans.vibey} with Vibey add-on</p>
    </Panel>
  );
}

/** What is waiting for the super admin, each a link to where it is handled. */
export function AttentionCard({ queues }: { queues: OverviewAnswer['queues'] }) {
  const rows = [
    { label: 'Payments to verify', value: queues.pendingPayments, href: '/admin/payments' },
    { label: 'Venues to review', value: queues.pendingReviews, href: '/admin/venues?review=pending' },
    { label: 'Open support tickets', value: queues.openTickets, href: '/admin/support' },
  ];
  return (
    <Panel title="Needs your attention" note="Live queues">
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label}>
            <Link href={r.href} className="flex items-center justify-between rounded-xl border border-[#ebebe8] px-4 py-3 hover:border-neutral-300 hover:bg-neutral-50">
              <span className="text-[13.5px] text-neutral-800">{r.label}</span>
              <span className="flex items-center gap-2">
                <b className={`tabular-nums text-[15px] ${r.value ? 'text-neutral-950' : 'text-neutral-400'}`}>{r.value === null ? 'n/a' : count(r.value)}</b>
                <ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {(queues.pendingReviews === null || queues.openTickets === null) && (
        <p className="mt-3 text-[11px] text-neutral-500">Reviews and tickets start once supabase/apply-pending-2026-10-24c.sql is applied.</p>
      )}
    </Panel>
  );
}
