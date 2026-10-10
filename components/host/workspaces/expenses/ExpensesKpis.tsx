'use client';

import { inr } from './expenses-format';
import type { BillsData, PayrollData } from './useExpenses';

function Tile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'warn' | 'bad' }) {
  const t = tone === 'bad' ? 'text-rose-700' : tone === 'warn' ? 'text-amber-700' : 'text-neutral-500';
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1.5 font-serif text-2xl tabular-nums text-neutral-950">{value}</p>
      <p className={`mt-0.5 truncate text-[11px] ${t}`}>{hint}</p>
    </div>
  );
}

/** The month at a glance: salaries owed and paid, bills paid and pending, and the total cost of running the venue. */
export function ExpensesKpis({ payroll, bills, isLoading }: { payroll: PayrollData | null; bills: BillsData | null; isLoading: boolean }) {
  if (isLoading && (!payroll || !bills)) {
    return <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-busy="true">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[98px] animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/70" />)}</div>;
  }
  const t = payroll?.totals || { headcount: 0, payable: 0, advances: 0, paid: 0, outstanding: 0 };
  const s = bills?.summary || { paid: 0, pending: 0, overdue: 0, total: 0, count: 0, categories: [] };
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile label="Salaries this month" value={inr(t.payable)} hint={`${t.headcount} on the team`} />
      <Tile label="Paid out" value={inr(t.paid + t.advances)} hint={`${inr(t.advances)} as advances`} />
      <Tile label="Salary still to pay" value={inr(t.outstanding)} hint={t.outstanding ? 'Pay before month end' : 'All settled'} tone={t.outstanding ? 'warn' : undefined} />
      <Tile label="Bills" value={inr(s.total)} hint={s.pending ? `${inr(s.pending)} to pay${s.overdue ? `, ${inr(s.overdue)} overdue` : ''}` : `${s.count} paid`} tone={s.overdue ? 'bad' : s.pending ? 'warn' : undefined} />
      <Tile label="Running cost" value={inr(t.payable + s.total)} hint="Salaries plus bills this month" />
    </div>
  );
}
