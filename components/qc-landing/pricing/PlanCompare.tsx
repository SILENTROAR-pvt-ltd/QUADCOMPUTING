import React from 'react';
import { Check, Minus } from 'lucide-react';
import { PER_BILL_PLAN, type PlanInfo } from '@/lib/services/wallet/plans';
import { ADDON_LABEL, COMPARE_COLUMNS, FEATURE_ROWS, PRICE_ROWS, featureState, type CompareRow } from '@/lib/services/wallet/plan-compare-rows';
import { inr } from '../qc-brand';

function Cell({ plan, row }: { plan: PlanInfo; row: CompareRow }) {
  if (!('feature' in row)) return <>{row.text(plan)}</>;
  const state = featureState(plan, row.feature);
  if (state === 'included') return <Check aria-label="Included" className="mx-auto h-4 w-4 text-[#8a6d3f]" />;
  if (state === 'addon') return <span className="inline-flex whitespace-nowrap rounded-full border border-[#d9c193] bg-[#fbf6ea] px-2 py-0.5 text-[10px] font-semibold text-[#6f5631]">{ADDON_LABEL}</span>;
  return <Minus aria-label="Not included" className="mx-auto h-4 w-4 text-[#0c0f0d]/20" />;
}

const GROUPS: { title: string; rows: CompareRow[] }[] = [{ title: 'What you get', rows: FEATURE_ROWS }, { title: 'What you pay', rows: PRICE_ROWS }];
const shade = (p: PlanInfo) => (p === PER_BILL_PLAN ? 'bg-[#d9c193]/15' : '');

/** Every plan against every feature, from the same rows as the Wallet's table. */
export function PlanCompare() {
  return (
    <div className="overflow-x-auto rounded-[22px] border border-[#e6dfcf] bg-[#fbf9f4]">
      <table className="w-full min-w-[780px] text-left text-[13px]">
        <caption className="sr-only">Plans compared</caption>
        <thead>
          <tr className="border-b border-[#e6dfcf]">
            <th scope="col" className="sticky left-0 bg-[#fbf9f4] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0c0f0d]/50">Plan</th>
            {COMPARE_COLUMNS.map((p) => (
              <th key={p.id} scope="col" className={`px-3 py-4 text-center align-bottom ${shade(p)}`}>
                {p === PER_BILL_PLAN && <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8a6d3f]">{p.badge}</span>}
                <span className="block font-semibold text-[#0c0f0d]">{p.name.replace('QC² ', '')}</span>
                <span className="block text-[12px] font-normal text-[#0c0f0d]/55">{p.perBillFee ? `${inr(p.perBillFee)} a bill` : `${inr(p.price)} a year`}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((g) => (
            <React.Fragment key={g.title}>
              <tr><th colSpan={COMPARE_COLUMNS.length + 1} scope="colgroup" className="px-5 pb-2 pt-5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3f]">{g.title}</th></tr>
              {g.rows.map((r) => (
                <tr key={r.label} className="border-t border-[#e6dfcf]/70">
                  <th scope="row" className="sticky left-0 bg-[#fbf9f4] px-5 py-3 font-medium text-[#0c0f0d]/80">{r.label}</th>
                  {COMPARE_COLUMNS.map((p) => <td key={p.id} className={`px-3 py-3 text-center text-[#0c0f0d]/75 ${shade(p)}`}><Cell plan={p} row={r} /></td>)}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
