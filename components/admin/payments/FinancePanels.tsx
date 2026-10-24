'use client';

import React from 'react';
import { StackedBars } from '../charts/StackedBars';
import { Panel, Empty } from '../ui/Panel';
import { compactInr, inr } from '../ui/format';

export interface FinanceAnswer {
  collected: { fees: number; fees30: number; plans: number; setup: number; creditSold: number };
  owed: { dues: number; duesCount: number };
  held: { venueCredit: number; guestCashback: number; cashbackIssued: number };
  months: Array<{ month: string; fees: number; plans: number; setup: number }>;
  venues: Array<{ id: string; name: string; fees: number; fees30: number; dues: number; wallet: number }>;
}

const monthLabel = (m: string) => new Date(`${m}-01T00:00:00+05:30`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

/** Money in, money owed and money held, as tinted figures. */
export function FinanceTiles({ f }: { f: FinanceAnswer }) {
  const tiles = [
    { label: 'Plans & add-ons paid', value: inr(f.collected.plans), hint: `Plus ${inr(f.collected.setup)} in ₹599 setups`, tint: 'bg-[#fdf1e7]' },
    { label: '₹3 bill fees taken', value: inr(f.collected.fees), hint: `${inr(f.collected.fees30)} in the last 30 days`, tint: 'bg-[#eaf6ef]' },
    { label: 'Dues outstanding', value: inr(f.owed.dues), hint: `${f.owed.duesCount} unpaid bill fees`, tint: 'bg-[#fcedef]' },
    { label: 'Venue credit held', value: inr(f.held.venueCredit, 2), hint: `${inr(f.collected.creditSold)} credit sold in all`, tint: 'bg-[#ecf2fd]' },
    { label: 'Guest cashback held', value: inr(f.held.guestCashback, 2), hint: `${inr(f.held.cashbackIssued)} issued in all`, tint: 'bg-[#eef5e7]' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className={`rounded-2xl p-4 ${t.tint}`}>
          <p className="text-[12px] font-medium text-neutral-600">{t.label}</p>
          <p className="mt-2 truncate text-[22px] font-semibold tracking-tight text-neutral-950">{t.value}</p>
          <p className="mt-2 text-[11px] text-neutral-500">{t.hint}</p>
        </div>
      ))}
    </div>
  );
}

/** Platform income per month: plan payments, setup fees and ₹3 bill fees stacked. */
export function IncomeChart({ months }: { months: FinanceAnswer['months'] }) {
  return (
    <Panel title="Income by month" note="Plans and add-ons, ₹599 setups and ₹3 bill fees (last 6 months with income)">
      <StackedBars format={(n) => inr(n)} axis={compactInr} empty="No platform income recorded yet."
        series={[{ name: 'Plans & add-ons', color: '#2a78d6' }, { name: 'Setup fees', color: '#eb6834' }, { name: 'Bill fees', color: '#1baf7a' }]}
        points={months.map((m) => ({ key: m.month, label: monthLabel(m.month), values: [m.plans, m.setup, m.fees] }))} />
    </Panel>
  );
}

/** Per venue: fees taken, what it still owes and its unused credit, biggest debts first. */
export function FeeLedger({ venues }: { venues: FinanceAnswer['venues'] }) {
  return (
    <Panel title="Fees and dues by venue" note="Dues are ₹3 bill fees recorded when the wallet had too little credit" pad={false}>
      <div className="px-5 pb-4 pt-3">
        {venues.length === 0 ? <Empty>No fees or dues yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead><tr className="text-[12px] text-neutral-500"><th className="pb-2 font-medium">Venue</th><th className="pb-2 font-medium">Fees taken</th><th className="pb-2 font-medium">Last 30 days</th><th className="pb-2 font-medium">Dues</th><th className="pb-2 font-medium">Credit held</th></tr></thead>
              <tbody className="divide-y divide-[#f0f0ed]">
                {venues.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 pr-3 font-medium text-neutral-900">{v.name}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{inr(v.fees)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-neutral-500">{inr(v.fees30)}</td>
                    <td className={`py-2.5 pr-3 tabular-nums ${v.dues > 0 ? 'font-semibold text-rose-600' : 'text-neutral-500'}`}>{inr(v.dues)}</td>
                    <td className="py-2.5 tabular-nums">{inr(v.wallet, 2)}</td>
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
