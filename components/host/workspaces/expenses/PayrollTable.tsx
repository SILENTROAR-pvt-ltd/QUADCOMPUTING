'use client';

import { Banknote, ChevronRight, HandCoins, UserPlus, Users } from 'lucide-react';
import { isOwed, type PayrollRow } from '@/lib/services/expenses/payroll.util';
import { PAY_STYLE, ROLE_LABEL, inr } from './expenses-format';

interface Props {
  rows: PayrollRow[];
  onAdd: () => void;
  onPay: (r?: PayrollRow) => void;
  onAdvance: (r?: PayrollRow) => void;
  onOpen: (r: PayrollRow) => void;
}

const btn = 'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold cursor-pointer active:scale-[0.98] sm:h-9';

/** Money still owed to someone, whether they work here now, joined this month, or have left. */
const isDue = isOwed;
const leftLabel = (r: PayrollRow) => `Left${r.end_date ? ` ${r.end_date.slice(8)}/${r.end_date.slice(5, 7)}` : ''}`;
const subtitle = (r: PayrollRow) => [r.designation || ROLE_LABEL[r.role || 'OTHER'], r.contact_number].filter(Boolean).join(' · ');

/** The "Settle" button: pays what is still owed. A leaver is settled the same way, for the days they worked. */
function SettleButton({ row, onPay, className = '' }: { row: PayrollRow; onPay: (r: PayrollRow) => void; className?: string }) {
  return (
    <button type="button" onClick={() => onPay(row)} aria-label={`Settle ${inr(row.balance)} for ${row.name}`}
      className={`${btn} bg-neutral-950 text-white hover:bg-neutral-800 ${className}`}>
      <Banknote className="h-4 w-4" aria-hidden /> Settle {inr(row.balance)}
    </button>
  );
}

/** The month's payroll: each person's salary, advances, payments and what is still owed. */
export function PayrollTable({ rows, onAdd, onPay, onAdvance, onOpen }: Props) {
  return (
    <section aria-label="Payroll" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-xl text-neutral-950">Team &amp; payroll</h2>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" onClick={() => onAdvance()} disabled={!rows.length} className={`${btn} border border-neutral-200 text-neutral-800 hover:bg-neutral-50 disabled:opacity-40`}><HandCoins className="h-4 w-4" /> Record advance</button>
          <button type="button" onClick={() => onPay()} disabled={!rows.length} className={`${btn} border border-neutral-200 text-neutral-800 hover:bg-neutral-50 disabled:opacity-40`}><Banknote className="h-4 w-4" /> Pay salary</button>
          <button type="button" onClick={onAdd} className={`${btn} col-span-2 bg-neutral-950 text-white hover:bg-neutral-800 sm:col-span-1`}><UserPlus className="h-4 w-4" /> Add employee</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center">
          <Users className="mx-auto h-7 w-7 text-neutral-400" />
          <p className="mt-2 font-serif text-lg text-neutral-950">No team members yet</p>
          <p className="text-sm text-neutral-500">Add your staff with their monthly salary to track advances and pay-outs.</p>
        </div>
      ) : (
        <>
          {/* Phone: one card per person, with the settle button in plain sight. */}
          <ul className="divide-y divide-neutral-100 md:hidden">
            {rows.map((r) => {
              const s = PAY_STYLE[r.pay_status];
              const left = r.status !== 'ACTIVE';
              return (
                <li key={r.id} className={`p-4 ${left ? 'bg-neutral-50/60' : ''}`}>
                  <button type="button" onClick={() => onOpen(r)} className="flex w-full items-start justify-between gap-3 text-left cursor-pointer">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[15px] font-semibold text-neutral-950">{r.name}</span>
                        {left && <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">{leftLabel(r)}</span>}
                        {!left && r.prorated_days !== null && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">Joined {r.join_date.slice(8)}/{r.join_date.slice(5, 7)}</span>}
                      </span>
                      <span className="block truncate text-[11px] text-neutral-500">{subtitle(r)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.chip}`}>{s.label}</span>
                      <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden />
                    </span>
                  </button>

                  <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {([
                      ['Salary', inr(r.payable), 'text-neutral-950'],
                      ['Advances', r.advances ? `−${inr(r.advances)}` : '—', 'text-rose-700'],
                      ['Paid', r.paid ? inr(r.paid) : '—', 'text-emerald-700'],
                      ['To pay', inr(Math.max(0, r.balance)), 'font-bold text-neutral-950'],
                    ] as const).map(([k, v, c]) => (
                      <div key={k} className="rounded-xl bg-neutral-50 px-1 py-2">
                        <dt className="text-[10px] uppercase tracking-wide text-neutral-500">{k}</dt>
                        <dd className={`font-mono text-[13px] ${c}`}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {r.prorated_days !== null && <p className="mt-1.5 text-[11px] text-neutral-500">{r.prorated_days} days of {inr(r.base_salary)}</p>}

                  {(isDue(r) || !left) && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {isDue(r) ? <SettleButton row={r} onPay={onPay} className={left ? 'col-span-2' : ''} /> : null}
                      {!left && <button type="button" onClick={() => onAdvance(r)} className={`${btn} border border-neutral-200 text-neutral-800 hover:bg-neutral-50 ${isDue(r) ? '' : 'col-span-2'}`}>Advance</button>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Desk: the full table. */}
          <div className="hidden overflow-x-auto md:block">
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
                          {left && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">{leftLabel(r)}</span>}
                          <span className="block text-[11px] text-neutral-500">{subtitle(r)}</span>
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
                          {isDue(r) && <button type="button" onClick={() => onPay(r)} className={`${btn} h-8 bg-neutral-950 text-white hover:bg-neutral-800`}>{left ? 'Settle' : 'Pay'}</button>}
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
        </>
      )}
    </section>
  );
}
