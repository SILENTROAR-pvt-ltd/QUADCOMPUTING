'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Notice, Spinner } from '../ui';
import { clubFetch, rupees, shortDate } from '../api';
import { ListState, StatusTabs, useAdminList, useDecision } from './admin-kit';

/** Payout queue: approve (escrow → payable), then mark paid with the bank/UPI reference (payable → cash). */
export function PayoutsTab() {
  const [status, setStatus] = useState('pending_approval');
  const { rows, error, reload } = useAdminList(`/admin/payouts?status=${status}`, 'payouts');
  const { busy, error: decideError, decide } = useDecision('/admin/payouts', reload);
  const [statement, setStatement] = useState<any>(null);

  const showStatement = async (eventId: string) => {
    const r = await clubFetch(`/admin/payouts?event_id=${eventId}`);
    if (r.ok) setStatement(r.data.statement);
  };

  return (
    <div>
      <StatusTabs value={status} options={['pending_approval', 'approved', 'paid', 'rejected']} onChange={setStatus} />
      <Notice>{decideError}</Notice>
      {!rows && !error && <Spinner />}
      <ListState rows={rows} error={error} empty="No payouts here." />
      <div className="space-y-3">
        {rows?.map((p: any) => (
          <Card key={p.id} className="!p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm"><span className="font-semibold">{rupees(p.amount)}</span> to {p.payee_label} {p.third_party && <Badge tone="warn">third party · unverified</Badge>}</p>
              <span className="text-xs text-[#14261b]/60">{shortDate(p.created_at)}{p.paid_reference ? ` · ref ${p.paid_reference}` : ''}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/club/events/${p.event_id}`} className="text-xs font-semibold underline">Plan</Link>
              <button type="button" onClick={() => showStatement(p.event_id)} className="text-xs font-semibold underline">Ledger</button>
              {status === 'pending_approval' && <>
                <Button busy={busy === p.id} onClick={() => decide(p.id, { payout_id: p.id, op: 'approve' }, `Approve ${rupees(p.amount)} to ${p.payee_label}?`)}>Approve</Button>
                <Button tone="danger" onClick={() => { const note = window.prompt('Reason for rejecting'); if (note) void decide(p.id, { payout_id: p.id, op: 'reject', note }); }}>Reject</Button>
              </>}
              {status === 'approved' && (
                <Button tone="aura" busy={busy === p.id} onClick={() => { const reference = window.prompt('Bank or UPI reference of the transfer'); if (reference) void decide(p.id, { payout_id: p.id, op: 'paid', reference }); }}>Mark paid</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {statement && (
        <Card className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><p className="font-semibold">Plan ledger</p><button type="button" onClick={() => setStatement(null)} className="text-xs underline">Close</button></div>
          {[['Collected', statement.collected], ['Fees', statement.fees], ['Paid out', statement.paidOut], ['Held in escrow', statement.heldInEscrow], ['Owed to vendors', statement.owedToVendors], ['Pending payouts', statement.pendingPayouts]].map(([k, v]) => (
            <p key={k as string} className="flex justify-between"><span className="text-[#14261b]/70">{k}</span><span>{rupees(v as number)}</span></p>
          ))}
          <p className="pt-1">{statement.reconciled ? <Badge tone="good">Reconciled to zero</Badge> : <Badge tone="warn">Not settled</Badge>}</p>
          <details className="pt-2"><summary className="cursor-pointer text-xs font-semibold">Journal ({statement.journals.length})</summary>
            <ul className="mt-2 space-y-2 text-xs">{statement.journals.map((j: any) => <li key={j.id}><p className="font-semibold">{j.kind} · {j.memo}</p>{j.lines.map((l: any, i: number) => <p key={i} className="flex justify-between font-mono"><span>{l.account}</span><span>{l.debit ? `Dr ${rupees(l.debit)}` : `Cr ${rupees(l.credit)}`}</span></p>)}</li>)}</ul>
          </details>
        </Card>
      )}
    </div>
  );
}
