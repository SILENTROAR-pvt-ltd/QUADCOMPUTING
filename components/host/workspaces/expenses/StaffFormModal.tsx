'use client';

import { useState } from 'react';
import { currentPeriod } from '@/lib/services/expenses/period.util';
import type { PayrollRow } from '@/lib/services/expenses/payroll.util';
import { ExpenseModal, field, label } from './ExpenseModal';
import { ROLE_LABEL, send, shortDate } from './expenses-format';

interface Props { staff?: PayrollRow | null; onClose: () => void; onSaved: (msg: string) => void }

const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/** Add an employee, or edit one: name, phone, role, monthly salary and joining date. */
export function StaffFormModal({ staff, onClose, onSaved }: Props) {
  const [f, setF] = useState({
    name: staff?.name || '', contact_number: staff?.contact_number || '', role: staff?.role || 'WAITER',
    designation: staff?.designation || '', department: staff?.department || '',
    base_salary: staff ? String(staff.base_salary) : '', join_date: staff?.join_date || today(),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const joinsThisMonth = f.join_date.slice(0, 7) === currentPeriod() && f.join_date.slice(8) !== '01';

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await send('/api/host/expenses/staff', staff ? 'PUT' : 'POST', { ...f, id: staff?.id, base_salary: Number(f.base_salary) });
      onSaved(staff ? `${f.name} updated.` : `${f.name} added to the team.`);
      onClose();
    } catch (e: any) { setError(e.message); setBusy(false); }
  };

  return (
    <ExpenseModal title={staff ? `Edit ${staff.name}` : 'Add employee'} subtitle="Salary is per month; a mid-month joiner is paid for the days worked."
      onClose={onClose} onSubmit={submit} submitLabel={staff ? 'Save changes' : 'Add employee'} busy={busy} error={error}>
      <label className="block"><span className={label}>Full name</span><input required value={f.name} onChange={set('name')} className={field} placeholder="e.g. Asha Patil" autoFocus /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Phone</span><input type="tel" inputMode="tel" value={f.contact_number} onChange={set('contact_number')} className={field} placeholder="98765 43210" /></label>
        <label className="block"><span className={label}>Role</span>
          <select value={f.role} onChange={set('role')} className={field}>{Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="block"><span className={label}>Job title</span><input value={f.designation} onChange={set('designation')} className={field} placeholder="e.g. Head chef" /></label>
        <label className="block"><span className={label}>Department</span><input value={f.department} onChange={set('department')} className={field} placeholder="e.g. Kitchen" /></label>
        <label className="block"><span className={label}>Monthly salary (₹)</span>
          <input required type="number" min={0} step="any" inputMode="decimal" value={f.base_salary} onChange={set('base_salary')} className={`${field} font-mono`} placeholder="18000" /></label>
        <label className="block"><span className={label}>Joining date</span><input required type="date" value={f.join_date} onChange={set('join_date')} className={field} /></label>
      </div>
      {joinsThisMonth && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Joins mid-month: this month&apos;s salary is worked out for the days from {shortDate(f.join_date)}.</p>}
    </ExpenseModal>
  );
}
