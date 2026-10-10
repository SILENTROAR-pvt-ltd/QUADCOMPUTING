'use client';

import { Banknote, ChevronRight, HandCoins, UserPlus, Users } from 'lucide-react';
import type { PayrollRow } from '@/lib/services/expenses/payroll.util';
import { PAY_STYLE, ROLE_LABEL, inr } from './expenses-format';

interface Props {
  rows: PayrollRow[];
  onAdd: () => void;
  onPay: (r?: PayrollRow) => void;
  onAdvance: (r?: PayrollRow) => void;
  onOpen: (r: PayrollRow) => void;
}

const btn = 'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold cursor-pointer';

/** The month's payroll: each person's salary, advances, payments and what is still owed. */
export function PayrollTable({ rows, onAdd, onPay, onAdvance, onOpen }: Props) {
  return (
    <section aria-label="Payroll" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-xl text-neutral-950">Team &amp; payroll</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAdvance()} disabled={!rows.length} className={`${btn} border border-neutral-200 text-neutral-800 hover:bg-neutral-50 disabled:opacity-40`}><HandCoins className="h-4 w-4" /> Record advance</button>
          <button type="button" onClick={() => onPay()} disabled={!rows.length} className={`${btn} border border-neutral-200 text-neutral-800 hover:bg-neutral-50 disabled:opacity-40`}><Banknote className="h-4 w-4" /> Pay salary</button>
          <button type="button" onClick={onAdd} className={`${btn} bg-neutral-950 text-white hover:bg-neutral-800`}><UserPlus className="h-4 w-4" /> Add employee</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center">
          <Users className="mx-auto h-7 w-7 text-neutral-400" />
          <p className="mt-2 font-serif text-lg text-neutral-950">No team members yet</p>
          <p className="text-sm text-neutral-500">Add your staff with their monthly salary to track advances and pay-outs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3 text-right">Salary</th><th className="px-4 py-3 text-right">Advances</th>
                <th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">To pay</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => {
                const s = PAY_STYLE[r.pay_status];
                const left = r.status !== 'ACTIVE';
                return (
                  <tr key={r.id} className={`hover:bg-neutral-50 ${left ? 'text-neutral-500' : ''}`}>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onOpen(r)} className="text-left cursor-pointer">
                        <span className="font-semibold text-neutral-950 hover:underline">{r.name}</span>
                        {left && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">Left {r.end_date ? r.end_date.slice(8) + '/' + r.end_date.slice(5, 7) : ''}</span>}
                        <span className="block text-[11px] text-neutral-500">{[r.designation || ROLE_LABEL[r.role || 'OTHER'], r.contact_number].filter(Boolean).join(' · ')}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {inr(r.payable)}{r.prorated_days !== null && <span className="block font-sans text-[10px] text-neutral-500">{r.prorated_days} days of {inr(r.base_salary)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-700">{r.advances ? `−${inr(r.advances)}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{r.paid ? inr(r.paid) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-950">{inr(Math.max(0, r.balance))}</td>
                    <td className="px-4 py-3"><span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.chip}`}>{s.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {!left && r.balance > 0 && <button type="button" onClick={() => onPay(r)} className={`${btn} h-8 bg-neutral-950 text-white hover:bg-neutral-800`}>Pay</button>}
                        {!left && <button type="button" onClick={() => onAdvance(r)} className={`${btn} h-8 border border-neutral-200 text-neutral-800 hover:bg-neutral-50`}>Advance</button>}
                        <button type="button" onClick={() => onOpen(r)} aria-label={`Open ${r.name}`} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
