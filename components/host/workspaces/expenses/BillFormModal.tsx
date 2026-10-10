'use client';

import { useState } from 'react';
import { BILL_CATEGORIES, BILL_METHODS } from '@/lib/services/expenses/bills.util';
import { ExpenseModal, field, label } from './ExpenseModal';
import { METHOD_LABEL, inr, send } from './expenses-format';

interface Props { bill?: any | null; template?: any | null; onClose: () => void; onSaved: (msg: string) => void }

const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/** Add or edit a bill: what for, how much, who to, paid now or due later, and whether it repeats monthly. */
export function BillFormModal({ bill, template, onClose, onSaved }: Props) {
  const src = bill || template || {};
  const [f, setF] = useState({
    category: BILL_CATEGORIES.includes(src.category) ? src.category : src.category === 'WiFi' ? 'Internet & phone' : src.category ? 'Other' : 'Rent',
    custom_category_name: src.custom_category_name || '', amount: src.amount ? String(src.amount) : '',
    vendor_name: src.vendor_name || '', reference: bill?.reference || '', billing_date: bill?.billing_date || today(),
    status: bill?.status || 'PAID', payment_method: bill?.payment_method || 'UPI', due_date: bill?.due_date || '',
    is_recurring: Boolean(src.is_recurring), notes: bill?.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await send('/api/host/expenses/bills', bill ? 'PATCH' : 'POST', { ...f, id: bill?.id, amount: Number(f.amount) });
      onSaved(bill ? 'Bill updated.' : `${f.category === 'Other' ? f.custom_category_name : f.category} bill of ${inr(Number(f.amount))} added.`);
      onClose();
    } catch (e: any) { setError(e.message); setBusy(false); }
  };

  return (
    <ExpenseModal title={bill ? 'Edit bill' : 'Add bill'} subtitle="Rent, power, gas, repairs, subscriptions: anything the venue pays for."
      onClose={onClose} onSubmit={submit} submitLabel={bill ? 'Save bill' : 'Add bill'} busy={busy} error={error}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Expense</span>
          <select value={f.category} onChange={set('category')} className={field}>{BILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="block"><span className={label}>Amount (₹)</span>
          <input required type="number" min={1} step="any" inputMode="decimal" value={f.amount} onChange={set('amount')} className={`${field} font-mono`} autoFocus /></label>
      </div>
      {f.category === 'Other' && <label className="block"><span className={label}>What was it for?</span><input required value={f.custom_category_name} onChange={set('custom_category_name')} className={field} placeholder="e.g. Pest control" /></label>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Paid to / vendor</span><input value={f.vendor_name} onChange={set('vendor_name')} className={field} placeholder="e.g. MSEB, Airtel" /></label>
        <label className="block"><span className={label}>Bill no.</span><input value={f.reference} onChange={set('reference')} className={field} placeholder="Optional" /></label>
        <label className="block"><span className={label}>Bill date</span><input type="date" value={f.billing_date} onChange={set('billing_date')} className={field} /></label>
        <label className="block"><span className={label}>Status</span>
          <select value={f.status} onChange={set('status')} className={field}><option value="PAID">Paid</option><option value="PENDING">To pay</option></select></label>
        {f.status === 'PAID'
          ? <label className="block"><span className={label}>Paid by</span>
              <select value={f.payment_method} onChange={set('payment_method')} className={field}>{BILL_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></label>
          : <label className="block"><span className={label}>Due date</span><input type="date" value={f.due_date} onChange={set('due_date')} className={field} /></label>}
        <label className="block"><span className={label}>Note</span><input value={f.notes} onChange={set('notes')} className={field} placeholder="Optional" /></label>
      </div>
      <label className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 cursor-pointer">
        <input type="checkbox" checked={f.is_recurring} onChange={set('is_recurring')} className="h-4 w-4" />
        Repeats every month <span className="text-xs text-neutral-500">· offered for one-tap entry next month</span>
      </label>
    </ExpenseModal>
  );
}
