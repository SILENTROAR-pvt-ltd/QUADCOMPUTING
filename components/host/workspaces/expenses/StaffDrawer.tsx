'use client';

import { useEffect, useState } from 'react';
import { Phone, Trash2, X } from 'lucide-react';
import type { PayrollRow } from '@/lib/services/expenses/payroll.util';
import { periodLabel } from '@/lib/services/expenses/period.util';
import { METHOD_LABEL, PAY_STYLE, ROLE_LABEL, inr, send, shortDate } from './expenses-format';

interface Props {
  row: PayrollRow; period: string; version: number;
  onClose: () => void; onEdit: () => void; onPay: () => void; onAdvance: () => void; onChanged: (msg: string) => void;
}
type Entry = { id: string; kind: 'advance' | 'salary'; amount: number; date: string; notes: string | null; method: string | null };
const btn = 'h-10 rounded-xl px-3 text-xs font-semibold cursor-pointer';

/** One employee: their month in money, every advance and payment, and what can be done next. */
export function StaffDrawer({ row, period, version, onClose, onEdit, onPay, onAdvance, onChanged }: Props) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const left = row.status !== 'ACTIVE';

  useEffect(() => {
    let live = true;
    send(`/api/host/expenses/payments?staff_id=${row.id}&period=${period}`, 'GET')
      .then((j) => { if (live) setEntries(j.entries || []); }).catch((e) => { if (live) setError(e.message); });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { live = false; window.removeEventListener('keydown', onKey); };
  }, [row.id, period, version, onClose]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setError(null);
    try { await fn(); onChanged(msg); } catch (e: any) { setError(e.message); }
  };
  const remove = (e: Entry) => confirm(`Remove this ${e.kind === 'salary' ? 'salary payment' : 'advance'} of ${inr(e.amount)}?`) &&
    act(() => send(`/api/host/expenses/${e.kind === 'salary' ? 'payments' : 'advances'}?id=${e.id}`, 'DELETE'), 'Entry removed.');
  const markLeft = () => confirm(`Mark ${row.name} as left today? Their records stay; this month's salary stops at today.`) &&
    act(() => send(`/api/host/expenses/staff?id=${row.id}`, 'DELETE'), `${row.name} marked as left.`);
  const rejoin = () => act(() => send('/api/host/expenses/staff', 'PUT', { id: row.id, action: 'reactivate' }), `${row.name} is active again.`);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/30 backdrop-blur-sm" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={row.name} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">{row.name}</h2>
            <p className="text-xs text-neutral-500">{[row.designation, ROLE_LABEL[row.role || 'OTHER'], row.department].filter(Boolean).join(' · ')} · joined {shortDate(row.join_date)}</p>
            {row.contact_number && <a href={`tel:${row.contact_number}`} className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-700 hover:underline"><Phone className="h-3 w-3" />{row.contact_number}</a>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 cursor-pointer"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-2xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">{periodLabel(period)}</p>
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${PAY_STYLE[row.pay_status].chip}`}>{PAY_STYLE[row.pay_status].label}</span></div>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Salary{row.prorated_days !== null ? ` (${row.prorated_days} days)` : ''}</dt><dd className="font-mono">{inr(row.payable)}</dd></div>
              <div className="flex justify-between text-rose-700"><dt>Advances</dt><dd className="font-mono">−{inr(row.advances)}</dd></div>
              <div className="flex justify-between text-emerald-700"><dt>Salary paid</dt><dd className="font-mono">−{inr(row.paid)}</dd></div>
              <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold text-neutral-950"><dt>Still to pay</dt><dd className="font-mono">{inr(Math.max(0, row.balance))}</dd></div>
            </dl>
          </div>
          {!left && <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onPay} className={`${btn} bg-neutral-950 text-white hover:bg-neutral-800`}>Pay salary</button>
            <button type="button" onClick={onAdvance} className={`${btn} border border-neutral-200 text-neutral-800 hover:bg-neutral-50`}>Record advance</button>
          </div>}
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
          <div>
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">This month</h3>
            {entries === null ? <div className="h-16 animate-pulse rounded-xl bg-neutral-100" /> : entries.length === 0 ? <p className="text-sm text-neutral-500">No advances or payments yet.</p> : (
              <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                {entries.map((e) => (
                  <li key={`${e.kind}-${e.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span><span className="font-medium text-neutral-950">{e.kind === 'salary' ? 'Salary paid' : 'Advance'}</span>
                      <span className="block text-[11px] text-neutral-500">{shortDate(e.date)}{e.method ? ` · ${METHOD_LABEL[e.method] || e.method}` : ''}{e.notes ? ` · ${e.notes}` : ''}</span></span>
                    <span className="flex items-center gap-2"><span className="font-mono">{inr(e.amount)}</span>
                      <button type="button" onClick={() => remove(e)} aria-label="Remove entry" className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <footer className="flex gap-2 border-t border-neutral-200 p-4">
          <button type="button" onClick={onEdit} className={`${btn} flex-1 border border-neutral-200 text-neutral-800 hover:bg-neutral-50`}>Edit details</button>
          {left ? <button type="button" onClick={rejoin} className={`${btn} flex-1 border border-neutral-200 text-neutral-800 hover:bg-neutral-50`}>Re-join</button>
            : <button type="button" onClick={markLeft} className={`${btn} flex-1 text-rose-700 hover:bg-rose-50`}>Mark as left</button>}
        </footer>
      </aside>
    </div>
  );
}
