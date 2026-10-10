'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { currentPeriod, periodLabel, shiftPeriod } from '@/lib/services/expenses/period.util';
import type { PayrollRow } from '@/lib/services/expenses/payroll.util';
import { useExpenses } from './expenses/useExpenses';
import { ExpensesKpis } from './expenses/ExpensesKpis';
import { PayrollTable } from './expenses/PayrollTable';
import { StaffDrawer } from './expenses/StaffDrawer';
import { StaffFormModal } from './expenses/StaffFormModal';
import { MoneyModal } from './expenses/MoneyModal';
import { BillsView } from './expenses/BillsView';
import { BillFormModal } from './expenses/BillFormModal';

type Modal = { kind: 'staff'; row?: PayrollRow } | { kind: 'salary' | 'advance'; row?: PayrollRow } | { kind: 'bill'; bill?: any; template?: any } | null;
const nav = 'flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer';

/** Staff pay and venue bills, month by month: who is owed what, what was paid, and what is due. */
export function ExpensesWorkspace() {
  const x = useExpenses();
  const [tab, setTab] = useState<'staff' | 'bills'>('staff');
  const [modal, setModal] = useState<Modal>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rows = x.payroll?.rows || [];
  const open = rows.find((r) => r.id === openId) || null;
  const isNow = x.period === currentPeriod();

  const done = (msg: string) => {
    setToast(msg); setVersion((v) => v + 1); void x.reload();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4500);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const needsUpdate = x.payroll?.needs_update || x.bills?.needs_update;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Staff &amp; expenses</h1>
          <p className="mt-1 text-sm text-neutral-500">Salaries, advances and every bill the venue pays, month by month.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous month" onClick={() => x.setPeriod(shiftPeriod(x.period, -1))} className={nav}><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[9.5rem] text-center text-sm font-semibold text-neutral-950">{periodLabel(x.period)}</span>
          <button type="button" aria-label="Next month" disabled={isNow} onClick={() => x.setPeriod(shiftPeriod(x.period, 1))} className={nav}><ChevronRight className="h-4 w-4" /></button>
          {!isNow && <button type="button" onClick={() => x.setPeriod(currentPeriod())} className="h-9 rounded-xl px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer">This month</button>}
        </div>
      </header>

      {x.error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">{x.error} <button type="button" onClick={() => void x.reload()} className="ml-2 font-semibold underline cursor-pointer">Try again</button></p>}
      {needsUpdate && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">Apply database update 20261010000009 to record salary payments, due dates and monthly bills.</p>}

      <ExpensesKpis payroll={x.payroll} bills={x.bills} isLoading={x.isLoading} />

      <div role="tablist" aria-label="Sections" className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
        {([['staff', 'Team & payroll'], ['bills', `Bills${x.bills?.summary.pending ? ' · to pay' : ''}`]] as const).map(([id, l]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`h-9 rounded-lg px-4 text-sm font-semibold cursor-pointer ${tab === id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}>{l}</button>
        ))}
      </div>

      {!x.payroll || !x.bills ? <div className="h-72 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/70" />
        : tab === 'staff'
          ? <PayrollTable rows={rows} onAdd={() => setModal({ kind: 'staff' })} onPay={(row) => setModal({ kind: 'salary', row })}
              onAdvance={(row) => setModal({ kind: 'advance', row })} onOpen={(r) => setOpenId(r.id)} />
          : <BillsView data={x.bills} onAdd={(template) => setModal({ kind: 'bill', template })} onEdit={(bill) => setModal({ kind: 'bill', bill })} onChanged={done} />}

      {open && !modal && (
        <StaffDrawer row={open} period={x.period} version={version} onClose={() => setOpenId(null)} onChanged={done}
          onEdit={() => setModal({ kind: 'staff', row: open })} onPay={() => setModal({ kind: 'salary', row: open })} onAdvance={() => setModal({ kind: 'advance', row: open })} />
      )}
      {modal?.kind === 'staff' && <StaffFormModal staff={modal.row} onClose={() => setModal(null)} onSaved={done} />}
      {(modal?.kind === 'salary' || modal?.kind === 'advance') && (
        <MoneyModal kind={modal.kind} rows={rows} staffId={modal.row?.id} period={x.period} onClose={() => setModal(null)} onSaved={done} />
      )}
      {modal?.kind === 'bill' && <BillFormModal bill={modal.bill} template={modal.template} onClose={() => setModal(null)} onSaved={done} />}

      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[120] flex max-w-sm items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs font-medium text-neutral-900 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="text-neutral-400 hover:text-neutral-900 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
}
