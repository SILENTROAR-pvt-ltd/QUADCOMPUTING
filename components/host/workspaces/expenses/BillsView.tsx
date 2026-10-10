'use client';

import { useState } from 'react';
import { CheckCircle2, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { billName, isOverdue } from '@/lib/services/expenses/bills.util';
import { METHOD_LABEL, inr, send, shortDate } from './expenses-format';
import type { BillsData } from './useExpenses';

interface Props { data: BillsData; onAdd: (template?: any) => void; onEdit: (bill: any) => void; onChanged: (msg: string) => void }

const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const btn = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold cursor-pointer';

/** The month's bills: repeating bills to add, spend by category, and each bill with its status. */
export function BillsView({ data, onAdd, onEdit, onChanged }: Props) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [error, setError] = useState<string | null>(null);
  const t = today();
  const list = data.bills.filter((b) => filter === 'all' || (filter === 'pending' ? b.status === 'PENDING' : b.status === 'PAID'));
  const peak = Math.max(1, ...data.summary.categories.map((c) => c.amount));

  const act = async (fn: () => Promise<unknown>, msg: string) => { setError(null); try { await fn(); onChanged(msg); } catch (e: any) { setError(e.message); } };
  const pay = (b: any) => act(() => send('/api/host/expenses/bills', 'PATCH', { id: b.id, action: 'mark_paid' }), `${billName(b)} marked paid.`);
  const del = (b: any) => confirm(`Delete the ${billName(b)} bill of ${inr(b.amount)}?`) && act(() => send(`/api/host/expenses/bills?id=${b.id}`, 'DELETE'), 'Bill deleted.');

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section aria-label="Bills" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
            {([['all', `All ${data.bills.length}`], ['pending', 'To pay'], ['paid', 'Paid']] as const).map(([id, l]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className={`h-8 rounded-lg px-3 text-xs font-semibold cursor-pointer ${filter === id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>{l}</button>
            ))}
          </div>
          <button type="button" onClick={() => onAdd()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-neutral-950 px-3 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"><Plus className="h-4 w-4" /> Add bill</button>
        </div>
        {data.recurring_due.length > 0 && (
          <div className="border-b border-neutral-200 bg-sky-50/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-sky-900"><Repeat className="h-3.5 w-3.5" /> Monthly bills not added yet</p>
            <div className="flex flex-wrap gap-2">
              {data.recurring_due.map((b) => (
                <button key={b.id} type="button" onClick={() => onAdd(b)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-2.5 text-xs font-semibold text-sky-900 hover:bg-sky-50 cursor-pointer">
                  <Plus className="h-3 w-3" /> {billName(b)} · {inr(b.amount)}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p role="alert" className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
        {list.length === 0 ? <p className="p-10 text-center text-sm text-neutral-500">{data.bills.length ? 'No bills match.' : 'No bills this month. Add rent, power, internet or any other expense.'}</p> : (
          <ul className="divide-y divide-neutral-100">
            {list.map((b) => {
              const late = isOverdue(b, t);
              return (
                <li key={b.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-neutral-950">{billName(b)}
                      {b.is_recurring && <Repeat className="h-3.5 w-3.5 text-neutral-400" aria-label="Repeats monthly" />}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${b.status === 'PAID' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : late ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
                        {b.status === 'PAID' ? 'Paid' : late ? `Overdue since ${shortDate(b.due_date)}` : b.due_date ? `Due ${shortDate(b.due_date)}` : 'To pay'}
                      </span></p>
                    <p className="text-[11px] text-neutral-500">{[shortDate(b.billing_date), b.vendor_name, b.reference && `bill ${b.reference}`, b.payment_method && METHOD_LABEL[b.payment_method], b.notes].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="font-mono font-semibold text-neutral-950">{inr(b.amount)}</span>
                    <span className="flex gap-1">
                      {b.status === 'PENDING' && <button type="button" onClick={() => pay(b)} className={`${btn} bg-neutral-950 text-white`}><CheckCircle2 className="h-3.5 w-3.5" /> Paid</button>}
                      <button type="button" onClick={() => onEdit(b)} aria-label="Edit bill" className={`${btn} text-neutral-500 hover:bg-neutral-100`}><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => del(b)} aria-label="Delete bill" className={`${btn} text-neutral-400 hover:bg-rose-50 hover:text-rose-700`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-label="Spend by category" className="h-fit rounded-2xl border border-neutral-200 bg-white p-4">
        <h3 className="font-serif text-lg text-neutral-950">Where it went</h3>
        {data.summary.categories.length === 0 ? <p className="mt-2 text-sm text-neutral-500">Nothing yet this month.</p> : (
          <ul className="mt-3 space-y-2.5">{data.summary.categories.map((c) => (
            <li key={c.name}><div className="flex justify-between text-sm"><span className="text-neutral-800">{c.name}</span><span className="font-mono text-neutral-950">{inr(c.amount)}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-800" style={{ width: `${(c.amount / peak) * 100}%` }} /></div></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
