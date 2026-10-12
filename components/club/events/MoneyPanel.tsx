'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Label, Notice, field } from '../ui';
import { clubFetch, rupees } from '../api';

/** The plan's escrow statement, its payouts, and a payout request (to a deal property or a third party). */
export function MoneyPanel({ view, onChanged }: { view: any; onChanged: () => void }) {
  const s = view.statement;
  const [payouts, setPayouts] = useState<any[]>([]);
  const [target, setTarget] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => `payout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => { void clubFetch(`/payouts?event_id=${view.event.id}`).then((r) => r.ok && setPayouts(r.data.payouts)); }, [view.event.id, s?.paidOut]);

  const request = async () => {
    setBusy(true);
    setError('');
    const res = await clubFetch('/payouts', {
      body: { event_id: view.event.id, amount, idempotency_key: key, ...(target && target !== 'other' ? { property_id: target } : { payee_label: payee }) },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setAmount('');
    setKey(`payout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    onChanged();
  };

  if (!s) return null;
  const row = (label: string, v: number, strong = false) => <p className={`flex justify-between text-sm ${strong ? 'font-semibold' : ''}`}><span className="text-[#14261b]/70">{label}</span><span>{rupees(v)}</span></p>;
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between"><p className="font-semibold">Escrow ledger</p>{s.reconciled ? <Badge tone="good">Settled to zero</Badge> : <Badge tone="warn">Open</Badge>}</div>
      <div className="space-y-1">
        {row('Collected', s.collected)}{row('Platform fee', s.fees)}{row('Paid out to vendors', s.paidOut)}
        {row('Held in escrow', s.heldInEscrow, true)}{row('Owed to vendors', s.owedToVendors)}
      </div>
      {payouts.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {payouts.map((p) => <li key={p.id} className="flex justify-between gap-2"><span>{p.payee_label}{p.third_party && ' (third party)'}</span><span className="flex items-center gap-2">{rupees(p.amount)}<Badge tone={p.status === 'paid' ? 'good' : p.status === 'rejected' ? 'bad' : 'warn'}>{p.status.replace('_', ' ')}</Badge></span></li>)}
        </ul>
      )}
      {view.event.status === 'approved' || view.event.status === 'completed' ? (
        <div className="space-y-3 rounded-2xl bg-[#14261b]/[0.05] p-4">
          <p className="text-sm font-semibold">Request a payout</p>
          <Label text="Pay">
            <select className={field} value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Choose who to pay</option>
              {view.agreements.filter((a: any) => a.status === 'deposit_paid').map((a: any) => <option key={a.id} value={a.property_id}>{a.property_name} · {a.invoice_number}</option>)}
              <option value="other">Another service (third party, needs staff approval)</option>
            </select>
          </Label>
          {target === 'other' && <Label text="Service name"><input className={field} maxLength={120} value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Local bus operator" /></Label>}
          <Label text="Amount" hint="₹"><input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></Label>
          <Notice>{error}</Notice>
          <Button busy={busy} disabled={!target || (target === 'other' && !payee.trim()) || !amount} onClick={request}>Request payout</Button>
        </div>
      ) : null}
      {view.nocCode && <Link href={`/club/noc/${view.nocCode}`} className="block text-sm font-semibold underline">View the No Objection Certificate</Link>}
    </Card>
  );
}
