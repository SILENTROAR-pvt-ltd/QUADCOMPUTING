'use client';

import { useState } from 'react';
import { isOwed, type PayrollRow } from '@/lib/services/expenses/payroll.util';
import { periodLabel } from '@/lib/services/expenses/period.util';
import { ExpenseModal, field, label } from './ExpenseModal';
import { METHOD_LABEL, inr, send } from './expenses-format';

interface Props {
  kind: 'advance' | 'salary';
  rows: PayrollRow[];
  staffId?: string;
  period: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/** Pay salary for the month, or give an advance against it, with the balance shown as you type. */
export function MoneyModal({ kind, rows, staffId, period, onClose, onSaved }: Props) {
  // Salary can be paid to someone who has left while they are still owed; an advance only goes to current staff.
  const active = rows.filter((r) => r.status === 'ACTIVE' || r.id === staffId || (kind === 'salary' && isOwed(r)));
  const [id, setId] = useState(staffId || active[0]?.id || '');
  const row = rows.find((r) => r.id === id) || null;
  const [amount, setAmount] = useState(kind === 'salary' && row && row.balance > 0 ? String(row.balance) : '');
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const after = row ? row.balance - (Number(amount) || 0) : 0;

  const pick = (v: string) => {
    setId(v);
    const r = rows.find((x) => x.id === v);
    if (kind === 'salary') setAmount(r && r.balance > 0 ? String(r.balance) : '');
  };
  const submit = async () => {
    if (!row) { setError('Choose an employee.'); return; }
    setBusy(true); setError(null);
    try {
      await send(kind === 'salary' ? '/api/host/expenses/payments' : '/api/host/expenses/advances', 'POST',
        { staff_id: row.id, amount: Number(amount), date, method, notes, period });
      onSaved(`${kind === 'salary' ? 'Salary paid' : 'Advance recorded'}: ${inr(Number(amount))} to ${row.name}.`);
      onClose();
    } catch (e: any) { setError(e.message); setBusy(false); }
  };

  return (
    <ExpenseModal title={kind === 'salary' ? (row && row.status !== 'ACTIVE' ? 'Settle salary' : 'Pay salary') : 'Record advance'}
      subtitle={kind === 'salary' ? `Counts towards ${periodLabel(period)}.${row && row.status !== 'ACTIVE' ? ' Their salary for the days they worked.' : ''}` : 'Taken off the salary still to pay this month.'}
      onClose={onClose} onSubmit={submit} submitLabel={kind === 'salary' ? (row && row.balance > 0.5 && Number(amount) === row.balance ? `Mark ${inr(row.balance)} paid` : 'Record payment') : 'Record advance'} busy={busy} error={error}>
      <label className="block"><span className={label}>Employee</span>
        <select value={id} onChange={(e) => pick(e.target.value)} className={field} required>
          <option value="">Choose…</option>
          {active.map((r) => <option key={r.id} value={r.id}>{r.name}{r.status !== 'ACTIVE' ? ' (left)' : ''}{r.balance > 0 ? ` · ${inr(r.balance)} to pay` : ''}</option>)}
        </select>
      </label>
      {row && (
        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-3 text-center text-xs">
          <div><dt className="text-neutral-500">Salary</dt><dd className="font-mono font-semibold text-neutral-950">{inr(row.payable)}</dd></div>
          <div><dt className="text-neutral-500">Advances + paid</dt><dd className="font-mono font-semibold text-neutral-950">{inr(row.advances + row.paid)}</dd></div>
          <div><dt className="text-neutral-500">After this</dt><dd className={`font-mono font-semibold ${after < 0 ? 'text-rose-700' : 'text-neutral-950'}`}>{inr(after)}</dd></div>
        </dl>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Amount (₹)</span>
          <input required type="number" min={1} step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} font-mono`} /></label>
        <label className="block"><span className={label}>Date</span><input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
        <label className="block"><span className={label}>Paid by</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={field}>{['CASH', 'UPI', 'BANK', 'OTHER'].map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></label>
        <label className="block"><span className={label}>Note</span><input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} placeholder="Optional" /></label>
      </div>
      {after < 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">This is more than the month&apos;s salary by {inr(-after)}.</p>}
    </ExpenseModal>
  );
}
