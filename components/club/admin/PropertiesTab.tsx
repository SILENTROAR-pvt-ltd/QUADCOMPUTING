'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Notice, Spinner } from '../ui';
import { rupees } from '../api';
import { DecisionRow, ListState, StatusTabs, useAdminList, useDecision } from './admin-kit';

/** Property verification: pending → verified (or rejected / suspended with a reason). */
export function PropertiesTab() {
  const [status, setStatus] = useState('pending');
  const { rows, error, reload } = useAdminList(`/admin/properties?status=${status}`, 'properties');
  const { busy, error: decideError, decide } = useDecision('/admin/properties', reload);

  return (
    <div>
      <StatusTabs value={status} options={['pending', 'verified', 'rejected', 'suspended']} onChange={setStatus} />
      <Notice>{decideError}</Notice>
      {!rows && !error && <Spinner />}
      <ListState rows={rows} error={error} empty="No listings here." />
      <div className="space-y-3">
        {rows?.map((p: any) => (
          <Card key={p.id}>
            <div className="flex flex-wrap gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.photos.map((u: string, i: number) => <img key={i} src={u} alt="" className="h-20 w-28 rounded-xl object-cover" />)}
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/club/properties/${p.id}`} className="font-semibold underline-offset-4 hover:underline">{p.name}</Link>
                <p className="text-xs text-[#2a1250]/55">{p.address}, {p.city}, {p.state} · up to {p.capacity} · {rupees(p.price_min)}–{rupees(p.price_max)}/night</p>
              </div>
              <div className="flex flex-wrap gap-1">{p.categories.map((c: string) => <Badge key={c}>{c}</Badge>)}{p.business_id && <Badge tone="good">linked QC venue</Badge>}</div>
            </div>
            {status === 'pending' && (
              <DecisionRow id={p.id} busy={busy} approveLabel="Verify"
                onApprove={() => decide(p.id, { property_id: p.id, decision: 'verified' })}
                onReject={(note) => decide(p.id, { property_id: p.id, decision: 'rejected', note })} />
            )}
            {status === 'verified' && (
              <Button tone="danger" className="mt-3" onClick={() => {
                const note = window.prompt('Why suspend this listing? The owner will see this.');
                if (note) void decide(p.id, { property_id: p.id, decision: 'suspended', note });
              }}>Suspend</Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
