'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge, Card, Notice, Spinner } from '../ui';
import { rupees, shortDate } from '../api';
import { DecisionRow, ListState, StatusTabs, useAdminList, useDecision } from './admin-kit';

/** Plans waiting for review, with the creator's signed consent (version, time, IP). */
export function EventsTab() {
  const [status, setStatus] = useState('submitted');
  const { rows, error, reload } = useAdminList(`/admin/events?status=${status}`, 'events');
  const { busy, error: decideError, decide } = useDecision('/admin/events', reload);

  return (
    <div>
      <StatusTabs value={status} options={['submitted', 'approved', 'rejected', 'completed']} onChange={setStatus} />
      <Notice>{decideError}</Notice>
      {!rows && !error && <Spinner />}
      <ListState rows={rows} error={error} empty="No plans here." />
      <div className="space-y-3">
        {rows?.map((e: any) => (
          <Card key={e.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/club/events/${e.id}`} className="font-semibold underline-offset-4 hover:underline">{e.title}</Link>
                <p className="text-xs text-[#2a1250]/55">{shortDate(e.starts_at)} → {shortDate(e.ends_at)} · {e.capacity} spots · {e.ticket_price ? rupees(e.ticket_price) : 'free'}</p>
              </div>
              <div className="flex gap-1"><Badge>{e.kind}</Badge>{e.verified && <Badge tone="good">verified</Badge>}</div>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-[#2a1250]/55">Safety: </span>{e.safety_protocol}</p>
              <p><span className="text-[#2a1250]/55">Cancellation: </span>{e.cancellation_policy}</p>
            </div>
            {e.consent
              ? <p className="mt-2 text-xs text-[#2a1250]/55">Consent v{e.consent.version} signed by {e.consent.viber_id} on {shortDate(e.consent.signed_at)} from {e.consent.ip}</p>
              : status === 'submitted' && <p className="mt-2 text-xs text-rose-700">No signed consent on record.</p>}
            {status === 'submitted' && (
              <DecisionRow id={e.id} busy={busy} approveLabel="Approve & announce"
                onApprove={() => decide(e.id, { event_id: e.id, decision: 'approve' }, 'Approve and notify every member and checked-in guest?')}
                onReject={(note) => decide(e.id, { event_id: e.id, decision: 'reject', note })} rejectLabel="Send back" />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
