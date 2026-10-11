'use client';

import React, { useState } from 'react';
import { Badge, Card, Notice, Spinner } from '../ui';
import { GENERATION_LABEL, shortDate } from '../api';
import { DecisionRow, ListState, StatusTabs, useAdminList, useDecision } from './admin-kit';

/** Applications with real identity, age and verified phone, for the vibe check. */
export function ApplicationsTab() {
  const [status, setStatus] = useState('pending');
  const { rows, error, reload } = useAdminList(`/admin/applications?status=${status}`, 'applications');
  const { busy, error: decideError, decide } = useDecision('/admin/applications', reload);

  return (
    <div>
      <StatusTabs value={status} options={['pending', 'approved', 'rejected', 'revoked']} onChange={setStatus} />
      <Notice>{decideError}</Notice>
      {!rows && !error && <Spinner />}
      <ListState rows={rows} error={error} empty="No applications here." />
      <div className="space-y-3">
        {rows?.map((a: any) => (
          <Card key={a.user_id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.display_name || '—'} <span className="font-normal text-[#2a1250]/55">{a.viber_id}</span></p>
                <p className="text-xs text-[#2a1250]/55">Applied {shortDate(a.created_at)}{a.campaign_source ? ` · via ${a.campaign_source}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge tone="aura">{GENERATION_LABEL[a.generation]}</Badge>
                <Badge>{a.age ?? '?'} yrs</Badge>
                <Badge>{a.account_type}</Badge>
                {a.alias_masked && <Badge tone="warn">masked as {a.alias}</Badge>}
              </div>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="inline text-[#2a1250]/55">Phone </dt><dd className="inline">+{a.phone} ✓</dd></div>
              <div><dt className="inline text-[#2a1250]/55">From </dt><dd className="inline">{a.city}, {a.state}, {a.country}</dd></div>
              {a.account_type === 'business' && <div className="sm:col-span-2"><dt className="inline text-[#2a1250]/55">Business </dt><dd className="inline">{a.business_name} · {a.categories.join(', ')}</dd></div>}
              {a.vibe_line && <div className="sm:col-span-2 italic text-[#2a1250]/75">“{a.vibe_line}”</div>}
              {a.review_note && <div className="sm:col-span-2 text-[#2a1250]/60">Note: {a.review_note}</div>}
            </dl>
            {status === 'pending' && (
              <DecisionRow id={a.user_id} busy={busy}
                onApprove={() => decide(a.user_id, { user_id: a.user_id, decision: 'approve' })}
                onReject={(note) => decide(a.user_id, { user_id: a.user_id, decision: 'reject', note })} approveLabel="Approve & issue pass" />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
