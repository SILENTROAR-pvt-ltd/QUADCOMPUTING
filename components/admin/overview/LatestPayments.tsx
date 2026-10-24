import React from 'react';
import Link from 'next/link';
import { Panel, Empty } from '../ui/Panel';
import { dateShort, inr } from '../ui/format';
import { purchaseName } from '@/lib/services/wallet/plans';
import type { OverviewAnswer } from './types';

const STATUS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

/** The latest payments venues filed (plans, the Vibey add-on, credit), with their review status. */
export function LatestPayments({ payments }: { payments: OverviewAnswer['latestPayments'] }) {
  return (
    <Panel title="Recent payments" note="Filed by venues for verification" pad={false}
      actions={<Link href="/admin/payments" className="text-xs font-semibold text-[#2a78d6] hover:underline">View all</Link>}>
      <div className="px-5 pb-4 pt-3">
        {payments.length === 0 ? <Empty>No payments filed yet. They appear here the moment a venue submits one.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="text-[12px] text-neutral-500">
                  <th className="pb-2 font-medium">Venue</th><th className="pb-2 font-medium">For</th><th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">UTR</th><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0ed]">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-3 font-medium text-neutral-900">{p.venue}</td>
                    <td className="py-2.5 pr-3 text-[#2a78d6]">{p.request_type === 'plan_subscription' ? purchaseName(p.requested_plan_tier) || 'Plan' : 'Wallet credit'}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-neutral-900">{inr(p.amount)}</td>
                    <td className="py-2.5 pr-3 font-mono text-[12px] text-neutral-500">{p.utr_number}</td>
                    <td className="py-2.5 pr-3 text-neutral-500">{dateShort(p.created_at)}</td>
                    <td className="py-2.5"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS[p.status] || STATUS.pending}`}>● {p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}
